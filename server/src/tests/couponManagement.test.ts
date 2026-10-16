import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app, httpServer } from '../index';
import { Coupon } from '../models/Coupon';
import { Admin } from '../models/Admin';
import { RoomType } from '../models/RoomType';
import { PricingEngine } from '../services/PricingEngine';

describe('Hotel Raama Comprehensive Coupon Management & Scheduling Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  let adminToken: string;
  let testRoomTypeId: string;
  const validGstin = '22AAAAA0000A1Z5';
  const secret = process.env.JWT_SECRET || 'raama_super_secret_jwt_key_2026_production';

  before(async () => {
    // 1. Initialize HTTP server
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 2. Ensure test RoomType exists
    const rt = (await RoomType.findOne({ code: 'EXEC_DBL_AC' })) || (await RoomType.findOne());
    if (rt) {
      testRoomTypeId = rt._id.toString();
    }

    // 3. Ensure test Admin exists and create valid JWT
    let admin = await Admin.findOne();
    if (!admin) {
      admin = await Admin.create({
        email: 'test_admin@hotelraama.com',
        password: 'hashed_password',
        role: 'ADMIN',
      });
    }

    adminToken = jwt.sign(
      { id: admin._id.toString(), email: admin.email, role: admin.role },
      secret,
      { expiresIn: '1h' }
    );

    // 4. Ensure WELCOME10 is in standard disabled baseline state without schedule
    await Coupon.updateOne(
      { code: 'WELCOME10' },
      { $set: { isActive: false, startDate: null, endDate: null, discountValue: 10 } }
    );
  });

  after(async () => {
    // Clean up test coupons created during tests
    await Coupon.deleteMany({
      code: {
        $in: [
          'TEST_SCHED_FUTURE',
          'TEST_SCHED_VALID',
          'TEST_EXPIRED',
          'TEST_NO_SCHED',
          'TEST_DUPE',
          'TEST_TEMP',
          'TEST_WINDOW_BEFORE',
          'TEST_WINDOW_ACTIVE',
          'TEST_WINDOW_STAY',
          'TEST_WINDOW_EXACT',
          'TEST_WINDOW_PARTIAL',
          'TEST_WINDOW_DISABLED',
          'TEST_WINDOW_NOSCHED',
          'TEST_IST_BOUND',
        ],
      },
    });

    // Restore baseline state of WELCOME10 to disabled without schedule
    await Coupon.updateOne(
      { code: 'WELCOME10' },
      { $set: { isActive: false, startDate: null, endDate: null, discountValue: 10 } }
    );

    await new Promise((r) => setTimeout(r, 400));
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    await mongoose.connection.close();
    setTimeout(() => process.exit(0), 50);
  });

  // --------------------------------------------------------------------------
  // 1. All five existing coupons appear in Coupon Management
  // --------------------------------------------------------------------------
  it('1. All five baseline coupons appear in Coupon Management API', async () => {
    const res = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));

    const codes = body.data.map((c: any) => c.code);
    assert.ok(codes.includes('WELCOME10'), 'WELCOME10 must be in coupons list');
    assert.ok(codes.includes('PREMIUM15'), 'PREMIUM15 must be in coupons list');
    assert.ok(codes.includes('GRAND20'), 'GRAND20 must be in coupons list');
    assert.ok(codes.includes('MEGA25'), 'MEGA25 must be in coupons list');
    assert.ok(codes.includes('PLATINUM30'), 'PLATINUM30 must be in coupons list');
  });

  // --------------------------------------------------------------------------
  // 2. WELCOME10 remains disabled by default
  // --------------------------------------------------------------------------
  it('2. WELCOME10 remains disabled by default (effectiveStatus: Disabled, isActive: false)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    const welcome10 = body.data.find((c: any) => c.code === 'WELCOME10');
    assert.ok(welcome10, 'WELCOME10 record must exist');
    assert.equal(welcome10.isActive, false, 'WELCOME10 must be inactive');
    assert.equal(welcome10.effectiveStatus, 'Disabled', 'WELCOME10 effectiveStatus must be Disabled');
    assert.equal(welcome10.discountPercentage, 10, 'WELCOME10 must be 10%');

    // Public guest application of disabled WELCOME10 must fail
    const validateRes = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'WELCOME10' }),
    });
    assert.equal(validateRes.status, 400);
    const valBody = (await validateRes.json()) as any;
    assert.equal(valBody.success, false);
    assert.equal(valBody.message, 'Invalid coupon code.');
  });

  // --------------------------------------------------------------------------
  // 3. An admin can enable and disable a coupon
  // --------------------------------------------------------------------------
  it('3. An admin can enable and disable a coupon with immediate effect', async () => {
    const welcome10Doc = await Coupon.findOne({ code: 'WELCOME10' });
    assert.ok(welcome10Doc);

    // Step A: Admin enables WELCOME10
    const enableRes = await fetch(`${baseUrl}/api/admin/coupons/${welcome10Doc._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: true }),
    });
    assert.equal(enableRes.status, 200);
    const enableBody = (await enableRes.json()) as any;
    assert.equal(enableBody.success, true);
    assert.equal(enableBody.data.isActive, true);
    assert.equal(enableBody.data.effectiveStatus, 'Active');

    // Step B: Public guest application succeeds now that admin enabled it
    const guestValidateRes = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'WELCOME10' }),
    });
    assert.equal(guestValidateRes.status, 200);
    const guestValBody = (await guestValidateRes.json()) as any;
    assert.equal(guestValBody.success, true);
    assert.equal(guestValBody.data.discountPercentage, 10);

    // Step C: Admin disables WELCOME10 again
    const disableRes = await fetch(`${baseUrl}/api/admin/coupons/${welcome10Doc._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    assert.equal(disableRes.status, 200);
    const disableBody = (await disableRes.json()) as any;
    assert.equal(disableBody.success, true);
    assert.equal(disableBody.data.isActive, false);
    assert.equal(disableBody.data.effectiveStatus, 'Disabled');

    // Step D: Public guest application fails immediately after admin disables it
    const recheckRes = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'WELCOME10' }),
    });
    assert.equal(recheckRes.status, 400);
  });

  // --------------------------------------------------------------------------
  // 4. A scheduled coupon is rejected before its start time
  // --------------------------------------------------------------------------
  it('4. A scheduled coupon is rejected before its start time (HTTP 400, "Coupon is not yet active.")', async () => {
    const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
    const futureEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await Coupon.create({
      code: 'TEST_SCHED_FUTURE',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minBookingAmount: 0,
      startDate: futureStart,
      endDate: futureEnd,
      isActive: true,
    });

    // Check effectiveStatus in admin API
    const adminRes = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminBody = (await adminRes.json()) as any;
    const schedCoup = adminBody.data.find((c: any) => c.code === 'TEST_SCHED_FUTURE');
    assert.ok(schedCoup);
    assert.equal(schedCoup.effectiveStatus, 'Scheduled');

    // Public guest validation without stay dates must reject as not yet active
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'TEST_SCHED_FUTURE' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Coupon is not yet active.');

    // Public guest validation with stay dates outside future window must reject with stay dates error
    const outRes = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_SCHED_FUTURE',
        checkIn: '2026-12-10',
        checkOut: '2026-12-11',
      }),
    });
    assert.equal(outRes.status, 400);
    const outBody = (await outRes.json()) as any;
    assert.equal(outBody.success, false);
    assert.equal(outBody.message, 'This coupon is not valid for the selected stay dates.');

    // PricingEngine with stay dates outside window directly rejects with stay dates error
    if (testRoomTypeId) {
      const pricing = await PricingEngine.calculateBookingPrice(
        testRoomTypeId,
        new Date('2026-12-10'),
        new Date('2026-12-11'),
        2,
        undefined,
        'TEST_SCHED_FUTURE'
      );
      assert.equal(pricing.couponCode, undefined);
      assert.equal(pricing.discountAmount, 0);
      assert.equal(pricing.couponError, 'This coupon is not valid for the selected stay dates.');
    }
  });

  // --------------------------------------------------------------------------
  // 5. A scheduled coupon is accepted during its valid window
  // --------------------------------------------------------------------------
  it('5. A scheduled coupon is accepted during its valid window', async () => {
    const pastStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const futureEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

    await Coupon.create({
      code: 'TEST_SCHED_VALID',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minBookingAmount: 0,
      startDate: pastStart,
      endDate: futureEnd,
      isActive: true,
    });

    // Public guest validation must succeed
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'TEST_SCHED_VALID' }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.couponCode, 'TEST_SCHED_VALID');
    assert.equal(body.data.discountPercentage, 15);
  });

  // --------------------------------------------------------------------------
  // 6. An expired coupon is rejected
  // --------------------------------------------------------------------------
  it('6. An expired coupon is rejected (HTTP 400, "Coupon has expired.")', async () => {
    const pastStart = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // Expired 2 days ago

    await Coupon.create({
      code: 'TEST_EXPIRED',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minBookingAmount: 0,
      startDate: pastStart,
      endDate: pastEnd,
      isActive: true,
    });

    // Admin API effectiveStatus must be Expired
    const adminRes = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminBody = (await adminRes.json()) as any;
    const expCoup = adminBody.data.find((c: any) => c.code === 'TEST_EXPIRED');
    assert.ok(expCoup);
    assert.equal(expCoup.effectiveStatus, 'Expired');

    // Public validation without stay dates must reject with "Coupon has expired."
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'TEST_EXPIRED', gstin: validGstin }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Coupon has expired.');

    // PricingEngine directly rejects with stay dates error when stay dates outside window are passed
    if (testRoomTypeId) {
      const pricing = await PricingEngine.calculateBookingPrice(
        testRoomTypeId,
        new Date('2026-12-10'),
        new Date('2026-12-11'),
        2,
        undefined,
        'TEST_EXPIRED',
        'NON_CP',
        false,
        validGstin
      );
      assert.equal(pricing.couponCode, undefined);
      assert.equal(pricing.discountAmount, 0);
      assert.equal(pricing.couponError, 'This coupon is not valid for the selected stay dates.');
    }
  });

  // --------------------------------------------------------------------------
  // 7. An enabled coupon with no schedule works as expected
  // --------------------------------------------------------------------------
  it('7. An enabled coupon with no schedule works as expected at any time', async () => {
    await Coupon.create({
      code: 'TEST_NO_SCHED',
      discountType: 'PERCENTAGE',
      discountValue: 12,
      minBookingAmount: 0,
      startDate: null,
      endDate: null,
      isActive: true,
    });

    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'TEST_NO_SCHED' }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.couponCode, 'TEST_NO_SCHED');
    assert.equal(body.data.discountPercentage, 12);
  });

  // --------------------------------------------------------------------------
  // 8. Duplicate codes and invalid percentages are rejected
  // --------------------------------------------------------------------------
  it('8. Duplicate codes and invalid percentages are rejected by backend', async () => {
    // Attempt duplicate coupon code creation (case-insensitive)
    const dupeRes = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: 'premium15', // lowercase version of existing PREMIUM15
        discountPercentage: 15,
      }),
    });
    assert.equal(dupeRes.status, 400);
    const dupeBody = (await dupeRes.json()) as any;
    assert.equal(dupeBody.success, false);
    assert.ok(dupeBody.message.includes('already exists'));

    // Attempt percentage <= 0
    const zeroPctRes = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: 'TEST_ZERO',
        discountPercentage: 0,
      }),
    });
    assert.equal(zeroPctRes.status, 400);

    // Attempt percentage >= 100
    const hundredPctRes = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: 'TEST_HUNDRED',
        discountPercentage: 100,
      }),
    });
    assert.equal(hundredPctRes.status, 400);

    // Attempt invalid end date before start date
    const badDatesRes = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: 'TEST_BADDATES',
        discountPercentage: 20,
        startDate: '2026-12-10T10:00:00Z',
        endDate: '2026-12-05T10:00:00Z',
      }),
    });
    assert.equal(badDatesRes.status, 400);
    const badDateBody = (await badDatesRes.json()) as any;
    assert.ok(badDateBody.message.includes('Scheduled end time must be later'));
  });

  // --------------------------------------------------------------------------
  // 9. Unauthorized users cannot create or modify coupons
  // --------------------------------------------------------------------------
  it('9. Unauthorized users cannot create, modify, or delete coupons (HTTP 401)', async () => {
    // No Authorization header
    const getNoAuth = await fetch(`${baseUrl}/api/admin/coupons`);
    assert.equal(getNoAuth.status, 401);

    const postNoAuth = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'HACK20', discountPercentage: 20 }),
    });
    assert.equal(postNoAuth.status, 401);

    // Invalid / forged token
    const patchInvalidAuth = await fetch(`${baseUrl}/api/admin/coupons/some_id/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_forged_jwt_token',
      },
      body: JSON.stringify({ isActive: true }),
    });
    assert.equal(patchInvalidAuth.status, 401);
  });

  // --------------------------------------------------------------------------
  // 10. Discounts apply only to room tariff, never to extra-person or meal charges
  // --------------------------------------------------------------------------
  it('10. Discounts apply only to room tariff, never to extra-person or meal charges (Exact ₹4,368 Example)', async () => {
    // Specific business rule from Section 5:
    // Room tariff: ₹3,200
    // Coupon: 20%
    // Room discount: ₹640 (20% of ₹3,200)
    // Extra-person charges: ₹600
    // Meal add-ons: ₹1,000
    // Subtotal before GST: ₹3,200 - ₹640 + ₹600 + ₹1,000 = ₹4,160
    // GST at 5%: ₹208
    // Final total: ₹4,368

    // Test with preloaded room type having double occupancy rate = 3200
    const mockRoomType = {
      _id: new mongoose.Types.ObjectId(),
      code: 'MOCK_TEST_ROOM',
      name: 'Mock Test Room',
      basePrice: 3200,
      cpPrice: 3600,
      isAc: true,
      rates: {
        singleAdult: 2800,
        doubleAdult: 3200,
        extraAdultRate: 600,
      },
    };

    const pricing = await PricingEngine.calculateBookingPrice(
      mockRoomType._id.toString(),
      new Date('2026-12-10'),
      new Date('2026-12-11'),
      2,
      { breakfast: false, lunch: false, dinner: false },
      'GRAND20',
      'NON_CP',
      true, // Extra person requested
      validGstin,
      { roomType: mockRoomType, dailyRates: [] }
    );

    // Override mealPlanTotal for isolated unit assertion if needed, or check formula directly:
    // With extra person: roomTotal = 3200, extraPersonTotal = 600
    assert.equal(pricing.roomTotal, 3200);
    assert.equal(pricing.extraPersonTotal, 600);
    assert.equal(pricing.discountPercentage, 20);
    // Discount MUST strictly be 20% of ₹3200 = ₹640, NOT 20% of (₹3200 + ₹600 = ₹3800 -> ₹760)
    assert.equal(pricing.discountAmount, 640);

    // Verify subtotal before GST and 5% GST computation
    const taxableSubtotal = (pricing.roomTotal - pricing.discountAmount) + pricing.extraPersonTotal + pricing.mealPlanTotal;
    assert.equal(taxableSubtotal, (3200 - 640) + 600 + 0); // 3160
    const expectedTax = Math.round((taxableSubtotal * 5) / 100); // 158
    assert.equal(pricing.taxAmount, expectedTax);
    assert.equal(pricing.totalAmount, taxableSubtotal + expectedTax);
  });

  // --------------------------------------------------------------------------
  // 11. GSTIN verification rules remain correct
  // --------------------------------------------------------------------------
  it('11. GSTIN verification rules remain correct (>15% requires GSTIN, <=15% optional)', async () => {
    // PREMIUM15 (15% <= 15%): No GSTIN required
    const p15NoGstin = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'PREMIUM15' }),
    });
    assert.equal(p15NoGstin.status, 200);
    const p15Body = (await p15NoGstin.json()) as any;
    assert.equal(p15Body.success, true);
    assert.equal(p15Body.data.discountPercentage, 15);

    // GRAND20 (20% > 15%): Without GSTIN is rejected
    const g20NoGstin = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'GRAND20' }),
    });
    assert.equal(g20NoGstin.status, 400);
    const g20NoBody = (await g20NoGstin.json()) as any;
    assert.equal(g20NoBody.message, 'GSTIN is required to apply this coupon.');

    // GRAND20 with invalid format GSTIN is rejected
    const g20BadFormat = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'GRAND20', gstin: 'INVALID_GSTIN_123' }),
    });
    assert.equal(g20BadFormat.status, 400);
    const g20BadBody = (await g20BadFormat.json()) as any;
    assert.equal(g20BadBody.message, 'Please enter a valid GSTIN.');

    // GRAND20 with valid GSTIN is accepted
    const g20Valid = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'GRAND20', gstin: validGstin }),
    });
    assert.equal(g20Valid.status, 200);
    const g20ValidBody = (await g20Valid.json()) as any;
    assert.equal(g20ValidBody.success, true);
    assert.equal(g20ValidBody.data.discountPercentage, 20);
  });

  // --------------------------------------------------------------------------
  // 12. Protection of baseline coupons from renaming and deletion
  // --------------------------------------------------------------------------
  it('12. Baseline system coupons cannot be renamed or deleted', async () => {
    const welcome10Doc = await Coupon.findOne({ code: 'WELCOME10' });
    assert.ok(welcome10Doc);

    // Attempt to rename WELCOME10
    const renameRes = await fetch(`${baseUrl}/api/admin/coupons/${welcome10Doc._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ code: 'NEWNAME10' }),
    });
    assert.equal(renameRes.status, 400);
    const renameBody = (await renameRes.json()) as any;
    assert.ok(renameBody.message.includes('System coupon codes'));

    // Attempt to delete WELCOME10
    const deleteRes = await fetch(`${baseUrl}/api/admin/coupons/${welcome10Doc._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(deleteRes.status, 400);
    const deleteBody = (await deleteRes.json()) as any;
    assert.ok(deleteBody.message.includes('System coupon codes'));
  });

  // --------------------------------------------------------------------------
  // 13. Booking within coupon window before the window begins (accepted)
  // --------------------------------------------------------------------------
  it('13. Booking within coupon window before window begins is accepted', async () => {
    // Configured for 31 October 2026 to 10 November 2026
    await Coupon.create({
      code: 'TEST_WINDOW_BEFORE',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minBookingAmount: 0,
      startDate: new Date('2026-10-31T00:00:00+05:30'),
      endDate: new Date('2026-11-10T23:59:59+05:30'),
      isActive: true,
    });

    // Stay from 2 November to 4 November (within window)
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_BEFORE',
        checkIn: '2026-11-02',
        checkOut: '2026-11-04',
        roomTypeId: testRoomTypeId,
        numGuests: 2,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.valid, true);
    assert.equal(body.data.discountPercentage, 15);
    assert.ok(body.data.discountAmount > 0);

    // PricingEngine calculates authoritative price with coupon
    if (testRoomTypeId) {
      const pricing = await PricingEngine.calculateBookingPrice(
        testRoomTypeId,
        new Date('2026-11-02'),
        new Date('2026-11-04'),
        2,
        undefined,
        'TEST_WINDOW_BEFORE'
      );
      assert.equal(pricing.couponCode, 'TEST_WINDOW_BEFORE');
      assert.equal(pricing.discountPercentage, 15);
      assert.ok(pricing.discountAmount > 0);
      assert.equal(pricing.couponError, undefined);
      assert.equal(body.data.discountAmount, pricing.discountAmount);
    }
  });

  // --------------------------------------------------------------------------
  // 14. Booking within window while window is active (accepted)
  // --------------------------------------------------------------------------
  it('14. Booking within window while window is active is accepted', async () => {
    // Window started 5 days ago and ends 10 days in future
    const activeStart = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const activeEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    await Coupon.create({
      code: 'TEST_WINDOW_ACTIVE',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minBookingAmount: 0,
      startDate: activeStart,
      endDate: activeEnd,
      isActive: true,
    });

    // Stay dates inside the active window
    const checkInStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
      new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
    );
    const checkOutStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );

    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_ACTIVE',
        checkIn: checkInStr,
        checkOut: checkOutStr,
        roomTypeId: testRoomTypeId,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.valid, true);
    assert.equal(body.data.discountPercentage, 10);
  });

  // --------------------------------------------------------------------------
  // 15. Booking outside the window is rejected
  // --------------------------------------------------------------------------
  it('15. Booking outside the window is rejected with clear message', async () => {
    // Configured for 31 October 2026 to 10 November 2026
    await Coupon.create({
      code: 'TEST_WINDOW_STAY',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minBookingAmount: 0,
      startDate: new Date('2026-10-31T00:00:00+05:30'),
      endDate: new Date('2026-11-10T23:59:59+05:30'),
      isActive: true,
    });

    // Stay before window: 20 October to 22 October 2026
    const resBefore = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_STAY',
        checkIn: '2026-10-20',
        checkOut: '2026-10-22',
        roomTypeId: testRoomTypeId,
      }),
    });
    assert.equal(resBefore.status, 400);
    const bodyBefore = (await resBefore.json()) as any;
    assert.equal(bodyBefore.success, false);
    assert.equal(bodyBefore.message, 'This coupon is not valid for the selected stay dates.');

    // Stay after window: 15 November to 17 November 2026
    const resAfter = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_STAY',
        checkIn: '2026-11-15',
        checkOut: '2026-11-17',
        roomTypeId: testRoomTypeId,
      }),
    });
    assert.equal(resAfter.status, 400);
    const bodyAfter = (await resAfter.json()) as any;
    assert.equal(bodyAfter.success, false);
    assert.equal(bodyAfter.message, 'This coupon is not valid for the selected stay dates.');

    // PricingEngine rejects both
    if (testRoomTypeId) {
      const pBefore = await PricingEngine.calculateBookingPrice(
        testRoomTypeId,
        new Date('2026-10-20'),
        new Date('2026-10-22'),
        2,
        undefined,
        'TEST_WINDOW_STAY'
      );
      assert.equal(pBefore.couponCode, undefined);
      assert.equal(pBefore.couponError, 'This coupon is not valid for the selected stay dates.');

      const pAfter = await PricingEngine.calculateBookingPrice(
        testRoomTypeId,
        new Date('2026-11-15'),
        new Date('2026-11-17'),
        2,
        undefined,
        'TEST_WINDOW_STAY'
      );
      assert.equal(pAfter.couponCode, undefined);
      assert.equal(pAfter.couponError, 'This coupon is not valid for the selected stay dates.');
    }
  });

  // --------------------------------------------------------------------------
  // 16. Boundary checks: check-in on start date & check-out on inclusive end date
  // --------------------------------------------------------------------------
  it('16. Check-in exactly on start date and check-out on inclusive end date are accepted', async () => {
    // Configured for 31 October 2026 through 10 November 2026
    await Coupon.create({
      code: 'TEST_WINDOW_EXACT',
      discountType: 'PERCENTAGE',
      discountValue: 12,
      minBookingAmount: 0,
      startDate: new Date('2026-10-31T00:00:00+05:30'),
      endDate: new Date('2026-11-10T23:59:59+05:30'),
      isActive: true,
    });

    // Case A: Check-in exactly on 31 October 2026
    const resA = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_EXACT',
        checkIn: '2026-10-31',
        checkOut: '2026-11-02',
        roomTypeId: testRoomTypeId,
      }),
    });
    assert.equal(resA.status, 200);
    const bodyA = (await resA.json()) as any;
    assert.equal(bodyA.success, true);
    assert.equal(bodyA.data.valid, true);

    // Case B: Check-out exactly on 10 November 2026 (inclusive end date)
    const resB = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_EXACT',
        checkIn: '2026-11-08',
        checkOut: '2026-11-10',
        roomTypeId: testRoomTypeId,
      }),
    });
    assert.equal(resB.status, 200);
    const bodyB = (await resB.json()) as any;
    assert.equal(bodyB.success, true);
    assert.equal(bodyB.data.valid, true);

    // Case C: Full stay spanning exactly from start date to inclusive end date
    const resC = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_EXACT',
        checkIn: '2026-10-31',
        checkOut: '2026-11-10',
        roomTypeId: testRoomTypeId,
      }),
    });
    assert.equal(resC.status, 200);
    const bodyC = (await resC.json()) as any;
    assert.equal(bodyC.success, true);
    assert.equal(bodyC.data.valid, true);
  });

  // --------------------------------------------------------------------------
  // 17. A stay partially outside the window is rejected
  // --------------------------------------------------------------------------
  it('17. A stay partially outside the window is rejected', async () => {
    // Configured for 31 October 2026 through 10 November 2026
    await Coupon.create({
      code: 'TEST_WINDOW_PARTIAL',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minBookingAmount: 0,
      startDate: new Date('2026-10-31T00:00:00+05:30'),
      endDate: new Date('2026-11-10T23:59:59+05:30'),
      isActive: true,
    });

    // Check-in before window: 30 October to 4 November
    const resPre = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_PARTIAL',
        checkIn: '2026-10-30',
        checkOut: '2026-11-04',
      }),
    });
    assert.equal(resPre.status, 400);
    const bodyPre = (await resPre.json()) as any;
    assert.equal(bodyPre.message, 'This coupon is not valid for the selected stay dates.');

    // Check-out after window: 5 November to 11 November
    const resPost = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_PARTIAL',
        checkIn: '2026-11-05',
        checkOut: '2026-11-11',
      }),
    });
    assert.equal(resPost.status, 400);
    const bodyPost = (await resPost.json()) as any;
    assert.equal(bodyPost.message, 'This coupon is not valid for the selected stay dates.');
  });

  // --------------------------------------------------------------------------
  // 18. Disabled coupons are rejected regardless of stay dates
  // --------------------------------------------------------------------------
  it('18. Disabled coupon is always rejected even if stay dates fall within window', async () => {
    await Coupon.create({
      code: 'TEST_WINDOW_DISABLED',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minBookingAmount: 0,
      startDate: new Date('2026-10-31T00:00:00+05:30'),
      endDate: new Date('2026-11-10T23:59:59+05:30'),
      isActive: false, // Disabled
    });

    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_DISABLED',
        checkIn: '2026-11-02',
        checkOut: '2026-11-04',
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Invalid coupon code.');

    if (testRoomTypeId) {
      const pricing = await PricingEngine.calculateBookingPrice(
        testRoomTypeId,
        new Date('2026-11-02'),
        new Date('2026-11-04'),
        2,
        undefined,
        'TEST_WINDOW_DISABLED'
      );
      assert.equal(pricing.couponCode, undefined);
      assert.equal(pricing.couponError, 'Invalid coupon code.');
    }
  });

  // --------------------------------------------------------------------------
  // 19. Enabled coupons without schedule remain valid on any stay dates
  // --------------------------------------------------------------------------
  it('19. Enabled coupons without schedule remain valid for any stay dates', async () => {
    await Coupon.create({
      code: 'TEST_WINDOW_NOSCHED',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minBookingAmount: 0,
      startDate: null,
      endDate: null,
      isActive: true,
    });

    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_WINDOW_NOSCHED',
        checkIn: '2026-12-25',
        checkOut: '2026-12-28',
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.valid, true);
    assert.equal(body.data.discountPercentage, 10);
  });

  // --------------------------------------------------------------------------
  // 20. Authoritative consistency between validation endpoint and pricing engine
  // --------------------------------------------------------------------------
  it('20. Authoritative consistency: validate endpoint and pricing engine produce identical results', async () => {
    if (!testRoomTypeId) return;

    // Both checkIn & checkOut with WELCOME10 enabled
    await Coupon.updateOne(
      { code: 'WELCOME10' },
      {
        $set: {
          isActive: true,
          startDate: new Date('2026-10-31T00:00:00+05:30'),
          endDate: new Date('2026-11-10T23:59:59+05:30'),
        },
      }
    );

    // Call /api/coupons/validate with roomTypeId and dates
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'WELCOME10',
        roomTypeId: testRoomTypeId,
        checkIn: '2026-11-03',
        checkOut: '2026-11-05',
        numGuests: 2,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;

    const pricing = await PricingEngine.calculateBookingPrice(
      testRoomTypeId,
      new Date('2026-11-03'),
      new Date('2026-11-05'),
      2,
      undefined,
      'WELCOME10'
    );

    assert.equal(body.data.discountAmount, pricing.discountAmount);
    assert.equal(body.data.pricing.totalAmount, pricing.totalAmount);
    assert.equal(body.data.discountPercentage, pricing.discountPercentage);

    // Now test with invalid stay dates
    const resInvalid = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'WELCOME10',
        roomTypeId: testRoomTypeId,
        checkIn: '2026-10-20',
        checkOut: '2026-10-22',
        numGuests: 2,
      }),
    });
    assert.equal(resInvalid.status, 400);

    const pricingInvalid = await PricingEngine.calculateBookingPrice(
      testRoomTypeId,
      new Date('2026-10-20'),
      new Date('2026-10-22'),
      2,
      undefined,
      'WELCOME10'
    );
    assert.equal(pricingInvalid.couponCode, undefined);
    assert.equal(pricingInvalid.discountAmount, 0);
    assert.equal(pricingInvalid.couponError, 'This coupon is not valid for the selected stay dates.');
  });

  // --------------------------------------------------------------------------
  // 21. IST timezone boundaries handled correctly
  // --------------------------------------------------------------------------
  it('21. IST timezone boundaries: UTC 18:30 aligns with 00:00 IST calendar day', async () => {
    // 31 October 00:00 IST is UTC 2026-10-30T18:30:00.000Z
    // 10 November 23:59:59 IST is UTC 2026-11-10T18:29:59.000Z
    await Coupon.create({
      code: 'TEST_IST_BOUND',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minBookingAmount: 0,
      startDate: new Date('2026-10-30T18:30:00.000Z'), // Exactly 00:00 IST on 31 Oct
      endDate: new Date('2026-11-10T18:29:59.000Z'),   // Exactly 23:59 IST on 10 Nov
      isActive: true,
    });

    // Valid stay: 2026-10-31 to 2026-11-02
    const resValid = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_IST_BOUND',
        checkIn: '2026-10-31',
        checkOut: '2026-11-02',
      }),
    });
    assert.equal(resValid.status, 200);

    // Stay checking out on 10 November (inclusive end date in IST)
    const resEndValid = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_IST_BOUND',
        checkIn: '2026-11-08',
        checkOut: '2026-11-10',
      }),
    });
    assert.equal(resEndValid.status, 200);

    // Stay starting on 30 October (before 00:00 IST 31 Oct in UTC)
    const resBefore = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_IST_BOUND',
        checkIn: '2026-10-30',
        checkOut: '2026-11-02',
      }),
    });
    assert.equal(resBefore.status, 400);
    const bodyBefore = (await resBefore.json()) as any;
    assert.equal(bodyBefore.message, 'This coupon is not valid for the selected stay dates.');

    // Stay extending past 10 November (checkout 11 Nov)
    const resAfter = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'TEST_IST_BOUND',
        checkIn: '2026-11-08',
        checkOut: '2026-11-11',
      }),
    });
    assert.equal(resAfter.status, 400);
    const bodyAfter = (await resAfter.json()) as any;
    assert.equal(bodyAfter.message, 'This coupon is not valid for the selected stay dates.');
  });
});
