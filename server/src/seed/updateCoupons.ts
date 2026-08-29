import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Coupon } from '../models/Coupon';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_raama';

async function updateCoupons() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[MongoDB] Connected successfully.');

    // Delete all existing coupons
    const deleteRes = await Coupon.deleteMany({});
    console.log(`[Coupons] Deleted ${deleteRes.deletedCount} old coupons.`);

    // Insert only RAAMA5
    const now = new Date();
    const nextYear = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

    const newCoupon = await Coupon.create({
      code: 'RAAMA5',
      discountType: 'PERCENTAGE',
      discountValue: 5,
      minBookingAmount: 0,
      startDate: new Date(2020, 0, 1),
      endDate: nextYear,
      maxUsage: 10000,
      usedCount: 0,
      isActive: true,
    });

    console.log('[Coupons] Successfully created RAAMA5 coupon:', newCoupon);

    const allCoupons = await Coupon.find();
    console.log('[Coupons] Current active coupons in DB:', allCoupons.map((c) => ({ code: c.code, discountValue: c.discountValue, discountType: c.discountType })));

    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('[Error] Failed to update coupons:', err);
    process.exit(1);
  }
}

updateCoupons();
