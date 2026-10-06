import { RatePlan, IRatePlan } from '../models/RatePlan';

export class RatePlanService {
  /**
   * Ensures default rate plans (Room Only & Breakfast Included) exist in DB
   */
  static async ensureDefaultRatePlans() {
    const defaultPlans = [
      {
        name: 'Room Only',
        code: 'ROOM_ONLY',
        description: 'Standard room stay without meal plan (EP Plan)',
        isDefault: true,
        isActive: true,
      },
      {
        name: 'Breakfast Included',
        code: 'BREAKFAST_INCLUDED',
        description: 'Room stay including daily buffet breakfast at Swaad restaurant (CP Plan)',
        isDefault: false,
        isActive: true,
      },
    ];

    for (const plan of defaultPlans) {
      await RatePlan.findOneAndUpdate(
        { code: plan.code },
        { $setOnInsert: plan },
        { upsert: true, new: true }
      );
    }

    return RatePlan.find({ isActive: true }).sort({ isDefault: -1, name: 1 });
  }

  static async getActiveRatePlans() {
    let plans = await RatePlan.find({ isActive: true }).sort({ isDefault: -1, name: 1 });
    if (plans.length === 0) {
      plans = await this.ensureDefaultRatePlans();
    }
    return plans;
  }
}
