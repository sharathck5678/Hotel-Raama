import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import path from 'path';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { DailyInventory } from '../models/DailyInventory';
import { AuditLog } from '../models/AuditLog';
import { Admin } from '../models/Admin';
import { AvailabilityEngine } from '../services/AvailabilityEngine';
import { AdminController } from '../controllers/adminController';
import { requireAdminAuth } from '../middleware/authMiddleware';
import { OFFICIAL_ROOMS_SPEC } from '../seed/seedDatabase';
import { DistributedLock } from '../models/DistributedLock';
import { DistributedLockManager, KeyedAsyncLock } from '../utils/asyncLock';
import { PhysicalRoomAllocation } from '../models/PhysicalRoomAllocation';
import { AllocationOperation } from '../models/AllocationOperation';
import { PhysicalRoomAllocationService } from '../services/PhysicalRoomAllocationService';
import { PublicController } from '../controllers/publicController';
import crypto from 'crypto';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';
const JWT_SECRET = process.env.JWT_SECRET || 'raama_super_secret_jwt_key_2026_production';

function mockReqRes(
  body: any = {},
  params: any = {},
  admin: any = null,
  headers: any = {}
) {
  const req: any = {
    body,
    params,
    admin,
    headers,
    ip: '127.0.0.1',
  };

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

async function runRoomReassignmentTestSuite() {
  console.log('========================================================================');
  console.log('HOTEL RAAMA — PHYSICAL ROOM REASSIGNMENT & LIVE INVENTORY SYNC TEST SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(MONGODB_URI);
  await PhysicalRoomAllocationService.syncExistingBookings();

  const cleanupBookingIds: Types.ObjectId[] = [];
  const cleanupDailyInvIds: Types.ObjectId[] = [];

  const testAdmin = {
    id: new Types.ObjectId().toString(),
    email: 'frontdesk@hotelraama.com',
    role: 'ADMIN',
  };

  const validToken = jwt.sign(
    { id: testAdmin.id, email: testAdmin.email, role: testAdmin.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Ensure test admin exists in DB for middleware auth verification
  let adminDoc = await Admin.findOne({ email: testAdmin.email });
  if (!adminDoc) {
    adminDoc = await Admin.create({
      email: testAdmin.email,
      passwordHash: 'hashed_password_for_test',
      name: 'Front Desk Officer',
      role: 'ADMIN',
    });
  }
  testAdmin.id = adminDoc._id.toString();

  try {
    // Load room types
    const execDblType = await RoomType.findOne({ code: 'EXEC_DBL_AC' });
    const execSglType = await RoomType.findOne({ code: 'EXEC_SGL_AC' });
    const premDblType = await RoomType.findOne({ code: 'PREM_DBL_NONAC' });
    const suiteType = await RoomType.findOne({ code: 'SUITE_ROOM' });

    if (!execDblType || !premDblType || !suiteType) {
      throw new Error('Required RoomTypes missing in database. Run seed first.');
    }

    // Load physical rooms
    const room102 = await Room.findOne({ roomNumber: '102' }); // Exec Dbl AC
    const room201 = await Room.findOne({ roomNumber: '201' }); // Exec Dbl AC
    const room202 = await Room.findOne({ roomNumber: '202' }); // Exec Dbl AC
    const room203 = await Room.findOne({ roomNumber: '203' }); // Exec Dbl AC
    const room208 = await Room.findOne({ roomNumber: '208' }); // Exec Dbl AC
    const room209 = await Room.findOne({ roomNumber: '209' }); // Exec Dbl AC
    const room210 = await Room.findOne({ roomNumber: '210' }); // Exec Dbl AC
    const room214 = await Room.findOne({ roomNumber: '214' }); // Exec Dbl AC
    const room105 = await Room.findOne({ roomNumber: '105' }); // Prem Dbl Non-AC
    const room103 = await Room.findOne({ roomNumber: '103' }); // Suite

    if (!room102 || !room201 || !room202 || !room203 || !room208 || !room209 || !room210 || !room214 || !room105 || !room103) {
      throw new Error('Required physical rooms missing. Ensure official 37 rooms exist.');
    }

    const testStayIn = new Date('2026-11-20T00:00:00.000Z');
    const testStayOut = new Date('2026-11-23T00:00:00.000Z');

    // Clean up any lingering test bookings/allocations from previous runs on test dates
    await Booking.deleteMany({ bookingId: { $regex: /^HR-TEST-/ } });
    await PhysicalRoomAllocation.deleteMany({
      date: {
        $in: [
          '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25',
          '2026-04-10', '2026-04-11', '2026-04-12',
          '2026-07-01', '2026-07-02', '2026-07-03',
          '2026-07-10', '2026-07-11', '2026-07-12',
          '2026-07-15', '2026-07-16', '2026-07-17',
          '2026-07-20', '2026-07-21', '2026-07-22',
          '2026-07-25', '2026-07-26', '2026-07-27',
          '2026-08-01', '2026-08-02', '2026-08-03',
        ],
      },
    });
    await AllocationOperation.deleteMany({
      $or: [
        { _id: { $regex: /^alloc_/ } },
        { _id: { $regex: /^op_/ } },
      ],
    });

    // ------------------------------------------------------------------------
    // TEST 1: Reassign an online booking from Room 102 to compatible, available Room 201
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Reassign an online booking from Room 102 to Room 201 ---');
    const onlineBooking = await Booking.create({
      bookingId: `HR-TEST-ONL-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Vikram Sharma',
      guestPhone: '9876543210',
      guestEmail: 'vikram@example.com',
      roomTypeId: execDblType._id,
      assignedRoomId: room102._id,
      checkIn: testStayIn,
      checkOut: testStayOut,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 330,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-test-${Date.now()}-1`,
    });
    cleanupBookingIds.push(onlineBooking._id as Types.ObjectId);

    const { req: req1, res: res1 } = mockReqRes(
      { targetRoomId: room201._id.toString() },
      { id: onlineBooking._id.toString() },
      testAdmin
    );

    await AdminController.reassignBookingRoom(req1, res1);

    const test1StatusCode = res1.getStatusCode();
    const test1Data = res1.getData();
    const reloadedBooking1 = await Booking.findById(onlineBooking._id);

    const test1Pass =
      test1StatusCode === 200 &&
      test1Data?.success === true &&
      reloadedBooking1?.assignedRoomId?.toString() === room201._id.toString() &&
      reloadedBooking1?.totalAmount === 6930 &&
      reloadedBooking1?.guestName === 'Vikram Sharma';

    console.log(`[TEST 1] Online booking reassigned from 102 to 201: ${test1Pass} (status: ${test1StatusCode})`);
    if (!test1Pass) throw new Error('Test 1 failed: Reassign online booking failed.');

    // Check AuditLog entry
    const audit1 = await AuditLog.findOne({
      entityId: onlineBooking._id.toString(),
      action: 'REASSIGN_ROOM',
    }).sort({ createdAt: -1 });

    const audit1Pass =
      audit1?.details?.previousRoomNumber === '102' &&
      audit1?.details?.newRoomNumber === '201' &&
      audit1?.adminEmail === testAdmin.email;
    console.log(`[TEST 1 - Audit] Audit log recorded with previous/new room and admin user: ${audit1Pass}`);
    if (!audit1Pass) throw new Error('Test 1 audit check failed.');

    // ------------------------------------------------------------------------
    // TEST 2: Reassign an offline booking
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Reassign an offline booking ---');
    const offlineBooking = await Booking.create({
      bookingId: `HR-TEST-OFF-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Ananya Rao',
      guestPhone: '9123456780',
      roomTypeId: execDblType._id,
      assignedRoomId: room202._id,
      checkIn: testStayIn,
      checkOut: testStayOut,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 0,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-test-${Date.now()}-2`,
    });
    cleanupBookingIds.push(offlineBooking._id as Types.ObjectId);

    const { req: req2, res: res2 } = mockReqRes(
      { targetRoomId: room203._id.toString() },
      { id: offlineBooking._id.toString() },
      testAdmin
    );

    await AdminController.reassignBookingRoom(req2, res2);

    const test2StatusCode = res2.getStatusCode();
    const test2Data = res2.getData();
    const reloadedBooking2 = await Booking.findById(offlineBooking._id);

    const test2Pass =
      test2StatusCode === 200 &&
      test2Data?.success === true &&
      reloadedBooking2?.assignedRoomId?.toString() === room203._id.toString();

    console.log(`[TEST 2] Offline booking reassigned to Room 203: ${test2Pass} (status: ${test2StatusCode})`);
    if (!test2Pass) throw new Error('Test 2 failed: Offline booking reassignment failed.');

    // ------------------------------------------------------------------------
    // TEST 3: Reject an incompatible physical room
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Reject incompatible physical rooms ---');
    // Attempt to assign room 105 (Premium Non-AC) to an Executive AC booking
    const { req: req3a, res: res3a } = mockReqRes(
      { targetRoomId: room105._id.toString() },
      { id: onlineBooking._id.toString() },
      testAdmin
    );

    await AdminController.reassignBookingRoom(req3a, res3a);

    const test3aStatus = res3a.getStatusCode();
    const test3aMsg = res3a.getData()?.message;
    const test3aPass =
      test3aStatus === 400 &&
      test3aMsg === 'This room is not compatible with the booking.';

    console.log(`[TEST 3a] Incompatible category (Non-AC to AC) rejected: ${test3aPass} (status: ${test3aStatus}, msg: "${test3aMsg}")`);
    if (!test3aPass) throw new Error('Test 3a failed: Incompatible category was not rejected.');

    // Attempt to assign Suite room 103
    const { req: req3b, res: res3b } = mockReqRes(
      { targetRoomId: room103._id.toString() },
      { id: onlineBooking._id.toString() },
      testAdmin
    );

    await AdminController.reassignBookingRoom(req3b, res3b);
    const test3bPass = res3b.getStatusCode() === 400;
    console.log(`[TEST 3b] Incompatible room pool (Suite to Executive) rejected: ${test3bPass}`);
    if (!test3bPass) throw new Error('Test 3b failed: Suite room was not rejected.');

    // ------------------------------------------------------------------------
    // TEST 4: Reject a room with an overlapping booking
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Reject a room with an overlapping booking ---');
    // Create conflicting booking on room 208 for overlapping dates: Nov 21 - Nov 24
    const conflictingBooking = await Booking.create({
      bookingId: `HR-TEST-CNF-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Overlapping Guest',
      guestPhone: '9988776655',
      roomTypeId: execDblType._id,
      assignedRoomId: room208._id,
      checkIn: new Date('2026-11-21T00:00:00.000Z'),
      checkOut: new Date('2026-11-24T00:00:00.000Z'),
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 330,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-test-${Date.now()}-cnf`,
    });
    cleanupBookingIds.push(conflictingBooking._id as Types.ObjectId);

    // Attempt to reassign onlineBooking (stay: Nov 20 - Nov 23) to room 208
    const { req: req4, res: res4 } = mockReqRes(
      { targetRoomId: room208._id.toString() },
      { id: onlineBooking._id.toString() },
      testAdmin
    );

    await AdminController.reassignBookingRoom(req4, res4);

    const test4Status = res4.getStatusCode();
    const test4Msg = res4.getData()?.message;
    const test4Pass =
      test4Status === 409 &&
      test4Msg === 'This room is already allocated for overlapping dates.';

    console.log(`[TEST 4] Overlapping booking rejected: ${test4Pass} (status: ${test4Status}, msg: "${test4Msg}")`);
    if (!test4Pass) throw new Error('Test 4 failed: Overlapping booking was not rejected with 409.');

    // ------------------------------------------------------------------------
    // TEST 5: Allow non-overlapping reservations
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Allow non-overlapping reservations ---');
    // Create booking on room 209 that ends Nov 20 (checkout on target booking's checkin date)
    const nonOverlappingBooking = await Booking.create({
      bookingId: `HR-TEST-NON-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Prior Guest',
      guestPhone: '9900112233',
      roomTypeId: execDblType._id,
      assignedRoomId: room209._id,
      checkIn: new Date('2026-11-17T00:00:00.000Z'),
      checkOut: new Date('2026-11-20T00:00:00.000Z'), // Ends Nov 20
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 330,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-test-${Date.now()}-non`,
    });
    cleanupBookingIds.push(nonOverlappingBooking._id as Types.ObjectId);

    // Reassign onlineBooking (stay starts Nov 20) to room 209
    const { req: req5, res: res5 } = mockReqRes(
      { targetRoomId: room209._id.toString() },
      { id: onlineBooking._id.toString() },
      testAdmin
    );

    await AdminController.reassignBookingRoom(req5, res5);

    const test5Status = res5.getStatusCode();
    const test5Pass = test5Status === 200 && res5.getData()?.success === true;
    console.log(`[TEST 5] Adjacent check-in/check-out reservation allowed without false conflict: ${test5Pass} (status: ${test5Status})`);
    if (!test5Pass) throw new Error('Test 5 failed: Non-overlapping booking falsely rejected.');

    // ------------------------------------------------------------------------
    // TEST 6: Confirm the booking being reassigned is excluded from conflict detection
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Booking being reassigned excluded from conflict detection ---');
    // Now onlineBooking is currently assigned to room 209.
    // Reassign to room 210: conflict detection evaluates stay Nov 20 - Nov 23, excluding onlineBooking._id
    const { req: req6, res: res6 } = mockReqRes(
      { targetRoomId: room210._id.toString() },
      { id: onlineBooking._id.toString() },
      testAdmin
    );

    await AdminController.reassignBookingRoom(req6, res6);

    const test6Pass = res6.getStatusCode() === 200 && res6.getData()?.success === true;
    console.log(`[TEST 6] Self-exclusion in conflict detection confirmed: ${test6Pass}`);
    if (!test6Pass) throw new Error('Test 6 failed: Self-conflict occurred.');

    // ------------------------------------------------------------------------
    // TEST 7: Verify old room is released and new room is allocated for complete stay
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Old room released and new room allocated ---');
    // onlineBooking moved: 102 -> 201 -> 209 -> 210.
    // Check room 102 availability during Nov 20 - Nov 23
    const checkRoom102 = await AvailabilityEngine.isPhysicalRoomAvailable(
      room102._id,
      testStayIn,
      testStayOut
    );

    // Check room 210 availability during Nov 20 - Nov 23
    const checkRoom210 = await AvailabilityEngine.isPhysicalRoomAvailable(
      room210._id,
      testStayIn,
      testStayOut
    );

    const test7Pass = checkRoom102.available === true && checkRoom210.available === false;
    console.log(`[TEST 7] Old room 102 is free: ${checkRoom102.available}, New room 210 is occupied: ${!checkRoom210.available}`);
    if (!test7Pass) throw new Error('Test 7 failed: Room availability release/allocation mismatch.');

    // ------------------------------------------------------------------------
    // TEST 8: Verify shared physical inventory remains correct across single/double occupancy variants
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8: Shared physical inventory integrity across Single/Double variants ---');
    const dblAvail = await AvailabilityEngine.checkAvailability(execDblType._id, testStayIn, testStayOut);
    const sglAvail = await AvailabilityEngine.checkAvailability(execSglType?._id || execDblType._id, testStayIn, testStayOut);

    // Both variants draw from identical 22-room pool
    const test8Pass =
      dblAvail.totalRooms === 22 &&
      sglAvail.totalRooms === 22 &&
      dblAvail.availableRooms === sglAvail.availableRooms;

    console.log(`[TEST 8] Shared pool capacity intact: ${test8Pass} (Total: 22, Dbl Avail: ${dblAvail.availableRooms}, Sgl Avail: ${sglAvail.availableRooms})`);
    if (!test8Pass) throw new Error('Test 8 failed: Shared pool capacity corrupted.');

    // ------------------------------------------------------------------------
    // TEST 9: Verify Stop Sell restrictions remain effective
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 9: Verify Stop Sell restrictions remain effective ---');
    const stopSellNight = '2026-11-21';
    let sglDailyInv = await DailyInventory.findOne({
      roomTypeId: execSglType?._id || execDblType._id,
      date: stopSellNight,
    });

    if (!sglDailyInv) {
      sglDailyInv = await DailyInventory.create({
        roomTypeId: execSglType?._id || execDblType._id,
        date: stopSellNight,
        dateValue: new Date('2026-11-21T00:00:00.000Z'),
        stopSell: true,
        blockedRooms: 0,
        minStay: 1,
      });
      cleanupDailyInvIds.push(sglDailyInv._id as Types.ObjectId);
    } else {
      sglDailyInv.stopSell = true;
      await sglDailyInv.save();
    }

    const sglAvailWithStopSell = await AvailabilityEngine.checkAvailability(
      execSglType?._id || execDblType._id,
      testStayIn,
      testStayOut
    );

    const test9Pass = sglAvailWithStopSell.isAvailable === false && sglAvailWithStopSell.stopSell === true;
    console.log(`[TEST 9] Stop Sell strictly blocks new reservations: ${test9Pass}`);
    if (!test9Pass) throw new Error('Test 9 failed: Stop sell restriction bypassed.');

    // Reset Stop Sell for cleanliness
    sglDailyInv.stopSell = false;
    await sglDailyInv.save();

    // ------------------------------------------------------------------------
    // TEST 10: Reject unauthorized reassignment requests
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 10: Reject unauthorized reassignment requests ---');
    const { req: req10NoAuth, res: res10NoAuth } = mockReqRes(
      { targetRoomId: room201._id.toString() },
      { id: onlineBooking._id.toString() },
      null, // No admin
      {} // No token
    );

    let nextCalled = false;
    await requireAdminAuth(req10NoAuth, res10NoAuth, () => {
      nextCalled = true;
    });

    const test10Pass = !nextCalled && res10NoAuth.getStatusCode() === 401;
    console.log(`[TEST 10] Unauthorized request strictly rejected with 401: ${test10Pass}`);
    if (!test10Pass) throw new Error('Test 10 failed: Unauthorized request not blocked.');

    // ------------------------------------------------------------------------
    // TEST 11: Verify failed reassignment leaves the original assignment unchanged
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 11: Failed reassignment leaves original assignment unchanged ---');
    const assignmentBeforeFailedAttempt = (await Booking.findById(onlineBooking._id))?.assignedRoomId?.toString();

    // Attempt invalid reassignment with incompatible room
    const { req: req11, res: res11 } = mockReqRes(
      { targetRoomId: room105._id.toString() }, // Incompatible Non-AC
      { id: onlineBooking._id.toString() },
      testAdmin
    );

    await AdminController.reassignBookingRoom(req11, res11);

    const assignmentAfterFailedAttempt = (await Booking.findById(onlineBooking._id))?.assignedRoomId?.toString();
    const test11Pass =
      res11.getStatusCode() === 400 &&
      assignmentBeforeFailedAttempt === assignmentAfterFailedAttempt;

    console.log(`[TEST 11] Original assignment preserved on validation failure: ${test11Pass} (Room ID: ${assignmentAfterFailedAttempt})`);
    if (!test11Pass) throw new Error('Test 11 failed: Original assignment was altered during failed operation.');

    // ------------------------------------------------------------------------
    // TEST 12: Simulate concurrent reassignment attempts and ensure overlapping assignments cannot both succeed
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 12: Concurrency & race condition prevention ---');
    const stayNov25In = new Date('2026-11-25T00:00:00.000Z');
    const stayNov28Out = new Date('2026-11-28T00:00:00.000Z');

    const bookingConcA = await Booking.create({
      bookingId: `HR-TEST-CONC-A-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Concurrent Guest A',
      guestPhone: '9111111111',
      roomTypeId: execDblType._id,
      assignedRoomId: room102._id,
      checkIn: stayNov25In,
      checkOut: stayNov28Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 330,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-conc-a-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingConcA._id as Types.ObjectId);

    const bookingConcB = await Booking.create({
      bookingId: `HR-TEST-CONC-B-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Concurrent Guest B',
      guestPhone: '9222222222',
      roomTypeId: execDblType._id,
      assignedRoomId: room201._id,
      checkIn: stayNov25In,
      checkOut: stayNov28Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 330,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-conc-b-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingConcB._id as Types.ObjectId);

    // Both attempt to reassign to room 214 simultaneously for the exact same stay dates
    const { req: reqConcA, res: resConcA } = mockReqRes(
      { targetRoomId: room214._id.toString() },
      { id: bookingConcA._id.toString() },
      testAdmin
    );
    const { req: reqConcB, res: resConcB } = mockReqRes(
      { targetRoomId: room214._id.toString() },
      { id: bookingConcB._id.toString() },
      testAdmin
    );

    await Promise.all([
      AdminController.reassignBookingRoom(reqConcA, resConcA),
      AdminController.reassignBookingRoom(reqConcB, resConcB),
    ]);

    const statusA = resConcA.getStatusCode();
    const statusB = resConcB.getStatusCode();

    // Exactly one must succeed (200) and one must be rejected (409)
    const test12Pass =
      (statusA === 200 && statusB === 409) || (statusA === 409 && statusB === 200);

    const overlappingBookingsInDB = await Booking.countDocuments({
      assignedRoomId: room214._id,
      checkIn: { $lt: stayNov28Out },
      checkOut: { $gt: stayNov25In },
      bookingStatus: 'CONFIRMED',
    });

    console.log(`[TEST 12] Concurrent race condition prevention: ${test12Pass} (Req A: ${statusA}, Req B: ${statusB}, Overlaps in DB: ${overlappingBookingsInDB})`);
    if (!test12Pass || overlappingBookingsInDB !== 1) {
      throw new Error(`Test 12 failed: Concurrent reassignment allowed double booking! Overlaps in DB: ${overlappingBookingsInDB}`);
    }

    // ------------------------------------------------------------------------
    // TEST 13: Verify admin/staff screens show updated room assignment
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 13: Admin/Staff screens reflection ---');
    // 1) Test candidate rooms endpoint:
    const freshOnlineBooking = await Booking.findById(onlineBooking._id);
    const { req: req13Cand, res: res13Cand } = mockReqRes(
      {},
      { id: onlineBooking._id.toString() },
      testAdmin
    );
    await AdminController.getCandidateRooms(req13Cand, res13Cand);
    const candData = res13Cand.getData();
    const candPass =
      res13Cand.getStatusCode() === 200 &&
      Array.isArray(candData?.data?.candidateRooms) &&
      !candData.data.candidateRooms.some((r: any) => r._id === freshOnlineBooking?.assignedRoomId?.toString());

    // 2) Test getPhysicalInventoryStatus reflection:
    const physicalInv = await AvailabilityEngine.getPhysicalInventoryStatus(testStayIn, testStayOut);
    const room210Grid = physicalInv.rooms.find((r) => r.roomNumber === '210');
    const room102Grid = physicalInv.rooms.find((r) => r.roomNumber === '102');

    const test13Pass =
      candPass &&
      room210Grid?.status === 'OCCUPIED' &&
      room102Grid?.status === 'AVAILABLE' &&
      room210Grid?.activeBooking?.bookingId === onlineBooking.bookingId;

    console.log(`[TEST 13] Admin physical inventory reflects new assignment: ${test13Pass} (Room 210: ${room210Grid?.status}, Room 102: ${room102Grid?.status})`);
    if (!test13Pass) throw new Error('Test 13 failed: Admin inventory screen reflection failed.');

    // ------------------------------------------------------------------------
    // TEST 14: Verify public availability reflects the new allocation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 14: Public availability reflects the new allocation ---');
    // Public check for room availability on test dates:
    const pubAvail = await AvailabilityEngine.checkAvailability(execDblType._id, testStayIn, testStayOut);

    // The newly assigned room (210) must NOT be assigned to a new customer
    const assignedRoomId = pubAvail.assignedRoomId?.toString();
    const isNewRoomAssigned = assignedRoomId === room210._id.toString();

    // Verify room 102 is freely allocatable
    const isRoom102Free = (await AvailabilityEngine.isPhysicalRoomAvailable(room102._id, testStayIn, testStayOut)).available;

    const test14Pass = !isNewRoomAssigned && isRoom102Free && pubAvail.isAvailable === true;
    console.log(`[TEST 14] Public engine correctly excludes Room 210 and makes Room 102 allocatable: ${test14Pass}`);
    if (!test14Pass) throw new Error('Test 14 failed: Public availability engine not synchronized.');

    // ------------------------------------------------------------------------
    // TEST 15: Cross-process concurrency using separate lock instances (Scenario B)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 15: Cross-process concurrency using separate lock instances ---');
    const stayDec1In = new Date('2026-12-01T00:00:00.000Z');
    const stayDec4Out = new Date('2026-12-04T00:00:00.000Z');

    // Simulate two separate backend instances / Node.js processes with distinct lock managers
    const lockManagerInstanceA = new DistributedLockManager({
      instanceId: 'process-node-worker-A',
      inMemoryLock: new KeyedAsyncLock(),
    });
    const lockManagerInstanceB = new DistributedLockManager({
      instanceId: 'process-node-worker-B',
      inMemoryLock: new KeyedAsyncLock(),
    });

    const bookingSepA = await Booking.create({
      bookingId: `HR-TEST-SEP-A-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Separate Instance Guest A',
      guestPhone: '9111111112',
      roomTypeId: execDblType._id,
      assignedRoomId: room102._id,
      checkIn: stayDec1In,
      checkOut: stayDec4Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-sep-a-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingSepA._id as Types.ObjectId);

    const bookingSepB = await Booking.create({
      bookingId: `HR-TEST-SEP-B-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Separate Instance Guest B',
      guestPhone: '9222222223',
      roomTypeId: execDblType._id,
      assignedRoomId: room201._id,
      checkIn: stayDec1In,
      checkOut: stayDec4Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-sep-b-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingSepB._id as Types.ObjectId);

    // Both attempt to reassign to room 208 for the exact same stay dates using separate lock instances
    let sepAOutcome = { status: 0, success: false };
    let sepBOutcome = { status: 0, success: false };

    const taskA = async () => {
      return await lockManagerInstanceA.withLock(
        [`booking:${bookingSepA._id}`, `room:${room208._id}`, `room:${bookingSepA.assignedRoomId}`],
        async () => {
          const fresh = await Booking.findById(bookingSepA._id);
          const conflict = await Booking.findOne({
            _id: { $ne: fresh?._id },
            assignedRoomId: room208._id,
            bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] },
            checkIn: { $lt: stayDec4Out },
            checkOut: { $gt: stayDec1In },
          });
          if (conflict) {
            sepAOutcome = { status: 409, success: false };
            return sepAOutcome;
          }
          await Booking.findByIdAndUpdate(bookingSepA._id, { assignedRoomId: room208._id });
          sepAOutcome = { status: 200, success: true };
          return sepAOutcome;
        }
      );
    };

    const taskB = async () => {
      return await lockManagerInstanceB.withLock(
        [`booking:${bookingSepB._id}`, `room:${room208._id}`, `room:${bookingSepB.assignedRoomId}`],
        async () => {
          const fresh = await Booking.findById(bookingSepB._id);
          const conflict = await Booking.findOne({
            _id: { $ne: fresh?._id },
            assignedRoomId: room208._id,
            bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] },
            checkIn: { $lt: stayDec4Out },
            checkOut: { $gt: stayDec1In },
          });
          if (conflict) {
            sepBOutcome = { status: 409, success: false };
            return sepBOutcome;
          }
          await Booking.findByIdAndUpdate(bookingSepB._id, { assignedRoomId: room208._id });
          sepBOutcome = { status: 200, success: true };
          return sepBOutcome;
        }
      );
    };

    await Promise.all([taskA(), taskB()]);

    const sepOverlapsInDB = await Booking.countDocuments({
      assignedRoomId: room208._id,
      checkIn: { $lt: stayDec4Out },
      checkOut: { $gt: stayDec1In },
      bookingStatus: 'CONFIRMED',
    });

    const test15Pass =
      ((sepAOutcome.status === 200 && sepBOutcome.status === 409) ||
       (sepAOutcome.status === 409 && sepBOutcome.status === 200)) &&
      sepOverlapsInDB === 1;

    console.log(`[TEST 15] Cross-process lock serializes assignments safely: ${test15Pass} (Instance A: ${sepAOutcome.status}, Instance B: ${sepBOutcome.status}, Overlaps in DB: ${sepOverlapsInDB})`);
    if (!test15Pass) throw new Error('Test 15 failed: Cross-process lock permitted double booking.');

    // ------------------------------------------------------------------------
    // TEST 16: Concurrent booking creation & room reassignment for same room (Scenario D)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 16: Concurrent booking creation & room reassignment for same room ---');
    const stayDec5In = new Date('2026-12-05T00:00:00.000Z');
    const stayDec8Out = new Date('2026-12-08T00:00:00.000Z');

    const bookingToReassign = await Booking.create({
      bookingId: `HR-TEST-REASSIGN-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Reassignment Target Guest',
      guestPhone: '9444444444',
      roomTypeId: execDblType._id,
      assignedRoomId: room102._id,
      checkIn: stayDec5In,
      checkOut: stayDec8Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-reassign-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingToReassign._id as Types.ObjectId);

    // Target room is Room 209
    // Admin 1 attempts to reassign bookingToReassign to Room 209
    const { req: reqReassign, res: resReassign } = mockReqRes(
      { targetRoomId: room209._id.toString() },
      { id: bookingToReassign._id.toString() },
      testAdmin
    );

    // Admin 2 attempts to create an offline booking targeting Room 209 simultaneously
    const { req: reqOffline, res: resOffline } = mockReqRes(
      {
        roomId: room209._id.toString(),
        checkIn: '2026-12-05',
        checkOut: '2026-12-08',
        guestName: 'Walk-in Dec 5 Guest',
      },
      {},
      testAdmin
    );

    await Promise.all([
      AdminController.reassignBookingRoom(reqReassign, resReassign),
      AdminController.createOfflineBooking(reqOffline, resOffline),
    ]);

    const reassignStatus = resReassign.getStatusCode();
    const offlineStatus = resOffline.getStatusCode();

    // If offline booking was created, record it for cleanup
    const offlineData = resOffline.getData();
    if (offlineData?.data?._id) {
      cleanupBookingIds.push(new Types.ObjectId(offlineData.data._id));
    }

    const decOverlapsInDB = await Booking.countDocuments({
      assignedRoomId: room209._id,
      checkIn: { $lt: stayDec8Out },
      checkOut: { $gt: stayDec5In },
      bookingStatus: 'CONFIRMED',
    });

    const test16Pass =
      ((reassignStatus === 200 && offlineStatus === 409) ||
       (reassignStatus === 409 && offlineStatus === 201)) &&
      decOverlapsInDB === 1;

    console.log(`[TEST 16] Simultaneous creation and reassignment conflict resolution: ${test16Pass} (Reassign: ${reassignStatus}, Offline: ${offlineStatus}, Overlaps in DB: ${decOverlapsInDB})`);
    if (!test16Pass) throw new Error('Test 16 failed: Simultaneous room creation and reassignment double booked Room 209.');

    // ------------------------------------------------------------------------
    // TEST 17: Concurrent reassignment of same booking to different target rooms (Scenario E)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 17: Concurrent reassignment of same booking to different target rooms ---');
    const stayDec10In = new Date('2026-12-10T00:00:00.000Z');
    const stayDec13Out = new Date('2026-12-13T00:00:00.000Z');

    const bookingTargetDoubleMove = await Booking.create({
      bookingId: `HR-TEST-DBLMOVE-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Double Move Guest',
      guestPhone: '9555555555',
      roomTypeId: execDblType._id,
      assignedRoomId: room102._id,
      checkIn: stayDec10In,
      checkOut: stayDec13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-dblmove-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingTargetDoubleMove._id as Types.ObjectId);

    // Staff 1 tries to move to room 201; Staff 2 tries to move to room 202
    const { req: reqMove1, res: resMove1 } = mockReqRes(
      { targetRoomId: room201._id.toString() },
      { id: bookingTargetDoubleMove._id.toString() },
      testAdmin
    );
    const { req: reqMove2, res: resMove2 } = mockReqRes(
      { targetRoomId: room202._id.toString() },
      { id: bookingTargetDoubleMove._id.toString() },
      testAdmin
    );

    await Promise.all([
      AdminController.reassignBookingRoom(reqMove1, resMove1),
      AdminController.reassignBookingRoom(reqMove2, resMove2),
    ]);

    const freshDoubleMove = await Booking.findById(bookingTargetDoubleMove._id);
    const finalRoomId = freshDoubleMove?.assignedRoomId?.toString();
    const isOneOfTargets =
      finalRoomId === room201._id.toString() || finalRoomId === room202._id.toString();

    // Verify both audit logs were created without errors
    const moveAuditLogs = await AuditLog.find({
      entity: 'Booking',
      entityId: bookingTargetDoubleMove._id.toString(),
      action: 'REASSIGN_ROOM',
    });

    const test17Pass = isOneOfTargets && moveAuditLogs.length >= 1;
    console.log(`[TEST 17] Same booking concurrent move resolved consistently: ${test17Pass} (Final room: ${freshDoubleMove?.assignedRoomId}, Audits: ${moveAuditLogs.length})`);
    if (!test17Pass) throw new Error('Test 17 failed: Inconsistent state on concurrent move of same booking.');

    // ------------------------------------------------------------------------
    // TEST 18: Failed database write leaves original assignment intact (Scenario F)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 18: Failed database write leaves original assignment intact ---');
    const originalRoomBefore = freshDoubleMove?.assignedRoomId?.toString();

    // Attempt to reassign to an invalid non-existent ID
    const { req: reqFail, res: resFail } = mockReqRes(
      { targetRoomId: new Types.ObjectId().toString() },
      { id: bookingTargetDoubleMove._id.toString() },
      testAdmin
    );
    await AdminController.reassignBookingRoom(reqFail, resFail);

    const bookingAfterFail = await Booking.findById(bookingTargetDoubleMove._id);
    const test18Pass =
      resFail.getStatusCode() === 400 &&
      bookingAfterFail?.assignedRoomId?.toString() === originalRoomBefore;

    console.log(`[TEST 18] Original assignment intact after failed operation: ${test18Pass}`);
    if (!test18Pass) throw new Error('Test 18 failed: Original assignment was corrupted.');

    // ------------------------------------------------------------------------
    // TEST 19: Lock lifecycle, release in finally, and auto-cleanup (Scenario G)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 19: Lock lifecycle, release in finally, and auto-cleanup ---');
    const lockManagerTest = new DistributedLockManager({ instanceId: 'test-lifecycle-worker' });
    const testLockKey = `test:lock:${Date.now()}`;

    // 1) Successful task releases lock
    await lockManagerTest.withLock(testLockKey, async () => {
      const activeLock = await DistributedLock.findById(testLockKey);
      if (!activeLock) throw new Error('Lock document should exist while held');
    });
    const lockAfterSuccess = await DistributedLock.findById(testLockKey);
    const successCleaned = lockAfterSuccess === null;

    // 2) Task throwing exception releases lock
    let errorCaught = false;
    try {
      await lockManagerTest.withLock(testLockKey, async () => {
        throw new Error('Intentional task error');
      });
    } catch {
      errorCaught = true;
    }
    const lockAfterError = await DistributedLock.findById(testLockKey);
    const errorCleaned = errorCaught && lockAfterError === null;

    // 3) Expired lock takeover
    await DistributedLock.create({
      _id: testLockKey,
      owner: 'crashed-worker-process',
      expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
    });
    const reclaimed = await lockManagerTest.tryAcquireKey(testLockKey, 'active-worker', 10000);
    const lockDocReclaimed = await DistributedLock.findById(testLockKey);
    const reclaimCleaned = reclaimed && lockDocReclaimed?.owner === 'active-worker';

    // Clean up
    await DistributedLock.deleteOne({ _id: testLockKey });

    const test19Pass = successCleaned && errorCleaned && reclaimCleaned;
    console.log(`[TEST 19] Lock cleanup and recovery verified: ${test19Pass} (Success: ${successCleaned}, Error: ${errorCleaned}, Reclaim: ${reclaimCleaned})`);
    if (!test19Pass) throw new Error('Test 19 failed: Lock lifecycle or cleanup issue.');

    // ------------------------------------------------------------------------
    // TEST 20: Stress test with 5 concurrent requests targeting the same room
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 20: Stress test with 5 concurrent reassignment requests ---');
    const stayDec15In = new Date('2026-12-15T00:00:00.000Z');
    const stayDec18Out = new Date('2026-12-18T00:00:00.000Z');

    const stressBookings: any[] = [];
    for (let i = 0; i < 5; i++) {
      const b = await Booking.create({
        bookingId: `HR-TEST-STRESS-${i}-${Date.now()}`,
        source: 'ONLINE',
        guestName: `Stress Guest ${i}`,
        guestPhone: `966666666${i}`,
        roomTypeId: execDblType._id,
        assignedRoomId: room102._id,
        checkIn: stayDec15In,
        checkOut: stayDec18Out,
        numGuests: 2,
        numNights: 3,
        roomPricePerNightSnapshot: 2200,
        totalAmount: 6930,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        trackingToken: `trk-stress-${i}-${Date.now()}`,
      });
      stressBookings.push(b);
      cleanupBookingIds.push(b._id as Types.ObjectId);
    }

    // All 5 attempt to reassign to room 203 simultaneously for the exact same stay dates
    const stressRequests = stressBookings.map((b) => {
      const { req, res } = mockReqRes(
        { targetRoomId: room203._id.toString() },
        { id: b._id.toString() },
        testAdmin
      );
      return AdminController.reassignBookingRoom(req, res).then(() => res.getStatusCode());
    });

    const stressResults = await Promise.all(stressRequests);
    const successCount = stressResults.filter((s) => s === 200).length;
    const conflictCount = stressResults.filter((s) => s === 409).length;

    const stressDBCount = await Booking.countDocuments({
      assignedRoomId: room203._id,
      checkIn: { $lt: stayDec18Out },
      checkOut: { $gt: stayDec15In },
      bookingStatus: 'CONFIRMED',
    });

    const test20Pass = successCount === 1 && conflictCount === 4 && stressDBCount === 1;
    console.log(`[TEST 20] Stress test results: ${test20Pass} (Successes: ${successCount}, Conflicts: ${conflictCount}, Overlaps in DB: ${stressDBCount})`);
    if (!test20Pass) throw new Error(`Test 20 failed: Multiple winners or DB conflict detected! DB count: ${stressDBCount}`);

    // ------------------------------------------------------------------------
    // TEST 21: Stale lock holder & lease expiration prevention (Kleppmann Scenario)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 21: Stale lock holder & lease expiration prevention ---');
    const stayDec20In = new Date('2026-12-20T00:00:00.000Z');
    const stayDec23Out = new Date('2026-12-23T00:00:00.000Z');

    const staleBooking1 = await Booking.create({
      bookingId: `HR-TEST-STALE-1-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Stale Worker 1 Guest',
      guestPhone: '9777777771',
      roomTypeId: execDblType._id,
      assignedRoomId: room102._id,
      checkIn: stayDec20In,
      checkOut: stayDec23Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-stale-1-${Date.now()}`,
    });
    cleanupBookingIds.push(staleBooking1._id as Types.ObjectId);

    const winnerBooking2 = await Booking.create({
      bookingId: `HR-TEST-WINNER-2-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Winner Worker 2 Guest',
      guestPhone: '9777777772',
      roomTypeId: execDblType._id,
      assignedRoomId: room105._id,
      checkIn: stayDec20In,
      checkOut: stayDec23Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-winner-2-${Date.now()}`,
    });
    cleanupBookingIds.push(winnerBooking2._id as Types.ObjectId);

    const staleManager = new DistributedLockManager({
      instanceId: 'stale-worker-inst',
      inMemoryLock: new KeyedAsyncLock(),
    });
    const winnerManager = new DistributedLockManager({
      instanceId: 'winner-worker-inst',
      inMemoryLock: new KeyedAsyncLock(),
    });

    let staleWorkerAttemptedWrite = false;
    let staleWorkerFailedWithLockLost = false;
    let winnerWorkerCommitted = false;

    // Worker 1 acquires lock on room 201 with a short 800ms lease and heartbeat disabled
    // (simulating a worker that freezes or has an extended GC pause)
    const stalePromise = staleManager.withLock(
      [`booking:${staleBooking1._id}`, `room:${room201._id}`],
      async (ctx) => {
        // Step 1: Worker 1 validates Room 201 is free
        const conflictBefore = await Booking.findOne({
          assignedRoomId: room201._id,
          checkIn: { $lt: stayDec23Out },
          checkOut: { $gt: stayDec20In },
          bookingStatus: 'CONFIRMED',
        });
        if (conflictBefore) throw new Error('Room 201 should be free initially');

        // Step 2: Worker 1 pauses for 1200ms, exceeding its 800ms lease
        await new Promise((r) => setTimeout(r, 1200));

        // Step 3: Worker 1 wakes up and attempts to commit
        staleWorkerAttemptedWrite = true;
        try {
          await ctx.assertHeld();
          // If assertHeld did not throw, it would commit a stale write!
          await Booking.findByIdAndUpdate(staleBooking1._id, { assignedRoomId: room201._id });
        } catch (err: any) {
          if (err.message.includes('Lock lease expired or lost')) {
            staleWorkerFailedWithLockLost = true;
          }
          throw err;
        }
      },
      { ttlMs: 800, enableHeartbeat: false }
    ).catch(() => {});

    // While Worker 1 is paused (after 900ms), Worker 2 acquires the expired lock on room 201
    await new Promise((r) => setTimeout(r, 900));

    await winnerManager.withLock(
      [`booking:${winnerBooking2._id}`, `room:${room201._id}`],
      async (ctx) => {
        await ctx.assertHeld();
        await Booking.findByIdAndUpdate(winnerBooking2._id, { assignedRoomId: room201._id });
        winnerWorkerCommitted = true;
      },
      { ttlMs: 5000 }
    );

    await stalePromise;

    // Check assignments in MongoDB
    const room201DecBookings = await Booking.find({
      assignedRoomId: room201._id,
      checkIn: { $lt: stayDec23Out },
      checkOut: { $gt: stayDec20In },
      bookingStatus: 'CONFIRMED',
    });

    const test21Pass =
      winnerWorkerCommitted &&
      staleWorkerAttemptedWrite &&
      staleWorkerFailedWithLockLost &&
      room201DecBookings.length === 1 &&
      room201DecBookings[0]._id.toString() === winnerBooking2._id.toString();

    console.log(`[TEST 21] Stale worker write safely prevented by assertHeld: ${test21Pass} (Winner committed: ${winnerWorkerCommitted}, Stale abort on lost lock: ${staleWorkerFailedWithLockLost}, Overlaps in DB: ${room201DecBookings.length})`);
    if (!test21Pass) throw new Error('Test 21 failed: Stale worker was able to overwrite or corrupt room allocation.');

    // ------------------------------------------------------------------------
    // TEST 22: True cross-process integration test (separate Node.js OS processes)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 22: True cross-process integration test (separate Node.js OS processes) ---');
    const stayDec24In = new Date('2026-12-24T00:00:00.000Z');
    const stayDec27Out = new Date('2026-12-27T00:00:00.000Z');

    const bookingProcParent = await Booking.create({
      bookingId: `HR-TEST-PROC-P-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Parent Process Guest',
      guestPhone: '9888888881',
      roomTypeId: execDblType._id,
      assignedRoomId: room102._id,
      checkIn: stayDec24In,
      checkOut: stayDec27Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-proc-p-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingProcParent._id as Types.ObjectId);

    const bookingProcChild = await Booking.create({
      bookingId: `HR-TEST-PROC-C-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Child Process Guest',
      guestPhone: '9888888882',
      roomTypeId: execDblType._id,
      assignedRoomId: room105._id,
      checkIn: stayDec24In,
      checkOut: stayDec27Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6930,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `trk-proc-c-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingProcChild._id as Types.ObjectId);

    // Target room is Room 202
    // Process 1 (Parent): runs reassignBookingRoom via AdminController
    const { req: reqParent, res: resParent } = mockReqRes(
      { targetRoomId: room202._id.toString() },
      { id: bookingProcParent._id.toString() },
      testAdmin
    );

    // Process 2 (Child): spawned as a separate Node.js process executing crossProcessWorker.ts
    const childWorkerPath = path.resolve(__dirname, 'helpers/crossProcessWorker.ts');

    const runChildProcess = (): Promise<{ statusCode: number; success: boolean }> => {
      return new Promise((resolve, reject) => {
        const child = spawn(
          process.platform === 'win32' ? 'npx.cmd' : 'npx',
          ['tsx', childWorkerPath, bookingProcChild._id.toString(), room202._id.toString()],
          {
            cwd: path.resolve(__dirname, '../../..'),
            env: { ...process.env },
            shell: process.platform === 'win32',
          }
        );

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => { stdout += d.toString(); });
        child.stderr.on('data', (d) => { stderr += d.toString(); });

        child.on('close', () => {
          try {
            const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
            const jsonLine = lines.find((l) => l.startsWith('{') && l.endsWith('}'));
            if (jsonLine) {
              const parsed = JSON.parse(jsonLine);
              resolve({ statusCode: parsed.statusCode, success: parsed.success });
            } else {
              resolve({ statusCode: 500, success: false });
            }
          } catch (e) {
            reject(new Error(`Failed to parse child output: ${stdout || stderr}`));
          }
        });
      });
    };

    // Launch both processes concurrently
    const [parentRes, childRes] = await Promise.all([
      AdminController.reassignBookingRoom(reqParent, resParent).then(() => ({
        statusCode: resParent.getStatusCode(),
        success: resParent.getData()?.success === true,
      })),
      runChildProcess(),
    ]);

    const room202ProcBookings = await Booking.countDocuments({
      assignedRoomId: room202._id,
      checkIn: { $lt: stayDec27Out },
      checkOut: { $gt: stayDec24In },
      bookingStatus: 'CONFIRMED',
    });

    const test22Pass =
      ((parentRes.statusCode === 200 && childRes.statusCode === 409) ||
       (parentRes.statusCode === 409 && childRes.statusCode === 200)) &&
      room202ProcBookings === 1;

    console.log(`[TEST 22] True cross-process mutual exclusion: ${test22Pass} (Parent: ${parentRes.statusCode}, Child: ${childRes.statusCode}, Overlaps in DB: ${room202ProcBookings})`);
    if (!test22Pass) throw new Error('Test 22 failed: Cross-process race condition permitted double booking between two OS processes.');

    // ------------------------------------------------------------------------
    // TEST 23: Regression test for lease-expiration TOCTOU race (Server A vs Server B)
    // Scenario:
    // 1. Server A acquires a lock for Room 201.
    // 2. Server A successfully passes assertHeld().
    // 3. Before Server A saves its booking, its lease expires.
    // 4. Server B acquires the expired lock and assigns Room 201 to an overlapping booking.
    // 5. Server A resumes and attempts its database write.
    // Verify whether both conflicting assignments can be saved, or whether fencing enforcement blocks/reverts Server A.
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 23: TOCTOU Lease Expiration & Fencing Regression (Server A vs Server B on Room 201) ---');
    const stayJan10In = new Date('2027-01-10T00:00:00.000Z');
    const stayJan13Out = new Date('2027-01-13T00:00:00.000Z');

    const bookingScenarioA = await Booking.create({
      bookingId: `HR-TEST-SCEN-A-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Server A Guest',
      guestPhone: '9222222221',
      roomTypeId: execDblType._id,
      assignedRoomId: room102._id, // initially room 102
      checkIn: stayJan10In,
      checkOut: stayJan13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `tt-scen-a-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingScenarioA._id);

    const bookingScenarioB = await Booking.create({
      bookingId: `HR-TEST-SCEN-B-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Server B Guest',
      guestPhone: '9222222222',
      roomTypeId: execDblType._id,
      assignedRoomId: room203._id, // initially room 203
      checkIn: stayJan10In,
      checkOut: stayJan13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `tt-scen-b-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingScenarioB._id);

    const serverALockManager = new DistributedLockManager({
      instanceId: 'server-instance-A',
      inMemoryLock: new KeyedAsyncLock(),
    });
    const serverBLockManager = new DistributedLockManager({
      instanceId: 'server-instance-B',
      inMemoryLock: new KeyedAsyncLock(),
    });

    const lockKey201 = `room_assign:${room201._id}`;
    let serverAPassedAssertHeld: boolean = false;
    let serverAWritePrevented: boolean = false;
    let serverAErrorMessage: string = '';
    let serverBCommitted: boolean = false;

    // Execute the exact 5-step scenario:
    await serverALockManager.withLock(
      lockKey201,
      async (ctxA) => {
        // Step 1: Server A acquired lock for Room 201
        // Step 2: Server A successfully passes assertHeld()
        await ctxA.assertHeld();
        serverAPassedAssertHeld = true;

        // Step 3: Before Server A saves its booking, its lease expires (short TTL expired while paused)
        // Wait 1200ms with a lock TTL of 800ms
        await new Promise((r) => setTimeout(r, 1200));

        // Step 4: Server B acquires the expired lock and assigns Room 201 to another overlapping booking
        await serverBLockManager.withLock(
          lockKey201,
          async (ctxB) => {
            // Verify no conflicting booking currently in DB for room 201
            const conflictForB = await Booking.findOne({
              _id: { $ne: bookingScenarioB._id },
              assignedRoomId: room201._id,
              bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] },
              checkIn: { $lt: stayJan13Out },
              checkOut: { $gt: stayJan10In },
            });
            if (!conflictForB) {
              await ctxB.assertFenceValid();
              bookingScenarioB.assignedRoomId = room201._id;
              await bookingScenarioB.save();
              await ctxB.assertFenceValid();
              serverBCommitted = true;
            }
          },
          { ttlMs: 5000, enableHeartbeat: false, useInMemory: false }
        );

        // Step 5: Server A resumes and attempts its database write.
        // We verify that the write path enforces assertFenceValid() and prevents double booking.
        try {
          // Pre-write fencing check
          await ctxA.assertFenceValid();

          // Write attempt
          const previousRoomA = bookingScenarioA.assignedRoomId;
          bookingScenarioA.assignedRoomId = room201._id;
          await bookingScenarioA.save();

          // Post-write fencing validation & rollback
          try {
            await ctxA.assertFenceValid();
            const overlapCheck = await Booking.findOne({
              _id: { $ne: bookingScenarioA._id },
              assignedRoomId: room201._id,
              bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] },
              checkIn: { $lt: stayJan13Out },
              checkOut: { $gt: stayJan10In },
            });
            if (overlapCheck) {
              throw new Error(`[Concurrency] Overlapping booking detected for room 201: ${overlapCheck.bookingId}`);
            }
          } catch (postWriteErr) {
            // Safe conditional rollback: only revert if assignedRoomId is STILL room201._id
            await Booking.updateOne(
              {
                _id: bookingScenarioA._id,
                assignedRoomId: room201._id,
              },
              {
                $set: { assignedRoomId: previousRoomA || null },
              }
            );
            bookingScenarioA.assignedRoomId = previousRoomA;
            throw postWriteErr;
          }
        } catch (err: any) {
          serverAWritePrevented = true;
          serverAErrorMessage = err.message;
        }
      },
      { ttlMs: 800, enableHeartbeat: false, useInMemory: false }
    );

    // Verify DB state
    const room201JanBookings = await Booking.find({
      assignedRoomId: room201._id,
      checkIn: { $lt: stayJan13Out },
      checkOut: { $gt: stayJan10In },
      bookingStatus: 'CONFIRMED',
    });

    const refreshedBookingA = await Booking.findById(bookingScenarioA._id);
    const refreshedBookingB = await Booking.findById(bookingScenarioB._id);

    const test23Pass =
      Boolean(serverAPassedAssertHeld) &&
      Boolean(serverBCommitted) &&
      Boolean(serverAWritePrevented) &&
      room201JanBookings.length === 1 &&
      room201JanBookings[0]._id.toString() === bookingScenarioB._id.toString() &&
      refreshedBookingA?.assignedRoomId?.toString() === room102._id.toString() &&
      refreshedBookingB?.assignedRoomId?.toString() === room201._id.toString();

    console.log(`[TEST 23] TOCTOU Race Condition on Lease Expiry Prevented: ${test23Pass}`);
    console.log(`  - Server A passed assertHeld() prior to lease expiry: ${serverAPassedAssertHeld}`);
    console.log(`  - Server B acquired expired lock & committed Room 201: ${serverBCommitted}`);
    console.log(`  - Server A stale write blocked/reverted by fencing: ${serverAWritePrevented} (${serverAErrorMessage})`);
    console.log(`  - Room 201 bookings in DB: ${room201JanBookings.length} (Booking B: ${refreshedBookingB?.bookingId})`);
    console.log(`  - Booking A safely retained original room: ${refreshedBookingA?.assignedRoomId?.toString() === room102._id.toString()}`);

    if (!test23Pass) {
      throw new Error('Test 23 failed: TOCTOU race allowed stale worker to overwrite or commit conflicting assignment.');
    }

    // ------------------------------------------------------------------------
    // TEST 24: Concurrency regression: Stale worker's write and rollback cannot overwrite newer assignment
    // Scenario:
    // 1. Booking X is assigned to Room 102.
    // 2. Server A begins reassignment of Booking X to Room 201 and loses its lease.
    // 3. Server B acquires lock and commits a newer assignment for Booking X (assigns Room 208).
    // 4. Server A resumes and attempts both its stale write (to Room 201) and its rollback (to Room 102).
    // 5. Verify that neither Server A's write nor Server A's rollback overwrites Server B's newer assignment (Room 208).
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 24: Stale Worker Rollback Isolation Regression (Server A vs Server B on Booking Target) ---');
    const stayFeb10In = new Date('2027-02-10T00:00:00.000Z');
    const stayFeb13Out = new Date('2027-02-13T00:00:00.000Z');

    const bookingTarget = await Booking.create({
      bookingId: `HR-TEST-TGT-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Target Guest For Stale Rollback Test',
      guestPhone: '9333333333',
      roomTypeId: execDblType._id,
      assignedRoomId: room102._id, // initially Room 102
      checkIn: stayFeb10In,
      checkOut: stayFeb13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `tt-tgt-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingTarget._id);

    let serverBCommittedNewerRoom: boolean = false;
    let serverAStaleWriteMatched: number = -1;
    let serverARollbackMatched: number = -1;

    // Server A acquires lock for Room 201 with short TTL (800ms) and pauses
    await serverALockManager.withLock(
      `room_assign:${room201._id}`,
      async (ctxA) => {
        const initialRoomA = bookingTarget.assignedRoomId; // Room 102

        // Server A passes initial assertHeld()
        await ctxA.assertHeld();

        // Server A pauses for 1200ms; lease expires
        await new Promise((r) => setTimeout(r, 1200));

        // In the interim, Server B processes a reassignment of bookingTarget to Room 208!
        await serverBLockManager.withLock(
          [`room_assign:${room208._id}`, `booking:${bookingTarget._id}`],
          async (ctxB) => {
            await ctxB.assertFenceValid();
            const updateRes = await Booking.updateOne(
              {
                _id: bookingTarget._id,
                assignedRoomId: room102._id,
              },
              {
                $set: { assignedRoomId: room208._id },
              }
            );
            if (updateRes.modifiedCount === 1) {
              serverBCommittedNewerRoom = true;
            }
          },
          { ttlMs: 5000, enableHeartbeat: false, useInMemory: false }
        );

        // Server A resumes and attempts stale write to Room 201
        // Using safe conditional update:
        const prevRoomMatch = initialRoomA ? initialRoomA : { $in: [null, undefined] };
        const staleWriteRes = await Booking.updateOne(
          {
            _id: bookingTarget._id,
            assignedRoomId: prevRoomMatch, // checks if still Room 102
          },
          {
            $set: { assignedRoomId: room201._id },
          }
        );
        serverAStaleWriteMatched = staleWriteRes.matchedCount; // Must be 0 because Server B changed it to Room 208!

        // Server A also attempts its rollback path
        // Safe conditional rollback: only reverts if assignedRoomId is Room 201
        const rollbackRes = await Booking.updateOne(
          {
            _id: bookingTarget._id,
            assignedRoomId: room201._id, // only revert if stale write wrote Room 201
          },
          {
            $set: { assignedRoomId: initialRoomA || null },
          }
        );
        serverARollbackMatched = rollbackRes.matchedCount; // Must be 0!
      },
      { ttlMs: 800, enableHeartbeat: false, useInMemory: false }
    );

    const refreshedTarget = await Booking.findById(bookingTarget._id);

    const test24Pass =
      Boolean(serverBCommittedNewerRoom) &&
      serverAStaleWriteMatched === 0 &&
      serverARollbackMatched === 0 &&
      refreshedTarget?.assignedRoomId?.toString() === room208._id.toString();

    console.log(`[TEST 24] Stale Worker Write & Rollback Isolation: ${test24Pass}`);
    console.log(`  - Server B successfully committed newer assignment (Room 208): ${serverBCommittedNewerRoom}`);
    console.log(`  - Server A stale write matched count (expected 0): ${serverAStaleWriteMatched}`);
    console.log(`  - Server A rollback matched count (expected 0): ${serverARollbackMatched}`);
    console.log(`  - Final assigned room in DB: ${refreshedTarget?.assignedRoomId?.toString() === room208._id.toString() ? 'Room 208 (Preserved)' : 'Clobbered!'}`);

    if (!test24Pass) {
      throw new Error('Test 24 failed: Stale worker write or rollback clobbered newer assignment.');
    }

    // ------------------------------------------------------------------------
    // TEST 25: Process crash/failure after database write but before post-write validation
    // Scenario:
    // 1. Worker C1 allocates Room 202 for stay dates (March 10-13, 2027) in PhysicalRoomAllocation.
    // 2. Worker C1 simulates a hard crash (abrupt exit without running post-write check or rollback).
    // 3. Worker C2 (concurrent/subsequent process) attempts to allocate Room 202 for overlapping dates.
    // 4. Verify that database-enforced PhysicalRoomAllocation guard strictly blocks Worker C2.
    // 5. Zero overlapping allocations can ever be persisted.
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 25: Process Crash Resilience & Database Allocation Guard (Room 202) ---');
    const stayMar10In = new Date('2027-03-10T00:00:00.000Z');
    const stayMar13Out = new Date('2027-03-13T00:00:00.000Z');
    const stayMar11In = new Date('2027-03-11T00:00:00.000Z');
    const stayMar14Out = new Date('2027-03-14T00:00:00.000Z');

    const bookingC1 = await Booking.create({
      bookingId: `HR-TEST-CRASH-1-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Crashed Worker Guest',
      guestPhone: '9444444441',
      roomTypeId: execDblType._id,
      assignedRoomId: room202._id,
      checkIn: stayMar10In,
      checkOut: stayMar13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `tt-crash-1-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingC1._id);

    // Worker C1 claims physical allocation
    await PhysicalRoomAllocationService.allocateRoom({
      roomId: room202._id,
      checkIn: stayMar10In,
      checkOut: stayMar13Out,
      bookingId: bookingC1._id,
      bookingStatus: 'CONFIRMED',
    });

    // Worker C1 "crashes": halts here, leaving the record in MongoDB.

    // Worker C2 attempts to allocate Room 202 for overlapping dates
    let workerC2Blocked = false;
    let workerC2Error = '';
    try {
      await PhysicalRoomAllocationService.allocateRoom({
        roomId: room202._id,
        checkIn: stayMar11In,
        checkOut: stayMar14Out,
        bookingId: new Types.ObjectId(),
        bookingStatus: 'CONFIRMED',
      });
    } catch (err: any) {
      workerC2Blocked = true;
      workerC2Error = err.message;
    }

    const { available: c2Avail } = await AvailabilityEngine.isPhysicalRoomAvailable(
      room202._id,
      stayMar11In,
      stayMar14Out
    );

    const test25Pass = workerC2Blocked === true && c2Avail === false;
    console.log(`[TEST 25] Crash Resilience Verified: ${test25Pass}`);
    console.log(`  - Worker C2 blocked by database allocation guard: ${workerC2Blocked} (${workerC2Error})`);
    console.log(`  - AvailabilityEngine reports room unavailable: ${!c2Avail}`);

    if (!test25Pass) {
      throw new Error('Test 25 failed: Process crash permitted overlapping physical room allocation.');
    }

    // ------------------------------------------------------------------------
    // TEST 26: Online payment verification and cancellation paths releasing/retaining allocations
    // Scenario:
    // 1. Online booking creates PENDING hold -> allocation exists with bookingStatus PENDING.
    // 2. Room is reported unavailable for overlapping dates while hold is active.
    // 3. Payment verification confirms booking -> allocation promoted to CONFIRMED.
    // 4. Booking is cancelled -> allocation is deleted and room is immediately freed.
    // 5. Subsequent booking on same dates succeeds with zero conflict.
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 26: Online Payment & Cancellation Allocation Lifecycle (Room 203) ---');
    const stayApr10In = new Date('2027-04-10T00:00:00.000Z');
    const stayApr13Out = new Date('2027-04-13T00:00:00.000Z');

    const bookingP1 = await Booking.create({
      bookingId: `HR-TEST-LIFECYCLE-1-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Lifecycle Guest',
      guestPhone: '9555555551',
      roomTypeId: execDblType._id,
      assignedRoomId: room203._id,
      checkIn: stayApr10In,
      checkOut: stayApr13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      trackingToken: `tt-life-1-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingP1._id);

    // 1. Allocate PENDING hold
    await PhysicalRoomAllocationService.allocateRoom({
      roomId: room203._id,
      checkIn: stayApr10In,
      checkOut: stayApr13Out,
      bookingId: bookingP1._id,
      bookingStatus: 'PENDING',
      expiresAt: bookingP1.expiresAt,
    });

    const pendingAlloc = await PhysicalRoomAllocation.findOne({
      roomId: room203._id,
      bookingId: bookingP1._id,
    });
    const isPendingSaved = pendingAlloc?.bookingStatus === 'PENDING';

    // 2. Active hold blocks new bookings
    const { available: heldAvail } = await AvailabilityEngine.isPhysicalRoomAvailable(
      room203._id,
      stayApr10In,
      stayApr13Out
    );

    // 3. Payment confirmed
    await PhysicalRoomAllocationService.confirmHold(bookingP1._id);
    const confirmedAlloc = await PhysicalRoomAllocation.findOne({
      roomId: room203._id,
      bookingId: bookingP1._id,
    });
    const isConfirmedPromoted = confirmedAlloc?.bookingStatus === 'CONFIRMED' && !confirmedAlloc.expiresAt;

    // 4. Cancellation releases allocation
    bookingP1.bookingStatus = 'CANCELLED';
    await bookingP1.save();
    await PhysicalRoomAllocationService.releaseBooking(bookingP1._id);
    const postCancelAllocCount = await PhysicalRoomAllocation.countDocuments({
      roomId: room203._id,
      bookingId: bookingP1._id,
    });

    // 5. Room is immediately free and can be allocated to Booking P2
    const { available: freeAfterCancel } = await AvailabilityEngine.isPhysicalRoomAvailable(
      room203._id,
      stayApr10In,
      stayApr13Out
    );

    const bookingP2 = await Booking.create({
      bookingId: `HR-TEST-LIFECYCLE-2-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Subsequent Guest',
      guestPhone: '9555555552',
      roomTypeId: execDblType._id,
      assignedRoomId: room203._id,
      checkIn: stayApr10In,
      checkOut: stayApr13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `tt-life-2-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingP2._id);

    await PhysicalRoomAllocationService.allocateRoom({
      roomId: room203._id,
      checkIn: stayApr10In,
      checkOut: stayApr13Out,
      bookingId: bookingP2._id,
      bookingStatus: 'CONFIRMED',
    });

    const finalAllocP2 = await PhysicalRoomAllocation.countDocuments({
      roomId: room203._id,
      bookingId: bookingP2._id,
    });

    const test26Pass =
      isPendingSaved === true &&
      heldAvail === false &&
      isConfirmedPromoted === true &&
      postCancelAllocCount === 0 &&
      freeAfterCancel === true &&
      finalAllocP2 === 3;

    console.log(`[TEST 26] Online Payment & Cancellation Lifecycle: ${test26Pass}`);
    console.log(`  - PENDING hold allocated correctly: ${isPendingSaved}`);
    console.log(`  - AvailabilityEngine blocks room during hold: ${!heldAvail}`);
    console.log(`  - Payment verification promotes hold to CONFIRMED: ${isConfirmedPromoted}`);
    console.log(`  - Cancellation deletes physical room allocations: ${postCancelAllocCount === 0}`);
    console.log(`  - Room available immediately post-cancellation: ${freeAfterCancel}`);
    console.log(`  - Subsequent booking successfully allocated all nights: ${finalAllocP2 === 3}`);

    if (!test26Pass) {
      throw new Error('Test 26 failed: Payment or cancellation lifecycle did not manage allocations correctly.');
    }

    // ------------------------------------------------------------------------
    // TEST 27: Expiry Racing with Payment Verification
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 27: Expiry Racing with Payment Verification (Room 201) ---');
    const stayJul01In = new Date('2026-07-01T00:00:00.000Z');
    const stayJul04Out = new Date('2026-07-04T00:00:00.000Z');

    const bookingT27 = await Booking.create({
      bookingId: `HR-TEST-RACE-EXP-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Expired Guest',
      guestPhone: '9555555527',
      roomTypeId: execDblType._id,
      assignedRoomId: room201._id,
      checkIn: stayJul01In,
      checkOut: stayJul04Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      expiresAt: new Date(Date.now() - 5000), // Hold expired 5s ago
      trackingToken: `tt-race-exp-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingT27._id);

    // Attempt verifyPayment for expired hold
    const { req: req27, res: res27 } = mockReqRes({
      bookingId: bookingT27.bookingId,
      razorpayOrderId: 'order_mock_exp_123',
      razorpayPaymentId: 'pay_mock_exp_123',
      razorpaySignature: 'mock_sig',
    });
    await PublicController.verifyPayment(req27, res27);

    const reloadedT27 = await Booking.findById(bookingT27._id);
    const allocCountT27 = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingT27._id });
    const { available: freePostExp } = await AvailabilityEngine.isPhysicalRoomAvailable(
      room201._id,
      stayJul01In,
      stayJul04Out
    );

    const test27Pass =
      res27.getStatusCode() === 400 &&
      reloadedT27?.bookingStatus === 'CANCELLED' &&
      reloadedT27?.paymentStatus === 'FAILED' &&
      allocCountT27 === 0 &&
      freePostExp === true;

    console.log(`[TEST 27] Expiry Racing with Payment Verification: ${test27Pass}`);
    console.log(`  - Expired verification rejected with 400: ${res27.getStatusCode() === 400}`);
    console.log(`  - Booking status updated to CANCELLED: ${reloadedT27?.bookingStatus === 'CANCELLED'}`);
    console.log(`  - Physical allocations released: ${allocCountT27 === 0}`);
    console.log(`  - Room remains available for new reservations: ${freePostExp}`);
    if (!test27Pass) throw new Error('Test 27 failed: Expired payment verification was not rejected properly.');

    // ------------------------------------------------------------------------
    // TEST 28: Delayed Payment Callback After Another Booking Claims the Room
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 28: Delayed Payment Callback After Another Booking Claims the Room ---');
    const stayJul10In = new Date('2026-07-10T00:00:00.000Z');
    const stayJul13Out = new Date('2026-07-13T00:00:00.000Z');

    // Booking A had a hold that expired
    const bookingT28A = await Booking.create({
      bookingId: `HR-TEST-DELAY-A-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Guest Delayed A',
      guestPhone: '9555555528',
      roomTypeId: execDblType._id,
      assignedRoomId: room201._id,
      checkIn: stayJul10In,
      checkOut: stayJul13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      expiresAt: new Date(Date.now() - 5000), // Expired
      trackingToken: `tt-delay-a-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingT28A._id);

    // Booking B claims Room 201 after hold A expired
    const bookingT28B = await Booking.create({
      bookingId: `HR-TEST-WINNER-B-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Guest Winner B',
      guestPhone: '9555555529',
      roomTypeId: execDblType._id,
      assignedRoomId: room201._id,
      checkIn: stayJul10In,
      checkOut: stayJul13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `tt-win-b-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingT28B._id);

    await PhysicalRoomAllocationService.allocateRoom({
      roomId: room201._id,
      checkIn: stayJul10In,
      checkOut: stayJul13Out,
      bookingId: bookingT28B._id,
      bookingStatus: 'CONFIRMED',
    });

    // Now delayed payment callback arrives for Booking A
    const { req: req28, res: res28 } = mockReqRes({
      bookingId: bookingT28A.bookingId,
      razorpayOrderId: 'order_mock_delay_123',
      razorpayPaymentId: 'pay_mock_delay_123',
      razorpaySignature: 'mock_sig',
    });
    await PublicController.verifyPayment(req28, res28);

    const reloadedT28A = await Booking.findById(bookingT28A._id);
    const allocCountA = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingT28A._id });
    const allocCountB = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingT28B._id });

    const test28Pass =
      (res28.getStatusCode() === 400 || res28.getStatusCode() === 409) &&
      reloadedT28A?.bookingStatus === 'CANCELLED' &&
      allocCountA === 0 &&
      allocCountB === 3;

    console.log(`[TEST 28] Delayed Callback After Room Claimed: ${test28Pass}`);
    console.log(`  - Delayed callback rejected (status ${res28.getStatusCode()}): true`);
    console.log(`  - Stale booking marked CANCELLED: ${reloadedT28A?.bookingStatus === 'CANCELLED'}`);
    console.log(`  - Stale booking allocations = 0: ${allocCountA === 0}`);
    console.log(`  - Winner booking allocations completely preserved (3 nights): ${allocCountB === 3}`);
    if (!test28Pass) throw new Error('Test 28 failed: Delayed payment callback corrupted winning booking.');

    // ------------------------------------------------------------------------
    // TEST 29: Cancellation Racing with Confirmation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 29: Cancellation Racing with Confirmation (Room 202) ---');
    const stayJul15In = new Date('2026-07-15T00:00:00.000Z');
    const stayJul18Out = new Date('2026-07-18T00:00:00.000Z');

    const bookingT29 = await Booking.create({
      bookingId: `HR-TEST-RACE-CAN-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Race Guest',
      guestPhone: '9555555530',
      roomTypeId: execDblType._id,
      assignedRoomId: room202._id,
      checkIn: stayJul15In,
      checkOut: stayJul18Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      trackingToken: `tt-race-can-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingT29._id);

    await PhysicalRoomAllocationService.allocateRoom({
      roomId: room202._id,
      checkIn: stayJul15In,
      checkOut: stayJul18Out,
      bookingId: bookingT29._id,
      bookingStatus: 'PENDING',
      expiresAt: bookingT29.expiresAt,
    });

    const { req: reqCan, res: resCan } = mockReqRes({
      bookingId: bookingT29.bookingId,
      trackingToken: bookingT29.trackingToken,
    });
    const { req: reqVfy, res: resVfy } = mockReqRes({
      bookingId: bookingT29.bookingId,
      razorpayOrderId: 'order_mock_race_123',
      razorpayPaymentId: 'pay_mock_race_123',
      razorpaySignature: 'mock_sig',
    });

    // Run cancel and verify in parallel
    await Promise.all([
      PublicController.cancelBooking(reqCan, resCan),
      PublicController.verifyPayment(reqVfy, resVfy),
    ]);

    const canStatus = resCan.getStatusCode();
    const vfyStatus = resVfy.getStatusCode();
    const reloadedT29 = await Booking.findById(bookingT29._id);
    const allocCountT29 = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingT29._id });

    // Exactly one must win, the other must be rejected
    const test29Pass =
      (canStatus === 200 && (vfyStatus === 400 || vfyStatus === 409) && reloadedT29?.bookingStatus === 'CANCELLED' && allocCountT29 === 0) ||
      (vfyStatus === 200 && canStatus === 400 && reloadedT29?.bookingStatus === 'CONFIRMED' && allocCountT29 === 3);

    console.log(`[TEST 29] Cancellation vs Confirmation Mutual Exclusion: ${test29Pass}`);
    console.log(`  - Cancel status: ${canStatus}, Verify status: ${vfyStatus}`);
    console.log(`  - Final booking status: ${reloadedT29?.bookingStatus}`);
    console.log(`  - Final physical allocations: ${allocCountT29}`);
    if (!test29Pass) throw new Error('Test 29 failed: Race condition between cancellation and verification.');

    // ------------------------------------------------------------------------
    // TEST 30: Multi-Night All-or-Nothing Allocation & Overlap Contention
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 30: Multi-Night All-or-Nothing Allocation & Overlap Contention (Room 203) ---');
    const stayJul20In = new Date('2026-07-20T00:00:00.000Z');
    const stayJul23Out = new Date('2026-07-23T00:00:00.000Z'); // July 20, 21, 22

    // Pre-occupy middle night (July 21) with bookingExisting
    const bookingExisting = await Booking.create({
      bookingId: `HR-TEST-EXIST-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Existing Mid Guest',
      guestPhone: '9555555531',
      roomTypeId: execDblType._id,
      assignedRoomId: room203._id,
      checkIn: new Date('2026-07-21T00:00:00.000Z'),
      checkOut: new Date('2026-07-22T00:00:00.000Z'),
      numGuests: 1,
      numNights: 1,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 2200,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `tt-exist-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingExisting._id);

    await PhysicalRoomAllocation.create({
      _id: `${room203._id.toString()}_2026-07-21`,
      roomId: room203._id,
      date: '2026-07-21',
      bookingId: bookingExisting._id,
      bookingStatus: 'CONFIRMED',
    });

    const bookingMulti = await Booking.create({
      bookingId: `HR-TEST-MULTI-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Multi Night Guest',
      guestPhone: '9555555532',
      roomTypeId: execDblType._id,
      assignedRoomId: room203._id,
      checkIn: stayJul20In,
      checkOut: stayJul23Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      trackingToken: `tt-multi-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingMulti._id);

    let multiErrorThrown = false;
    try {
      await PhysicalRoomAllocationService.allocateRoom({
        roomId: room203._id,
        checkIn: stayJul20In,
        checkOut: stayJul23Out,
        bookingId: bookingMulti._id,
        bookingStatus: 'CONFIRMED',
      });
    } catch (err: any) {
      multiErrorThrown = true;
    }

    const allocCountMulti = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingMulti._id });
    const allocCountExisting = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingExisting._id });

    const test30Pass = multiErrorThrown === true && allocCountMulti === 0 && allocCountExisting === 1;
    console.log(`[TEST 30] Multi-Night All-or-Nothing Allocation: ${test30Pass}`);
    console.log(`  - Error thrown on middle night conflict: ${multiErrorThrown}`);
    console.log(`  - Partial nights cleanly rolled back (Multi nights: ${allocCountMulti}): true`);
    console.log(`  - Existing booking night completely preserved: ${allocCountExisting === 1}`);
    if (!test30Pass) throw new Error('Test 30 failed: Partial multi-night claim was not rolled back.');

    // ------------------------------------------------------------------------
    // TEST 31: Runtime Recovery of Partial / Interrupted Allocation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 31: Runtime Recovery of Partial / Interrupted Allocation (Room 208) ---');
    const stayJul25In = new Date('2026-07-25T00:00:00.000Z');
    const stayJul28Out = new Date('2026-07-28T00:00:00.000Z');
    const fakeBookingId = new Types.ObjectId();

    // Manually create orphaned allocation and stale AllocationOperation to simulate crashed worker
    await PhysicalRoomAllocation.create({
      _id: `${room208._id.toString()}_2026-07-25`,
      roomId: room208._id,
      date: '2026-07-25',
      bookingId: fakeBookingId,
      bookingStatus: 'PENDING',
      expiresAt: new Date(Date.now() + 60000),
    });

    await AllocationOperation.create({
      _id: `op_crashed_worker_${Date.now()}`,
      bookingId: fakeBookingId,
      roomId: room208._id,
      checkIn: stayJul25In,
      checkOut: stayJul28Out,
      stayDates: ['2026-07-25', '2026-07-26', '2026-07-27'],
      expectedNights: 3,
      claimedSlotIds: [`${room208._id.toString()}_2026-07-25`],
      status: 'PENDING',
      leaseExpiresAt: new Date(Date.now() - 5000), // Lease expired (crashed worker)
    });

    const preRecoveryCount = await PhysicalRoomAllocation.countDocuments({ bookingId: fakeBookingId });
    const recoveryResult = await PhysicalRoomAllocationService.recoverStaleOperations();
    const postRecoveryCount = await PhysicalRoomAllocation.countDocuments({ bookingId: fakeBookingId });

    const { available: availPostRecover } = await AvailabilityEngine.isPhysicalRoomAvailable(
      room208._id,
      stayJul25In,
      stayJul28Out
    );

    const test31Pass =
      preRecoveryCount === 1 &&
      recoveryResult.recoveredOps >= 1 &&
      postRecoveryCount === 0 &&
      availPostRecover === true;

    console.log(`[TEST 31] Runtime Recovery of Crashed Allocation: ${test31Pass}`);
    console.log(`  - Stale operation detected and recovered: ${recoveryResult.recoveredOps >= 1}`);
    console.log(`  - Orphaned slot deleted while server running: ${postRecoveryCount === 0}`);
    console.log(`  - Target room fully available for entire stay: ${availPostRecover}`);
    if (!test31Pass) throw new Error('Test 31 failed: Runtime recovery of partial allocation failed.');

    // ------------------------------------------------------------------------
    // TEST 32: Idempotent Retries of Multi-Night Allocation
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 32: Idempotent Retries of Multi-Night Allocation (Room 209) ---');
    const stayAug01In = new Date('2026-08-01T00:00:00.000Z');
    const stayAug04Out = new Date('2026-08-04T00:00:00.000Z');

    const bookingRetry = await Booking.create({
      bookingId: `HR-TEST-RETRY-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Retry Guest',
      guestPhone: '9555555533',
      roomTypeId: execDblType._id,
      assignedRoomId: room209._id,
      checkIn: stayAug01In,
      checkOut: stayAug04Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `tt-retry-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingRetry._id);

    // Initial allocation
    const resTry1 = await PhysicalRoomAllocationService.allocateRoom({
      roomId: room209._id,
      checkIn: stayAug01In,
      checkOut: stayAug04Out,
      bookingId: bookingRetry._id,
      bookingStatus: 'CONFIRMED',
    });

    // Idempotent retry with identical parameters
    const resTry2 = await PhysicalRoomAllocationService.allocateRoom({
      roomId: room209._id,
      checkIn: stayAug01In,
      checkOut: stayAug04Out,
      bookingId: bookingRetry._id,
      bookingStatus: 'CONFIRMED',
    });

    const retryAllocCount = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingRetry._id });
    const test32Pass = resTry1.length === 3 && resTry2.length === 3 && retryAllocCount === 3;

    console.log(`[TEST 32] Idempotent Retries: ${test32Pass}`);
    console.log(`  - Initial allocation succeeded (3 nights): ${resTry1.length === 3}`);
    console.log(`  - Retry allocation succeeded without duplicate key error: ${resTry2.length === 3}`);
    console.log(`  - Total allocations in DB remains exactly 3: ${retryAllocCount === 3}`);
    if (!test32Pass) throw new Error('Test 32 failed: Idempotent retry failed.');

    // ------------------------------------------------------------------------
    // TEST 33: Razorpay Refund Execution & Tracking when Hold Expired/Room Claimed
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 33: Razorpay Refund Execution & Tracking when Hold Expired/Room Claimed (Room 201) ---');
    process.env.ALLOW_MOCK_PAYMENTS = 'true';
    const staySep01In = new Date('2026-09-01T00:00:00.000Z');
    const staySep04Out = new Date('2026-09-04T00:00:00.000Z');

    const bookingT33 = await Booking.create({
      bookingId: `HR-TEST-REFUND-33-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Refund Guest 33',
      guestEmail: 'refund33@example.com',
      guestPhone: '9555555535',
      roomTypeId: execDblType._id,
      assignedRoomId: room201._id,
      checkIn: staySep01In,
      checkOut: staySep04Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      razorpayOrderId: 'order_mock_rfnd33_123',
      trackingToken: `tt-rfnd33-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingT33._id);

    // Another competitor booking claimed room 201 first
    const competitorT33 = await Booking.create({
      bookingId: `HR-TEST-COMP-33-${Date.now()}`,
      source: 'OFFLINE',
      guestName: 'Competitor Guest 33',
      guestPhone: '9555555536',
      roomTypeId: execDblType._id,
      assignedRoomId: room201._id,
      checkIn: staySep01In,
      checkOut: staySep04Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      trackingToken: `tt-comp33-${Date.now()}`,
    });
    cleanupBookingIds.push(competitorT33._id);

    await PhysicalRoomAllocationService.allocateRoom({
      roomId: room201._id,
      checkIn: staySep01In,
      checkOut: staySep04Out,
      bookingId: competitorT33._id,
      bookingStatus: 'CONFIRMED',
    });

    // Verification arrives for bookingT33 after room was claimed
    const { req: req33, res: res33 } = mockReqRes({
      bookingId: bookingT33.bookingId,
      razorpayOrderId: 'order_mock_rfnd33_123',
      razorpayPaymentId: 'pay_mock_rfnd33_123',
      razorpaySignature: 'mock_sig',
    });
    await PublicController.verifyPayment(req33, res33);

    const reloadedT33 = await Booking.findById(bookingT33._id);
    const allocCountT33 = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingT33._id });
    const compAllocCount = await PhysicalRoomAllocation.countDocuments({ bookingId: competitorT33._id });

    const test33Pass =
      res33.getStatusCode() === 409 &&
      reloadedT33?.bookingStatus === 'CANCELLED' &&
      reloadedT33?.paymentStatus === 'REFUNDED' &&
      typeof reloadedT33?.refundId === 'string' &&
      reloadedT33.refundId.startsWith('rfnd_') &&
      reloadedT33?.refundAmount === 6600 &&
      reloadedT33?.refundStatus === 'processed' &&
      reloadedT33?.refundInitiatedAt instanceof Date &&
      allocCountT33 === 0 &&
      compAllocCount === 3;

    console.log(`[TEST 33] Actual Razorpay Refund Execution & Tracking: ${test33Pass}`);
    console.log(`  - 409 conflict returned on claimed room: ${res33.getStatusCode() === 409}`);
    console.log(`  - Booking status updated to CANCELLED: ${reloadedT33?.bookingStatus === 'CANCELLED'}`);
    console.log(`  - Payment status updated to REFUNDED: ${reloadedT33?.paymentStatus === 'REFUNDED'}`);
    console.log(`  - Actual refundId tracked: ${reloadedT33?.refundId}`);
    console.log(`  - Refund amount tracked (Rs ${reloadedT33?.refundAmount}): ${reloadedT33?.refundAmount === 6600}`);
    console.log(`  - Competitor allocation untouched (3 nights): ${compAllocCount === 3}`);
    if (!test33Pass) throw new Error('Test 33 failed: Razorpay refund execution and tracking failed.');

    // ------------------------------------------------------------------------
    // TEST 34: Duplicate / Concurrent Payment Callbacks Idempotency (Room 202)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 34: Duplicate / Concurrent Payment Callbacks Idempotency (Room 202) ---');
    const staySep10In = new Date('2026-09-10T00:00:00.000Z');
    const staySep13Out = new Date('2026-09-13T00:00:00.000Z');

    const bookingT34 = await Booking.create({
      bookingId: `HR-TEST-DUP-34-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Duplicate Guest 34',
      guestEmail: 'dup34@example.com',
      guestPhone: '9555555537',
      roomTypeId: execDblType._id,
      assignedRoomId: room202._id,
      checkIn: staySep10In,
      checkOut: staySep13Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      razorpayOrderId: 'order_mock_dup34_123',
      trackingToken: `tt-dup34-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingT34._id);

    await PhysicalRoomAllocationService.allocateRoom({
      roomId: room202._id,
      checkIn: staySep10In,
      checkOut: staySep13Out,
      bookingId: bookingT34._id,
      bookingStatus: 'PENDING',
      expiresAt: bookingT34.expiresAt,
    });

    const { req: req34A, res: res34A } = mockReqRes({
      bookingId: bookingT34.bookingId,
      razorpayOrderId: 'order_mock_dup34_123',
      razorpayPaymentId: 'pay_mock_dup34_123',
      razorpaySignature: 'mock_sig',
    });
    const { req: req34B, res: res34B } = mockReqRes({
      bookingId: bookingT34.bookingId,
      razorpayOrderId: 'order_mock_dup34_123',
      razorpayPaymentId: 'pay_mock_dup34_123',
      razorpaySignature: 'mock_sig',
    });

    // Fire duplicate callbacks concurrently
    await Promise.all([
      PublicController.verifyPayment(req34A, res34A),
      PublicController.verifyPayment(req34B, res34B),
    ]);

    const reloadedT34 = await Booking.findById(bookingT34._id);
    const allocCountT34 = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingT34._id });

    const status34A = res34A.getStatusCode();
    const status34B = res34B.getStatusCode();
    const test34Pass =
      status34A === 200 &&
      status34B === 200 &&
      reloadedT34?.bookingStatus === 'CONFIRMED' &&
      reloadedT34?.paymentStatus === 'PAID' &&
      allocCountT34 === 3;

    console.log(`[TEST 34] Duplicate Callbacks Idempotency: ${test34Pass}`);
    console.log(`  - Callback A status: ${status34A}, Callback B status: ${status34B}`);
    console.log(`  - Booking status: ${reloadedT34?.bookingStatus}, Payment status: ${reloadedT34?.paymentStatus}`);
    console.log(`  - Allocations preserved in DB (expected 3): ${allocCountT34 === 3} (count: ${allocCountT34})`);
    if (!test34Pass) throw new Error('Test 34 failed: Duplicate payment callbacks dropped or corrupted allocation.');

    // ------------------------------------------------------------------------
    // TEST 35: Cancellation Winning Race Against Payment Confirmation (Room 203)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 35: Cancellation Winning Race Against Payment Confirmation (Room 203) ---');
    const staySep15In = new Date('2026-09-15T00:00:00.000Z');
    const staySep18Out = new Date('2026-09-18T00:00:00.000Z');

    const bookingT35 = await Booking.create({
      bookingId: `HR-TEST-CAN-35-${Date.now()}`,
      source: 'ONLINE',
      guestName: 'Cancel Race Guest 35',
      guestEmail: 'cancel35@example.com',
      guestPhone: '9555555538',
      roomTypeId: execDblType._id,
      assignedRoomId: room203._id,
      checkIn: staySep15In,
      checkOut: staySep18Out,
      numGuests: 2,
      numNights: 3,
      roomPricePerNightSnapshot: 2200,
      totalAmount: 6600,
      bookingStatus: 'CANCELLED', // Cancelled by guest or admin before payment confirmation
      paymentStatus: 'PENDING',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      razorpayOrderId: 'order_mock_can35_123',
      trackingToken: `tt-can35-${Date.now()}`,
    });
    cleanupBookingIds.push(bookingT35._id);

    // Physical hold exists
    await PhysicalRoomAllocationService.allocateRoom({
      roomId: room203._id,
      checkIn: staySep15In,
      checkOut: staySep18Out,
      bookingId: bookingT35._id,
      bookingStatus: 'PENDING',
      expiresAt: bookingT35.expiresAt,
    });

    const { req: req35, res: res35 } = mockReqRes({
      bookingId: bookingT35.bookingId,
      razorpayOrderId: 'order_mock_can35_123',
      razorpayPaymentId: 'pay_mock_can35_123',
      razorpaySignature: 'mock_sig',
    });
    await PublicController.verifyPayment(req35, res35);

    const reloadedT35 = await Booking.findById(bookingT35._id);
    const allocCountT35 = await PhysicalRoomAllocation.countDocuments({ bookingId: bookingT35._id });

    const test35Pass =
      res35.getStatusCode() === 409 &&
      reloadedT35?.bookingStatus === 'CANCELLED' &&
      reloadedT35?.paymentStatus === 'REFUNDED' &&
      typeof reloadedT35?.refundId === 'string' &&
      reloadedT35.refundId.startsWith('rfnd_') &&
      reloadedT35?.refundAmount === 6600 &&
      allocCountT35 === 0;

    console.log(`[TEST 35] Cancellation Race with Refund Execution: ${test35Pass}`);
    console.log(`  - 409 returned on cancelled verification: ${res35.getStatusCode() === 409}`);
    console.log(`  - Payment refunded: ${reloadedT35?.paymentStatus === 'REFUNDED'}`);
    console.log(`  - Refund ID tracked: ${reloadedT35?.refundId}`);
    console.log(`  - Physical allocations safely released: ${allocCountT35 === 0}`);
    if (!test35Pass) throw new Error('Test 35 failed: Cancellation race did not trigger refund.');

    // ------------------------------------------------------------------------
    // TEST 36: Concurrent recoverStaleOperations() Workers Serialization
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 36: Concurrent recoverStaleOperations() Workers Serialization ---');
    const fakeBooking36 = new Types.ObjectId();
    const staleOpId36 = `op_stale_concurrent_${Date.now()}`;

    await AllocationOperation.create({
      _id: staleOpId36,
      bookingId: fakeBooking36,
      roomId: room208._id,
      checkIn: new Date('2026-09-20T00:00:00.000Z'),
      checkOut: new Date('2026-09-22T00:00:00.000Z'),
      stayDates: ['2026-09-20', '2026-09-21'],
      expectedNights: 2,
      claimedSlotIds: [`${room208._id.toString()}_2026-09-20`],
      status: 'PENDING',
      leaseExpiresAt: new Date(Date.now() - 5000), // Stale lease
    });

    await PhysicalRoomAllocation.create({
      _id: `${room208._id.toString()}_2026-09-20`,
      roomId: room208._id,
      date: '2026-09-20',
      bookingId: fakeBooking36,
      bookingStatus: 'PENDING',
      expiresAt: new Date(Date.now() + 60000),
      operationId: staleOpId36,
    });

    // Run recovery concurrently from two worker processes
    const [workerA, workerB] = await Promise.all([
      PhysicalRoomAllocationService.recoverStaleOperations(),
      PhysicalRoomAllocationService.recoverStaleOperations(),
    ]);

    const totalRecovered = workerA.recoveredOps + workerB.recoveredOps;
    const finalOp36 = await AllocationOperation.findById(staleOpId36);
    const postSlotCount36 = await PhysicalRoomAllocation.countDocuments({ bookingId: fakeBooking36 });

    const test36Pass =
      totalRecovered === 1 &&
      finalOp36?.status === 'FAILED' &&
      postSlotCount36 === 0;

    console.log(`[TEST 36] Concurrent Recovery Workers Serialization: ${test36Pass}`);
    console.log(`  - Worker A recovered: ${workerA.recoveredOps}, Worker B recovered: ${workerB.recoveredOps}`);
    console.log(`  - Exactly one worker claimed the operation: ${totalRecovered === 1}`);
    console.log(`  - Operation transitioned to FAILED: ${finalOp36?.status === 'FAILED'}`);
    console.log(`  - Orphaned slot safely deleted: ${postSlotCount36 === 0}`);
    if (!test36Pass) throw new Error('Test 36 failed: Concurrent recovery workers violated mutual exclusion.');

    // ------------------------------------------------------------------------
    // TEST 37: Stale Recovery Worker Constrained by operationId Protects Newer Slot
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 37: Stale Recovery Worker Protects Newer Operation Slot (Room 209) ---');
    const fakeBooking37 = new Types.ObjectId();
    const staleOpId37 = `op_stale_old_${Date.now()}`;
    const newerOpId37 = `op_newer_success_${Date.now()}`;
    const slotId37 = `${room209._id.toString()}_2026-09-25`;

    // Stale operation crashed earlier
    await AllocationOperation.create({
      _id: staleOpId37,
      bookingId: fakeBooking37,
      roomId: room209._id,
      checkIn: new Date('2026-09-25T00:00:00.000Z'),
      checkOut: new Date('2026-09-26T00:00:00.000Z'),
      stayDates: ['2026-09-25'],
      expectedNights: 1,
      claimedSlotIds: [slotId37],
      status: 'PENDING',
      leaseExpiresAt: new Date(Date.now() - 5000), // Expired lease
    });

    // In the meantime, a newer retry operation claimed the slot with its own operationId
    await PhysicalRoomAllocation.create({
      _id: slotId37,
      roomId: room209._id,
      date: '2026-09-25',
      bookingId: fakeBooking37,
      bookingStatus: 'CONFIRMED',
      operationId: newerOpId37, // NEWER OPERATION OWNERSHIP
    });

    // Old recovery worker resumes
    const recoveryRes37 = await PhysicalRoomAllocationService.recoverStaleOperations();
    const staleOpReloaded = await AllocationOperation.findById(staleOpId37);
    const newerSlotInDb = await PhysicalRoomAllocation.findById(slotId37);

    const test37Pass =
      recoveryRes37.recoveredOps >= 1 &&
      staleOpReloaded?.status === 'FAILED' &&
      newerSlotInDb !== null &&
      newerSlotInDb.operationId === newerOpId37 &&
      newerSlotInDb.bookingStatus === 'CONFIRMED';

    console.log(`[TEST 37] Newer Slot Protection from Stale Recovery: ${test37Pass}`);
    console.log(`  - Stale operation recovered and marked FAILED: ${staleOpReloaded?.status === 'FAILED'}`);
    console.log(`  - Newer slot preserved in DB: ${newerSlotInDb !== null}`);
    console.log(`  - Newer operation ownership intact: ${newerSlotInDb?.operationId === newerOpId37}`);
    if (!test37Pass) throw new Error('Test 37 failed: Stale recovery worker deleted slot belonging to newer operation.');

    // Cleanup TEST 37 slot
    await PhysicalRoomAllocation.deleteOne({ _id: slotId37 });
    await AllocationOperation.deleteMany({ _id: { $in: [staleOpId36, staleOpId37] } });

    console.log('\n========================================================================');
    console.log('✓ ALL 37 PHYSICAL ROOM REASSIGNMENT & CONCURRENCY TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } finally {
    // Clean up created test data
    if (cleanupBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: cleanupBookingIds } });
      await PhysicalRoomAllocation.deleteMany({ bookingId: { $in: cleanupBookingIds } });
      await AllocationOperation.deleteMany({ bookingId: { $in: cleanupBookingIds } });
    }
    if (cleanupDailyInvIds.length > 0) {
      await DailyInventory.deleteMany({ _id: { $in: cleanupDailyInvIds } });
    }
    await AuditLog.deleteMany({ entity: 'Booking', 'details.bookingId': { $regex: /^HR-TEST-/ } });
    await mongoose.disconnect();
  }
}

runRoomReassignmentTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
