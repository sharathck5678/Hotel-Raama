import { Types } from 'mongoose';
import { RoomType } from '../models/RoomType';
import { MealPlan } from '../models/MealPlan';
import { Coupon } from '../models/Coupon';
import { HotelSetting } from '../models/HotelSetting';
import { validateGSTIN, IGSTINValidationResult } from '../utils/gstinValidator';

export interface IMealSelectionInput {
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
}

export interface IPricingCalculationResult {
  numNights: number;
  roomPricePerNight: number;
  roomTotal: number;
  extraPerson: boolean;
  extraPersonChargePerNight: number;
  extraPersonTotal: number;
  mealPlanPricePerNight: number;
  mealPlanTotal: number;
  subtotal: number;
  couponCode?: string;
  discountPercentage?: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  gstin?: string;
  gstinValid?: boolean;
  couponError?: string;
  couponMessage?: string;
}

export const OFFICIAL_COUPONS: Record<string, number> = {
  WELCOME10: 10,
  WELCOME15: 15,
};

export class PricingEngine {
  static async calculateBookingPrice(
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date,
    numGuests: number,
    mealSelection?: IMealSelectionInput,
    couponCode?: string,
    planType: 'NON_CP' | 'CP' = 'NON_CP',
    extraPerson: boolean = false,
    gstin?: string
  ): Promise<IPricingCalculationResult> {
    // 1. Calculate number of nights
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
    const numNights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // 2. Fetch RoomType rate
    let roomType = null;
    if (typeof roomTypeId === 'string' && Types.ObjectId.isValid(roomTypeId) && roomTypeId.length === 24) {
      roomType = await RoomType.findById(roomTypeId);
    }
    if (!roomType) {
      const MOCK_MAP: Record<string, string> = {
        rt_1: 'PREM_SGL_NONAC',
        rt_2: 'PREM_DBL_NONAC',
        rt_3: 'EXEC_SGL_AC',
        rt_4: 'EXEC_DBL_AC',
        rt_5: 'TRIPLE_PREM',
        rt_6: 'TRIPLE_EXEC',
        rt_7: 'SUITE_ROOM',
      };
      const searchCode = typeof roomTypeId === 'string' ? (MOCK_MAP[roomTypeId] || roomTypeId) : '';
      roomType = await RoomType.findOne({ code: searchCode });
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
      const mealPlans = await MealPlan.find({ isActive: true });
      const mealMap = new Map(mealPlans.map(m => [m.type, m.pricePerPersonPerNight]));

      if (mealSelection.breakfast && mealMap.has('BREAKFAST')) {
        mealPlanPricePerNight += mealMap.get('BREAKFAST')! * totalDiningGuests;
      }
      if (mealSelection.lunch && mealMap.has('LUNCH')) {
        mealPlanPricePerNight += mealMap.get('LUNCH')! * totalDiningGuests;
      }
      if (mealSelection.dinner && mealMap.has('DINNER')) {
        mealPlanPricePerNight += mealMap.get('DINNER')! * totalDiningGuests;
      }
    }
    const mealPlanTotal = mealPlanPricePerNight * numNights;

    const subtotal = roomTotal + extraPersonTotal + mealPlanTotal;

    // 5. Authoritative Server-Side Coupon & GSTIN Validation
    let discountAmount = 0;
    let discountPercentage = 0;
    let validCouponCode: string | undefined;
    let couponError: string | undefined;
    let couponMessage: string | undefined;
    let gstinValidation: IGSTINValidationResult | undefined;

    if (couponCode && couponCode.trim().length > 0) {
      const rawCode = couponCode.trim();

      // Check for attempted coupon stacking (multiple codes passed via delimiter)
      if (rawCode.includes(',') || rawCode.includes('+') || rawCode.includes('&') || /\s+/.test(rawCode)) {
        couponError = 'Only one coupon can be applied per booking.';
      } else {
        const cleanCode = rawCode.toUpperCase();

        // The ONLY permitted active coupons are WELCOME10 and WELCOME15
        if (!(cleanCode in OFFICIAL_COUPONS)) {
          couponError = 'Invalid coupon code.';
        } else {
          // Verify against Coupon model in DB if exists (or verify active status)
          const dbCoupon = await Coupon.findOne({
            code: cleanCode,
            isActive: true,
          });

          // Check if coupon exists in DB and is active (or seed if not yet created)
          if (dbCoupon && !dbCoupon.isActive) {
            couponError = 'Invalid coupon code.';
          } else {
            // Validate GSTIN requirement for coupon application
            gstinValidation = validateGSTIN(gstin);

            if (!gstin || typeof gstin !== 'string' || gstin.trim().length === 0) {
              couponError = 'GSTIN is required to apply this coupon.';
            } else if (!gstinValidation.isValid) {
              couponError = 'Please enter a valid GSTIN.';
            } else {
              // GSTIN is valid and coupon is eligible
              validCouponCode = cleanCode;
              discountPercentage = OFFICIAL_COUPONS[cleanCode];
              discountAmount = Math.round((subtotal * discountPercentage) / 100);
              discountAmount = Math.min(discountAmount, subtotal);
              couponMessage = `Coupon ${cleanCode} applied! ${discountPercentage}% discount added.`;
            }
          }
        }
      }
    } else if (gstin && gstin.trim().length > 0) {
      gstinValidation = validateGSTIN(gstin);
    }

    const netAmountBeforeTax = Math.max(0, subtotal - discountAmount);

    // 6. Calculate GST Tax (Official Rate = 5%)
    const settings = await HotelSetting.findOne() || { taxPercentage: 5 };
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
