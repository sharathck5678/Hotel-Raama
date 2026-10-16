"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Coupon = void 0;
exports.normalizeCouponCode = normalizeCouponCode;
exports.formatKolkataDate = formatKolkataDate;
exports.getEffectiveCouponStatus = getEffectiveCouponStatus;
exports.validateCouponSchedule = validateCouponSchedule;
const mongoose_1 = require("mongoose");
function normalizeCouponCode(code) {
    if (!code || typeof code !== 'string')
        return '';
    return code.trim().toUpperCase();
}
function formatKolkataDate(d) {
    if (!d)
        return '';
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
        return d.trim();
    }
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (!dateObj || isNaN(dateObj.getTime())) {
        return '';
    }
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(dateObj);
}
function getEffectiveCouponStatus(coupon, now = new Date()) {
    if (!coupon.isActive) {
        return 'Disabled';
    }
    const nowCal = formatKolkataDate(now);
    if (coupon.startDate) {
        const startCal = formatKolkataDate(coupon.startDate);
        if (startCal && nowCal < startCal) {
            return 'Scheduled';
        }
    }
    if (coupon.endDate) {
        const endCal = formatKolkataDate(coupon.endDate);
        if (endCal && nowCal > endCal) {
            return 'Expired';
        }
    }
    return 'Active';
}
function validateCouponSchedule(coupon, stayDates, now = new Date()) {
    // 1. Authoritative enable/disable check
    if (!coupon.isActive) {
        return {
            valid: false,
            error: 'Invalid coupon code.',
        };
    }
    // 2. Unscheduled coupons are always valid when active
    if (!coupon.startDate && !coupon.endDate) {
        return { valid: true };
    }
    const couponStartCal = coupon.startDate ? formatKolkataDate(coupon.startDate) : null;
    const couponEndCal = coupon.endDate ? formatKolkataDate(coupon.endDate) : null;
    const checkInCal = stayDates?.checkIn ? formatKolkataDate(stayDates.checkIn) : null;
    const checkOutCal = stayDates?.checkOut ? formatKolkataDate(stayDates.checkOut) : null;
    // 3. When stay dates are supplied, evaluate stay qualification
    if (checkInCal && checkOutCal) {
        if (checkOutCal <= checkInCal) {
            return {
                valid: false,
                error: 'Check-out date must be after check-in date.',
            };
        }
        if (couponStartCal && checkInCal < couponStartCal) {
            return {
                valid: false,
                error: 'This coupon is not valid for the selected stay dates.',
            };
        }
        if (couponEndCal && checkOutCal > couponEndCal) {
            return {
                valid: false,
                error: 'This coupon is not valid for the selected stay dates.',
            };
        }
        return { valid: true };
    }
    if (checkInCal) {
        if (couponStartCal && checkInCal < couponStartCal) {
            return {
                valid: false,
                error: 'This coupon is not valid for the selected stay dates.',
            };
        }
        if (couponEndCal && checkInCal > couponEndCal) {
            return {
                valid: false,
                error: 'This coupon is not valid for the selected stay dates.',
            };
        }
        return { valid: true };
    }
    // 4. Fallback when stay dates are not supplied (e.g. general coupon validation)
    const nowCal = formatKolkataDate(now);
    if (couponStartCal && nowCal < couponStartCal) {
        return {
            valid: false,
            error: 'Coupon is not yet active.',
        };
    }
    if (couponEndCal && nowCal > couponEndCal) {
        return {
            valid: false,
            error: 'Coupon has expired.',
        };
    }
    return { valid: true };
}
const CouponSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], default: 'PERCENTAGE', required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minBookingAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number },
    startDate: { type: Date, required: false },
    endDate: { type: Date, required: false },
    maxUsage: { type: Number, default: 100000 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
CouponSchema.index({ code: 1, isActive: 1 });
exports.Coupon = (0, mongoose_1.model)('Coupon', CouponSchema);
