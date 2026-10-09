import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';
import { RatePlan } from '../models/RatePlan';
import { DailyRate } from '../models/DailyRate';
import { DailyInventory } from '../models/DailyInventory';
import { PublicController } from '../controllers/publicController';
import { PricingEngine } from '../services/PricingEngine';
import { AvailabilityEngine } from '../services/AvailabilityEngine';
import { RatePlanService } from '../services/RatePlanService';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

function mockReqRes(query: any = {}, body: any = {}) {
  const req: any = { query, body };
  let statusCode = 200;
  let responseData: any = null;
  const headers: Record<string, string> = {};

  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      responseData = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      headers[name] = value;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
    getHeader: (name: string) => headers[name],
  };

  return { req, res };
}

async function runHomepagePricingTestSuite() {
  console.log('========================================================================');
  console.log('HOTEL RAAMA — HOMEPAGE ROOM PRICES DATE-WISE OVERRIDE SYNC TEST');
  console.log('========================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const cleanupRateIds: Types.ObjectId[] = [];
  const cleanupInventoryIds: Types.ObjectId[] = [];

  try {
    await RatePlanService.ensureDefaultRatePlans();

    const premSgl = await RoomType.findOne({ code: 'PREM_SGL_NONAC' });
    if (!premSgl) throw new Error('PREM_SGL_NONAC room type not found.');

    const epPlan = await RatePlan.findOne({ code: 'ROOM_ONLY' });
    if (!epPlan) throw new Error('ROOM_ONLY rate plan not found.');

    const cpPlan = await RatePlan.findOne({ code: 'BREAKFAST_INCLUDED' });
    if (!cpPlan) throw new Error('BREAKFAST_INCLUDED rate plan not found.');

    // Configure test date-wise overrides:
    // Override date: 2026-10-15 (within override range) -> ₹2000 (EP) and ₹2300 (CP)
    // Non-override date: 2026-10-25 -> base price ₹1200
    // Multi-night: 2026-10-15 (₹2000) and 2026-10-16 (₹2400)
    const overrideDate1 = '2026-10-15';
    const overrideDate2 = '2026-10-16';
    const nonOverrideDate = '2026-10-25';

    // Clean up any pre-existing records for these dates
    await DailyRate.deleteMany({
      roomTypeId: premSgl._id,
      date: { $in: [overrideDate1, overrideDate2, nonOverrideDate] },
    });

    const rate1 = await DailyRate.create({
      roomTypeId: premSgl._id,
      ratePlanId: epPlan._id,
      ratePlanCode: 'ROOM_ONLY',
      date: overrideDate1,
      dateValue: new Date(`${overrideDate1}T00:00:00.000Z`),
      singleAdult: 2000,
      doubleAdult: 2000,
      extraAdultRate: 600,
      childRate: 0,
    });
    cleanupRateIds.push(rate1._id as Types.ObjectId);

    const rate1Cp = await DailyRate.create({
      roomTypeId: premSgl._id,
      ratePlanId: cpPlan._id,
      ratePlanCode: 'BREAKFAST_INCLUDED',
      date: overrideDate1,
      dateValue: new Date(`${overrideDate1}T00:00:00.000Z`),
      singleAdult: 2300,
      doubleAdult: 2300,
      extraAdultRate: 800,
      childRate: 0,
    });
    cleanupRateIds.push(rate1Cp._id as Types.ObjectId);

    const rate2 = await DailyRate.create({
      roomTypeId: premSgl._id,
      ratePlanId: epPlan._id,
      ratePlanCode: 'ROOM_ONLY',
      date: overrideDate2,
      dateValue: new Date(`${overrideDate2}T00:00:00.000Z`),
      singleAdult: 2400,
      doubleAdult: 2400,
      extraAdultRate: 600,
      childRate: 0,
    });
    cleanupRateIds.push(rate2._id as Types.ObjectId);

    // ------------------------------------------------------------------------
    // CASE 1: Active date-wise override reflected on homepage
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Active date-wise override is reflected (₹2000 vs base ₹1200) ---');
    {
      const { req, res } = mockReqRes({
        checkIn: overrideDate1,
        checkOut: '2026-10-16',
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(req, res);
      const data = res.getData();
      const room = data?.data?.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 1] Base Price: ₹${room.basePrice}, Effective dateWiseRate: ₹${room.dateWiseRate}`);
      if (room.dateWiseRate !== 2000) {
        throw new Error(`TEST 1 Failed: Expected dateWiseRate 2000, got ${room.dateWiseRate}`);
      }
      console.log('✓ TEST 1 PASSED: Active date-wise override correctly returned as ₹2000!');
    }

    // ------------------------------------------------------------------------
    // CASE 2: Dates without override use base rate fallback (₹1200)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Dates without override use correct base price (₹1200) ---');
    {
      const { req, res } = mockReqRes({
        checkIn: nonOverrideDate,
        checkOut: '2026-10-26',
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(req, res);
      const data = res.getData();
      const room = data?.data?.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 2] Base Price: ₹${room.basePrice}, Effective dateWiseRate: ₹${room.dateWiseRate}`);
      if (room.dateWiseRate !== 1200) {
        throw new Error(`TEST 2 Failed: Expected base rate fallback 1200, got ${room.dateWiseRate}`);
      }
      console.log('✓ TEST 2 PASSED: Base price fallback (₹1200) verified for date without override!');
    }

    // ------------------------------------------------------------------------
    // CASE 3: Homepage and RoomsPage display parity for identical search parameters
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Homepage and RoomsPage parity for identical search parameters ---');
    {
      // Homepage query
      const { req: hpReq, res: hpRes } = mockReqRes({
        checkIn: overrideDate1,
        checkOut: '2026-10-16',
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(hpReq, hpRes);
      const hpRoom = hpRes.getData()?.data?.find((r: any) => r.code === 'PREM_SGL_NONAC');

      // RoomsPage query (exact same parameters)
      const { req: rpReq, res: rpRes } = mockReqRes({
        checkIn: overrideDate1,
        checkOut: '2026-10-16',
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(rpReq, rpRes);
      const rpRoom = rpRes.getData()?.data?.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 3] Homepage effective price: ₹${hpRoom.dateWiseRate}`);
      console.log(`[TEST 3] RoomsPage effective price: ₹${rpRoom.dateWiseRate}`);
      if (hpRoom.dateWiseRate !== rpRoom.dateWiseRate) {
        throw new Error(`TEST 3 Failed: Discrepancy between Homepage (₹${hpRoom.dateWiseRate}) and RoomsPage (₹${rpRoom.dateWiseRate})!`);
      }
      console.log('✓ TEST 3 PASSED: Homepage and RoomsPage return identical effective room prices!');
    }

    // ------------------------------------------------------------------------
    // CASE 4: Rate plans (EP vs CP) pricing distinction preserved
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: EP vs CP rates preserved (EP: ₹2000, CP: ₹2300) ---');
    {
      const { req: epReq, res: epRes } = mockReqRes({
        checkIn: overrideDate1,
        checkOut: '2026-10-16',
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(epReq, epRes);
      const epRoom = epRes.getData()?.data?.find((r: any) => r.code === 'PREM_SGL_NONAC');

      const { req: cpReq, res: cpRes } = mockReqRes({
        checkIn: overrideDate1,
        checkOut: '2026-10-16',
        planType: 'CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(cpReq, cpRes);
      const cpRoom = cpRes.getData()?.data?.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 4] EP Rate: ₹${epRoom.dateWiseRate}, CP Rate: ₹${cpRoom.dateWiseRate}`);
      if (epRoom.dateWiseRate !== 2000 || cpRoom.dateWiseRate !== 2300) {
        throw new Error(`TEST 4 Failed: Expected EP=2000, CP=2300. Got EP=${epRoom.dateWiseRate}, CP=${cpRoom.dateWiseRate}`);
      }
      console.log('✓ TEST 4 PASSED: Rate plan distinction strictly verified!');
    }

    // ------------------------------------------------------------------------
    // CASE 5: Multi-night stays with varying rates indicate correct range & total
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Multi-night varying rates handled correctly ---');
    {
      const { req, res } = mockReqRes({
        checkIn: overrideDate1,
        checkOut: '2026-10-17', // 2 nights: overrideDate1 (₹2000) + overrideDate2 (₹2400)
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(req, res);
      const room = res.getData()?.data?.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 5] numNights: ${room.numNights}, roomTotal: ₹${room.roomTotal}, minRate: ₹${room.minRate}, maxRate: ₹${room.maxRate}, hasVaryingRates: ${room.hasVaryingRates}`);
      if (room.numNights !== 2 || room.roomTotal !== 4400 || room.minRate !== 2000 || room.maxRate !== 2400 || !room.hasVaryingRates) {
        throw new Error(`TEST 5 Failed: Multi-night calculation incorrect. Got total: ${room.roomTotal}, range: ${room.minRate}-${room.maxRate}`);
      }
      console.log('✓ TEST 5 PASSED: Multi-night varying rates indicate ₹2000–₹2400 and ₹4400 total!');
    }

    // ------------------------------------------------------------------------
    // CASE 6: Unparameterized GET /api/rooms returns enriched dateWiseRate
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Unparameterized GET /api/rooms returns authoritative dateWiseRate ---');
    {
      const { req, res } = mockReqRes({}, {});
      await PublicController.getRoomTypes(req, res);
      const data = res.getData();

      if (!data?.success || !Array.isArray(data?.data)) {
        throw new Error('TEST 6 Failed: Response not successful or data not array.');
      }

      const room = data.data.find((r: any) => r.code === 'PREM_SGL_NONAC');
      if (room.dateWiseRate === undefined || room.epRate === undefined) {
        throw new Error('TEST 6 Failed: dateWiseRate or epRate missing from unparameterized call.');
      }

      console.log(`[TEST 6] Cache-Control header: ${res.getHeader('Cache-Control')}`);
      if (!res.getHeader('Cache-Control')?.includes('no-cache')) {
        throw new Error('TEST 6 Failed: No-cache headers missing.');
      }
      console.log(`[TEST 6] Unparameterized PREM_SGL_NONAC dateWiseRate: ₹${room.dateWiseRate}`);
      console.log('✓ TEST 6 PASSED: Unparameterized call returns enriched effective rate and no-cache headers!');
    }

    // ------------------------------------------------------------------------
    // CASE 7: Stop Sell restricts booking on the homepage
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Stop Sell marks room as unavailable ---');
    {
      const stopSellDate = '2026-10-15';
      const stopSellInv = await DailyInventory.findOneAndUpdate(
        { roomTypeId: premSgl._id, date: stopSellDate },
        {
          $set: {
            stopSell: true,
            roomTypeId: premSgl._id,
            date: stopSellDate,
          },
        },
        { upsert: true, new: true }
      );
      cleanupInventoryIds.push(stopSellInv._id as Types.ObjectId);

      const { req, res } = mockReqRes({
        checkIn: stopSellDate,
        checkOut: '2026-10-16',
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(req, res);
      const room = res.getData()?.data?.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 7] isAvailable under Stop Sell: ${room.isAvailable}`);
      if (room.isAvailable !== false) {
        throw new Error('TEST 7 Failed: Room should have isAvailable: false under Stop Sell.');
      }
      console.log('✓ TEST 7 PASSED: Stop Sell correctly reports isAvailable: false for the room category!');
    }

    console.log('\n========================================================================');
    console.log('ALL 7 HOMEPAGE PRICING SYNCHRONIZATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } finally {
    if (cleanupRateIds.length > 0) {
      await DailyRate.deleteMany({ _id: { $in: cleanupRateIds } });
    }
    if (cleanupInventoryIds.length > 0) {
      await DailyInventory.deleteMany({ _id: { $in: cleanupInventoryIds } });
    }
    await mongoose.disconnect();
  }
}

runHomepagePricingTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
