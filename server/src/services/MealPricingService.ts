import { MealPlan, MealType } from '../models/MealPlan';
import { DailyMealPrice, IDailyMealPrice } from '../models/DailyMealPrice';
import { AvailabilityEngine } from './AvailabilityEngine';

export interface IBaseMealPrices {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface IEffectiveMealRateSummary {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  totalPerGuest: number;
  effectivePrice: number;
  isVariable: boolean;
  hasOverride: boolean;
}

export interface INightlyMealRate {
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  isOverridden: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
}

export interface IEffectiveMealPricesResult {
  stayDates: string[];
  numNights: number;
  basePrices: IBaseMealPrices;
  breakfast: IEffectiveMealRateSummary;
  lunch: IEffectiveMealRateSummary;
  dinner: IEffectiveMealRateSummary;
  nightlyBreakdown: INightlyMealRate[];
}

export const DEFAULT_BASE_MEAL_PRICES: IBaseMealPrices = {
  breakfast: 150,
  lunch: 250,
  dinner: 300,
};

export class MealPricingService {
  /**
   * Fetch permanent base meal prices. Falls back to defaults (150, 250, 300) if not configured.
   */
  static async getBasePrices(): Promise<IBaseMealPrices> {
    const plans = await MealPlan.find({ isActive: true }).lean();
    const result: IBaseMealPrices = { ...DEFAULT_BASE_MEAL_PRICES };

    for (const p of plans) {
      if (p.type === 'BREAKFAST' && typeof p.pricePerPersonPerNight === 'number') {
        result.breakfast = p.pricePerPersonPerNight;
      } else if (p.type === 'LUNCH' && typeof p.pricePerPersonPerNight === 'number') {
        result.lunch = p.pricePerPersonPerNight;
      } else if (p.type === 'DINNER' && typeof p.pricePerPersonPerNight === 'number') {
        result.dinner = p.pricePerPersonPerNight;
      }
    }

    return result;
  }

  /**
   * Updates permanent base meal prices in the database.
   */
  static async updateBasePrices(
    prices: { breakfast?: number; lunch?: number; dinner?: number },
    adminEmail: string = 'admin'
  ): Promise<IBaseMealPrices> {
    const current = await this.getBasePrices();
    const mealDefinitions: Array<{ type: MealType; name: string; key: keyof IBaseMealPrices; defaultPrice: number }> = [
      { type: 'BREAKFAST', name: 'Buffet Breakfast', key: 'breakfast', defaultPrice: DEFAULT_BASE_MEAL_PRICES.breakfast },
      { type: 'LUNCH', name: 'Executive Lunch', key: 'lunch', defaultPrice: DEFAULT_BASE_MEAL_PRICES.lunch },
      { type: 'DINNER', name: 'Royal Dinner', key: 'dinner', defaultPrice: DEFAULT_BASE_MEAL_PRICES.dinner },
    ];

    for (const def of mealDefinitions) {
      const val = prices[def.key];
      if (val !== undefined) {
        const numVal = Number(val);
        if (typeof val === 'boolean' || val === null || isNaN(numVal) || !isFinite(numVal) || numVal < 0) {
          throw new Error(`Invalid price for ${def.key}. Must be a valid non-negative number.`);
        }
        const rounded = Math.round(numVal);
        await MealPlan.findOneAndUpdate(
          { type: def.type },
          {
            $set: {
              name: def.name,
              type: def.type,
              pricePerPersonPerNight: rounded,
              isActive: true,
            },
          },
          { upsert: true, new: true }
        );
        current[def.key] = rounded;
      }
    }

    return current;
  }

  /**
   * Fetches date-wise price overrides for a date range (or all overrides).
   */
  static async getDateWiseOverrides(startDate?: string, endDate?: string): Promise<any[]> {
    const filter: any = {};
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.date = { $gte: startDate };
    } else if (endDate) {
      filter.date = { $lte: endDate };
    }
    return DailyMealPrice.find(filter).sort({ date: 1 }).lean();
  }

  /**
   * Bulk updates date-wise prices across an inclusive date range [startDate, endDate].
   * Overwrites overlapping dates with the latest values, leaving other dates untouched.
   */
  static async bulkUpdateDateWisePrices(params: {
    startDate: string;
    endDate: string;
    breakfastPrice?: number;
    lunchPrice?: number;
    dinnerPrice?: number;
    adminEmail?: string;
  }): Promise<{ updatedCount: number; dates: string[] }> {
    const { startDate, endDate, breakfastPrice, lunchPrice, dinnerPrice, adminEmail } = params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error('Dates must be in YYYY-MM-DD format.');
    }

    if (endDate < startDate) {
      throw new Error('End date must be on or after start date.');
    }

    if (breakfastPrice === undefined && lunchPrice === undefined && dinnerPrice === undefined) {
      throw new Error('At least one meal price (breakfast, lunch, or dinner) must be specified.');
    }

    const setFields: any = {
      updatedBy: adminEmail || 'admin',
    };

    if (breakfastPrice !== undefined) {
      const b = Number(breakfastPrice);
      if (typeof breakfastPrice === 'boolean' || isNaN(b) || !isFinite(b) || b < 0) {
        throw new Error('Breakfast price must be a valid non-negative number.');
      }
      setFields.breakfastPrice = Math.round(b);
    }

    if (lunchPrice !== undefined) {
      const l = Number(lunchPrice);
      if (typeof lunchPrice === 'boolean' || isNaN(l) || !isFinite(l) || l < 0) {
        throw new Error('Lunch price must be a valid non-negative number.');
      }
      setFields.lunchPrice = Math.round(l);
    }

    if (dinnerPrice !== undefined) {
      const d = Number(dinnerPrice);
      if (typeof dinnerPrice === 'boolean' || isNaN(d) || !isFinite(d) || d < 0) {
        throw new Error('Dinner price must be a valid non-negative number.');
      }
      setFields.dinnerPrice = Math.round(d);
    }

    const dateStrings = AvailabilityEngine.getDateRangeStrings(startDate, endDate);

    const bulkOps = dateStrings.map((dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateVal = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

      return {
        updateOne: {
          filter: { date: dateStr },
          update: {
            $set: {
              ...setFields,
              dateValue: dateVal,
            },
            $setOnInsert: {
              createdBy: adminEmail || 'admin',
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      await DailyMealPrice.bulkWrite(bulkOps);
    }

    return { updatedCount: bulkOps.length, dates: dateStrings };
  }

  /**
   * Deletes a date-specific override, naturally reverting that date back to base prices.
   */
  static async deleteDateWiseOverride(date: string): Promise<boolean> {
    const res = await DailyMealPrice.deleteOne({ date });
    return res.deletedCount > 0;
  }

  /**
   * Resolves effective meal prices for each date in a stay.
   * Priority:
   * 1. Date-specific meal price override, if one exists for that meal.
   * 2. Otherwise, permanent base meal price.
   */
  static async getEffectiveMealPrices(
    checkIn: Date | string,
    checkOut?: Date | string
  ): Promise<IEffectiveMealPricesResult> {
    const cIn = new Date(checkIn);
    let stayDates: string[];

    if (checkOut) {
      const cOut = new Date(checkOut);
      stayDates = AvailabilityEngine.getStayDateStrings(cIn, cOut);
    } else {
      stayDates = [];
    }

    // Single-day fallback if checkOut wasn't provided or same day
    if (stayDates.length === 0) {
      stayDates = [AvailabilityEngine.formatDateStr(cIn)];
    }

    const numNights = Math.max(1, stayDates.length);
    const basePrices = await this.getBasePrices();
    const overrides = await DailyMealPrice.find({ date: { $in: stayDates } }).lean();
    const overrideMap = new Map<string, any>(overrides.map((o) => [o.date, o]));

    const nightlyBreakdown: INightlyMealRate[] = [];
    const bPrices: number[] = [];
    const lPrices: number[] = [];
    const dPrices: number[] = [];

    let hasBOverride = false;
    let hasLOverride = false;
    let hasDOverride = false;

    for (const dateStr of stayDates) {
      const ov = overrideMap.get(dateStr);

      const isBOverridden = ov && ov.breakfastPrice !== undefined && ov.breakfastPrice !== null;
      const bPrice = isBOverridden ? ov.breakfastPrice : basePrices.breakfast;
      if (isBOverridden) hasBOverride = true;

      const isLOverridden = ov && ov.lunchPrice !== undefined && ov.lunchPrice !== null;
      const lPrice = isLOverridden ? ov.lunchPrice : basePrices.lunch;
      if (isLOverridden) hasLOverride = true;

      const isDOverridden = ov && ov.dinnerPrice !== undefined && ov.dinnerPrice !== null;
      const dPrice = isDOverridden ? ov.dinnerPrice : basePrices.dinner;
      if (isDOverridden) hasDOverride = true;

      nightlyBreakdown.push({
        date: dateStr,
        breakfast: bPrice,
        lunch: lPrice,
        dinner: dPrice,
        isOverridden: {
          breakfast: isBOverridden,
          lunch: isLOverridden,
          dinner: isDOverridden,
        },
      });

      bPrices.push(bPrice);
      lPrices.push(lPrice);
      dPrices.push(dPrice);
    }

    const summarize = (prices: number[], hasOv: boolean): IEffectiveMealRateSummary => {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const totalPerGuest = prices.reduce((sum, p) => sum + p, 0);
      const avgPrice = Math.round(totalPerGuest / prices.length);
      const isVariable = minPrice !== maxPrice;
      const effectivePrice = isVariable ? avgPrice : minPrice;

      return {
        minPrice,
        maxPrice,
        avgPrice,
        totalPerGuest,
        effectivePrice,
        isVariable,
        hasOverride: hasOv,
      };
    };

    return {
      stayDates,
      numNights,
      basePrices,
      breakfast: summarize(bPrices, hasBOverride),
      lunch: summarize(lPrices, hasLOverride),
      dinner: summarize(dPrices, hasDOverride),
      nightlyBreakdown,
    };
  }
}
