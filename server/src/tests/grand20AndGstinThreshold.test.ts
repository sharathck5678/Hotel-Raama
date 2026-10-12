import mongoose from 'mongoose';
import dotenv from 'dotenv';
import assert from 'assert';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { Coupon } from '../models/Coupon';
import { PricingEngine, OFFICIAL_COUPONS } from '../services/PricingEngine';
import { validateGSTIN } from '../utils/gstinValidator';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

async function runGrand20AndGstinThresholdTests() {
  console.log('================================================================');
  console.log('HOTEL RAAMA — COUPON RULES & WELCOME10 DEACTIVATION TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const initialHistoricalCount = await Booking.countDocuments();

  try {
    const testRoomType = (await RoomType.findOne({ code: 'EXEC_DBL_AC' })) || (await RoomType.findOne());
    if (!testRoomType) throw new Error('No RoomType found for testing');

    const checkIn = new Date('2026-12-10T00:00:00.000Z');
    const checkOut = new Date('2026-12-11T00:00:00.000Z');
    const validGstin = '22AAAAA0000A1Z5';
    const invalidFormatGstin = 'INVALID123';
    const invalidChecksumGstin = '29ABCDE1234F1Z0';

    // 1. Authoritative active coupon set (exactly 4 active codes: PREMIUM15, GRAND20, MEGA25, PLATINUM30)
    console.log('[SECTION 1] Active Coupon Codes Verification (WELCOME10 Disabled)');
    const activeCouponsInEngine = Object.keys(OFFICIAL_COUPONS).sort();
    const expectedActiveCoupons = ['GRAND20', 'MEGA25', 'PLATINUM30', 'PREMIUM15'].sort();
    assert.deepStrictEqual(
      activeCouponsInEngine,
      expectedActiveCoupons,
      'OFFICIAL_COUPONS must contain exactly 4 active coupons (PREMIUM15, GRAND20, MEGA25, PLATINUM30)'
    );
    assert.strictEqual(OFFICIAL_COUPONS.PREMIUM15, 15);
    assert.strictEqual(OFFICIAL_COUPONS.GRAND20, 20);
    assert.strictEqual(OFFICIAL_COUPONS.MEGA25, 25);
    assert.strictEqual(OFFICIAL_COUPONS.PLATINUM30, 30);
    assert.strictEqual((OFFICIAL_COUPONS as any).WELCOME10, undefined, 'WELCOME10 must NOT be in OFFICIAL_COUPONS');
    console.log('✓ Exactly 4 active coupons exist with exact discount percentages (WELCOME10 removed).');

    // DB coupons check: exactly 4 active in database
    const dbActiveCoupons = await Coupon.find({ isActive: true }).select('code discountValue').lean();
    const dbActiveCodes = dbActiveCoupons.map((c) => c.code).sort();
    assert.deepStrictEqual(dbActiveCodes, expectedActiveCoupons, 'DB active coupons must match exactly 4 active codes');
    console.log('✓ Database active coupons match exactly the 4 active codes.');

    // Both WELCOME10 and WELCOME15 must be inactive in DB
    const welcome10Doc = await Coupon.findOne({ code: 'WELCOME10' });
    if (welcome10Doc) {
      assert.strictEqual(welcome10Doc.isActive, false, 'WELCOME10 must be inactive in DB');
      console.log('✓ WELCOME10 exists in DB but is strictly inactive (isActive: false).');
    }

    const welcome15Doc = await Coupon.findOne({ code: 'WELCOME15' });
    if (welcome15Doc) {
      assert.strictEqual(welcome15Doc.isActive, false, 'WELCOME15 must be inactive in DB');
      console.log('✓ WELCOME15 exists in DB but is strictly inactive (isActive: false).');
    }

    // 2. WELCOME10 is strictly rejected across all permutations
    console.log('\n[SECTION 2] WELCOME10 Deactivation Enforcement');
    const w10WithoutGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'WELCOME10',
      'NON_CP',
      false,
      undefined
    );
    assert.strictEqual(w10WithoutGstin.couponCode, undefined);
    assert.strictEqual(w10WithoutGstin.discountAmount, 0);
    assert.strictEqual(w10WithoutGstin.couponError, 'Invalid coupon code.');
    console.log('✓ WELCOME10 without GSTIN is rejected with "Invalid coupon code."');

    const w10WithGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'WELCOME10',
      'NON_CP',
      false,
      validGstin
    );
    assert.strictEqual(w10WithGstin.couponCode, undefined);
    assert.strictEqual(w10WithGstin.discountAmount, 0);
    assert.strictEqual(w10WithGstin.couponError, 'Invalid coupon code.');
    console.log('✓ WELCOME10 with valid GSTIN is still strictly rejected with "Invalid coupon code."');

    // 3. PREMIUM15 (<= 15%): No GSTIN Required
    console.log('\n[SECTION 3] PREMIUM15 (<= 15%): GSTIN Optional');
    const p15NoGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'PREMIUM15',
      'NON_CP',
      false,
      undefined
    );
    assert.strictEqual(p15NoGstin.couponCode, 'PREMIUM15');
    assert.strictEqual(p15NoGstin.discountPercentage, 15);
    assert.strictEqual(p15NoGstin.discountAmount, Math.round((p15NoGstin.subtotal * 15) / 100));
    assert.strictEqual(p15NoGstin.couponError, undefined);
    console.log('✓ PREMIUM15 (15%) applies 15% discount without GSTIN.');

    const p15WithGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'PREMIUM15',
      'NON_CP',
      false,
      validGstin
    );
    assert.strictEqual(p15WithGstin.couponCode, 'PREMIUM15');
    assert.strictEqual(p15WithGstin.discountPercentage, 15);
    assert.strictEqual(p15WithGstin.gstin, validGstin);
    assert.strictEqual(p15WithGstin.gstinValid, true);
    console.log('✓ PREMIUM15 applies 15% discount and retains valid GSTIN.');

    const p15InvalidGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'PREMIUM15',
      'NON_CP',
      false,
      invalidFormatGstin
    );
    assert.strictEqual(p15InvalidGstin.couponCode, undefined);
    assert.strictEqual(p15InvalidGstin.discountAmount, 0);
    assert.strictEqual(p15InvalidGstin.couponError, 'Please enter a valid GSTIN.');
    console.log('✓ PREMIUM15 with invalid GSTIN rejects invalid GSTIN.');

    // 4. Coupons > 15% (GRAND20, MEGA25, PLATINUM30): Valid GSTIN strictly required
    console.log('\n[SECTION 4] High-Discount Coupons (> 15%): Valid GSTIN Strictly Required');

    // GRAND20 without GSTIN
    const g20NoGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'GRAND20',
      'NON_CP',
      false,
      undefined
    );
    assert.strictEqual(g20NoGstin.couponCode, undefined);
    assert.strictEqual(g20NoGstin.discountAmount, 0);
    assert.strictEqual(g20NoGstin.couponError, 'GSTIN is required to apply this coupon.');
    console.log('✓ GRAND20 without GSTIN is strictly rejected.');

    // GRAND20 with invalid format GSTIN
    const g20InvalidGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'GRAND20',
      'NON_CP',
      false,
      invalidFormatGstin
    );
    assert.strictEqual(g20InvalidGstin.couponCode, undefined);
    assert.strictEqual(g20InvalidGstin.discountAmount, 0);
    assert.strictEqual(g20InvalidGstin.couponError, 'Please enter a valid GSTIN.');
    console.log('✓ GRAND20 with invalid format GSTIN is rejected.');

    // GRAND20 with invalid checksum GSTIN
    const g20BadChecksum = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'GRAND20',
      'NON_CP',
      false,
      invalidChecksumGstin
    );
    assert.strictEqual(g20BadChecksum.couponCode, undefined);
    assert.strictEqual(g20BadChecksum.discountAmount, 0);
    assert.strictEqual(g20BadChecksum.couponError, 'Please enter a valid GSTIN.');
    console.log('✓ GRAND20 with invalid checksum GSTIN is rejected.');

    // GRAND20 with valid GSTIN
    const g20ValidGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'GRAND20',
      'NON_CP',
      false,
      validGstin
    );
    assert.strictEqual(g20ValidGstin.couponCode, 'GRAND20');
    assert.strictEqual(g20ValidGstin.discountPercentage, 20);
    assert.strictEqual(g20ValidGstin.discountAmount, Math.round((g20ValidGstin.subtotal * 20) / 100));
    assert.strictEqual(g20ValidGstin.gstin, validGstin);
    assert.strictEqual(g20ValidGstin.gstinValid, true);
    console.log('✓ GRAND20 with valid GSTIN applies exact 20% discount.');

    // MEGA25 without GSTIN
    const m25NoGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'MEGA25',
      'NON_CP',
      false,
      ''
    );
    assert.strictEqual(m25NoGstin.couponCode, undefined);
    assert.strictEqual(m25NoGstin.discountAmount, 0);
    assert.strictEqual(m25NoGstin.couponError, 'GSTIN is required to apply this coupon.');
    console.log('✓ MEGA25 without GSTIN is strictly rejected.');

    // MEGA25 with valid GSTIN
    const m25ValidGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'MEGA25',
      'NON_CP',
      false,
      validGstin
    );
    assert.strictEqual(m25ValidGstin.couponCode, 'MEGA25');
    assert.strictEqual(m25ValidGstin.discountPercentage, 25);
    console.log('✓ MEGA25 with valid GSTIN applies exact 25% discount.');

    // PLATINUM30 without GSTIN
    const p30NoGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'PLATINUM30',
      'NON_CP',
      false,
      ''
    );
    assert.strictEqual(p30NoGstin.couponCode, undefined);
    assert.strictEqual(p30NoGstin.discountAmount, 0);
    assert.strictEqual(p30NoGstin.couponError, 'GSTIN is required to apply this coupon.');
    console.log('✓ PLATINUM30 without GSTIN is strictly rejected.');

    // PLATINUM30 with valid GSTIN
    const p30ValidGstin = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      'PLATINUM30',
      'NON_CP',
      false,
      validGstin
    );
    assert.strictEqual(p30ValidGstin.couponCode, 'PLATINUM30');
    assert.strictEqual(p30ValidGstin.discountPercentage, 30);
    console.log('✓ PLATINUM30 with valid GSTIN applies exact 30% discount.');

    // 5. Normalization & Case-Insensitivity
    console.log('\n[SECTION 5] Normalization & Case-Insensitivity');
    const g20Normalized = await PricingEngine.calculateBookingPrice(
      testRoomType._id.toString(),
      checkIn,
      checkOut,
      2,
      undefined,
      '   grand20   ',
      'NON_CP',
      false,
      `  ${validGstin.toLowerCase()}  `
    );
    assert.strictEqual(g20Normalized.couponCode, 'GRAND20');
    assert.strictEqual(g20Normalized.discountPercentage, 20);
    assert.strictEqual(g20Normalized.gstin, validGstin);
    console.log('✓ Case-insensitivity and whitespace trimming succeed for GRAND20 and GSTIN.');

    // 6. Pricing & 5% GST Math Verification
    console.log('\n[SECTION 6] Pricing & 5% GST Math Verification');
    const subtotal = g20ValidGstin.subtotal;
    const discount = Math.round((subtotal * 20) / 100);
    const taxable = subtotal - discount;
    const gst = Math.round((taxable * 5) / 100);
    const expectedTotal = taxable + gst;
    assert.strictEqual(g20ValidGstin.discountAmount, discount);
    assert.strictEqual(g20ValidGstin.taxPercentage, 5);
    assert.strictEqual(g20ValidGstin.taxAmount, gst);
    assert.strictEqual(g20ValidGstin.totalAmount, expectedTotal);
    console.log(
      `✓ GRAND20 20% math verified: Subtotal ₹${subtotal} - Discount ₹${discount} + 5% GST ₹${gst} = Total ₹${expectedTotal}.`
    );

    // Verify historical bookings count
    const postHistoricalCount = await Booking.countDocuments();
    assert.strictEqual(postHistoricalCount, initialHistoricalCount, 'Historical bookings count must be preserved.');
    console.log('✓ Historical bookings count preserved intact.');

    console.log('\n================================================================');
    console.log('ALL COUPON RULES & WELCOME10 DEACTIVATION TESTS PASSED! (100%)');
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runGrand20AndGstinThresholdTests();
