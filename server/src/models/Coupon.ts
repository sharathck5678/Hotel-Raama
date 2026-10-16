import { Schema, model, Document } from 'mongoose';

export type DiscountType = 'PERCENTAGE' | 'FLAT';
export type EffectiveCouponStatus = 'Active' | 'Disabled' | 'Scheduled' | 'Expired';

export interface ICoupon extends Document {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minBookingAmount: number;
  maxDiscountAmount?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  maxUsage: number;
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function normalizeCouponCode(code: string): string {
  if (!code || typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

export function formatKolkataDate(d: Date | string | null | undefined): string {
  if (!d) return '';
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

export function getEffectiveCouponStatus(
  coupon: {
    isActive: boolean;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  },
  now = new Date()
): EffectiveCouponStatus {
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

export interface ICouponScheduleValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCouponSchedule(
  coupon: {
    isActive: boolean;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  },
  stayDates?: {
    checkIn?: Date | string | null;
    checkOut?: Date | string | null;
  },
  now = new Date()
): ICouponScheduleValidationResult {
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

const CouponSchema = new Schema<ICoupon>(
  {
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
  },
  { timestamps: true }
);

CouponSchema.index({ code: 1, isActive: 1 });

export const Coupon = model<ICoupon>('Coupon', CouponSchema);

