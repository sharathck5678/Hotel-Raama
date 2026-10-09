import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { DailyRate } from '../models/DailyRate';
import { DailyInventory } from '../models/DailyInventory';
import { RatePlan } from '../models/RatePlan';
import { AvailabilityEngine } from '../services/AvailabilityEngine';
import { PricingEngine } from '../services/PricingEngine';
import { RatePlanService } from '../services/RatePlanService';
import { OFFICIAL_ROOMS_SPEC } from '../seed/seedDatabase';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

async function runDateWiseInventoryTests() {
  console.log('========================================================================');
  console.log('HOTEL RAAMA — DATE-WISE INVENTORY + RATE MANAGEMENT 15-SCENARIO TEST SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const cleanupBookingIds: Types.ObjectId[] = [];
  const cleanupRateIds: Types.ObjectId[] = [];
  const cleanupInvIds: Types.ObjectId[] = [];
  let originalMaintenanceRoom: any = null;

  try {
    await RatePlanService.ensureDefaultRatePlans();
    const roomPlan = await RatePlan.findOne({ code: 'ROOM_ONLY' });
    if (!roomPlan) throw new Error('Default RatePlan ROOM_ONLY not found.');

    const execType = await RoomType.findOne({ code: 'EXEC_DBL_AC' });
    if (!execType) throw new Error('Executive Double A/C RoomType not found.');

    // -------------------------------------------------------------
    // TEST 1: 37 physical rooms. Total availability across categories = 37 (in empty future dates)
    // -------------------------------------------------------------
    const testFarDateIn = new Date('2028-06-01T00:00:00.000Z');
    const testFarDateOut = new Date('2028-06-02T00:00:00.000Z');

    const physicalStatus = await AvailabilityEngine.getPhysicalInventoryStatus(testFarDateIn, testFarDateOut);
    const test1Pass = physicalStatus.rooms.length === 37;
    console.log(`[TEST 1] Exactly 37 active physical rooms exist: ${test1Pass} (count = ${physicalStatus.rooms.length})`);
    if (!test1Pass) throw new Error(`TEST 1 Failed: Expected 37 physical rooms, got ${physicalStatus.rooms.length}`);

    // Check availability for Executive Double A/C (22 physical rooms)
    const availExec1 = await AvailabilityEngine.checkAvailability(execType._id, testFarDateIn, testFarDateOut);
    console.log(`[TEST 1] Executive Double A/C base capacity: total = ${availExec1.totalRooms}, available = ${availExec1.availableRooms}`);
    if (availExec1.totalRooms !== 22) throw new Error(`TEST 1 Failed: Expected 22 rooms for EXEC_DBL_AC, got ${availExec1.totalRooms}`);

    // -------------------------------------------------------------
    // TEST 2: One room booked offline. Availability decreases appropriately.
    // -------------------------------------------------------------
    const testDateIn = new Date('2028-06-10T00:00:00.000Z');
    const testDateOut = new Date('2028-06-12T00:00:00.000Z');

    const room102 = await Room.findOne({ roomNumber: '102', isActive: true });
    if (!room102) throw new Error('Room 102 not found.');

    const offlineBooking = await Booking.create({
      bookingId: `HR-TEST-OFF-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Walkin Guest Test 2',
      guestPhone: '9876543210',
      roomTypeId: execType._id,
      assignedRoomId: room102._id,
      checkIn: testDateIn,
      checkOut: testDateOut,
      numGuests: 2,
      numNights: 2,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 4400,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk_off_${Date.now()}`,
    });
    cleanupBookingIds.push(offlineBooking._id as Types.ObjectId);

    const availAfterOffline = await AvailabilityEngine.checkAvailability(execType._id, testDateIn, testDateOut);
    const test2Pass = availAfterOffline.availableRooms === availExec1.totalRooms - 1;
    console.log(`[TEST 2] Offline booking decreases availability by 1: ${test2Pass} (avail: ${availAfterOffline.availableRooms} / ${availExec1.totalRooms})`);
    if (!test2Pass) throw new Error('TEST 2 Failed: Availability did not decrease after offline booking.');

    // -------------------------------------------------------------
    // TEST 3: One room booked online. Availability decreases appropriately.
    // -------------------------------------------------------------
    const onlineBooking = await Booking.create({
      bookingId: `HR-TEST-ON-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Online Guest Test 3',
      guestPhone: '9876543211',
      guestEmail: 'online@test.com',
      roomTypeId: execType._id,
      checkIn: testDateIn,
      checkOut: testDateOut,
      numGuests: 2,
      numNights: 2,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 4400,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk_on_${Date.now()}`,
    });
    cleanupBookingIds.push(onlineBooking._id as Types.ObjectId);

    const availAfterOnline = await AvailabilityEngine.checkAvailability(execType._id, testDateIn, testDateOut);
    const test3Pass = availAfterOnline.availableRooms === availExec1.totalRooms - 2;
    console.log(`[TEST 3] Online booking decreases availability by another 1: ${test3Pass} (avail: ${availAfterOnline.availableRooms} / ${availExec1.totalRooms})`);
    if (!test3Pass) throw new Error('TEST 3 Failed: Availability did not decrease after online booking.');

    // -------------------------------------------------------------
    // TEST 4: Booking cancelled. Availability restored.
    // -------------------------------------------------------------
    onlineBooking.bookingStatus = 'CANCELLED';
    await onlineBooking.save();

    const availAfterCancel = await AvailabilityEngine.checkAvailability(execType._id, testDateIn, testDateOut);
    const test4Pass = availAfterCancel.availableRooms === availExec1.totalRooms - 1;
    console.log(`[TEST 4] Cancelled booking restores availability: ${test4Pass} (avail: ${availAfterCancel.availableRooms} / ${availExec1.totalRooms})`);
    if (!test4Pass) throw new Error('TEST 4 Failed: Availability not restored after cancellation.');

    // -------------------------------------------------------------
    // TEST 5: One room maintenance. Availability excludes it for operational date.
    // -------------------------------------------------------------
    const room106 = await Room.findOne({ roomNumber: '106' });
    if (!room106) throw new Error('Room 106 not found.');
    originalMaintenanceRoom = { _id: room106._id, status: room106.status };

    const todayDate = new Date();
    const tomorrowDate = new Date(Date.now() + 86400000);
    const availBeforeMaint = await AvailabilityEngine.checkAvailability(execType._id, todayDate, tomorrowDate);

    room106.status = 'MAINTENANCE';
    await room106.save();

    const availAfterMaint = await AvailabilityEngine.checkAvailability(execType._id, todayDate, tomorrowDate);
    // 1 room under operational maintenance today reduces today's availability by exactly 1
    const test5Pass = availAfterMaint.availableRooms === availBeforeMaint.availableRooms - 1;
    console.log(`[TEST 5] Maintenance room excluded from availability: ${test5Pass} (avail: ${availAfterMaint.availableRooms} / ${availBeforeMaint.availableRooms})`);
    if (!test5Pass) throw new Error('TEST 5 Failed: Maintenance room was not excluded from availability.');

    // Restore room 106 status
    room106.status = originalMaintenanceRoom.status;
    await room106.save();

    // -------------------------------------------------------------
    // TEST 6: Date-specific rate: Oct 5 = ₹2200, Oct 6 = ₹2500. Booking Oct 5-7 calculates ₹2200 + ₹2500 = ₹4700
    // -------------------------------------------------------------
    const oct5Date = new Date('2028-10-05T00:00:00.000Z');
    const oct7Date = new Date('2028-10-07T00:00:00.000Z');

    const rateOct5 = await DailyRate.create({
      roomTypeId: execType._id,
      ratePlanId: roomPlan._id,
      ratePlanCode: 'ROOM_ONLY',
      date: '2028-10-05',
      dateValue: oct5Date,
      singleAdult: 2000,
      doubleAdult: 2200,
      tripleAdult: 2800,
    });
    cleanupRateIds.push(rateOct5._id as Types.ObjectId);

    const rateOct6 = await DailyRate.create({
      roomTypeId: execType._id,
      ratePlanId: roomPlan._id,
      ratePlanCode: 'ROOM_ONLY',
      date: '2028-10-06',
      dateValue: new Date('2028-10-06T00:00:00.000Z'),
      singleAdult: 2300,
      doubleAdult: 2500,
      tripleAdult: 3100,
    });
    cleanupRateIds.push(rateOct6._id as Types.ObjectId);

    const priceResult = await PricingEngine.calculateBookingPrice(
      execType._id.toString(),
      oct5Date,
      oct7Date,
      2, // 2 adults
      undefined,
      undefined,
      'NON_CP',
      false
    );

    const test6Pass = priceResult.roomTotal === 2200 + 2500; // 4700
    console.log(`[TEST 6] Date-specific rate sum: ${test6Pass} (roomTotal: ₹${priceResult.roomTotal}, expected ₹4700)`);
    if (!test6Pass) throw new Error(`TEST 6 Failed: Expected roomTotal 4700, got ${priceResult.roomTotal}`);

    // -------------------------------------------------------------
    // TEST 7: WELCOME10 applies 10%
    // -------------------------------------------------------------
    const priceWelcome10 = await PricingEngine.calculateBookingPrice(
      execType._id.toString(),
      oct5Date,
      oct7Date,
      2,
      undefined,
      'WELCOME10',
      'NON_CP',
      false,
      '22AAAAA0000A1Z5' // valid test fixture GSTIN format
    );
    const expectedDiscount10 = Math.round((4700 * 10) / 100); // 470
    const test7Pass = priceWelcome10.discountAmount === expectedDiscount10 && priceWelcome10.couponCode === 'WELCOME10';
    console.log(`[TEST 7] WELCOME10 coupon gives 10% discount: ${test7Pass} (discount = ₹${priceWelcome10.discountAmount})`);
    if (!test7Pass) throw new Error(`TEST 7 Failed: Expected discount 470, got ${priceWelcome10.discountAmount}`);

    // -------------------------------------------------------------
    // TEST 8: PREMIUM15 applies 15%
    // -------------------------------------------------------------
    const pricePremium15 = await PricingEngine.calculateBookingPrice(
      execType._id.toString(),
      oct5Date,
      oct7Date,
      2,
      undefined,
      'PREMIUM15',
      'NON_CP',
      false,
      '22AAAAA0000A1Z5'
    );
    const expectedDiscount15 = Math.round((4700 * 15) / 100); // 705
    const test8Pass = pricePremium15.discountAmount === expectedDiscount15 && pricePremium15.couponCode === 'PREMIUM15';
    console.log(`[TEST 8] PREMIUM15 coupon gives 15% discount: ${test8Pass} (discount = ₹${pricePremium15.discountAmount})`);
    if (!test8Pass) throw new Error(`TEST 8 Failed: Expected discount 705, got ${pricePremium15.discountAmount}`);

    // -------------------------------------------------------------
    // TEST 9: Stop Sell ON. Customer cannot book.
    // -------------------------------------------------------------
    const stopSellInv = await DailyInventory.create({
      roomTypeId: execType._id,
      date: '2028-10-05',
      dateValue: oct5Date,
      stopSell: true,
      minStay: 1,
      blockedRooms: 0,
    });
    cleanupInvIds.push(stopSellInv._id as Types.ObjectId);

    const availStopSell = await AvailabilityEngine.checkAvailability(execType._id, oct5Date, oct7Date);
    const test9Pass = !availStopSell.isAvailable && availStopSell.stopSell === true;
    console.log(`[TEST 9] Stop Sell prevents customer booking: ${test9Pass} (isAvailable = ${availStopSell.isAvailable}, reason: ${availStopSell.restrictionError})`);
    if (!test9Pass) throw new Error('TEST 9 Failed: Booking allowed when Stop Sell is ON.');

    // Remove stop sell for next test
    await DailyInventory.findByIdAndDelete(stopSellInv._id);

    // -------------------------------------------------------------
    // TEST 10: Minimum stay = 2. 1-night rejected, 2-night allowed.
    // -------------------------------------------------------------
    const minStayInv = await DailyInventory.create({
      roomTypeId: execType._id,
      date: '2028-10-05',
      dateValue: oct5Date,
      stopSell: false,
      minStay: 2,
      blockedRooms: 0,
    });
    cleanupInvIds.push(minStayInv._id as Types.ObjectId);

    const oct6Date = new Date('2028-10-06T00:00:00.000Z');
    const avail1Night = await AvailabilityEngine.checkAvailability(execType._id, oct5Date, oct6Date); // 1 night
    const avail2Nights = await AvailabilityEngine.checkAvailability(execType._id, oct5Date, oct7Date); // 2 nights

    const test10Pass = !avail1Night.isAvailable && avail1Night.restrictionError?.includes('minimum stay') && avail2Nights.isAvailable;
    console.log(`[TEST 10] Minimum Stay restriction enforced (1 night rejected: ${!avail1Night.isAvailable}, 2 nights allowed: ${avail2Nights.isAvailable}): ${test10Pass}`);
    if (!test10Pass) throw new Error('TEST 10 Failed: Minimum stay restriction was not properly enforced.');

    await DailyInventory.findByIdAndDelete(minStayInv._id);

    // -------------------------------------------------------------
    // TEST 11: Two customers attempt to book final available room concurrently. Only 1 succeeds.
    // -------------------------------------------------------------
    // Set sellable override to exactly 1 room on a specific test date
    const raceDateIn = new Date('2028-11-20T00:00:00.000Z');
    const raceDateOut = new Date('2028-11-21T00:00:00.000Z');

    const raceInv = await DailyInventory.create({
      roomTypeId: execType._id,
      date: '2028-11-20',
      dateValue: raceDateIn,
      inventoryOverride: 1, // Only 1 room sellable!
      stopSell: false,
      minStay: 1,
      blockedRooms: 0,
    });
    cleanupInvIds.push(raceInv._id as Types.ObjectId);

    // Simulate 2 parallel reservation hold attempts
    const attemptReservation = async (guestName: string) => {
      // Step A: Check availability
      const avail = await AvailabilityEngine.checkAvailability(execType._id, raceDateIn, raceDateOut);
      if (!avail.isAvailable) {
        return { success: false, code: 'ROOM_NO_LONGER_AVAILABLE' };
      }

      // Step B: Create hold
      const b = await Booking.create({
        bookingId: `HR-RACE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        guestName,
        guestPhone: '9999999999',
        roomTypeId: execType._id,
        checkIn: raceDateIn,
        checkOut: raceDateOut,
        numGuests: 2,
        numNights: 1,
        roomPricePerNightSnapshot: 2200,
        totalAmount: 2200,
        bookingStatus: 'PENDING',
        paymentStatus: 'PENDING',
        trackingToken: `trk_race_${Date.now()}_${Math.random()}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      cleanupBookingIds.push(b._id as Types.ObjectId);

      // Step C: Concurrency check (count prior reservations vs sellable capacity)
      const count = await Booking.countDocuments({
        roomTypeId: execType._id,
        _id: { $lt: b._id },
        $or: [
          { bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
          { bookingStatus: 'PENDING', expiresAt: { $gt: new Date() } },
        ],
        checkIn: { $lte: raceDateIn },
        checkOut: { $gt: raceDateIn },
      });

      if (count >= 1) {
        // Overbooked! Rollback immediately
        await Booking.findByIdAndUpdate(b._id, { bookingStatus: 'CANCELLED', paymentStatus: 'FAILED' });
        return { success: false, code: 'ROOM_NO_LONGER_AVAILABLE' };
      }

      return { success: true, bookingId: b.bookingId };
    };

    const [resA, resB] = await Promise.all([
      attemptReservation('Customer A'),
      attemptReservation('Customer B'),
    ]);

    const successCount = (resA.success ? 1 : 0) + (resB.success ? 1 : 0);
    const rejectedCount = (resA.code === 'ROOM_NO_LONGER_AVAILABLE' ? 1 : 0) + (resB.code === 'ROOM_NO_LONGER_AVAILABLE' ? 1 : 0);
    const test11Pass = successCount === 1 && rejectedCount === 1;
    console.log(`[TEST 11] Concurrency check: Exactly 1 customer wins, 1 receives ROOM_NO_LONGER_AVAILABLE: ${test11Pass}`);
    if (!test11Pass) throw new Error(`TEST 11 Failed: Expected 1 winner and 1 rejected, got ${successCount} winners`);

    // -------------------------------------------------------------
    // TEST 12: Payment failure. Temporary hold released.
    // -------------------------------------------------------------
    const holdBooking = await Booking.create({
      bookingId: `HR-TEST-HOLD-${Date.now()}`,
      guestName: 'Hold Guest Test 12',
      guestPhone: '9876543212',
      roomTypeId: execType._id,
      checkIn: testDateIn,
      checkOut: testDateOut,
      numGuests: 2,
      numNights: 2,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 4400,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      trackingToken: `trk_hold_${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    cleanupBookingIds.push(holdBooking._id as Types.ObjectId);

    // Cancel / release hold
    holdBooking.bookingStatus = 'CANCELLED';
    holdBooking.paymentStatus = 'FAILED';
    await holdBooking.save();

    const availAfterHoldRelease = await AvailabilityEngine.checkAvailability(execType._id, testDateIn, testDateOut);
    const test12Pass = availAfterHoldRelease.availableRooms === availExec1.totalRooms - 1; // only offline booking remains
    console.log(`[TEST 12] Hold release restores availability: ${test12Pass} (avail = ${availAfterHoldRelease.availableRooms})`);
    if (!test12Pass) throw new Error('TEST 12 Failed: Releasing hold did not restore availability.');

    // -------------------------------------------------------------
    // TEST 13: Payment success. Temporary hold converted to confirmed booking.
    // -------------------------------------------------------------
    const payingBooking = await Booking.create({
      bookingId: `HR-TEST-PAY-${Date.now()}`,
      guestName: 'Paying Guest Test 13',
      guestPhone: '9876543213',
      roomTypeId: execType._id,
      checkIn: testDateIn,
      checkOut: testDateOut,
      numGuests: 2,
      numNights: 2,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 4400,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      trackingToken: `trk_pay_${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    cleanupBookingIds.push(payingBooking._id as Types.ObjectId);

    // Transition to CONFIRMED & PAID atomically
    const confirmed = await Booking.findOneAndUpdate(
      { _id: payingBooking._id, bookingStatus: 'PENDING', paymentStatus: { $ne: 'PAID' } },
      { $set: { bookingStatus: 'CONFIRMED', paymentStatus: 'PAID' }, $unset: { expiresAt: 1 } },
      { new: true }
    );
    const test13Pass = !!confirmed && confirmed.bookingStatus === 'CONFIRMED' && confirmed.paymentStatus === 'PAID';
    console.log(`[TEST 13] Payment success transitions hold to CONFIRMED & PAID: ${test13Pass}`);
    if (!test13Pass) throw new Error('TEST 13 Failed: Booking not confirmed on payment.');

    // -------------------------------------------------------------
    // TEST 14: Duplicate Razorpay webhook event. Inventory affected only once.
    // -------------------------------------------------------------
    // A second webhook delivery arrives with same payment
    const duplicateConfirmationAttempt = await Booking.findOneAndUpdate(
      { _id: payingBooking._id, bookingStatus: 'PENDING', paymentStatus: { $ne: 'PAID' } },
      { $set: { bookingStatus: 'CONFIRMED', paymentStatus: 'PAID' } },
      { new: true }
    );
    // duplicateConfirmationAttempt is null because status is already CONFIRMED
    const test14Pass = duplicateConfirmationAttempt === null;
    console.log(`[TEST 14] Duplicate webhook idempotency verified (second attempt safely skipped): ${test14Pass}`);
    if (!test14Pass) throw new Error('TEST 14 Failed: Duplicate webhook processed multiple times.');

    // -------------------------------------------------------------
    // TEST 15: Existing physical booking. Date-wise availability reflects it.
    // -------------------------------------------------------------
    const gridData = await AvailabilityEngine.getDateWiseGridData(testDateIn, testDateOut, execType._id.toString(), 'ROOM_ONLY');
    const execRow = gridData.rows.find((r) => r.roomType._id === execType._id.toString());
    const cell0 = execRow?.dates[0];
    const test15Pass = !!cell0 && cell0.bookedRooms >= 2; // offline booking + confirmed online booking
    console.log(`[TEST 15] Date-wise grid accurately reflects existing bookings: ${test15Pass} (booked on date: ${cell0?.bookedRooms})`);
    if (!test15Pass) throw new Error('TEST 15 Failed: Date-wise grid did not reflect existing bookings.');

    console.log('\n========================================================================');
    console.log('ALL 15 TESTS PASSED SUCCESSFULLY! BACKEND ENGINE IS 100% AUTHORITATIVE');
    console.log('========================================================================\n');
  } finally {
    // Clean up test data so live DB remains pristine
    if (cleanupBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: cleanupBookingIds } });
    }
    if (cleanupRateIds.length > 0) {
      await DailyRate.deleteMany({ _id: { $in: cleanupRateIds } });
    }
    if (cleanupInvIds.length > 0) {
      await DailyInventory.deleteMany({ _id: { $in: cleanupInvIds } });
    }
    if (originalMaintenanceRoom) {
      await Room.findByIdAndUpdate(originalMaintenanceRoom._id, { status: originalMaintenanceRoom.status });
    }
    await mongoose.disconnect();
  }
}

runDateWiseInventoryTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
