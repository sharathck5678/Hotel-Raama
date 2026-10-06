import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';
import { DailyRate } from '../models/DailyRate';
import { RatePlan } from '../models/RatePlan';
import { AuditLog } from '../models/AuditLog';
import { AdminController } from '../controllers/adminController';
import { PublicController } from '../controllers/publicController';
import { PricingEngine } from '../services/PricingEngine';
import { RatePlanService } from '../services/RatePlanService';
import { requireAdminAuth } from '../middleware/authMiddleware';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

function mockReqRes(query: any = {}, body: any = {}, params: any = {}, admin: any = null, headers: any = {}) {
  const req: any = { query, body, params, admin, headers, ip: '127.0.0.1' };
  let statusCode = 200;
  let responseData: any = null;

  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      responseData = payload;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
}

async function runBaseRatesTestSuite() {
  console.log('========================================================================');
  console.log('HOTEL RAAMA — BASE RATES MANAGEMENT 12-POINT VERIFICATION SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const cleanupRateIds: Types.ObjectId[] = [];
  const testAdmin = {
    id: new Types.ObjectId().toString(),
    email: 'admin@hotelraama.com',
    role: 'ADMIN',
  };

  try {
    await RatePlanService.ensureDefaultRatePlans();

    // Use PREM_SGL_NONAC as primary test category
    let premSgl = await RoomType.findOne({ code: 'PREM_SGL_NONAC' });
    if (!premSgl) {
      premSgl = await RoomType.create({
        name: 'Premium Single Non A/C',
        code: 'PREM_SGL_NONAC',
        description: 'Single non-AC room',
        basePrice: 1200,
        cpPrice: 1350,
        maxOccupancy: 1,
        isAc: false,
        isActive: true,
      });
    }

    const epPlan = await RatePlan.findOne({ code: 'ROOM_ONLY' });
    const cpPlan = await RatePlan.findOne({ code: 'BREAKFAST_INCLUDED' });
    if (!epPlan || !cpPlan) throw new Error('Default RatePlans not found.');

    // Save initial rates to restore after tests
    const initialBasePrice = premSgl.basePrice;
    const initialCpPrice = premSgl.cpPrice;

    // Reset to known baseline: EP = 1200, CP = 1350
    premSgl.basePrice = 1200;
    premSgl.cpPrice = 1350;
    await premSgl.save();

    // Clean up any test DailyRates for our test dates
    await DailyRate.deleteMany({
      roomTypeId: premSgl._id,
      date: { $in: ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'] },
    });

    // ------------------------------------------------------------------------
    // TEST 1 — Base EP rate update (1200 -> 1500)
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Base EP rate update ---');
    const { req: req1, res: res1 } = mockReqRes({}, { basePrice: 1500 }, { id: premSgl._id.toString() }, testAdmin);
    await AdminController.updateRoomTypeBaseRates(req1, res1);

    const updatedSgl1 = await RoomType.findById(premSgl._id);
    const test1Pass = res1.getStatusCode() === 200 && updatedSgl1?.basePrice === 1500;
    console.log(`[TEST 1] Status: ${res1.getStatusCode()}, RoomType.basePrice: ₹${updatedSgl1?.basePrice} (Expected: ₹1500)`);
    if (!test1Pass) throw new Error(`TEST 1 Failed: RoomType.basePrice is ${updatedSgl1?.basePrice}, expected 1500.`);
    console.log('✓ TEST 1 PASSED: RoomType.basePrice successfully updated to ₹1500!\n');

    // ------------------------------------------------------------------------
    // TEST 2 — Base CP rate update (1350 -> 1650)
    // ------------------------------------------------------------------------
    console.log('--- TEST 2: Base CP rate update ---');
    const { req: req2, res: res2 } = mockReqRes({}, { cpPrice: 1650 }, { id: premSgl._id.toString() }, testAdmin);
    await AdminController.updateRoomTypeBaseRates(req2, res2);

    const updatedSgl2 = await RoomType.findById(premSgl._id);
    const test2Pass = res2.getStatusCode() === 200 && updatedSgl2?.cpPrice === 1650;
    console.log(`[TEST 2] Status: ${res2.getStatusCode()}, RoomType.cpPrice: ₹${updatedSgl2?.cpPrice} (Expected: ₹1650)`);
    if (!test2Pass) throw new Error(`TEST 2 Failed: RoomType.cpPrice is ${updatedSgl2?.cpPrice}, expected 1650.`);
    console.log('✓ TEST 2 PASSED: RoomType.cpPrice successfully updated to ₹1650!\n');

    // ------------------------------------------------------------------------
    // TEST 3 — EP and CP independence
    // ------------------------------------------------------------------------
    console.log('--- TEST 3: EP and CP independence ---');
    // Change EP only from 1500 to 1550
    const { req: req3a, res: res3a } = mockReqRes({}, { basePrice: 1550 }, { id: premSgl._id.toString() }, testAdmin);
    await AdminController.updateRoomTypeBaseRates(req3a, res3a);
    const afterEpChange = await RoomType.findById(premSgl._id);
    const cpUnchanged = afterEpChange?.cpPrice === 1650;
    console.log(`[TEST 3a] Changed EP to 1550. CP price remains ₹${afterEpChange?.cpPrice} (Unchanged: ${cpUnchanged})`);

    // Change CP only from 1650 to 1750
    const { req: req3b, res: res3b } = mockReqRes({}, { cpPrice: 1750 }, { id: premSgl._id.toString() }, testAdmin);
    await AdminController.updateRoomTypeBaseRates(req3b, res3b);
    const afterCpChange = await RoomType.findById(premSgl._id);
    const epUnchanged = afterCpChange?.basePrice === 1550;
    console.log(`[TEST 3b] Changed CP to 1750. EP price remains ₹${afterCpChange?.basePrice} (Unchanged: ${epUnchanged})`);

    // Reset EP to 1500 and CP to 1650 for remaining tests
    afterCpChange!.basePrice = 1500;
    afterCpChange!.cpPrice = 1650;
    await afterCpChange!.save();

    if (!cpUnchanged || !epUnchanged) throw new Error('TEST 3 Failed: EP and CP rates are not mutually independent.');
    console.log('✓ TEST 3 PASSED: EP and CP base rate changes are strictly independent!\n');

    // ------------------------------------------------------------------------
    // TEST 4 — Base rate fallback when no DailyRate exists
    // ------------------------------------------------------------------------
    console.log('--- TEST 4: Base rate fallback when no DailyRate exists ---');
    // Date: 2026-10-25 -> 2026-10-26 (no DailyRate exists)
    const checkInNoOverride = new Date('2026-10-25T00:00:00.000Z');
    const checkOutNoOverride = new Date('2026-10-26T00:00:00.000Z');

    const pricingNoOverride = await PricingEngine.calculateBookingPrice(
      premSgl._id,
      checkInNoOverride,
      checkOutNoOverride,
      1,
      undefined,
      undefined,
      'NON_CP',
      false
    );

    const test4Pass = pricingNoOverride.roomPricePerNight === 1500 && pricingNoOverride.roomTotal === 1500;
    console.log(`[TEST 4] Fallback calculation: roomPricePerNight = ₹${pricingNoOverride.roomPricePerNight}, roomTotal = ₹${pricingNoOverride.roomTotal} (Expected: ₹1500)`);
    if (!test4Pass) throw new Error(`TEST 4 Failed: Expected 1500, got ${pricingNoOverride.roomPricePerNight}`);
    console.log('✓ TEST 4 PASSED: PricingEngine falls back to updated RoomType.basePrice (₹1500)!\n');

    // ------------------------------------------------------------------------
    // TEST 5 — DailyRate priority over Base Rate
    // ------------------------------------------------------------------------
    console.log('--- TEST 5: DailyRate priority over Base Rate ---');
    // Create custom DailyRate of ₹2000 for 2026-10-31
    const customOct31 = await DailyRate.create({
      roomTypeId: premSgl._id,
      ratePlanId: epPlan._id,
      ratePlanCode: 'ROOM_ONLY',
      date: '2026-10-31',
      dateValue: new Date('2026-10-31T00:00:00.000Z'),
      singleAdult: 2000,
      doubleAdult: 2000,
      tripleAdult: 2000,
      childRate: 0,
      extraAdultRate: 600,
    });
    cleanupRateIds.push(customOct31._id as Types.ObjectId);

    const checkInOct31 = new Date('2026-10-31T00:00:00.000Z');
    const checkOutNov01 = new Date('2026-11-01T00:00:00.000Z');

    const pricingOct31 = await PricingEngine.calculateBookingPrice(
      premSgl._id,
      checkInOct31,
      checkOutNov01,
      1,
      undefined,
      undefined,
      'NON_CP',
      false
    );

    const test5Pass = pricingOct31.roomPricePerNight === 2000 && pricingOct31.roomTotal === 2000;
    console.log(`[TEST 5] Oct 31 with DailyRate: ₹${pricingOct31.roomPricePerNight} (Base: ₹1500, DailyRate: ₹2000 -> Expected: ₹2000)`);
    if (!test5Pass) throw new Error(`TEST 5 Failed: Expected 2000 from DailyRate, got ${pricingOct31.roomPricePerNight}`);
    console.log('✓ TEST 5 PASSED: DailyRate (₹2000) takes strict priority over Base Rate (₹1500)!\n');

    // ------------------------------------------------------------------------
    // TEST 6 — Existing DailyRate preservation when Base Rate is changed again
    // ------------------------------------------------------------------------
    console.log('--- TEST 6: Existing DailyRate preservation ---');
    // Change base rate again from 1500 to 1600
    const { req: req6, res: res6 } = mockReqRes({}, { basePrice: 1600 }, { id: premSgl._id.toString() }, testAdmin);
    await AdminController.updateRoomTypeBaseRates(req6, res6);

    // Verify Oct 31 DailyRate still exists and still equals 2000
    const dailyRateRecord = await DailyRate.findOne({
      roomTypeId: premSgl._id,
      date: '2026-10-31',
      ratePlanCode: 'ROOM_ONLY',
    });

    const test6Pass = dailyRateRecord !== null && dailyRateRecord.singleAdult === 2000 && dailyRateRecord.doubleAdult === 2000;
    console.log(`[TEST 6] Oct 31 DailyRate after Base Rate updated to 1600: singleAdult = ₹${dailyRateRecord?.singleAdult}, doubleAdult = ₹${dailyRateRecord?.doubleAdult}`);
    if (!test6Pass) throw new Error('TEST 6 Failed: DailyRate record was modified or lost after Base Rate change.');

    // Reset base price back to 1500 for tests 7-10
    premSgl.basePrice = 1500;
    await premSgl.save();
    console.log('✓ TEST 6 PASSED: Existing DailyRate records are preserved and NOT modified!\n');

    // ------------------------------------------------------------------------
    // TEST 7 — Multi-night mixed pricing
    // Oct 30 (no DailyRate) = 1500
    // Oct 31 (DailyRate)    = 2000
    // Nov 1 (no DailyRate)  = 1500
    // Total for 3 nights: 1500 + 2000 + 1500 = 5000
    // ------------------------------------------------------------------------
    console.log('--- TEST 7: Multi-night mixed pricing ---');
    const checkInMulti = new Date('2026-10-30T00:00:00.000Z');
    const checkOutMulti = new Date('2026-11-02T00:00:00.000Z');

    const multiNightPricing = await PricingEngine.calculateBookingPrice(
      premSgl._id,
      checkInMulti,
      checkOutMulti,
      1,
      undefined,
      undefined,
      'NON_CP',
      false
    );

    const nightlyRates = multiNightPricing.nightlyRates || [];
    const oct30Rate = nightlyRates.find((r) => r.date === '2026-10-30')?.rate;
    const oct31Rate = nightlyRates.find((r) => r.date === '2026-10-31')?.rate;
    const nov01Rate = nightlyRates.find((r) => r.date === '2026-11-01')?.rate;

    const test7Pass =
      multiNightPricing.numNights === 3 &&
      oct30Rate === 1500 &&
      oct31Rate === 2000 &&
      nov01Rate === 1500 &&
      multiNightPricing.roomTotal === 5000;

    console.log(`[TEST 7] Stay Oct 30 -> Nov 02 (3 nights):`);
    console.log(`         Oct 30 (Base Rate): ₹${oct30Rate}`);
    console.log(`         Oct 31 (DailyRate): ₹${oct31Rate}`);
    console.log(`         Nov 01 (Base Rate): ₹${nov01Rate}`);
    console.log(`         Total: ₹${multiNightPricing.roomTotal} (Expected: ₹5000)`);

    if (!test7Pass) throw new Error(`TEST 7 Failed: Multi-night calculation error. Total = ${multiNightPricing.roomTotal}, expected 5000.`);
    console.log('✓ TEST 7 PASSED: Multi-night correctly combines base rate fallback and date-specific DailyRate!\n');

    // ------------------------------------------------------------------------
    // TEST 8 — Customer room listing (no DailyRate)
    // ------------------------------------------------------------------------
    console.log('--- TEST 8: Customer room listing (no DailyRate) ---');
    const { req: req8, res: res8 } = mockReqRes({
      checkIn: '2026-10-25',
      checkOut: '2026-10-26',
      planType: 'NON_CP',
      guests: '1',
    });
    await PublicController.getRoomTypes(req8, res8);
    const roomsData8 = res8.getData()?.data || [];
    const sglCard8 = roomsData8.find((r: any) => r.code === 'PREM_SGL_NONAC');

    const test8Pass = sglCard8?.dateWiseRate === 1500 && sglCard8?.epRate === 1500;
    console.log(`[TEST 8] Guest room card rate for unconfigured date: dateWiseRate = ₹${sglCard8?.dateWiseRate}, epRate = ₹${sglCard8?.epRate} (Expected: ₹1500)`);
    if (!test8Pass) throw new Error(`TEST 8 Failed: Room card shows ${sglCard8?.dateWiseRate}, expected 1500.`);
    console.log('✓ TEST 8 PASSED: Guest room card displays updated base rate (₹1500) when no DailyRate exists!\n');

    // ------------------------------------------------------------------------
    // TEST 9 — Customer room listing with override (date with DailyRate)
    // ------------------------------------------------------------------------
    console.log('--- TEST 9: Customer room listing with override (date with DailyRate) ---');
    const { req: req9, res: res9 } = mockReqRes({
      checkIn: '2026-10-31',
      checkOut: '2026-11-01',
      planType: 'NON_CP',
      guests: '1',
    });
    await PublicController.getRoomTypes(req9, res9);
    const roomsData9 = res9.getData()?.data || [];
    const sglCard9 = roomsData9.find((r: any) => r.code === 'PREM_SGL_NONAC');

    const test9Pass = sglCard9?.dateWiseRate === 2000 && sglCard9?.epRate === 2000;
    console.log(`[TEST 9] Guest room card rate for Oct 31 override: dateWiseRate = ₹${sglCard9?.dateWiseRate}, epRate = ₹${sglCard9?.epRate} (Expected: ₹2000)`);
    if (!test9Pass) throw new Error(`TEST 9 Failed: Room card shows ${sglCard9?.dateWiseRate}, expected 2000.`);
    console.log('✓ TEST 9 PASSED: Guest room card displays date-specific DailyRate (₹2000) on overridden date!\n');

    // ------------------------------------------------------------------------
    // TEST 10 — Booking modal shows same authoritative price
    // ------------------------------------------------------------------------
    console.log('--- TEST 10: Booking modal & room card consistency ---');
    // For date with DailyRate: card = 2000, modal calculation = 2000
    const modalPricingOct31 = await PricingEngine.calculateBookingPrice(
      premSgl._id,
      new Date('2026-10-31T00:00:00.000Z'),
      new Date('2026-11-01T00:00:00.000Z'),
      1,
      undefined,
      undefined,
      'NON_CP',
      false
    );
    // For date without DailyRate: card = 1500, modal calculation = 1500
    const modalPricingOct25 = await PricingEngine.calculateBookingPrice(
      premSgl._id,
      new Date('2026-10-25T00:00:00.000Z'),
      new Date('2026-10-26T00:00:00.000Z'),
      1,
      undefined,
      undefined,
      'NON_CP',
      false
    );

    const test10Pass =
      sglCard9?.dateWiseRate === modalPricingOct31.roomPricePerNight &&
      sglCard8?.dateWiseRate === modalPricingOct25.roomPricePerNight;

    console.log(`[TEST 10] Oct 31 consistency: Card = ₹${sglCard9?.dateWiseRate}, Modal = ₹${modalPricingOct31.roomPricePerNight}`);
    console.log(`[TEST 10] Oct 25 consistency: Card = ₹${sglCard8?.dateWiseRate}, Modal = ₹${modalPricingOct25.roomPricePerNight}`);
    if (!test10Pass) throw new Error('TEST 10 Failed: Pricing discrepancy between card and booking modal.');
    console.log('✓ TEST 10 PASSED: Guest room card and booking modal display matching authoritative prices!\n');

    // ------------------------------------------------------------------------
    // TEST 11 — Invalid base rate validation
    // Negative, zero, NaN, text strings
    // ------------------------------------------------------------------------
    console.log('--- TEST 11: Invalid base rate validation ---');
    const invalidInputs = [-100, 0, 'abc', 'NaN', NaN, '', null];
    let allRejected = true;

    for (const badVal of invalidInputs) {
      const { req: badReq, res: badRes } = mockReqRes({}, { basePrice: badVal }, { id: premSgl._id.toString() }, testAdmin);
      await AdminController.updateRoomTypeBaseRates(badReq, badRes);
      const isRejected = badRes.getStatusCode() === 400 && badRes.getData()?.success === false;
      console.log(`[TEST 11] Input: ${JSON.stringify(badVal)} -> HTTP ${badRes.getStatusCode()}: "${badRes.getData()?.message}" (Rejected: ${isRejected})`);
      if (!isRejected) allRejected = false;
    }

    // Also test empty body (neither basePrice nor cpPrice)
    const { req: emptyReq, res: emptyRes } = mockReqRes({}, {}, { id: premSgl._id.toString() }, testAdmin);
    await AdminController.updateRoomTypeBaseRates(emptyReq, emptyRes);
    const emptyRejected = emptyRes.getStatusCode() === 400;
    console.log(`[TEST 11] Empty body -> HTTP ${emptyRes.getStatusCode()}: "${emptyRes.getData()?.message}" (Rejected: ${emptyRejected})`);
    if (!emptyRejected) allRejected = false;

    if (!allRejected) throw new Error('TEST 11 Failed: Invalid base rate values were not rejected with 400.');
    console.log('✓ TEST 11 PASSED: Invalid base rates are strictly rejected with HTTP 400!\n');

    // ------------------------------------------------------------------------
    // TEST 12 — Unauthorized modification prevention
    // ------------------------------------------------------------------------
    console.log('--- TEST 12: Unauthorized modification prevention ---');
    // 1) Test via requireAdminAuth middleware without credentials
    const { req: unauthReq, res: unauthRes } = mockReqRes({}, { basePrice: 9999 }, { id: premSgl._id.toString() }, null);
    let nextCalled = false;
    await requireAdminAuth(unauthReq, unauthRes, () => {
      nextCalled = true;
    });

    const isBlocked = unauthRes.getStatusCode() === 401 && !nextCalled;
    console.log(`[TEST 12] Unauthenticated request blocked by requireAdminAuth: status = ${unauthRes.getStatusCode()}, nextCalled = ${nextCalled}`);

    // Verify roomType was NOT changed to 9999
    const afterUnauthCheck = await RoomType.findById(premSgl._id);
    const priceProtected = afterUnauthCheck?.basePrice === 1500;
    console.log(`[TEST 12] RoomType.basePrice remained protected at ₹${afterUnauthCheck?.basePrice}`);

    if (!isBlocked || !priceProtected) throw new Error('TEST 12 Failed: Public/unauthorized request was not rejected with 401.');
    console.log('✓ TEST 12 PASSED: Non-admin/public requests are strictly prohibited from modifying base rates!\n');

    // ------------------------------------------------------------------------
    // CLEANUP & RESTORATION
    // ------------------------------------------------------------------------
    console.log('Restoring baseline RoomType rates and cleaning up test records...');
    premSgl.basePrice = initialBasePrice;
    premSgl.cpPrice = initialCpPrice;
    await premSgl.save();

    if (cleanupRateIds.length > 0) {
      await DailyRate.deleteMany({ _id: { $in: cleanupRateIds } });
    }

    console.log('========================================================================');
    console.log('ALL 12 BASE RATES MANAGEMENT TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

// Run test suite
runBaseRatesTestSuite().catch((err) => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
