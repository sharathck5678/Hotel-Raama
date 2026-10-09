import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Coupon } from '../models/Coupon';
import { HotelSetting } from '../models/HotelSetting';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_raama';

async function updateCouponsAndGst() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[MongoDB] Connected successfully.');

    // 1. Update HotelSetting tax rate to 5% GST
    const settingResult = await HotelSetting.updateMany({}, { $set: { taxPercentage: 5 } });
    console.log(`[HotelSetting] Updated tax percentage to 5% GST:`, settingResult);

    // 2. Safely deactivate obsolete coupons including WELCOME15
    await Coupon.updateMany(
      { code: { $nin: ['WELCOME10', 'PREMIUM15', 'MEGA25', 'PLATINUM30'] } },
      { $set: { isActive: false } }
    );

    // 3. Upsert official active coupons: WELCOME10 (10%), PREMIUM15 (15%), MEGA25 (25%), PLATINUM30 (30%)
    const now = new Date(2020, 0, 1);
    const nextYears = new Date(new Date().getFullYear() + 5, 11, 31);

    const activeList = [
      { code: 'WELCOME10', discountValue: 10 },
      { code: 'PREMIUM15', discountValue: 15 },
      { code: 'MEGA25', discountValue: 25 },
      { code: 'PLATINUM30', discountValue: 30 },
    ];

    for (const coup of activeList) {
      await Coupon.findOneAndUpdate(
        { code: coup.code },
        {
          code: coup.code,
          discountType: 'PERCENTAGE',
          discountValue: coup.discountValue,
          minBookingAmount: 0,
          startDate: now,
          endDate: nextYears,
          maxUsage: 100000,
          usedCount: 0,
          isActive: true,
        },
        { upsert: true, new: true }
      );
      console.log(`[Coupons] Verified active coupon ${coup.code} (${coup.discountValue}%).`);
    }

    const allCoupons = await Coupon.find();
    console.log(
      '[Coupons] Current active coupons in DB:',
      allCoupons.map((c) => ({ code: c.code, discountValue: c.discountValue, discountType: c.discountType, isActive: c.isActive }))
    );

    const settings = await HotelSetting.find();
    console.log('[HotelSetting] Current tax percentage in DB:', settings.map((s) => s.taxPercentage));

    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('[Error] Failed to update coupons and GST:', err);
    process.exit(1);
  }
}

updateCouponsAndGst();
