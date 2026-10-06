import { Types } from 'mongoose';
import { RoomType } from '../models/RoomType';
import { MealPlan } from '../models/MealPlan';
import { Coupon } from '../models/Coupon';
import { HotelSetting } from '../models/HotelSetting';
import { DailyRate } from '../models/DailyRate';
import { validateGSTIN, IGSTINValidationResult } from '../utils/gstinValidator';
import { AvailabilityEngine } from './AvailabilityEngine';

export interface IMealSelectionInput {
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
}

export interface INightlyRateBreakdown {
  date: string;
  rate: number;
  isCustomRate: boolean;
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
  nightlyRates?: INightlyRateBreakdown[];
}

export const OFFICIAL_COUPONS: Record<string, number> = {
  WELCOME10: 10,
  WELCOME15: 15,
};

export class PricingEngine {
  static async calculateBookingPrice(
    roomTypeId: string | Types.ObjectId,
    checkIn: Date,
    checkOut: Date,
    numGuests: number,
    mealSelection?: IMealSelectionInput,
    couponCode?: string,
    planType: 'NON_CP' | 'CP' = 'NON_CP',
    extraPerson: boolean = false,
    gstin?: string
  ): Promise<IPricingCalculationResult> {
    // 1. Calculate stay nights
    const stayDates = AvailabilityEngine.getStayDateStrings(checkIn, checkOut);
    const numNights = Math.max(1, stayDates.length);

    // 2. Fetch RoomType rate
    let roomType = null;
    if (roomTypeId instanceof Types.ObjectId) {
      roomType = await RoomType.findById(roomTypeId);
    } else if (typeof roomTypeId === 'string' && Types.ObjectId.isValid(roomTypeId) && roomTypeId.length === 24) {
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

    const ratePlanCode = planType === 'CP' ? 'BREAKFAST_INCLUDED' : 'ROOM_ONLY';

    // 3. Fetch any custom DailyRate records for this room type, rate plan, and stay dates
    const customRates = await DailyRate.find({
      roomTypeId: roomType._id,
      ratePlanCode,
      date: { $in: stayDates },
    }).lean();

    const customRateMap = new Map<string, any>();
    for (const cr of customRates) {
      customRateMap.set(cr.date, cr);
    }

    // 4. Calculate per-night room price across all stay dates
    let roomTotal = 0;
    let extraPersonTotal = 0;
    const nightlyRates: INightlyRateBreakdown[] = [];

    const defaultBase = planType === 'CP' ? (roomType.cpPrice || roomType.basePrice) : roomType.basePrice;
    const isSingleCategory = roomType.code.includes('SGL');
    const defaultSingle = isSingleCategory ? defaultBase : Math.max(0, defaultBase - 200);
    const defaultDouble = defaultBase;
    const defaultTriple = roomType.maxOccupancy >= 3 ? defaultBase : defaultBase + 600;

    for (const nightStr of stayDates) {
      const cr = customRateMap.get(nightStr);
      let nightPrice = defaultDouble;
      let extraCharge = extraPerson ? 600 : 0;
      let isCustom = false;

      if (cr) {
        isCustom = true;
        if (numGuests === 1) {
          nightPrice = cr.singleAdult ?? defaultSingle;
        } else if (numGuests === 2) {
          nightPrice = cr.doubleAdult ?? defaultDouble;
        } else {
          // 3 or more guests
          if (roomType.maxOccupancy >= 3) {
            nightPrice = cr.tripleAdult ?? defaultTriple;
          } else {
            nightPrice = (cr.doubleAdult ?? defaultDouble) + (cr.extraAdultRate ?? 600);
          }
        }
        if (extraPerson) {
          extraCharge = cr.extraAdultRate ?? 600;
        }
      } else {
        if (numGuests === 1) {
          nightPrice = defaultSingle;
        } else if (numGuests === 2) {
          nightPrice = defaultDouble;
        } else {
          nightPrice = defaultTriple;
        }
        if (extraPerson) {
          extraCharge = 600;
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
    const totalDiningGuests = numGuests + (extraPerson ? 1 : 0);
    if (mealSelection) {
      const mealPlans = await MealPlan.find({ isActive: true });
      const mealMap = new Map(mealPlans.map((m) => [m.type, m.pricePerPersonPerNight]));

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

    // 6. Authoritative Server-Side Coupon & GSTIN Validation
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
          const dbCoupon = await Coupon.findOne({
            code: cleanCode,
            isActive: true,
          });

          if (dbCoupon && !dbCoupon.isActive) {
            couponError = 'Invalid coupon code.';
          } else {
            gstinValidation = validateGSTIN(gstin);

            if (!gstin || typeof gstin !== 'string' || gstin.trim().length === 0) {
              couponError = 'GSTIN is required to apply this coupon.';
            } else if (!gstinValidation.isValid) {
              couponError = 'Please enter a valid GSTIN.';
            } else {
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

    // 7. Calculate GST Tax
    // Precedence: Existing DB HotelSetting -> process.env.TAX_PERCENTAGE (if valid number) -> default 5%
    const settings = await HotelSetting.findOne();
    let taxPercentage: number;

    if (settings && typeof settings.taxPercentage === 'number' && !isNaN(settings.taxPercentage) && settings.taxPercentage >= 0) {
      taxPercentage = settings.taxPercentage;
    } else if (process.env.TAX_PERCENTAGE !== undefined && process.env.TAX_PERCENTAGE.trim() !== '') {
      const parsedEnvTax = Number(process.env.TAX_PERCENTAGE);
      taxPercentage = (!isNaN(parsedEnvTax) && parsedEnvTax >= 0) ? parsedEnvTax : 5;
    } else {
      taxPercentage = 5;
    }

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
      nightlyRates,
    };
  }
}
