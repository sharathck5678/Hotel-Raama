"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingEngine = void 0;
const RoomType_1 = require("../models/RoomType");
const MealPlan_1 = require("../models/MealPlan");
const Coupon_1 = require("../models/Coupon");
const HotelSetting_1 = require("../models/HotelSetting");
class PricingEngine {
    static async calculateBookingPrice(roomTypeId, checkIn, checkOut, numGuests, mealSelection, couponCode, planType = 'NON_CP', extraPerson = false) {
        // 1. Calculate number of nights
        const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
        const numNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        // 2. Fetch RoomType rate
        const roomType = await RoomType_1.RoomType.findById(roomTypeId);
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
        // 5. Validate and apply Coupon
        let discountAmount = 0;
        let validCouponCode;
        if (couponCode && couponCode.trim().length > 0) {
            const cleanCode = couponCode.trim().toUpperCase();
            const coupon = await Coupon_1.Coupon.findOne({
                code: cleanCode,
                isActive: true,
                startDate: { $lte: new Date() },
                endDate: { $gte: new Date() },
            });
            if (coupon && subtotal >= coupon.minBookingAmount && coupon.usedCount < coupon.maxUsage) {
                validCouponCode = coupon.code;
                if (coupon.discountType === 'PERCENTAGE') {
                    discountAmount = (subtotal * coupon.discountValue) / 100;
                    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                        discountAmount = coupon.maxDiscountAmount;
                    }
                }
                else if (coupon.discountType === 'FLAT') {
                    discountAmount = coupon.discountValue;
                }
                discountAmount = Math.min(discountAmount, subtotal);
            }
        }
        const netAmountBeforeTax = Math.max(0, subtotal - discountAmount);
        // 6. Calculate GST Tax
        const settings = await HotelSetting_1.HotelSetting.findOne() || { taxPercentage: 12 };
        const taxPercentage = settings.taxPercentage || 12;
        const taxAmount = Math.round((netAmountBeforeTax * taxPercentage) / 100);
        const totalAmount = Math.round(netAmountBeforeTax + taxAmount);
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
            discountAmount,
            taxPercentage,
            taxAmount,
            totalAmount,
        };
    }
}
exports.PricingEngine = PricingEngine;
