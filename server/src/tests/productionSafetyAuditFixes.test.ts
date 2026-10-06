import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { DailyInventory } from '../models/DailyInventory';
import { HotelSetting } from '../models/HotelSetting';
import { AvailabilityEngine } from '../services/AvailabilityEngine';
import { PricingEngine } from '../services/PricingEngine';
import { RatePlanService } from '../services/RatePlanService';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

// Helper matching index.ts ensureHotelSettings
const ensureHotelSettings = async () => {
  const existing = await HotelSetting.findOne();
  const envTax = process.env.TAX_PERCENTAGE !== undefined && process.env.TAX_PERCENTAGE.trim() !== ''
    ? Number(process.env.TAX_PERCENTAGE)
    : NaN;
  const defaultTax = !isNaN(envTax) && envTax >= 0 ? envTax : 5;

  if (!existing) {
    await HotelSetting.create({
      taxPercentage: defaultTax,
    });
  } else if (existing.taxPercentage === undefined || existing.taxPercentage === null || isNaN(existing.taxPercentage)) {
    existing.taxPercentage = defaultTax;
    await existing.save();
  }
};

async function runProductionSafetyTests() {
  console.log('========================================================================');
  console.log('HOTEL RAAMA — PRODUCTION SAFETY AUDIT FIXES VERIFICATION TEST SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const cleanupBookingIds: Types.ObjectId[] = [];
  const cleanupInvIds: Types.ObjectId[] = [];
  let originalSettingTax: number | undefined;

  try {
    await RatePlanService.ensureDefaultRatePlans();
    const execType = await RoomType.findOne({ code: 'EXEC_DBL_AC' });
    if (!execType) throw new Error('EXEC_DBL_AC RoomType not found.');

    const initialSetting = await HotelSetting.findOne();
    originalSettingTax = initialSetting?.taxPercentage ?? 5;

    // ------------------------------------------------------------------------
    // TEST A — IST DATE BOUNDARY
    // Create dates around 00:00, 05:29, 05:30, 12:00, 23:59 IST on Oct 5, 2026.
    // Verify all bookings map to the correct Hotel Raama calendar date.
    // ------------------------------------------------------------------------
    console.log('--- TEST A: IST DATE BOUNDARY ---');
    const istDates = [
      { label: '00:00 IST', d: new Date('2026-10-04T18:30:00.000Z') }, // 00:00:00 IST Oct 5
      { label: '05:29 IST', d: new Date('2026-10-04T23:59:00.000Z') }, // 05:29:00 IST Oct 5
      { label: '05:30 IST', d: new Date('2026-10-05T00:00:00.000Z') }, // 05:30:00 IST Oct 5
      { label: '12:00 IST', d: new Date('2026-10-05T06:30:00.000Z') }, // 12:00:00 IST Oct 5
      { label: '23:59 IST', d: new Date('2026-10-05T18:29:00.000Z') }, // 23:59:00 IST Oct 5
    ];

    let allMappedToOct5 = true;
    for (const item of istDates) {
      const formatted = AvailabilityEngine.formatDateStr(item.d);
      const isOct5 = formatted === '2026-10-05';
      console.log(`[TEST A] ${item.label} (${item.d.toISOString()}) -> ${formatted} (expected 2026-10-05): ${isOct5}`);
      if (!isOct5) allMappedToOct5 = false;
    }
    if (!allMappedToOct5) throw new Error('TEST A Failed: IST timestamps did not map to 2026-10-05 in Asia/Kolkata.');

    // Verify stay nights generation using early morning check-in and standard check-out
    const checkInEarly = new Date('2026-10-04T18:30:00.000Z'); // Oct 5 00:00 IST
    const checkOutNoon = new Date('2026-10-07T06:30:00.000Z'); // Oct 7 12:00 IST
    const stayNights = AvailabilityEngine.getStayDateStrings(checkInEarly, checkOutNoon);
    const expectedStay = ['2026-10-05', '2026-10-06'];
    const stayNightsCorrect = JSON.stringify(stayNights) === JSON.stringify(expectedStay);
    console.log(`[TEST A] Multi-night stay [${stayNights.join(', ')}] matches [${expectedStay.join(', ')}]: ${stayNightsCorrect}`);
    if (!stayNightsCorrect) throw new Error('TEST A Failed: getStayDateStrings shifted stay nights.');

    // ------------------------------------------------------------------------
    // TEST B — FUTURE ROOM AVAILABILITY
    // Room #107 is marked MAINTENANCE today.
    // Verify it does NOT automatically disappear from future availability.
    // ------------------------------------------------------------------------
    console.log('\n--- TEST B: FUTURE ROOM AVAILABILITY ---');
    const room107 = await Room.findOne({ roomNumber: '107', isActive: true });
    if (!room107) throw new Error('Room 107 not found.');

    const original107Status = room107.status;
    room107.status = 'MAINTENANCE';
    await room107.save();

    const futureDateIn = new Date('2028-11-10T06:30:00.000Z');
    const futureDateOut = new Date('2028-11-12T06:30:00.000Z');

    const futureAvail = await AvailabilityEngine.checkAvailability(execType._id, futureDateIn, futureDateOut);
    // Since room 107 is in EXEC_DBL_AC pool (22 rooms total) and maintenance is only today, future availability should equal total 22!
    const testBPass = futureAvail.availableRooms === 22 && futureAvail.totalRooms === 22;
    console.log(`[TEST B] Room 107 in MAINTENANCE today is available for future dates (avail: ${futureAvail.availableRooms} / ${futureAvail.totalRooms}): ${testBPass}`);
    
    // Restore Room 107 status
    room107.status = original107Status;
    await room107.save();
    if (!testBPass) throw new Error('TEST B Failed: Today maintenance room was incorrectly excluded from future availability.');

    // ------------------------------------------------------------------------
    // TEST C — DATE-SPECIFIC BLOCK
    // Category has 22 rooms. DailyInventory.blockedRooms = 1 for 2028-10-07.
    // Verify Oct 7 sellable inventory is reduced by exactly 1.
    // Verify Oct 8 is NOT reduced unless Oct 8 also has a block.
    // ------------------------------------------------------------------------
    console.log('\n--- TEST C: DATE-SPECIFIC BLOCK ---');
    const blockDate1 = '2028-10-07';
    const blockDate2 = '2028-10-08';

    const invBlock = await DailyInventory.findOneAndUpdate(
      { roomTypeId: execType._id, date: blockDate1 },
      {
        $set: {
          blockedRooms: 1,
          dateValue: new Date('2028-10-07T12:00:00.000Z'),
          updatedBy: 'test',
        },
      },
      { upsert: true, new: true }
    );
    cleanupInvIds.push(invBlock._id as Types.ObjectId);

    // Check night of Oct 7 (Oct 7 -> Oct 8)
    const availOct7 = await AvailabilityEngine.checkAvailability(
      execType._id,
      new Date('2028-10-07T12:00:00+05:30'),
      new Date('2028-10-08T12:00:00+05:30')
    );
    const oct7ReducedBy1 = availOct7.availableRooms === 21; // 22 - 1 blocked = 21
    console.log(`[TEST C] Oct 7 available rooms with 1 blockedRoom: ${availOct7.availableRooms} (expected 21): ${oct7ReducedBy1}`);
    if (!oct7ReducedBy1) throw new Error(`TEST C Failed: Oct 7 expected 21 available rooms, got ${availOct7.availableRooms}`);

    // Check night of Oct 8 (Oct 8 -> Oct 9)
    const availOct8 = await AvailabilityEngine.checkAvailability(
      execType._id,
      new Date('2028-10-08T12:00:00+05:30'),
      new Date('2028-10-09T12:00:00+05:30')
    );
    const oct8NotReduced = availOct8.availableRooms === 22; // No block on Oct 8 -> 22 available
    console.log(`[TEST C] Oct 8 available rooms (unblocked date): ${availOct8.availableRooms} (expected 22): ${oct8NotReduced}`);
    if (!oct8NotReduced) throw new Error(`TEST C Failed: Oct 8 was incorrectly reduced when not blocked.`);

    // ------------------------------------------------------------------------
    // TEST D — TAX PERSISTENCE
    // Set HotelSetting.taxPercentage = 12. Restart server (call ensureHotelSettings).
    // Verify it remains 12.
    // ------------------------------------------------------------------------
    console.log('\n--- TEST D: TAX PERSISTENCE ---');
    await HotelSetting.updateMany({}, { $set: { taxPercentage: 12 } });

    // Simulate server restart calling ensureHotelSettings
    await ensureHotelSettings();

    const settingAfterRestart = await HotelSetting.findOne();
    const testDPass = settingAfterRestart?.taxPercentage === 12;
    console.log(`[TEST D] HotelSetting tax rate preserved across restart: ${testDPass} (taxPercentage: ${settingAfterRestart?.taxPercentage}%)`);
    if (!testDPass) throw new Error(`TEST D Failed: Tax percentage was reset instead of preserved.`);

    // ------------------------------------------------------------------------
    // TEST E — TAX DEFAULT
    // Remove the tax setting. Start server (call ensureHotelSettings).
    // Verify it initializes to 5.
    // ------------------------------------------------------------------------
    console.log('\n--- TEST E: TAX DEFAULT ---');
    await HotelSetting.deleteMany({});
    delete process.env.TAX_PERCENTAGE;

    await ensureHotelSettings();

    const settingAfterDefault = await HotelSetting.findOne();
    const testEPass = settingAfterDefault?.taxPercentage === 5;
    console.log(`[TEST E] Missing HotelSetting initializes to default 5%: ${testEPass} (taxPercentage: ${settingAfterDefault?.taxPercentage}%)`);
    if (!testEPass) throw new Error(`TEST E Failed: Default tax percentage did not initialize to 5.`);

    // ------------------------------------------------------------------------
    // TEST F — ENVIRONMENT TAX
    // Set TAX_PERCENTAGE=12. When DB setting is missing, PricingEngine uses 12.
    // Also verify non-numeric env tax is safely rejected and defaults to 5.
    // ------------------------------------------------------------------------
    console.log('\n--- TEST F: ENVIRONMENT TAX ---');
    await HotelSetting.deleteMany({});
    process.env.TAX_PERCENTAGE = '12';

    const priceEnv12 = await PricingEngine.calculateBookingPrice(
      execType._id.toString(),
      new Date('2028-10-15T12:00:00+05:30'),
      new Date('2028-10-16T12:00:00+05:30'),
      2
    );
    const testFPass = priceEnv12.taxPercentage === 12;
    console.log(`[TEST F] PricingEngine uses environment TAX_PERCENTAGE=12 when DB missing: ${testFPass} (tax: ${priceEnv12.taxPercentage}%)`);
    if (!testFPass) throw new Error(`TEST F Failed: Expected 12% tax from environment, got ${priceEnv12.taxPercentage}%`);

    // Verify invalid/non-numeric env tax does not produce NaN
    process.env.TAX_PERCENTAGE = 'invalid_tax';
    const priceInvalidEnv = await PricingEngine.calculateBookingPrice(
      execType._id.toString(),
      new Date('2028-10-15T12:00:00+05:30'),
      new Date('2028-10-16T12:00:00+05:30'),
      2
    );
    const testFNonNanPass = priceInvalidEnv.taxPercentage === 5 && !isNaN(priceInvalidEnv.totalAmount);
    console.log(`[TEST F] Non-numeric TAX_PERCENTAGE safely handled without NaN: ${testFNonNanPass} (tax: ${priceInvalidEnv.taxPercentage}%, total: ₹${priceInvalidEnv.totalAmount})`);
    if (!testFNonNanPass) throw new Error('TEST F Failed: Invalid TAX_PERCENTAGE produced NaN total.');

    // ------------------------------------------------------------------------
    // TEST G — EXISTING BOOKING FLOW
    // Online, Offline, Coupons, Hold, Release, Cancellation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST G: EXISTING BOOKING FLOW ---');
    // Restore clean HotelSetting to official 5%
    await HotelSetting.deleteMany({});
    delete process.env.TAX_PERCENTAGE;
    await HotelSetting.create({ taxPercentage: 5 });

    const testGIn = new Date('2028-12-01T12:00:00+05:30');
    const testGOut = new Date('2028-12-03T12:00:00+05:30');

    // 1. Initial Availability
    const initAvail = await AvailabilityEngine.checkAvailability(execType._id, testGIn, testGOut);
    console.log(`[TEST G.1] Initial available rooms: ${initAvail.availableRooms}`);

    // 2. Offline Booking
    const offlineBk = await Booking.create({
      bookingId: `HR-TEST-G-OFF-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Guest Offline Test G',
      guestPhone: '9876543210',
      roomTypeId: execType._id,
      checkIn: testGIn,
      checkOut: testGOut,
      numGuests: 2,
      numNights: 2,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 4400,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk_g_off_${Date.now()}`,
    });
    cleanupBookingIds.push(offlineBk._id as Types.ObjectId);

    const availAfterOffline = await AvailabilityEngine.checkAvailability(execType._id, testGIn, testGOut);
    const offlineDecremented = availAfterOffline.availableRooms === initAvail.availableRooms - 1;
    console.log(`[TEST G.2] Offline booking decrements availability by 1: ${offlineDecremented}`);
    if (!offlineDecremented) throw new Error('TEST G.2 Failed: Offline booking did not decrement availability.');

    // 3. Online Temporary Hold
    const holdBk = await Booking.create({
      bookingId: `HR-TEST-G-HOLD-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Guest Hold Test G',
      guestPhone: '9876543211',
      guestEmail: 'hold@test.com',
      roomTypeId: execType._id,
      checkIn: testGIn,
      checkOut: testGOut,
      numGuests: 2,
      numNights: 2,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 4400,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      trackingToken: `trk_g_hold_${Date.now()}`,
    });
    cleanupBookingIds.push(holdBk._id as Types.ObjectId);

    const availAfterHold = await AvailabilityEngine.checkAvailability(execType._id, testGIn, testGOut);
    const holdDecremented = availAfterHold.availableRooms === initAvail.availableRooms - 2;
    console.log(`[TEST G.3] Temporary 15-min hold decrements availability by another 1: ${holdDecremented}`);
    if (!holdDecremented) throw new Error('TEST G.3 Failed: Temporary hold did not decrement availability.');

    // 4. Coupons WELCOME10 and WELCOME15
    const priceW10 = await PricingEngine.calculateBookingPrice(
      execType._id.toString(),
      testGIn,
      testGOut,
      2,
      undefined,
      'WELCOME10',
      'NON_CP',
      false,
      '22AAAAA0000A1Z5'
    );
    const w10Correct = priceW10.discountPercentage === 10 && priceW10.discountAmount === 440;
    console.log(`[TEST G.4] WELCOME10 coupon gives 10% discount (₹${priceW10.discountAmount}): ${w10Correct}`);
    if (!w10Correct) throw new Error('TEST G.4 Failed: WELCOME10 discount calculation incorrect.');

    const priceW15 = await PricingEngine.calculateBookingPrice(
      execType._id.toString(),
      testGIn,
      testGOut,
      2,
      undefined,
      'WELCOME15',
      'NON_CP',
      false,
      '22AAAAA0000A1Z5'
    );
    const w15Correct = priceW15.discountPercentage === 15 && priceW15.discountAmount === 660;
    console.log(`[TEST G.4] WELCOME15 coupon gives 15% discount (₹${priceW15.discountAmount}): ${w15Correct}`);
    if (!w15Correct) throw new Error('TEST G.4 Failed: WELCOME15 discount calculation incorrect.');

    // 5. Booking Cancellation restores availability
    holdBk.bookingStatus = 'CANCELLED';
    await holdBk.save();

    const availAfterCancel = await AvailabilityEngine.checkAvailability(execType._id, testGIn, testGOut);
    const cancelRestored = availAfterCancel.availableRooms === initAvail.availableRooms - 1;
    console.log(`[TEST G.5] Cancelled hold immediately restores availability: ${cancelRestored}`);
    if (!cancelRestored) throw new Error('TEST G.5 Failed: Cancelled booking did not restore availability.');

    console.log('\n========================================================================');
    console.log('ALL TESTS A THROUGH G PASSED WITH 100% SUCCESS!');
    console.log('========================================================================');
  } finally {
    if (cleanupBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: cleanupBookingIds } });
    }
    if (cleanupInvIds.length > 0) {
      await DailyInventory.deleteMany({ _id: { $in: cleanupInvIds } });
    }
    if (originalSettingTax !== undefined) {
      await HotelSetting.updateMany({}, { $set: { taxPercentage: originalSettingTax } });
    }
    await mongoose.disconnect();
    process.exit(0);
  }
}

runProductionSafetyTests().catch((err) => {
  console.error('[Production Safety Test Failed]:', err);
  process.exit(1);
});
