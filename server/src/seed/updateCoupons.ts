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

    // 2. Safely ensure baseline coupons exist
    const now = new Date(2020, 0, 1);
    const nextYears = new Date(new Date().getFullYear() + 5, 11, 31);

    const baselineCoupons = [
      { code: 'WELCOME10', discountValue: 10, isActive: false },
      { code: 'PREMIUM15', discountValue: 15, isActive: true },
      { code: 'GRAND20', discountValue: 20, isActive: true },
      { code: 'MEGA25', discountValue: 25, isActive: true },
      { code: 'PLATINUM30', discountValue: 30, isActive: true },
    ];

    for (const coup of baselineCoupons) {
      const existing = await Coupon.findOne({ code: coup.code });
      if (!existing) {
        await Coupon.create({
          code: coup.code,
          discountType: 'PERCENTAGE',
          discountValue: coup.discountValue,
          minBookingAmount: 0,
          startDate: now,
          endDate: nextYears,
          maxUsage: 100000,
          usedCount: 0,
          isActive: coup.isActive,
        });
        console.log(`[Coupons] Created baseline coupon ${coup.code} (${coup.discountValue}%, active: ${coup.isActive}).`);
      } else {
        console.log(`[Coupons] Preserved existing coupon ${coup.code} (${existing.discountValue}%, active: ${existing.isActive}).`);
      }
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
