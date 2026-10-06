import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';
import { RatePlan } from '../models/RatePlan';
import { DailyRate } from '../models/DailyRate';
import { Booking } from '../models/Booking';
import { Coupon } from '../models/Coupon';
import { PublicController } from '../controllers/publicController';
import { PricingEngine } from '../services/PricingEngine';
import { RatePlanService } from '../services/RatePlanService';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

// Helper mock request and response for testing express controllers
function mockReqRes(query: any = {}, body: any = {}) {
  const req: any = { query, body };
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

async function runRegressionTestSuite() {
  console.log('========================================================================');
  console.log('HOTEL RAAMA — DATE-WISE RATE FRONTEND SYNCHRONIZATION REGRESSION TEST');
  console.log('========================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const cleanupRateIds: Types.ObjectId[] = [];
  const cleanupBookingIds: Types.ObjectId[] = [];

  try {
    await RatePlanService.ensureDefaultRatePlans();

    const premSglType = await RoomType.findOne({ code: 'PREM_SGL_NONAC' });
    if (!premSglType) throw new Error('PREM_SGL_NONAC room type not found.');

    const epPlan = await RatePlan.findOne({ code: 'ROOM_ONLY' });
    if (!epPlan) throw new Error('ROOM_ONLY rate plan not found.');

    const cpPlan = await RatePlan.findOne({ code: 'BREAKFAST_INCLUDED' });
    if (!cpPlan) throw new Error('BREAKFAST_INCLUDED rate plan not found.');

    // ------------------------------------------------------------------------
    // SCENARIO SETUP:
    // Admin bulk-updated Premium Single Non A/C:
    // Date range: 31 Oct 2026 -> 15 Nov 2026 with new rate ₹2000
    // ------------------------------------------------------------------------
    console.log('Setting up DailyRate records for 31 Oct 2026 -> 15 Nov 2026...');
    const rateOct31 = await DailyRate.findOneAndUpdate(
      {
        roomTypeId: premSglType._id,
        ratePlanId: epPlan._id,
        date: '2026-10-31',
      },
      {
        ratePlanCode: 'ROOM_ONLY',
        dateValue: new Date('2026-10-31T00:00:00.000Z'),
        singleAdult: 2000,
        doubleAdult: 2000,
        tripleAdult: 2000,
        childRate: 0,
        extraAdultRate: 600,
      },
      { upsert: true, new: true }
    );
    cleanupRateIds.push(rateOct31._id as Types.ObjectId);

    // Also configure CP rate for 31 Oct 2026 as ₹2300
    const rateOct31Cp = await DailyRate.findOneAndUpdate(
      {
        roomTypeId: premSglType._id,
        ratePlanId: cpPlan._id,
        date: '2026-10-31',
      },
      {
        ratePlanCode: 'BREAKFAST_INCLUDED',
        dateValue: new Date('2026-10-31T00:00:00.000Z'),
        singleAdult: 2300,
        doubleAdult: 2300,
        tripleAdult: 2300,
        childRate: 0,
        extraAdultRate: 600,
      },
      { upsert: true, new: true }
    );
    cleanupRateIds.push(rateOct31Cp._id as Types.ObjectId);

    // Nov 1 = ₹2500 for multi-night test
    const rateNov1 = await DailyRate.findOneAndUpdate(
      {
        roomTypeId: premSglType._id,
        ratePlanId: epPlan._id,
        date: '2026-11-01',
      },
      {
        ratePlanCode: 'ROOM_ONLY',
        dateValue: new Date('2026-11-01T00:00:00.000Z'),
        singleAdult: 2500,
        doubleAdult: 2500,
        tripleAdult: 2500,
        childRate: 0,
        extraAdultRate: 600,
      },
      { upsert: true, new: true }
    );
    cleanupRateIds.push(rateNov1._id as Types.ObjectId);

    // ------------------------------------------------------------------------
    // TEST 1 — DAILYRATE EXISTS: GUEST ROOM CARD DISPLAYS DAILYRATE INSTEAD OF BASEPRICE
    // Customer searches: Check-in: 31 Oct 2026, Check-out: 1 Nov 2026
    // Expected: dateWiseRate = ₹2000 (NOT ₹1200 fallback)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: DailyRate exists -> Card displays DailyRate instead of RoomType.basePrice ---');
    {
      const { req, res } = mockReqRes({
        checkIn: '2026-10-31',
        checkOut: '2026-11-01',
        planType: 'NON_CP',
        guests: '1',
      });

      await PublicController.getRoomTypes(req, res);
      const data = res.getData();

      if (!data?.success || !Array.isArray(data?.data)) {
        throw new Error('TEST 1 Failed: getRoomTypes did not return success array.');
      }

      const room = data.data.find((r: any) => r.code === 'PREM_SGL_NONAC');
      if (!room) throw new Error('TEST 1 Failed: PREM_SGL_NONAC room not found in response.');

      console.log(`[TEST 1] Static basePrice: ₹${room.basePrice}`);
      console.log(`[TEST 1] Date-Wise Rate returned for listing card: ₹${room.dateWiseRate}`);
      console.log(`[TEST 1] Room subtotal: ₹${room.roomTotal}`);

      if (room.dateWiseRate !== 2000) {
        throw new Error(`TEST 1 Failed: Expected dateWiseRate to be 2000, got ${room.dateWiseRate}`);
      }
      if (room.dateWiseRate === room.basePrice) {
        throw new Error('TEST 1 Failed: Room card is still displaying old static basePrice (1200)!');
      }

      // Check modal availability endpoint consistency
      const { req: modalReq, res: modalRes } = mockReqRes({}, {
        roomTypeId: premSglType._id.toString(),
        checkIn: '2026-10-31',
        checkOut: '2026-11-01',
        numGuests: 1,
        planType: 'NON_CP',
      });
      await PublicController.checkAvailabilityAndPrice(modalReq, modalRes);
      const modalData = modalRes.getData();
      const modalNightRate = modalData?.data?.pricing?.roomPricePerNight;
      const modalRoomTotal = modalData?.data?.pricing?.roomTotal;

      console.log(`[TEST 1] Booking Modal roomPricePerNight: ₹${modalNightRate}`);
      console.log(`[TEST 1] Booking Modal roomTotal: ₹${modalRoomTotal}`);

      if (modalNightRate !== room.dateWiseRate || modalRoomTotal !== room.roomTotal) {
        throw new Error(
          `TEST 1 Failed: Discrepancy between room card (₹${room.dateWiseRate}) and modal (₹${modalNightRate})!`
        );
      }
      console.log('✓ TEST 1 PASSED: Room listing card and booking modal both display authoritative ₹2000 / night!');
    }

    // ------------------------------------------------------------------------
    // TEST 2 — DAILYRATE ABSENT: FALLBACK TO BASEPRICE
    // Date with NO DailyRate configured (e.g. 2026-12-01 -> 2026-12-02)
    // Expected: Fallback to basePrice ₹1200
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: DailyRate absent -> Fallback to basePrice ---');
    {
      const { req, res } = mockReqRes({
        checkIn: '2026-12-01',
        checkOut: '2026-12-02',
        planType: 'NON_CP',
        guests: '1',
      });

      await PublicController.getRoomTypes(req, res);
      const data = res.getData();
      const room = data.data.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 2] Static basePrice: ₹${room.basePrice}`);
      console.log(`[TEST 2] Date-Wise Rate for unconfigured date: ₹${room.dateWiseRate}`);

      if (room.dateWiseRate !== 1200) {
        throw new Error(`TEST 2 Failed: Expected fallback basePrice 1200, got ${room.dateWiseRate}`);
      }
      console.log('✓ TEST 2 PASSED: Fallback to basePrice (₹1200) works correctly when no DailyRate exists!');
    }

    // ------------------------------------------------------------------------
    // TEST 3 — DIFFERENT DATES: DISPLAYED RATE REFRESHES AND CHANGES DYNAMICALLY
    // Search 1: 2026-10-20 -> 2026-10-21 (no custom rate: ₹1200)
    // Search 2: 2026-10-31 -> 2026-11-01 (custom rate: ₹2000)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Different dates -> Displayed rate changes dynamically ---');
    {
      const { req: req1, res: res1 } = mockReqRes({
        checkIn: '2026-10-20',
        checkOut: '2026-10-21',
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(req1, res1);
      const room1 = res1.getData().data.find((r: any) => r.code === 'PREM_SGL_NONAC');

      const { req: req2, res: res2 } = mockReqRes({
        checkIn: '2026-10-31',
        checkOut: '2026-11-01',
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(req2, res2);
      const room2 = res2.getData().data.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 3] Oct 20 search rate: ₹${room1.dateWiseRate}`);
      console.log(`[TEST 3] Oct 31 search rate: ₹${room2.dateWiseRate}`);

      if (room1.dateWiseRate !== 1200 || room2.dateWiseRate !== 2000) {
        throw new Error(`TEST 3 Failed: Rate did not dynamically switch between dates.`);
      }
      console.log('✓ TEST 3 PASSED: Displayed rates refresh dynamically across date searches!');
    }

    // ------------------------------------------------------------------------
    // TEST 4 — DIFFERENT RATE PLANS: DISPLAYED RATE CHANGES (EP vs CP)
    // EP: ₹2000, CP: ₹2300 for 31 Oct 2026
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Different rate plans -> Displayed rate changes (EP vs CP) ---');
    {
      const { req: reqEp, res: resEp } = mockReqRes({
        checkIn: '2026-10-31',
        checkOut: '2026-11-01',
        planType: 'NON_CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(reqEp, resEp);
      const roomEp = resEp.getData().data.find((r: any) => r.code === 'PREM_SGL_NONAC');

      const { req: reqCp, res: resCp } = mockReqRes({
        checkIn: '2026-10-31',
        checkOut: '2026-11-01',
        planType: 'CP',
        guests: '1',
      });
      await PublicController.getRoomTypes(reqCp, resCp);
      const roomCp = resCp.getData().data.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 4] EP plan rate: ₹${roomEp.dateWiseRate}`);
      console.log(`[TEST 4] CP plan rate: ₹${roomCp.dateWiseRate}`);

      if (roomEp.dateWiseRate !== 2000) {
        throw new Error(`TEST 4 Failed: Expected EP rate 2000, got ${roomEp.dateWiseRate}`);
      }
      if (roomCp.dateWiseRate !== 2300) {
        throw new Error(`TEST 4 Failed: Expected CP rate 2300, got ${roomCp.dateWiseRate}`);
      }
      console.log('✓ TEST 4 PASSED: Rate plan toggle dynamically updates rate between EP (₹2000) and CP (₹2300)!');
    }

    // ------------------------------------------------------------------------
    // TEST 5 — MULTI-NIGHT DIFFERENT RATES: UI COMMUNICATES ACCURATE NIGHTLY PRICING
    // Oct 31: ₹2000
    // Nov 1: ₹2500
    // Check-out: Nov 2 (2 nights)
    // Expected:
    // minRate = 2000, maxRate = 2500, hasVaryingRates = true, roomTotal = 4500
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Multi-night varying rates -> Does not misrepresent nightly pricing ---');
    {
      const { req, res } = mockReqRes({
        checkIn: '2026-10-31',
        checkOut: '2026-11-02',
        planType: 'NON_CP',
        guests: '1',
      });

      await PublicController.getRoomTypes(req, res);
      const data = res.getData();
      const room = data.data.find((r: any) => r.code === 'PREM_SGL_NONAC');

      console.log(`[TEST 5] numNights: ${room.numNights}`);
      console.log(`[TEST 5] minRate: ₹${room.minRate}, maxRate: ₹${room.maxRate}`);
      console.log(`[TEST 5] hasVaryingRates: ${room.hasVaryingRates}`);
      console.log(`[TEST 5] roomTotal: ₹${room.roomTotal}`);
      console.log(`[TEST 5] Nightly rates:`, room.nightlyRates);

      if (room.numNights !== 2) throw new Error(`TEST 5 Failed: Expected numNights 2, got ${room.numNights}`);
      if (room.minRate !== 2000 || room.maxRate !== 2500) {
        throw new Error(`TEST 5 Failed: Expected min 2000 and max 2500, got ${room.minRate} - ${room.maxRate}`);
      }
      if (!room.hasVaryingRates) throw new Error('TEST 5 Failed: Expected hasVaryingRates to be true');
      if (room.roomTotal !== 4500) throw new Error(`TEST 5 Failed: Expected roomTotal 4500, got ${room.roomTotal}`);

      // Verify modal price breakdown also gives 4500
      const { req: mReq, res: mRes } = mockReqRes({}, {
        roomTypeId: premSglType._id.toString(),
        checkIn: '2026-10-31',
        checkOut: '2026-11-02',
        numGuests: 1,
        planType: 'NON_CP',
      });
      await PublicController.checkAvailabilityAndPrice(mReq, mRes);
      const mData = mRes.getData();
      if (mData.data.pricing.roomTotal !== 4500) {
        throw new Error(`TEST 5 Failed: Modal roomTotal mismatch: ${mData.data.pricing.roomTotal} !== 4500`);
      }
      console.log('✓ TEST 5 PASSED: Multi-night stay correctly indicates range ₹2000–₹2500 and total ₹4500!');
    }

    // ------------------------------------------------------------------------
    // TEST 6 — COUPON TEST: ROOM CARD PRE-COUPON, BOOKING APPLIES DISCOUNT
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Coupon test: Room card displays pre-coupon rate; modal applies discount ---');
    {
      await Coupon.findOneAndUpdate(
        { code: 'WELCOME10' },
        {
          code: 'WELCOME10',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minBookingAmount: 0,
          startDate: new Date(2020, 0, 1),
          endDate: new Date(2035, 11, 31),
          maxUsage: 100000,
          isActive: true,
        },
        { upsert: true, new: true }
      );

      const pricingWithCoupon = await PricingEngine.calculateBookingPrice(
        premSglType._id.toString(),
        new Date('2026-10-31T00:00:00.000Z'),
        new Date('2026-11-01T00:00:00.000Z'),
        1,
        undefined,
        'WELCOME10',
        'NON_CP',
        false,
        '22AAAAA0000A1Z5'
      );

      console.log(`[TEST 6] Pre-discount room subtotal: ₹${pricingWithCoupon.roomTotal}`);
      console.log(`[TEST 6] WELCOME10 discount amount: ₹${pricingWithCoupon.discountAmount}`);
      console.log(`[TEST 6] Tax (5% on ₹1800): ₹${pricingWithCoupon.taxAmount}`);
      console.log(`[TEST 6] Final total amount: ₹${pricingWithCoupon.totalAmount}`);

      if (pricingWithCoupon.roomTotal !== 2000) {
        throw new Error(`TEST 6 Failed: Base room total should remain pre-coupon ₹2000`);
      }
      if (pricingWithCoupon.discountAmount !== 200) {
        throw new Error(`TEST 6 Failed: Expected discount ₹200, got ${pricingWithCoupon.discountAmount}`);
      }
      if (pricingWithCoupon.totalAmount !== 1890) {
        throw new Error(`TEST 6 Failed: Expected total ₹1890, got ${pricingWithCoupon.totalAmount}`);
      }
      console.log('✓ TEST 6 PASSED: Room card displays pre-coupon ₹2000; coupon discount applied in summary!');
    }

    // ------------------------------------------------------------------------
    // TEST 7 — BACKEND RECALCULATES AUTHORITATIVE PRICE (DO NOT TRUST FRONTEND)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Backend price remains authoritative ---');
    {
      // Attempt to create booking hold with fraudulent client price in body
      const { req: bookReq, res: bookRes } = mockReqRes({}, {
        guestName: 'Regression Tester',
        guestEmail: 'test.regression@example.com',
        guestPhone: '9876543210',
        roomTypeId: premSglType._id.toString(),
        checkIn: '2026-10-31',
        checkOut: '2026-11-01',
        numGuests: 1,
        planType: 'NON_CP',
        clientPrice: 100, // Fraudulent frontend price
      });

      await PublicController.createBooking(bookReq, bookRes);
      const bookData = bookRes.getData();

      if (!bookData?.success || !bookData?.data?.bookingId) {
        throw new Error(`TEST 7 Failed: createBooking failed: ${JSON.stringify(bookData)}`);
      }

      const booking = await Booking.findOne({ bookingId: bookData.data.bookingId });
      if (!booking) throw new Error(`TEST 7 Failed: Booking record not found for ID ${bookData.data.bookingId}`);
      cleanupBookingIds.push(booking._id as Types.ObjectId);

      console.log(`[TEST 7] Client tried to submit price: ₹100`);
      console.log(`[TEST 7] Server authoritative roomPricePerNightSnapshot: ₹${booking.roomPricePerNightSnapshot}`);
      console.log(`[TEST 7] Server authoritative totalAmount: ₹${booking.totalAmount}`);

      if (booking.roomPricePerNightSnapshot !== 2000) {
        throw new Error(
          `TEST 7 Failed: Server accepted client price instead of authoritative DailyRate ₹2000!`
        );
      }
      if (booking.totalAmount !== 2100) {
        throw new Error(`TEST 7 Failed: Expected totalAmount ₹2100 (₹2000 + 5% GST), got ₹${booking.totalAmount}`);
      }
      console.log('✓ TEST 7 PASSED: Backend strictly enforces authoritative server-side PricingEngine calculation!');
    }

    console.log('\n========================================================================');
    console.log('ALL REGRESSION TESTS (1 THROUGH 7) PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } finally {
    if (cleanupRateIds.length > 0) {
      await DailyRate.deleteMany({ _id: { $in: cleanupRateIds } });
    }
    if (cleanupBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: cleanupBookingIds } });
    }
    await mongoose.disconnect();
  }
}

runRegressionTestSuite().catch((err) => {
  console.error('Regression Test Error:', err);
  process.exit(1);
});
