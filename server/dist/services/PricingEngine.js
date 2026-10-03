"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingEngine = exports.OFFICIAL_COUPONS = void 0;
const mongoose_1 = require("mongoose");
const RoomType_1 = require("../models/RoomType");
const MealPlan_1 = require("../models/MealPlan");
const Coupon_1 = require("../models/Coupon");
const HotelSetting_1 = require("../models/HotelSetting");
const gstinValidator_1 = require("../utils/gstinValidator");
exports.OFFICIAL_COUPONS = {
    WELCOME10: 10,
    WELCOME15: 15,
};
class PricingEngine {
    static async calculateBookingPrice(roomTypeId, checkIn, checkOut, numGuests, mealSelection, couponCode, planType = 'NON_CP', extraPerson = false, gstin) {
        // 1. Calculate number of nights
        const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
        const numNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        // 2. Fetch RoomType rate
        let roomType = null;
        if (typeof roomTypeId === 'string' && mongoose_1.Types.ObjectId.isValid(roomTypeId) && roomTypeId.length === 24) {
            roomType = await RoomType_1.RoomType.findById(roomTypeId);
        }
        if (!roomType) {
            const MOCK_MAP = {
                rt_1: 'PREM_SGL_NONAC',
                rt_2: 'PREM_DBL_NONAC',
                rt_3: 'EXEC_SGL_AC',
                rt_4: 'EXEC_DBL_AC',
                rt_5: 'TRIPLE_PREM',
                rt_6: 'TRIPLE_EXEC',
                rt_7: 'SUITE_ROOM',
            };
            const searchCode = typeof roomTypeId === 'string' ? (MOCK_MAP[roomTypeId] || roomTypeId) : '';
            roomType = await RoomType_1.RoomType.findOne({ code: searchCode });
        }
        if (!roomType) {
            throw new Error('Invalid Room Type');
        }
        const roomPricePerNight = planType === 'CP' ? (roomType.cpPrice || roomType.basePrice) : roomType.basePrice;
        const roomTotal = roomPricePerNight * numNights;
        // 3. Extra Person Charge (₹600 per night)
        const extraPersonChargePerNight = extraPerson ? 600 : 0;
        const extraPersonTotal = extraPersonChargePerNight * numNights;
        // 4. Fetch Meal Plans and calculate total
        let mealPlanPricePerNight = 0;
        const totalDiningGuests = numGuests + (extraPerson ? 1 : 0);
        if (mealSelection) {
            const mealPlans = await MealPlan_1.MealPlan.find({ isActive: true });
            const mealMap = new Map(mealPlans.map(m => [m.type, m.pricePerPersonPerNight]));
            if (mealSelection.breakfast && mealMap.has('BREAKFAST')) {
                mealPlanPricePerNight += mealMap.get('BREAKFAST') * totalDiningGuests;
            }
            if (mealSelection.lunch && mealMap.has('LUNCH')) {
                mealPlanPricePerNight += mealMap.get('LUNCH') * totalDiningGuests;
            }
            if (mealSelection.dinner && mealMap.has('DINNER')) {
                mealPlanPricePerNight += mealMap.get('DINNER') * totalDiningGuests;
            }
        }
        const mealPlanTotal = mealPlanPricePerNight * numNights;
        const subtotal = roomTotal + extraPersonTotal + mealPlanTotal;
        // 5. Authoritative Server-Side Coupon & GSTIN Validation
        let discountAmount = 0;
        let discountPercentage = 0;
        let validCouponCode;
        let couponError;
        let couponMessage;
        let gstinValidation;
        if (couponCode && couponCode.trim().length > 0) {
            const rawCode = couponCode.trim();
            // Check for attempted coupon stacking (multiple codes passed via delimiter)
            if (rawCode.includes(',') || rawCode.includes('+') || rawCode.includes('&') || /\s+/.test(rawCode)) {
                couponError = 'Only one coupon can be applied per booking.';
            }
            else {
                const cleanCode = rawCode.toUpperCase();
                // The ONLY permitted active coupons are WELCOME10 and WELCOME15
                if (!(cleanCode in exports.OFFICIAL_COUPONS)) {
                    couponError = 'Invalid coupon code.';
                }
                else {
                    // Verify against Coupon model in DB if exists (or verify active status)
                    const dbCoupon = await Coupon_1.Coupon.findOne({
                        code: cleanCode,
                        isActive: true,
                    });
                    // Check if coupon exists in DB and is active (or seed if not yet created)
                    if (dbCoupon && !dbCoupon.isActive) {
                        couponError = 'Invalid coupon code.';
                    }
                    else {
                        // Validate GSTIN requirement for coupon application
                        gstinValidation = (0, gstinValidator_1.validateGSTIN)(gstin);
                        if (!gstin || typeof gstin !== 'string' || gstin.trim().length === 0) {
                            couponError = 'GSTIN is required to apply this coupon.';
                        }
                        else if (!gstinValidation.isValid) {
                            couponError = 'Please enter a valid GSTIN.';
                        }
                        else {
                            // GSTIN is valid and coupon is eligible
                            validCouponCode = cleanCode;
                            discountPercentage = exports.OFFICIAL_COUPONS[cleanCode];
                            discountAmount = Math.round((subtotal * discountPercentage) / 100);
                            discountAmount = Math.min(discountAmount, subtotal);
                            couponMessage = `Coupon ${cleanCode} applied! ${discountPercentage}% discount added.`;
                        }
                    }
                }
            }
        }
        else if (gstin && gstin.trim().length > 0) {
            gstinValidation = (0, gstinValidator_1.validateGSTIN)(gstin);
        }
        const netAmountBeforeTax = Math.max(0, subtotal - discountAmount);
        // 6. Calculate GST Tax (Official Rate = 5%)
        const settings = await HotelSetting_1.HotelSetting.findOne() || { taxPercentage: 5 };
        const taxPercentage = settings.taxPercentage ?? 5;
        const taxAmount = Math.round((netAmountBeforeTax * taxPercentage) / 100);
        const totalAmount = Math.max(0, Math.round(netAmountBeforeTax + taxAmount));
        return {
            numNights,
            roomPricePerNight,
            roomTotal,
            extraPerson: !!extraPerson,
            extraPersonChargePerNight,
            extraPersonTotal,
            mealPlanPricePerNight,
            mealPlanTotal,
            subtotal,
            couponCode: validCouponCode,
            discountPercentage: validCouponCode ? discountPercentage : 0,
            discountAmount,
            taxPercentage,
            taxAmount,
            totalAmount,
            gstin: gstinValidation?.normalizedGstin,
            gstinValid: gstinValidation?.isValid,
            couponError,
            couponMessage,
        };
    }
}
exports.PricingEngine = PricingEngine;
