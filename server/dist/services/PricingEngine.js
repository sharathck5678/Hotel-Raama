"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingEngine = exports.OFFICIAL_COUPONS = void 0;
const mongoose_1 = require("mongoose");
const RoomType_1 = require("../models/RoomType");
const MealPlan_1 = require("../models/MealPlan");
const Coupon_1 = require("../models/Coupon");
const DailyRate_1 = require("../models/DailyRate");
const HotelSettingService_1 = require("./HotelSettingService");
const gstinValidator_1 = require("../utils/gstinValidator");
const AvailabilityEngine_1 = require("./AvailabilityEngine");
exports.OFFICIAL_COUPONS = {
    WELCOME10: 10,
    WELCOME15: 15,
};
class PricingEngine {
    static async calculateBookingPrice(roomTypeId, checkIn, checkOut, numGuests, mealSelection, couponCode, planType = 'NON_CP', extraPerson = false, gstin, preloadedContext) {
        // 1. Calculate stay nights
        const stayDates = AvailabilityEngine_1.AvailabilityEngine.getStayDateStrings(checkIn, checkOut);
        const numNights = Math.max(1, stayDates.length);
        // 2. Fetch RoomType rate
        let roomType = preloadedContext?.roomType || null;
        if (!roomType) {
            if (roomTypeId instanceof mongoose_1.Types.ObjectId) {
                roomType = await RoomType_1.RoomType.findById(roomTypeId);
            }
            else if (typeof roomTypeId === 'string' && mongoose_1.Types.ObjectId.isValid(roomTypeId) && roomTypeId.length === 24) {
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
        }
        const ratePlanCode = planType === 'CP' ? 'BREAKFAST_INCLUDED' : 'ROOM_ONLY';
        // 3. Fetch any custom DailyRate records for this room type, rate plan, and stay dates
        let customRates;
        if (preloadedContext?.dailyRates) {
            const rtIdStr = roomType._id.toString();
            customRates = preloadedContext.dailyRates.filter((cr) => cr.roomTypeId.toString() === rtIdStr &&
                cr.ratePlanCode === ratePlanCode &&
                stayDates.includes(cr.date));
        }
        else {
            customRates = await DailyRate_1.DailyRate.find({
                roomTypeId: roomType._id,
                ratePlanCode,
                date: { $in: stayDates },
            }).lean();
        }
        const customRateMap = new Map();
        for (const cr of customRates) {
            customRateMap.set(cr.date, cr);
        }
        // 4. Calculate per-night room price across all stay dates
        let roomTotal = 0;
        let extraPersonTotal = 0;
        const nightlyRates = [];
        const defaultBase = planType === 'CP' ? (roomType.cpPrice || roomType.basePrice) : roomType.basePrice;
        const isSingleCategory = roomType.code.includes('SGL');
        const defaultSingle = isSingleCategory ? defaultBase : Math.max(0, defaultBase - 200);
        const defaultDouble = defaultBase;
        // Room max occupancy determines the threshold beyond which extra person charges apply
        const maxOcc = roomType.maxOccupancy || 2;
        const requestedExtra = extraPerson ? 1 : 0;
        const totalGuests = Math.max(numGuests, 1) + requestedExtra;
        const extraCount = (totalGuests > maxOcc && (extraPerson || numGuests > maxOcc))
            ? Math.max(1, totalGuests - maxOcc)
            : 0;
        const hasExtraPerson = extraCount > 0;
        for (const nightStr of stayDates) {
            const cr = customRateMap.get(nightStr);
            let nightPrice = defaultDouble;
            let extraCharge = 0;
            let isCustom = false;
            if (cr) {
                isCustom = true;
                if (numGuests === 1) {
                    nightPrice = cr.singleAdult ?? defaultSingle;
                }
                else {
                    // 2 or more guests: 2-adult rate is the base room price.
                    // 3 adults and 4 adults use the SAME 2-adult/base rate within room capacity.
                    nightPrice = cr.doubleAdult ?? defaultDouble;
                }
                if (hasExtraPerson) {
                    extraCharge = extraCount * (cr.extraAdultRate ?? 600);
                }
            }
            else {
                if (numGuests === 1) {
                    nightPrice = defaultSingle;
                }
                else {
                    // 2 or more guests: 2-adult rate is the base room price.
                    nightPrice = defaultDouble;
                }
                if (hasExtraPerson) {
                    extraCharge = extraCount * 600;
                }
            }
            roomTotal += nightPrice;
            extraPersonTotal += extraCharge;
            nightlyRates.push({
                date: nightStr,
                rate: nightPrice,
                isCustomRate: isCustom,
            });
        }
        const roomPricePerNight = Math.round(roomTotal / numNights);
        const extraPersonChargePerNight = Math.round(extraPersonTotal / numNights);
        // 5. Fetch Meal Plans and calculate total
        let mealPlanPricePerNight = 0;
        const totalDiningGuests = Math.max(numGuests, 1) + (hasExtraPerson ? extraCount : 0);
        if (mealSelection) {
            const mealPlans = await MealPlan_1.MealPlan.find({ isActive: true });
            const mealMap = new Map(mealPlans.map((m) => [m.type, m.pricePerPersonPerNight]));
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
        // 6. Authoritative Server-Side Coupon & GSTIN Validation
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
                    const dbCoupon = await Coupon_1.Coupon.findOne({
                        code: cleanCode,
                        isActive: true,
                    });
                    if (dbCoupon && !dbCoupon.isActive) {
                        couponError = 'Invalid coupon code.';
                    }
                    else {
                        gstinValidation = (0, gstinValidator_1.validateGSTIN)(gstin);
                        if (!gstin || typeof gstin !== 'string' || gstin.trim().length === 0) {
                            couponError = 'GSTIN is required to apply this coupon.';
                        }
                        else if (!gstinValidation.isValid) {
                            couponError = 'Please enter a valid GSTIN.';
                        }
                        else {
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
        // 7. Calculate GST Tax
        // Precedence: Existing DB HotelSetting -> process.env.TAX_PERCENTAGE (if valid number) -> default 5%
        const settings = await (0, HotelSettingService_1.getHotelSettings)();
        let taxPercentage;
        if (settings && typeof settings.taxPercentage === 'number' && !isNaN(settings.taxPercentage) && settings.taxPercentage >= 0) {
            taxPercentage = settings.taxPercentage;
        }
        else if (process.env.TAX_PERCENTAGE !== undefined && process.env.TAX_PERCENTAGE.trim() !== '') {
            const parsedEnvTax = Number(process.env.TAX_PERCENTAGE);
            taxPercentage = (!isNaN(parsedEnvTax) && parsedEnvTax >= 0) ? parsedEnvTax : 5;
        }
        else {
            taxPercentage = 5;
        }
        const taxAmount = Math.round((netAmountBeforeTax * taxPercentage) / 100);
        const totalAmount = Math.max(0, Math.round(netAmountBeforeTax + taxAmount));
        return {
            numNights,
            roomPricePerNight,
            roomTotal,
            extraPerson: hasExtraPerson,
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
            nightlyRates,
        };
    }
}
exports.PricingEngine = PricingEngine;
