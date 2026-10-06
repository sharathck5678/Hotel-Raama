import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { Order } from '../models/Order';
import { AvailabilityEngine } from '../services/AvailabilityEngine';
import { QrController } from '../controllers/qrController';
import { PublicController } from '../controllers/publicController';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(id: string, name: string, passed: boolean, details: string) {
  results.push({ id, name, passed, details });
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} [${id}] ${name}: ${details}`);
}

async function runOfficialTests() {
  console.log('\n======================================================');
  console.log('HOTEL RAAMA — OFFICIAL 37-ROOM INVENTORY VERIFICATION');
  console.log('======================================================\n');

  await mongoose.connect(MONGODB_URI);

  // -----------------------------------------------------------------
  // TEST 1 — ROOM COUNT
  // 37 active guest rooms + 1 banquet hall + 1 conference room = 39 total
  // -----------------------------------------------------------------
  const activeGuestRooms = await Room.find({ isActive: true, isVenue: { $ne: true } }).lean();
  const activeVenues = await Room.find({ isActive: true, isVenue: true }).lean();
  const totalActive = await Room.find({ isActive: true }).lean();

  const test1Passed = activeGuestRooms.length === 37 && activeVenues.length === 2 && totalActive.length === 39;
  record(
    'TEST 1',
    'Room Count Verification',
    test1Passed,
    `Guest Rooms: ${activeGuestRooms.length} (expected 37), Venues: ${activeVenues.length} (expected 2), Total Active: ${totalActive.length} (expected 39)`
  );

  // -----------------------------------------------------------------
  // TEST 2 — EXACT ROOM NUMBERS
  // 101, 102, 103, 105..305. No 104, no active 1..40.
  // -----------------------------------------------------------------
  const EXPECTED_ROOMS = [
    '101', '102', '103', '105', '106', '107', '108', '109', '110', '111', '112', '113', '114', '115',
    '201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212', '213', '214', '215', '216', '217', '218',
    '301', '302', '303', '304', '305',
  ];
  const actualRoomNumbers = activeGuestRooms.map(r => r.roomNumber).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const has104 = activeGuestRooms.some(r => r.roomNumber === '104');
  const hasOld1to40 = activeGuestRooms.some(r => /^[1-9]$|^[1-3][0-9]$|^40$/.test(r.roomNumber));
  const exactMatch = JSON.stringify(actualRoomNumbers) === JSON.stringify(EXPECTED_ROOMS);

  const test2Passed = exactMatch && !has104 && !hasOld1to40;
  record(
    'TEST 2',
    'Exact Room Numbers',
    test2Passed,
    `Exact 37 room list matches: ${exactMatch}. Has 104: ${has104}. Has active old 1-40: ${hasOld1to40}`
  );

  // -----------------------------------------------------------------
  // TEST 3 — FLOOR COUNTS
  // Floor 1 = 14, Floor 2 = 18, Floor 3 = 5. Total = 37.
  // -----------------------------------------------------------------
  const floor1 = activeGuestRooms.filter(r => r.floor === 1);
  const floor2 = activeGuestRooms.filter(r => r.floor === 2);
  const floor3 = activeGuestRooms.filter(r => r.floor === 3);

  const test3Passed = floor1.length === 14 && floor2.length === 18 && floor3.length === 5;
  record(
    'TEST 3',
    'Floor Counts',
    test3Passed,
    `Floor 1: ${floor1.length} (expected 14), Floor 2: ${floor2.length} (expected 18), Floor 3: ${floor3.length} (expected 5)`
  );

  // -----------------------------------------------------------------
  // TEST 4 — ROOM TYPE DISTRIBUTION
  // -----------------------------------------------------------------
  const populatedRooms = await Room.find({ isActive: true, isVenue: { $ne: true } }).populate('roomTypeId').lean();
  const roomMap = new Map(populatedRooms.map(r => [r.roomNumber, (r.roomTypeId as any)?.code]));

  const suiteOk = roomMap.get('103') === 'SUITE_ROOM' && roomMap.get('205') === 'SUITE_ROOM';
  const tripleAcOk = ['101', '110', '206', '212', '213'].every(num => roomMap.get(num) === 'TRIPLE_EXEC');
  const tripleNonAcOk = roomMap.get('305') === 'TRIPLE_PREM';
  const splitBedOk = ['215', '303', '304'].every(num => roomMap.get(num) === 'EXEC_DBL_AC');
  const nonAcOk = ['105', '204', '207', '211', '216', '217', '302'].every(num => roomMap.get(num) === 'PREM_DBL_NONAC');

  const test4Passed = suiteOk && tripleAcOk && tripleNonAcOk && splitBedOk && nonAcOk;
  record(
    'TEST 4',
    'Room Type Distribution',
    test4Passed,
    `Suites (103, 205): ${suiteOk}. Triple A/C (5 rooms): ${tripleAcOk}. Triple Non-AC (305): ${tripleNonAcOk}. Split Bed (3 rooms): ${splitBedOk}. Non-AC (7 rooms): ${nonAcOk}`
  );

  // -----------------------------------------------------------------
  // TEST 5 — BOOKING ROOM ASSIGNMENT
  // Assigned room must be from the 37 guest rooms, never 104, never venue
  // -----------------------------------------------------------------
  const execDblType = await RoomType.findOne({ code: 'EXEC_DBL_AC' });
  const checkIn = new Date(Date.now() + 5 * 86400000);
  const checkOut = new Date(Date.now() + 6 * 86400000);

  const availResult = await AvailabilityEngine.checkAvailability(execDblType!._id, checkIn, checkOut);
  const assignedRoom = await Room.findById(availResult.assignedRoomId);
  const isAssignedRoomValid = assignedRoom && EXPECTED_ROOMS.includes(assignedRoom.roomNumber);
  const isAssignedVenue = assignedRoom?.isVenue === true || /party|hall|board/i.test(assignedRoom?.roomNumber || '');

  const test5Passed = !!isAssignedRoomValid && !isAssignedVenue && assignedRoom?.roomNumber !== '104';
  record(
    'TEST 5',
    'Booking Room Assignment',
    test5Passed,
    `Assigned Room: #${assignedRoom?.roomNumber} (Floor ${assignedRoom?.floor}). Is Venue: ${isAssignedVenue}. Is 104: ${assignedRoom?.roomNumber === '104'}`
  );

  // -----------------------------------------------------------------
  // TEST 6 — AVAILABILITY DECREASE & RESTORATION
  // -----------------------------------------------------------------
  const initialAvailable = availResult.availableRooms;
  const testBookingId = `HR-TEST-AVAIL-${Date.now()}`;
  const testBooking = await Booking.create({
    bookingId: testBookingId,
    guestName: 'Inventory Verification Guest',
    guestEmail: 'inventory.test@hotelraama.com',
    guestPhone: '9988776655',
    roomTypeId: execDblType!._id,
    assignedRoomId: availResult.assignedRoomId,
    checkIn,
    checkOut,
    numGuests: 2,
    numNights: 1,
    roomPricePerNightSnapshot: 2200,
    discountAmountSnapshot: 0,
    taxAmountSnapshot: 264,
    totalAmount: 2464,
    bookingStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
    trackingToken: `trk_${Date.now()}`,
  });

  const bookedAvail = await AvailabilityEngine.checkAvailability(execDblType!._id, checkIn, checkOut);
  const decreasedOk = bookedAvail.availableRooms === initialAvailable - 1;

  // Cancel booking and verify restoration
  testBooking.bookingStatus = 'CANCELLED';
  await testBooking.save();

  const restoredAvail = await AvailabilityEngine.checkAvailability(execDblType!._id, checkIn, checkOut);
  const restoredOk = restoredAvail.availableRooms === initialAvailable;

  const test6Passed = decreasedOk && restoredOk;
  record(
    'TEST 6',
    'Availability Decrement & Restoration',
    test6Passed,
    `Initial: ${initialAvailable} -> After booking: ${bookedAvail.availableRooms} (decreased: ${decreasedOk}) -> After cancellation: ${restoredAvail.availableRooms} (restored: ${restoredOk})`
  );

  // Clean up test booking
  await Booking.deleteOne({ bookingId: testBookingId });

  // -----------------------------------------------------------------
  // TEST 7 — QR CODE COUNT
  // Exactly 37 guest room QRs + 2 venue QRs = 39
  // -----------------------------------------------------------------
  let mockResData: any = null;
  const mockReq: any = {};
  const mockRes: any = {
    json: (d: any) => { mockResData = d; return mockRes; },
    status: () => mockRes,
  };
  await QrController.getAllQrCodes(mockReq, mockRes);
  const qrRooms = mockResData?.data || [];

  const test7Passed = qrRooms.length === 39;
  record(
    'TEST 7',
    'QR Directory Destinations Count',
    test7Passed,
    `Total QR codes returned: ${qrRooms.length} (expected exactly 39: 37 rooms + 2 venues)`
  );

  // -----------------------------------------------------------------
  // TEST 8 — QR VALIDATION ON ALL FLOORS
  // Test 101, 103, 115 (Fl 1), 201, 205, 215, 218 (Fl 2), 301, 303, 305 (Fl 3)
  // -----------------------------------------------------------------
  const testSampleRooms = ['101', '103', '115', '201', '205', '215', '218', '301', '303', '305'];
  let sampleValidationsPassed = true;
  const sampleDetails: string[] = [];

  for (const roomNum of testSampleRooms) {
    const roomDoc = await Room.findOne({ roomNumber: roomNum, isActive: true });
    if (!roomDoc) {
      sampleValidationsPassed = false;
      sampleDetails.push(`Room ${roomNum} not found in DB`);
      continue;
    }
    let resJson: any = null;
    let resStatus = 200;
    const reqV: any = { params: { token: roomDoc.qrToken } };
    const resV: any = {
      json: (d: any) => { resJson = d; return resV; },
      status: (c: number) => { resStatus = c; return resV; },
    };
    await QrController.validateToken(reqV, resV);

    const matches = resStatus === 200 && resJson?.success === true && resJson?.data?.roomNumber === roomNum;
    if (!matches) {
      sampleValidationsPassed = false;
      sampleDetails.push(`Room ${roomNum} validation failed`);
    } else {
      sampleDetails.push(`${roomNum}->Fl${resJson.data.floor}`);
    }
  }

  record(
    'TEST 8',
    'QR Token Multi-Floor Validation',
    sampleValidationsPassed,
    `Validated ${testSampleRooms.length} rooms: ${sampleDetails.join(', ')}`
  );

  // -----------------------------------------------------------------
  // TEST 9 — QR ORDER CREATION FOR ROOM 215
  // -----------------------------------------------------------------
  const room215 = await Room.findOne({ roomNumber: '215', isActive: true });
  const menuItem = await mongoose.connection.collection('menuitems').findOne({ isAvailable: true });

  let orderResData: any = null;
  let orderResStatus = 200;
  const orderReq: any = {
    body: {
      qrToken: room215!.qrToken,
      roomNumber: '215',
      deliveryOption: 'ROOM_SERVICE',
      guestName: 'Verification Guest 215',
      guestPhone: '9876543210',
      paymentMethod: 'CASH',
      items: [
        {
          menuItemId: menuItem!._id.toString(),
          name: menuItem!.name,
          price: menuItem!.price,
          quantity: 2,
        },
      ],
    },
  };
  const orderRes: any = {
    json: (d: any) => { orderResData = d; return orderRes; },
    status: (c: number) => { orderResStatus = c; return orderRes; },
  };

  await QrController.createOrder(orderReq, orderRes);
  const createdOrder = await Order.findOne({ orderId: orderResData?.data?.orderId });

  const test9Passed =
    orderResStatus === 201 &&
    createdOrder?.roomNumber === '215' &&
    createdOrder?.roomId?.toString() === room215!._id.toString() &&
    createdOrder?.deliveryOption === 'ROOM_SERVICE';

  record(
    'TEST 9',
    'QR Order Binding to Physical Room 215',
    test9Passed,
    `Order ID: ${createdOrder?.orderId}, Room Number: "${createdOrder?.roomNumber}", Delivery Option: ${createdOrder?.deliveryOption}`
  );

  // Clean up test order
  if (createdOrder) await Order.deleteOne({ _id: createdOrder._id });

  // -----------------------------------------------------------------
  // TEST 10 — SPECIAL VENUES EXCLUSION FROM ROOM AVAILABILITY
  // -----------------------------------------------------------------
  const banquetHall = await Room.findOne({ roomNumber: /sambhrama/i, isActive: true });
  const boardRoom = await Room.findOne({ roomNumber: /board/i, isActive: true });

  const venuesHaveFlag = banquetHall?.isVenue === true && boardRoom?.isVenue === true;

  // Check that no availability check ever returns banquet hall or board room
  const suiteAvail = await AvailabilityEngine.checkAvailability(banquetHall!.roomTypeId, new Date(), new Date(Date.now() + 86400000));
  const suiteAssigned = await Room.findById(suiteAvail.assignedRoomId);
  const suiteNotVenue = suiteAssigned?.roomNumber !== banquetHall?.roomNumber && suiteAssigned?.isVenue !== true;

  const test10Passed = venuesHaveFlag && suiteNotVenue;
  record(
    'TEST 10',
    'Special Venues Excluded from Room Availability',
    test10Passed,
    `Banquet Hall isVenue: ${banquetHall?.isVenue}, Board Room isVenue: ${boardRoom?.isVenue}. Suite check assigned: "${suiteAssigned?.roomNumber}" (never banquet hall)`
  );

  // -----------------------------------------------------------------
  // TEST 11 — OBSOLETE ROOMS SAFETY & INACTIVITY
  // Obsolete rooms 1-40 must be inactive, rejected by QR, and preserved for history
  // -----------------------------------------------------------------
  const oldRoom1 = await Room.findOne({ roomNumber: '1' });
  const oldRoom40 = await Room.findOne({ roomNumber: '40' });

  const oldAreInactive = (!oldRoom1 || oldRoom1.isActive === false) && (!oldRoom40 || oldRoom40.isActive === false);

  let oldQrStatus = 404;
  const testQrToken = oldRoom1?.qrToken || 'non_existent_old_room_token_purged';
  const oldReq: any = { params: { token: testQrToken } };
  const oldRes: any = {
    json: () => oldRes,
    status: (c: number) => { oldQrStatus = c; return oldRes; },
  };
  await QrController.validateToken(oldReq, oldRes);

  const historicalBookingsCount = await Booking.countDocuments();
  const test11Passed = oldAreInactive && oldQrStatus === 404 && historicalBookingsCount > 0;
  record(
    'TEST 11',
    'Obsolete Rooms Inactive & Historical Records Intact',
    test11Passed,
    `Old Room 1 isActive: ${oldRoom1?.isActive ?? 'purged'}, Old Room 40 isActive: ${oldRoom40?.isActive ?? 'purged'}. Old QR Status: ${oldQrStatus} (expected 404). Preserved bookings: ${historicalBookingsCount}`
  );

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  const allPassed = results.every(r => r.passed);
  console.log('\n======================================================');
  console.log(allPassed ? '✓ ALL 11 TESTS PASSED SUCCESSFULLY!' : '✗ SOME TESTS FAILED');
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

runOfficialTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
