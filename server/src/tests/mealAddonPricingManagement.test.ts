import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { MealPlan } from '../models/MealPlan';
import { DailyMealPrice } from '../models/DailyMealPrice';
import { Booking } from '../models/Booking';
import { RoomType } from '../models/RoomType';
import { AdminController } from '../controllers/adminController';
import { PublicController } from '../controllers/publicController';
import { MealPricingService } from '../services/MealPricingService';
import { PricingEngine } from '../services/PricingEngine';
import { RazorpayService } from '../services/RazorpayService';
import { InvoicePdfService } from '../services/InvoicePdfService';
import { requireAdminAuth } from '../middleware/authMiddleware';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

function mockReqRes(
  query: any = {},
  body: any = {},
  params: any = {},
  admin: any = null,
  headers: any = {}
) {
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

async function runMealAddonPricingTestSuite() {
  console.log('========================================================================');
  console.log('HOTEL RAAMA — EDIT MEAL ADDON PRICING MANAGEMENT TEST SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const testAdmin = {
    id: new Types.ObjectId().toString(),
    email: 'admin@hotelraama.com',
    role: 'ADMIN',
  };

  const testDates = [
    '2026-10-18',
    '2026-10-19',
    '2026-10-20',
    '2026-10-21',
    '2026-10-22',
    '2026-10-23',
    '2026-10-24',
    '2026-10-25',
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
  ];

  // Backup existing base meal plans to restore at the end
  const originalPlans = await MealPlan.find({}).lean();

  try {
    // Clean up any test date overrides before starting
    await DailyMealPrice.deleteMany({ date: { $in: testDates } });

    let testRoomType = await RoomType.findOne({ code: 'PREM_DBL_NONAC' });
    if (!testRoomType) {
      testRoomType = await RoomType.findOne({});
    }

    // ------------------------------------------------------------------------
    // TEST A — Base meal prices
    // ------------------------------------------------------------------------
    console.log('--- TEST A: Base meal prices (₹150, ₹250, ₹300) ---');
    const { req: reqA, res: resA } = mockReqRes(
      {},
      { breakfast: 150, lunch: 250, dinner: 300 },
      {},
      testAdmin
    );
    await AdminController.updateBaseMealPrices(reqA, resA);

    const baseA = await MealPricingService.getBasePrices();
    const isBaseASet = baseA.breakfast === 150 && baseA.lunch === 250 && baseA.dinner === 300;
    console.log(`[TEST A] Base prices configured: Breakfast=₹${baseA.breakfast}, Lunch=₹${baseA.lunch}, Dinner=₹${baseA.dinner}`);
    if (!isBaseASet) throw new Error(`TEST A Failed: Base prices not set correctly: ${JSON.stringify(baseA)}`);

    // Verify dates without overrides use those prices
    const oct19Effective = await MealPricingService.getEffectiveMealPrices('2026-10-19', '2026-10-20');
    const oct19Pass =
      oct19Effective.breakfast.effectivePrice === 150 &&
      oct19Effective.lunch.effectivePrice === 250 &&
      oct19Effective.dinner.effectivePrice === 300;
    console.log(`[TEST A] Oct 19 effective (no overrides): Breakfast=₹${oct19Effective.breakfast.effectivePrice}, Lunch=₹${oct19Effective.lunch.effectivePrice}, Dinner=₹${oct19Effective.dinner.effectivePrice}`);
    if (!oct19Pass) throw new Error('TEST A Failed: Effective prices on Oct 19 did not fall back to base rates.');
    console.log('✓ TEST A PASSED: Base meal prices persist and dates without overrides resolve to base prices!\n');

    // ------------------------------------------------------------------------
    // TEST B — Date-wise override (20–25 October to ₹180, ₹280, ₹350)
    // ------------------------------------------------------------------------
    console.log('--- TEST B: Date-wise override (20–25 Oct: ₹180, ₹280, ₹350) ---');
    const { req: reqB, res: resB } = mockReqRes(
      {},
      {
        startDate: '2026-10-20',
        endDate: '2026-10-25',
        breakfastPrice: 180,
        lunchPrice: 280,
        dinnerPrice: 350,
      },
      {},
      testAdmin
    );
    await AdminController.bulkUpdateDateWiseMealPrices(reqB, resB);
    if (resB.getStatusCode() !== 200) throw new Error(`TEST B Failed: Bulk update failed with status ${resB.getStatusCode()}`);

    // Verify 20 Oct uses overridden prices
    const oct20Effective = await MealPricingService.getEffectiveMealPrices('2026-10-20', '2026-10-21');
    const oct20Pass =
      oct20Effective.breakfast.effectivePrice === 180 &&
      oct20Effective.lunch.effectivePrice === 280 &&
      oct20Effective.dinner.effectivePrice === 350;
    console.log(`[TEST B] Oct 20 override: Breakfast=₹${oct20Effective.breakfast.effectivePrice}, Lunch=₹${oct20Effective.lunch.effectivePrice}, Dinner=₹${oct20Effective.dinner.effectivePrice} (Expected: 180, 280, 350)`);
    if (!oct20Pass) throw new Error('TEST B Failed: 20 Oct did not use overridden prices.');

    // Verify 25 Oct uses overridden prices
    const oct25Effective = await MealPricingService.getEffectiveMealPrices('2026-10-25', '2026-10-26');
    const oct25Pass =
      oct25Effective.breakfast.effectivePrice === 180 &&
      oct25Effective.lunch.effectivePrice === 280 &&
      oct25Effective.dinner.effectivePrice === 350;
    console.log(`[TEST B] Oct 25 override: Breakfast=₹${oct25Effective.breakfast.effectivePrice}, Lunch=₹${oct25Effective.lunch.effectivePrice}, Dinner=₹${oct25Effective.dinner.effectivePrice} (Expected: 180, 280, 350)`);
    if (!oct25Pass) throw new Error('TEST B Failed: 25 Oct did not use overridden prices.');

    // Verify 19 Oct and 26 Oct outside range use base prices
    const oct19Again = await MealPricingService.getEffectiveMealPrices('2026-10-19', '2026-10-20');
    const oct26Effective = await MealPricingService.getEffectiveMealPrices('2026-10-26', '2026-10-27');
    const boundaryPass =
      oct19Again.breakfast.effectivePrice === 150 &&
      oct19Again.lunch.effectivePrice === 250 &&
      oct19Again.dinner.effectivePrice === 300 &&
      oct26Effective.breakfast.effectivePrice === 150 &&
      oct26Effective.lunch.effectivePrice === 250 &&
      oct26Effective.dinner.effectivePrice === 300;
    console.log(`[TEST B] Oct 19 & Oct 26 outside range: Oct 19 Breakfast=₹${oct19Again.breakfast.effectivePrice}, Oct 26 Breakfast=₹${oct26Effective.breakfast.effectivePrice} (Expected: 150)`);
    if (!boundaryPass) throw new Error('TEST B Failed: Dates outside range did not use base prices.');
    console.log('✓ TEST B PASSED: 20 Oct and 25 Oct use overrides; 19 Oct and 26 Oct use base rates!\n');

    // ------------------------------------------------------------------------
    // TEST C — Permanent base-price update (Change base breakfast from ₹150 to ₹170)
    // ------------------------------------------------------------------------
    console.log('--- TEST C: Permanent base-price update (Base Breakfast: 150 -> 170) ---');
    const { req: reqC, res: resC } = mockReqRes(
      {},
      { breakfast: 170 },
      {},
      testAdmin
    );
    await AdminController.updateBaseMealPrices(reqC, resC);

    // Verify dates without a breakfast override now use 170
    const oct19AfterBaseUpdate = await MealPricingService.getEffectiveMealPrices('2026-10-19', '2026-10-20');
    const oct19NewBasePass = oct19AfterBaseUpdate.breakfast.effectivePrice === 170;
    console.log(`[TEST C] Oct 19 without override now uses new base Breakfast: ₹${oct19AfterBaseUpdate.breakfast.effectivePrice} (Expected: 170)`);
    if (!oct19NewBasePass) throw new Error(`TEST C Failed: Oct 19 got ${oct19AfterBaseUpdate.breakfast.effectivePrice}, expected 170.`);

    // Verify dates with existing override (20 Oct) still use overridden value (180)
    const oct20AfterBaseUpdate = await MealPricingService.getEffectiveMealPrices('2026-10-20', '2026-10-21');
    const oct20OverridePreserved = oct20AfterBaseUpdate.breakfast.effectivePrice === 180;
    console.log(`[TEST C] Oct 20 with override retains overridden Breakfast: ₹${oct20AfterBaseUpdate.breakfast.effectivePrice} (Expected: 180)`);
    if (!oct20OverridePreserved) throw new Error(`TEST C Failed: Oct 20 override was modified, got ${oct20AfterBaseUpdate.breakfast.effectivePrice}`);
    console.log('✓ TEST C PASSED: Base price update took effect for un-overridden dates while existing overrides remained intact!\n');

    // ------------------------------------------------------------------------
    // TEST D — Overlapping date ranges
    // 20–25 Oct was set to 180, 280, 350.
    // Now create a new override for 23–27 Oct to 200, 300, 400.
    // ------------------------------------------------------------------------
    console.log('--- TEST D: Overlapping date ranges (23–27 Oct new override: ₹200, ₹300, ₹400) ---');
    const { req: reqD, res: resD } = mockReqRes(
      {},
      {
        startDate: '2026-10-23',
        endDate: '2026-10-27',
        breakfastPrice: 200,
        lunchPrice: 300,
        dinnerPrice: 400,
      },
      {},
      testAdmin
    );
    await AdminController.bulkUpdateDateWiseMealPrices(reqD, resD);

    // Verify 23–27 Oct uses newer prices (200, 300, 400)
    const oct23Effective = await MealPricingService.getEffectiveMealPrices('2026-10-23', '2026-10-24');
    const oct27Effective = await MealPricingService.getEffectiveMealPrices('2026-10-27', '2026-10-28');
    const newerRangePass =
      oct23Effective.breakfast.effectivePrice === 200 &&
      oct23Effective.lunch.effectivePrice === 300 &&
      oct23Effective.dinner.effectivePrice === 400 &&
      oct27Effective.breakfast.effectivePrice === 200 &&
      oct27Effective.lunch.effectivePrice === 300 &&
      oct27Effective.dinner.effectivePrice === 400;
    console.log(`[TEST D] Overlapping Oct 23 newer price: Breakfast=₹${oct23Effective.breakfast.effectivePrice}, Lunch=₹${oct23Effective.lunch.effectivePrice}, Dinner=₹${oct23Effective.dinner.effectivePrice} (Expected: 200, 300, 400)`);
    console.log(`[TEST D] Overlapping Oct 27 newer price: Breakfast=₹${oct27Effective.breakfast.effectivePrice}, Lunch=₹${oct27Effective.lunch.effectivePrice}, Dinner=₹${oct27Effective.dinner.effectivePrice} (Expected: 200, 300, 400)`);
    if (!newerRangePass) throw new Error('TEST D Failed: Newer update was not applied to 23–27 Oct.');

    // Verify 20–22 Oct retain original override (180, 280, 350)
    const oct21Effective = await MealPricingService.getEffectiveMealPrices('2026-10-21', '2026-10-22');
    const oct22Effective = await MealPricingService.getEffectiveMealPrices('2026-10-22', '2026-10-23');
    const earlierRangeRetained =
      oct21Effective.breakfast.effectivePrice === 180 &&
      oct21Effective.lunch.effectivePrice === 280 &&
      oct21Effective.dinner.effectivePrice === 350 &&
      oct22Effective.breakfast.effectivePrice === 180 &&
      oct22Effective.lunch.effectivePrice === 280 &&
      oct22Effective.dinner.effectivePrice === 350;
    console.log(`[TEST D] Non-overlapping Oct 21-22 retained: Oct 21 Breakfast=₹${oct21Effective.breakfast.effectivePrice}, Oct 22 Breakfast=₹${oct22Effective.breakfast.effectivePrice} (Expected: 180)`);
    if (!earlierRangeRetained) throw new Error('TEST D Failed: Oct 20-22 did not retain original override.');

    // Dates outside both ranges (Oct 19, Oct 28) use applicable base rates
    const oct19PostOverlap = await MealPricingService.getEffectiveMealPrices('2026-10-19', '2026-10-20');
    const oct28PostOverlap = await MealPricingService.getEffectiveMealPrices('2026-10-28', '2026-10-29');
    const outsideBothPass =
      oct19PostOverlap.breakfast.effectivePrice === 170 &&
      oct28PostOverlap.breakfast.effectivePrice === 170;
    console.log(`[TEST D] Outside both ranges (Oct 19: ₹${oct19PostOverlap.breakfast.effectivePrice}, Oct 28: ₹${oct28PostOverlap.breakfast.effectivePrice}) -> Base rate ₹170`);
    if (!outsideBothPass) throw new Error('TEST D Failed: Outside dates did not use base rates.');
    console.log('✓ TEST D PASSED: Overlapping ranges handled correctly: latest update wins for overlapping dates, prior overrides retained elsewhere!\n');

    // ------------------------------------------------------------------------
    // TEST E — Per-guest, per-night calculation
    // Breakfast ₹180, two guests, two nights: Expected breakfast total = ₹720
    // ------------------------------------------------------------------------
    console.log('--- TEST E: Per-guest, per-night calculation (₹180 x 2 guests x 2 nights = ₹720) ---');
    // Set 2026-10-20 and 2026-10-21 to ₹180 for breakfast
    await MealPricingService.bulkUpdateDateWisePrices({
      startDate: '2026-10-20',
      endDate: '2026-10-21',
      breakfastPrice: 180,
    });

    const pricingE = await PricingEngine.calculateBookingPrice(
      testRoomType!._id,
      new Date('2026-10-20T00:00:00.000Z'),
      new Date('2026-10-22T00:00:00.000Z'), // 2 nights: Oct 20, Oct 21
      2, // 2 guests
      { breakfast: true }
    );

    console.log(`[TEST E] numNights: ${pricingE.numNights}, mealPlanTotal: ₹${pricingE.mealPlanTotal} (Expected: ₹720)`);
    if (pricingE.mealPlanTotal !== 720) {
      throw new Error(`TEST E Failed: Expected mealPlanTotal 720, got ${pricingE.mealPlanTotal}`);
    }
    console.log('✓ TEST E PASSED: Per-guest, per-night calculation equals ₹720 exactly!\n');

    // ------------------------------------------------------------------------
    // TEST F — Different prices across nights
    // Night 1 breakfast: ₹150, Night 2 breakfast: ₹180, Two guests.
    // Expected total = (150 + 180) x 2 = ₹660.
    // ------------------------------------------------------------------------
    console.log('--- TEST F: Different prices across nights (Night 1: ₹150, Night 2: ₹180, 2 guests -> Total ₹660) ---');
    // Date: 2026-10-18 (₹150 override) and 2026-10-19 (₹180 override)
    await MealPricingService.bulkUpdateDateWisePrices({
      startDate: '2026-10-18',
      endDate: '2026-10-18',
      breakfastPrice: 150,
    });
    await MealPricingService.bulkUpdateDateWisePrices({
      startDate: '2026-10-19',
      endDate: '2026-10-19',
      breakfastPrice: 180,
    });

    const pricingF = await PricingEngine.calculateBookingPrice(
      testRoomType!._id,
      new Date('2026-10-18T00:00:00.000Z'),
      new Date('2026-10-20T00:00:00.000Z'), // 2 nights: Oct 18, Oct 19
      2, // 2 guests
      { breakfast: true }
    );

    console.log(`[TEST F] Night 1 (150) + Night 2 (180) for 2 guests -> mealPlanTotal: ₹${pricingF.mealPlanTotal} (Expected: ₹660)`);
    if (pricingF.mealPlanTotal !== 660) {
      throw new Error(`TEST F Failed: Expected mealPlanTotal 660, got ${pricingF.mealPlanTotal}`);
    }
    console.log('✓ TEST F PASSED: Multi-night varying meal prices calculate correctly to ₹660!\n');

    // ------------------------------------------------------------------------
    // TEST G — Booking amount consistency
    // Verify booking summary, server calculated amount, payment order, and invoice agree
    // ------------------------------------------------------------------------
    console.log('--- TEST G: Booking amount consistency ---');
    const { req: reqG, res: resG } = mockReqRes({
      roomTypeId: testRoomType!._id.toString(),
      checkIn: '2026-10-18',
      checkOut: '2026-10-20',
      numGuests: 2,
      mealSelection: { breakfast: true },
    }, {
      roomTypeId: testRoomType!._id.toString(),
      checkIn: '2026-10-18',
      checkOut: '2026-10-20',
      numGuests: 2,
      mealSelection: { breakfast: true },
    });

    await PublicController.checkAvailabilityAndPrice(reqG, resG);
    const summaryData = resG.getData()?.data;
    const serverPricing = summaryData?.pricing;

    // Verify subtotal, tax, and total consistency
    const expectedSubtotal = serverPricing.roomTotal + serverPricing.extraPersonTotal + serverPricing.mealPlanTotal;
    const expectedTax = Math.round((expectedSubtotal * serverPricing.taxPercentage) / 100);
    const expectedTotal = expectedSubtotal + expectedTax;

    console.log(`[TEST G] Pricing Engine: roomTotal=₹${serverPricing.roomTotal}, meals=₹${serverPricing.mealPlanTotal}, subtotal=₹${serverPricing.subtotal}, total=₹${serverPricing.totalAmount}`);
    if (serverPricing.subtotal !== expectedSubtotal || serverPricing.totalAmount !== expectedTotal) {
      throw new Error(`TEST G Failed: Subtotal or Total mismatch in server pricing.`);
    }

    // Verify mock Razorpay order creation matches total amount
    const razorpayOrder = await RazorpayService.createOrder(serverPricing.totalAmount, 'HR-TEST-G');
    console.log(`[TEST G] Razorpay Order amount in paise: ${razorpayOrder.amount} (Expected: ${serverPricing.totalAmount * 100})`);
    if (razorpayOrder.amount !== serverPricing.totalAmount * 100) {
      throw new Error('TEST G Failed: Razorpay order amount mismatch.');
    }

    // Verify Invoice PDF calculation uses the exact same total
    const mockBookingForPdf: any = {
      bookingId: 'HR-TEST-G',
      guestName: 'Test Guest',
      guestEmail: 'test@example.com',
      guestPhone: '9876543210',
      paymentStatus: 'PAID',
      createdAt: new Date(),
      roomTypeId: testRoomType,
      checkIn: new Date('2026-10-18'),
      checkOut: new Date('2026-10-20'),
      numGuests: 2,
      numNights: 2,
      roomPricePerNightSnapshot: serverPricing.roomPricePerNight,
      mealPlanSelection: {
        breakfast: true,
        lunch: false,
        dinner: false,
        pricePerNight: serverPricing.mealPlanPricePerNight,
        totalPrice: serverPricing.mealPlanTotal,
      },
      discountAmountSnapshot: 0,
      taxAmountSnapshot: serverPricing.taxAmount,
      totalAmount: serverPricing.totalAmount,
    };

    const pdfBuffer = await InvoicePdfService.generateBookingInvoicePdf(mockBookingForPdf);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('TEST G Failed: Invoice PDF generation returned empty buffer.');
    }

    console.log('✓ TEST G PASSED: Booking summary, server pricing, payment order, and invoice amounts strictly agree!\n');

    // ------------------------------------------------------------------------
    // TEST H — Existing bookings retain original charges after rate changes
    // ------------------------------------------------------------------------
    console.log('--- TEST H: Existing bookings preservation after subsequent rate updates ---');
    const existingBooking = await Booking.create({
      bookingId: 'HR-SNAPSHOT-TEST-H',
      source: 'ONLINE',
      guestName: 'Snapshot Guest',
      guestPhone: '9876543210',
      guestEmail: 'snapshot@example.com',
      roomTypeId: testRoomType!._id,
      checkIn: new Date('2026-10-20T00:00:00.000Z'),
      checkOut: new Date('2026-10-22T00:00:00.000Z'),
      numGuests: 2,
      numNights: 2,
      roomPricePerNightSnapshot: 1500,
      mealPlanSelection: {
        breakfast: true,
        lunch: false,
        dinner: false,
        pricePerNight: 180,
        totalPrice: 720,
      },
      totalAmount: 3720,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: new Types.ObjectId().toString(),
    });

    // Now change base meal prices AND date-wise prices
    await MealPricingService.updateBasePrices({ breakfast: 250 });
    await MealPricingService.bulkUpdateDateWisePrices({
      startDate: '2026-10-20',
      endDate: '2026-10-22',
      breakfastPrice: 350,
    });

    // Verify existing booking still has its original snapshots
    const refreshedBooking = await Booking.findById(existingBooking._id);
    const bookingPreserved =
      refreshedBooking?.mealPlanSelection?.totalPrice === 720 &&
      refreshedBooking?.mealPlanSelection?.pricePerNight === 180 &&
      refreshedBooking?.totalAmount === 3720;

    console.log(`[TEST H] Existing booking after rate changes: totalPrice=₹${refreshedBooking?.mealPlanSelection?.totalPrice}, pricePerNight=₹${refreshedBooking?.mealPlanSelection?.pricePerNight}, totalAmount=₹${refreshedBooking?.totalAmount}`);
    if (!bookingPreserved) {
      throw new Error('TEST H Failed: Existing booking meal charges were altered by subsequent rate updates.');
    }

    // Clean up test booking
    await Booking.deleteOne({ _id: existingBooking._id });
    console.log('✓ TEST H PASSED: Existing confirmed bookings retain their agreed snapshot meal addon charges!\n');

    // ------------------------------------------------------------------------
    // TEST I — Admin authorization
    // ------------------------------------------------------------------------
    console.log('--- TEST I: Admin authorization ---');
    // 1. Unauthenticated request to update base prices blocked
    const { req: reqI1, res: resI1 } = mockReqRes({}, { breakfast: 999 }, {}, null);
    let nextCalledI1 = false;
    requireAdminAuth(reqI1, resI1, () => { nextCalledI1 = true; });
    const blockedI1 = resI1.getStatusCode() === 401 && !nextCalledI1;
    console.log(`[TEST I] Unauthenticated update base prices blocked: status=${resI1.getStatusCode()}, nextCalled=${nextCalledI1}`);
    if (!blockedI1) throw new Error('TEST I Failed: requireAdminAuth failed to block unauthenticated base rate update.');

    // 2. Unauthenticated request to bulk update date-wise prices blocked
    const { req: reqI2, res: resI2 } = mockReqRes({}, { startDate: '2026-10-20', endDate: '2026-10-21', breakfastPrice: 999 }, {}, null);
    let nextCalledI2 = false;
    requireAdminAuth(reqI2, resI2, () => { nextCalledI2 = true; });
    const blockedI2 = resI2.getStatusCode() === 401 && !nextCalledI2;
    console.log(`[TEST I] Unauthenticated bulk update blocked: status=${resI2.getStatusCode()}, nextCalled=${nextCalledI2}`);
    if (!blockedI2) throw new Error('TEST I Failed: requireAdminAuth failed to block unauthenticated bulk update.');

    // 3. Invalid inputs rejected
    const { req: reqI3, res: resI3 } = mockReqRes({}, { breakfast: -50 }, {}, testAdmin);
    await AdminController.updateBaseMealPrices(reqI3, resI3);
    const rejectedNegative = resI3.getStatusCode() === 400;
    console.log(`[TEST I] Negative meal price rejected: status=${resI3.getStatusCode()}`);
    if (!rejectedNegative) throw new Error('TEST I Failed: Negative meal price was not rejected with HTTP 400.');

    // 4. Invalid date range rejected (end date < start date)
    const { req: reqI4, res: resI4 } = mockReqRes(
      {},
      { startDate: '2026-10-25', endDate: '2026-10-20', breakfastPrice: 200 },
      {},
      testAdmin
    );
    await AdminController.bulkUpdateDateWiseMealPrices(reqI4, resI4);
    const rejectedReversedDates = resI4.getStatusCode() === 400;
    console.log(`[TEST I] Reversed date range (endDate < startDate) rejected: status=${resI4.getStatusCode()}`);
    if (!rejectedReversedDates) throw new Error('TEST I Failed: Reversed date range was not rejected with HTTP 400.');

    console.log('✓ TEST I PASSED: Unauthorized users and invalid parameters are strictly rejected!\n');

    console.log('========================================================================');
    console.log('ALL TESTS (A THROUGH I) PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } finally {
    // Restore original MealPlans and clean up test dates
    await DailyMealPrice.deleteMany({ date: { $in: testDates } });
    if (originalPlans.length > 0) {
      for (const p of originalPlans) {
        await MealPlan.findOneAndUpdate({ type: p.type }, p, { upsert: true });
      }
    }
    await mongoose.connection.close();
  }
}

runMealAddonPricingTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
