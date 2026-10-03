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

    // 2. Delete all existing old coupons (RAAMA5, HotelRaama5, etc.)
    const deleteRes = await Coupon.deleteMany({});
    console.log(`[Coupons] Deleted ${deleteRes.deletedCount} old coupons.`);

    // 3. Insert official active coupons: WELCOME10 (10%) and WELCOME15 (15%)
    const now = new Date(2020, 0, 1);
    const nextYears = new Date(new Date().getFullYear() + 5, 11, 31);

    const coupon10 = await Coupon.create({
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minBookingAmount: 0,
      startDate: now,
      endDate: nextYears,
      maxUsage: 100000,
      usedCount: 0,
      isActive: true,
    });

    const coupon15 = await Coupon.create({
      code: 'WELCOME15',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minBookingAmount: 0,
      startDate: now,
      endDate: nextYears,
      maxUsage: 100000,
      usedCount: 0,
      isActive: true,
    });

    console.log('[Coupons] Successfully created WELCOME10 (10%):', coupon10.code);
    console.log('[Coupons] Successfully created WELCOME15 (15%):', coupon15.code);

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
