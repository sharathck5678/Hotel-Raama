import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { Order } from '../models/Order';
import { AvailabilityEngine } from '../services/AvailabilityEngine';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

async function runInventoryTests() {
  console.log('================================================================');
  console.log('HOTEL RAAMA — INVENTORY MANAGEMENT & PHYSICAL BOOKING TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const initialHistoricalBookings = await Booking.countDocuments();
  const initialHistoricalOrders = await Order.countDocuments();

  const createdTestBookingIds: Types.ObjectId[] = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: Retrieve all 37 active guest rooms
    // -------------------------------------------------------------
    const testDateIn = new Date('2026-11-10T00:00:00.000Z');
    const testDateOut = new Date('2026-11-13T00:00:00.000Z');
    const inventory = await AvailabilityEngine.getPhysicalInventoryStatus(testDateIn, testDateOut);

    const test1Pass = inventory.rooms.length === 37;
    console.log(`[TEST 1] Admin retrieves exactly 37 active guest rooms: ${test1Pass} (count: ${inventory.rooms.length})`);
    if (!test1Pass) throw new Error('Test 1 failed: Expected 37 active guest rooms.');

    // -------------------------------------------------------------
    // TEST 2: Inactive legacy rooms (1-40) are NOT shown
    // -------------------------------------------------------------
    const legacyNumbers = Array.from({ length: 40 }, (_, i) => `${i + 1}`);
    const activeRoomNums = new Set(inventory.rooms.map((r) => r.roomNumber));
    // Valid 37 room list includes overlapping 101-115, 201-218, 301-305. None of "1", "2", ... "40" should be in inventory.rooms
    const hasLegacySimpleNums = legacyNumbers.some((num) => activeRoomNums.has(num));
    const test2Pass = !hasLegacySimpleNums;
    console.log(`[TEST 2] Inactive legacy rooms 1-40 not shown: ${test2Pass}`);
    if (!test2Pass) throw new Error('Test 2 failed: Legacy room numbers 1-40 found in active inventory.');

    // -------------------------------------------------------------
    // TEST 3: Room 104 is NOT shown
    // -------------------------------------------------------------
    const test3Pass = !activeRoomNums.has('104');
    console.log(`[TEST 3] Room 104 is not shown: ${test3Pass}`);
    if (!test3Pass) throw new Error('Test 3 failed: Room 104 found in active inventory.');

    // -------------------------------------------------------------
    // TEST 4: Venues cannot be selected / booked as guest rooms
    // -------------------------------------------------------------
    const venueCheck = inventory.rooms.some((r) =>
      ['Sambhrama Banquet Hall', 'Sambhrama Party Hall', 'Board Room'].includes(r.roomNumber)
    );
    const test4Pass = !venueCheck;
    console.log(`[TEST 4] Venues strictly excluded from guest rooms: ${test4Pass}`);
    if (!test4Pass) throw new Error('Test 4 failed: Venues found in guest room inventory.');

    // -------------------------------------------------------------
    // TEST 5, 6, 7: Admin creates offline booking for Room 215
    // -------------------------------------------------------------
    const room215 = await Room.findOne({ roomNumber: '215', isActive: true });
    if (!room215) throw new Error('Room 215 not found.');

    const checkInOct5 = new Date('2026-10-05T00:00:00.000Z');
    const checkOutOct8 = new Date('2026-10-08T00:00:00.000Z');

    // Create offline booking
    const offlineBooking = await Booking.create({
      bookingId: `HR-TEST-OFF-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Mr. John Physical Walkin',
      guestPhone: '9876543210',
      guestEmail: 'offline@hotelraama.com',
      roomTypeId: room215.roomTypeId,
      assignedRoomId: room215._id,
      checkIn: checkInOct5,
      checkOut: checkOutOct8,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk_test_off_${Date.now()}`,
      adminNotes: 'Direct desk walk-in reservation test',
      createdBy: 'admin@hotelraama.com',
    });
    createdTestBookingIds.push(offlineBooking._id as Types.ObjectId);

    const test5Pass = !!offlineBooking._id && offlineBooking.source === 'OFFLINE';
    const test6Pass = offlineBooking.assignedRoomId?.toString() === room215._id.toString();
    const test7Pass = (await Room.findById(offlineBooking.assignedRoomId))?.roomNumber === '215';

    console.log(`[TEST 5] Admin creates offline booking: ${test5Pass} (Booking ID: ${offlineBooking.bookingId})`);
    console.log(`[TEST 6] Stores correct assignedRoomId: ${test6Pass}`);
    console.log(`[TEST 7] Target room resolves to physical Room #215: ${test7Pass}`);
    if (!test5Pass || !test6Pass || !test7Pass) throw new Error('Tests 5-7 failed.');

    // -------------------------------------------------------------
    // TEST 8, 9, 10: AvailabilityEngine online impact
    // -------------------------------------------------------------
    // When searching for Executive Double A/C for Oct 5-8:
    const execDblType = await RoomType.findOne({ code: 'EXEC_DBL_AC' });
    if (!execDblType) throw new Error('EXEC_DBL_AC type missing');

    const onlineAvailDuringOct5_8 = await AvailabilityEngine.checkAvailability(
      execDblType._id as Types.ObjectId,
      checkInOct5,
      checkOutOct8
    );

    // 22 pool rooms total, exactly 1 is booked (Room 215), so 21 available
    const test8Pass = onlineAvailDuringOct5_8.assignedRoomId?.toString() !== room215._id.toString();
    const test9Pass = onlineAvailDuringOct5_8.availableRooms === 21;
    const test10Pass = onlineAvailDuringOct5_8.bookedRooms === 1;

    console.log(`[TEST 8] Room 215 excluded from candidate online room assignment: ${test8Pass}`);
    console.log(`[TEST 9] Pool reduced by exactly 1 (available: ${onlineAvailDuringOct5_8.availableRooms}/22): ${test9Pass}`);
    console.log(`[TEST 10] Online booking cannot reserve Room 215 during overlapping dates: ${test10Pass}`);
    if (!test8Pass || !test9Pass || !test10Pass) throw new Error('Tests 8-10 failed.');

    // -------------------------------------------------------------
    // TEST 11: Two overlapping offline bookings for Room 215 cannot both succeed
    // -------------------------------------------------------------
    const overlapCheck = await AvailabilityEngine.isPhysicalRoomAvailable(
      room215._id,
      new Date('2026-10-06T00:00:00.000Z'),
      new Date('2026-10-09T00:00:00.000Z')
    );
    const test11Pass = overlapCheck.available === false && !!overlapCheck.conflictingBooking;
    console.log(`[TEST 11] Duplicate/overlapping booking for Room 215 rejected: ${test11Pass}`);
    if (!test11Pass) throw new Error('Test 11 failed: Overlapping booking was not rejected.');

    // -------------------------------------------------------------
    // TEST 12: Booking ending Oct 8 does NOT block booking beginning Oct 8
    // -------------------------------------------------------------
    const checkOct8_10 = await AvailabilityEngine.isPhysicalRoomAvailable(
      room215._id,
      new Date('2026-10-08T00:00:00.000Z'),
      new Date('2026-10-10T00:00:00.000Z')
    );
    const test12Pass = checkOct8_10.available === true;
    console.log(`[TEST 12] Booking beginning Oct 8 is allowed (no checkout date conflict): ${test12Pass}`);
    if (!test12Pass) throw new Error('Test 12 failed: Checkout date falsely flagged as conflict.');

    // -------------------------------------------------------------
    // TEST 13: Cancelling offline booking restores availability
    // -------------------------------------------------------------
    offlineBooking.bookingStatus = 'CANCELLED';
    await offlineBooking.save();

    const checkAfterCancel = await AvailabilityEngine.isPhysicalRoomAvailable(
      room215._id,
      checkInOct5,
      checkOutOct8
    );
    const onlineAvailAfterCancel = await AvailabilityEngine.checkAvailability(
      execDblType._id as Types.ObjectId,
      checkInOct5,
      checkOutOct8
    );
    const test13Pass = checkAfterCancel.available === true && onlineAvailAfterCancel.availableRooms === 22;
    console.log(`[TEST 13] Cancelling offline booking restores Room 215 availability to 22/22: ${test13Pass}`);
    if (!test13Pass) throw new Error('Test 13 failed: Availability not restored after cancellation.');

    // Re-confirm offline booking for subsequent tests
    offlineBooking.bookingStatus = 'CONFIRMED';
    await offlineBooking.save();

    // -------------------------------------------------------------
    // TEST 14: Future offline booking does NOT permanently mark Room document as OCCUPIED
    // -------------------------------------------------------------
    const freshRoomDoc = await Room.findById(room215._id);
    const test14Pass = freshRoomDoc?.status !== 'OCCUPIED'; // Room document status remains AVAILABLE
    console.log(`[TEST 14] Room document status is not permanently overwritten (status: ${freshRoomDoc?.status}): ${test14Pass}`);
    if (!test14Pass) throw new Error('Test 14 failed: Room document status was mutated.');

    // -------------------------------------------------------------
    // TEST 15: After checkout date, room is automatically available via AvailabilityEngine
    // -------------------------------------------------------------
    const futureSearch = await AvailabilityEngine.checkAvailability(
      execDblType._id as Types.ObjectId,
      new Date('2026-10-15T00:00:00.000Z'),
      new Date('2026-10-18T00:00:00.000Z')
    );
    const test15Pass = futureSearch.availableRooms === 22;
    console.log(`[TEST 15] Automatic availability return post-checkout without cron: ${test15Pass} (22/22 available)`);
    if (!test15Pass) throw new Error('Test 15 failed: Post-checkout availability not restored.');

    // -------------------------------------------------------------
    // TEST 16: Rooms 215, 303, 304 remain part of EXEC_DBL_AC
    // -------------------------------------------------------------
    const splitRooms = await Room.find({ roomNumber: { $in: ['215', '303', '304'] } }).populate('roomTypeId');
    const test16Pass = splitRooms.every((r: any) => r.roomTypeId?.code === 'EXEC_DBL_AC');
    console.log(`[TEST 16] Rooms 215, 303, 304 mapped to EXEC_DBL_AC: ${test16Pass}`);
    if (!test16Pass) throw new Error('Test 16 failed: Split bed rooms not under EXEC_DBL_AC.');

    // -------------------------------------------------------------
    // TEST 17: Booking Room 215 reduces shared 22-room A/C pool by one
    // -------------------------------------------------------------
    const singleAcType = await RoomType.findOne({ code: 'EXEC_SGL_AC' });
    const singleAcAvail = await AvailabilityEngine.checkAvailability(
      singleAcType!._id as Types.ObjectId,
      checkInOct5,
      checkOutOct8
    );
    const test17Pass = singleAcAvail.availableRooms === 21;
    console.log(`[TEST 17] Shared single/double pool correctly decremented for EXEC_SGL_AC (21/22): ${test17Pass}`);
    if (!test17Pass) throw new Error('Test 17 failed: Shared pool was not decremented for single occupancy.');

    // -------------------------------------------------------------
    // TEST 18: QR code for Room 215 resolves correctly
    // -------------------------------------------------------------
    const qrRoom = await Room.findOne({ qrToken: room215.qrToken, isActive: true });
    const test18Pass = qrRoom?.roomNumber === '215' && qrRoom?.isActive === true;
    console.log(`[TEST 18] QR resolution for Room 215 continues to resolve: ${test18Pass}`);
    if (!test18Pass) throw new Error('Test 18 failed: QR resolution broken.');

    // -------------------------------------------------------------
    // TEST 19: Historical bookings & orders remain intact
    // -------------------------------------------------------------
    // Clean up test booking first
    await Booking.deleteMany({ _id: { $in: createdTestBookingIds } });
    const finalBookingsCount = await Booking.countDocuments();
    const finalOrdersCount = await Order.countDocuments();

    const test19Pass =
      finalBookingsCount === initialHistoricalBookings && finalOrdersCount === initialHistoricalOrders;
    console.log(
      `[TEST 19] Historical data integrity preserved (Bookings: ${finalBookingsCount}, Orders: ${finalOrdersCount}): ${test19Pass}`
    );
    if (!test19Pass) throw new Error('Test 19 failed: Historical bookings or orders corrupted.');

    console.log('\n================================================================');
    console.log('✓ ALL INVENTORY MANAGEMENT & PHYSICAL BOOKING TESTS PASSED!');
    console.log('================================================================');
  } finally {
    // Cleanup any lingering test bookings
    if (createdTestBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: createdTestBookingIds } });
    }
    await mongoose.disconnect();
  }
}

runInventoryTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
