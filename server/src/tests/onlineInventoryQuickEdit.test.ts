import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';
import { Room } from '../models/Room';
import { DailyInventory } from '../models/DailyInventory';
import { Booking } from '../models/Booking';
import { AvailabilityEngine } from '../services/AvailabilityEngine';
import { AdminController } from '../controllers/adminController';
import { OFFICIAL_ROOMS_SPEC } from '../seed/seedDatabase';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

// Helper mock request and response
function mockReqRes(query: any = {}, body: any = {}, admin: any = { id: new Types.ObjectId().toString(), email: 'admin@raama.com' }) {
  const req: any = { query, body, admin, params: {} };
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

async function runOnlineInventoryQuickEditTests() {
  console.log('========================================================================');
  console.log('HOTEL RAAMA — DIRECT ONLINE INVENTORY QUICK EDIT TEST SUITE (14 TESTS)');
  console.log('========================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const testDate1 = '2026-10-05';
  const testDate2 = '2026-10-06';
  const createdBookingIds: Types.ObjectId[] = [];

  try {
    const premDbl = await RoomType.findOne({ code: 'PREM_DBL_NONAC' });
    if (!premDbl) throw new Error('PREM_DBL_NONAC room type not found.');

    const initialPhysicalCount = await Room.countDocuments({
      roomNumber: { $in: OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber) },
      isActive: true,
      isVenue: { $ne: true },
    });
    console.log(`[Setup] Total official physical guest rooms in DB: ${initialPhysicalCount}`);

    const premDblRooms = await Room.find({
      roomTypeId: premDbl._id,
      roomNumber: { $in: OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber) },
      isActive: true,
      isVenue: { $ne: true },
    });
    console.log(`[Setup] Premium Double Non A/C physical rooms count: ${premDblRooms.length}`);
    if (premDblRooms.length !== 7) {
      console.warn(`[Warning] Expected 7 physical rooms for PREM_DBL_NONAC, got ${premDblRooms.length}`);
    }

    // Clean up any existing test records for test dates
    await DailyInventory.deleteMany({
      roomTypeId: premDbl._id,
      date: { $in: [testDate1, testDate2] },
    });

    const getGrid = async (startDateStr: string, days: number = 1) => {
      const [y, m, d] = startDateStr.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, d + days - 1, 23, 59, 59, 999));
      return AvailabilityEngine.getDateWiseGridData(start, end, undefined, 'ROOM_ONLY');
    };

    let bookingCounter = 1;
    const createTestBooking = async (custom: any = {}) => {
      const idx = bookingCounter++;
      const bk = await Booking.create({
        bookingId: `BK-TEST-${Date.now()}-${idx}`,
        source: 'ONLINE',
        guestName: `Test Guest ${idx}`,
        guestEmail: `guest${idx}@test.com`,
        guestPhone: `98765432${(idx % 90 + 10).toString().padStart(2, '0')}`,
        roomTypeId: premDbl._id,
        checkIn: new Date(Date.UTC(2026, 9, 5, 0, 0, 0, 0)),
        checkOut: new Date(Date.UTC(2026, 9, 6, 0, 0, 0, 0)),
        numGuests: 2,
        numNights: 1,
        roomPricePerNightSnapshot: 1600,
        discountAmountSnapshot: 0,
        taxAmountSnapshot: 0,
        totalAmount: 1600,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        trackingToken: `token-${Date.now()}-${idx}-${Math.random()}`,
        ...custom,
      });
      createdBookingIds.push(bk._id);
      return bk;
    };

    // ------------------------------------------------------------------------
    // TEST 1: Physical = 7, No override, Booked = 0 -> Expected: 7 LEFT
    // ------------------------------------------------------------------------
    console.log('TEST 1: Physical = 7, No override, Booked = 0');
    let grid1 = await getGrid(testDate1, 1);
    let row1 = grid1.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell1 = row1?.dates[0];
    if (cell1?.availableRooms !== 7 || cell1?.inventoryOverride !== null) {
      throw new Error(`TEST 1 FAILED: Expected 7 available and null override, got ${cell1?.availableRooms} avail, override: ${cell1?.inventoryOverride}`);
    }
    console.log(`✓ TEST 1 PASSED: Displayed [ ${cell1.availableRooms} LEFT ] with no override.\n`);

    // ------------------------------------------------------------------------
    // TEST 2: Physical = 7, Override = 5, Booked = 0 -> Expected: 5 LEFT
    // ------------------------------------------------------------------------
    console.log('TEST 2: Physical = 7, Override = 5, Booked = 0');
    const { req: req2, res: res2 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 5,
    });
    await AdminController.quickUpdateCell(req2, res2);
    if (res2.getStatusCode() !== 200) {
      throw new Error(`TEST 2 FAILED: quickUpdateCell returned ${res2.getStatusCode()}: ${JSON.stringify(res2.getData())}`);
    }

    let grid2 = await getGrid(testDate1, 1);
    let row2 = grid2.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell2 = row2?.dates[0];
    if (cell2?.availableRooms !== 5 || cell2?.inventoryOverride !== 5) {
      throw new Error(`TEST 2 FAILED: Expected 5 available and override 5, got ${cell2?.availableRooms} avail, override: ${cell2?.inventoryOverride}`);
    }
    console.log(`✓ TEST 2 PASSED: Displayed [ ${cell2.availableRooms} LEFT ] with override = 5.\n`);

    // ------------------------------------------------------------------------
    // TEST 3: Physical = 7, Override = 5, Booked = 2 -> Expected: 3 LEFT
    // ------------------------------------------------------------------------
    console.log('TEST 3: Physical = 7, Override = 5, Booked = 2');
    // Create 2 confirmed bookings for testDate1
    const b1 = await createTestBooking({ assignedRoomId: premDblRooms[0]._id });
    const b2 = await createTestBooking({ assignedRoomId: premDblRooms[1]._id });

    let grid3 = await getGrid(testDate1, 1);
    let row3 = grid3.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell3 = row3?.dates[0];
    if (cell3?.availableRooms !== 3 || cell3?.bookedRooms !== 2) {
      throw new Error(`TEST 3 FAILED: Expected 3 available and 2 booked, got ${cell3?.availableRooms} avail, ${cell3?.bookedRooms} booked`);
    }
    console.log(`✓ TEST 3 PASSED: Displayed [ ${cell3.availableRooms} LEFT ] (5 cap - 2 booked = 3 available).\n`);

    // ------------------------------------------------------------------------
    // TEST 4: Physical = 7, Override = 0, Booked = 0 -> Expected: SOLD OUT
    // ------------------------------------------------------------------------
    console.log('TEST 4: Physical = 7, Override = 0, Booked = 0 (on testDate2)');
    const { req: req4, res: res4 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate2,
      inventoryOverride: 0,
    });
    await AdminController.quickUpdateCell(req4, res4);
    if (res4.getStatusCode() !== 200) {
      throw new Error(`TEST 4 FAILED: quickUpdateCell returned ${res4.getStatusCode()}`);
    }

    let grid4 = await getGrid(testDate2, 1);
    let row4 = grid4.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell4 = row4?.dates[0];
    if (cell4?.availableRooms !== 0) {
      throw new Error(`TEST 4 FAILED: Expected 0 available, got ${cell4?.availableRooms}`);
    }
    console.log(`✓ TEST 4 PASSED: Displayed [ SOLD OUT ] when override = 0.\n`);

    // ------------------------------------------------------------------------
    // TEST 5: Physical = 7, Override = 5, Booked = 5 -> Expected: SOLD OUT
    // ------------------------------------------------------------------------
    console.log('TEST 5: Physical = 7, Override = 5, Booked = 5');
    // Add 3 more bookings for testDate1 to reach 5 booked
    for (let i = 2; i < 5; i++) {
      await createTestBooking({ assignedRoomId: premDblRooms[i]._id });
    }

    let grid5 = await getGrid(testDate1, 1);
    let row5 = grid5.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell5 = row5?.dates[0];
    if (cell5?.availableRooms !== 0 || cell5?.bookedRooms !== 5) {
      throw new Error(`TEST 5 FAILED: Expected 0 available and 5 booked, got ${cell5?.availableRooms} avail, ${cell5?.bookedRooms} booked`);
    }
    console.log(`✓ TEST 5 PASSED: Displayed [ SOLD OUT ] when booked = 5 and cap = 5.\n`);

    // ------------------------------------------------------------------------
    // TEST 6: Physical = 7, Override = 5, Booked = 2, Cancel one booking -> Expected: 4 LEFT
    // ------------------------------------------------------------------------
    console.log('TEST 6: Physical = 7, Override = 5, Booked = 2, Cancel one booking');
    // Cancel 3 of the 5 bookings so we are down to 2 bookings, then cancel 1 more so 1 remains
    // First cancel the 3 extra bookings:
    await Booking.deleteMany({ _id: { $in: createdBookingIds.slice(2) } });
    createdBookingIds.splice(2);

    // Grid now has 2 booked -> 3 left
    let grid6a = await getGrid(testDate1, 1);
    let row6a = grid6a.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    if (row6a?.dates[0].availableRooms !== 3) {
      throw new Error(`TEST 6 Setup FAILED: Expected 3 left before cancellation, got ${row6a?.dates[0].availableRooms}`);
    }

    // Now cancel one booking (b2)
    b2.bookingStatus = 'CANCELLED';
    await b2.save();

    let grid6b = await getGrid(testDate1, 1);
    let row6b = grid6b.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell6b = row6b?.dates[0];
    if (cell6b?.availableRooms !== 4 || cell6b?.bookedRooms !== 1) {
      throw new Error(`TEST 6 FAILED: Expected 4 left after cancelling 1 booking, got ${cell6b?.availableRooms}`);
    }
    console.log(`✓ TEST 6 PASSED: Displayed [ ${cell6b.availableRooms} LEFT ] after cancelling 1 of 2 bookings.\n`);

    // Cancel remaining b1 so booked = 0 for next tests
    b1.bookingStatus = 'CANCELLED';
    await b1.save();

    // ------------------------------------------------------------------------
    // TEST 7: Physical = 7, Override = 5, Create one hold -> 4 LEFT, Release hold -> 5 LEFT
    // ------------------------------------------------------------------------
    console.log('TEST 7: Physical = 7, Override = 5, Create hold -> 4 LEFT, Release hold -> 5 LEFT');
    const holdBooking = await createTestBooking({
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      assignedRoomId: premDblRooms[0]._id,
      expiresAt: new Date(Date.now() + 600000),
    });

    let grid7a = await getGrid(testDate1, 1);
    let row7a = grid7a.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    if (row7a?.dates[0].availableRooms !== 4 || row7a?.dates[0].heldRooms !== 1) {
      throw new Error(`TEST 7 FAILED: Expected 4 left with 1 active hold, got ${row7a?.dates[0].availableRooms}`);
    }
    console.log(`  - 1 active hold: [ ${row7a?.dates[0].availableRooms} LEFT ]`);

    // Release hold
    await Booking.deleteOne({ _id: holdBooking._id });

    let grid7b = await getGrid(testDate1, 1);
    let row7b = grid7b.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    if (row7b?.dates[0].availableRooms !== 5 || row7b?.dates[0].heldRooms !== 0) {
      throw new Error(`TEST 7 FAILED: Expected 5 left after releasing hold, got ${row7b?.dates[0].availableRooms}`);
    }
    console.log(`✓ TEST 7 PASSED: Displayed [ ${row7b?.dates[0].availableRooms} LEFT ] after hold release.\n`);

    // ------------------------------------------------------------------------
    // TEST 8: Physical = 7, Attempt override = 8 -> Validation error
    // ------------------------------------------------------------------------
    console.log('TEST 8: Physical = 7, Attempt override = 8 (Exceeds physical capacity)');
    const { req: req8, res: res8 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 8,
    });
    await AdminController.quickUpdateCell(req8, res8);
    if (res8.getStatusCode() !== 400 || !res8.getData()?.message?.includes('Enter a number between 0 and 7')) {
      throw new Error(`TEST 8 FAILED: Expected status 400 with 'Enter a number between 0 and 7', got ${res8.getStatusCode()}: ${JSON.stringify(res8.getData())}`);
    }
    console.log(`✓ TEST 8 PASSED: Rejected with validation message: "${res8.getData().message}"\n`);

    // ------------------------------------------------------------------------
    // TEST 9: Physical = 7, Booked = 4, Attempt override = 2 -> Validation error
    // ------------------------------------------------------------------------
    console.log('TEST 9: Physical = 7, Booked = 4, Attempt override = 2 (Existing Bookings Protection)');
    // Create 4 confirmed bookings on testDate1
    const test9Bookings: Types.ObjectId[] = [];
    for (let i = 0; i < 4; i++) {
      const bk = await createTestBooking({ assignedRoomId: premDblRooms[i]._id });
      test9Bookings.push(bk._id);
    }

    const { req: req9, res: res9 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 2,
    });
    await AdminController.quickUpdateCell(req9, res9);
    if (res9.getStatusCode() !== 400 || !res9.getData()?.message?.includes('Online inventory cannot be lower than the 4 rooms already booked')) {
      throw new Error(`TEST 9 FAILED: Expected status 400 with booking protection message, got ${res9.getStatusCode()}: ${JSON.stringify(res9.getData())}`);
    }
    console.log(`✓ TEST 9 PASSED: Rejected with message: "${res9.getData().message}"\n`);

    // Clean up test 9 bookings
    await Booking.deleteMany({ _id: { $in: test9Bookings } });

    // ------------------------------------------------------------------------
    // TEST 10: Date-specific: Oct 5 override = 3, Oct 6 no override -> Oct 5 = 3 max, Oct 6 = 7 normal
    // ------------------------------------------------------------------------
    console.log('TEST 10: Date-specific: Oct 5 override = 3, Oct 6 no override');
    // Set Oct 5 override = 3
    const { req: req10a, res: res10a } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 3,
    });
    await AdminController.quickUpdateCell(req10a, res10a);

    // Clear Oct 6 override
    const { req: req10b, res: res10b } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate2,
      inventoryOverride: null,
    });
    await AdminController.quickUpdateCell(req10b, res10b);

    let grid10 = await getGrid(testDate1, 2);
    let row10 = grid10.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cellOct5 = row10?.dates.find((c) => c.date === testDate1);
    let cellOct6 = row10?.dates.find((c) => c.date === testDate2);

    if (cellOct5?.availableRooms !== 3 || cellOct5?.inventoryOverride !== 3) {
      throw new Error(`TEST 10 FAILED: Oct 5 expected 3 available with override 3, got ${cellOct5?.availableRooms}`);
    }
    if (cellOct6?.availableRooms !== 7 || cellOct6?.inventoryOverride !== null) {
      throw new Error(`TEST 10 FAILED: Oct 6 expected 7 available with null override, got ${cellOct6?.availableRooms}`);
    }
    console.log(`✓ TEST 10 PASSED: Oct 5 has max 3 online, Oct 6 has normal physical availability (7).\n`);

    // ------------------------------------------------------------------------
    // TEST 11: Clear override -> System returns to automatic physical availability
    // ------------------------------------------------------------------------
    console.log('TEST 11: Clear override (USE PHYSICAL AVAILABILITY)');
    const { req: req11, res: res11 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: null,
    });
    await AdminController.quickUpdateCell(req11, res11);
    if (res11.getStatusCode() !== 200) {
      throw new Error(`TEST 11 FAILED: Expected 200, got ${res11.getStatusCode()}`);
    }

    let grid11 = await getGrid(testDate1, 1);
    let row11 = grid11.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell11 = row11?.dates[0];
    if (cell11?.availableRooms !== 7 || cell11?.inventoryOverride !== null) {
      throw new Error(`TEST 11 FAILED: Expected 7 available and null override, got ${cell11?.availableRooms}, override: ${cell11?.inventoryOverride}`);
    }
    console.log(`✓ TEST 11 PASSED: Cleared override, returns to [ 7 LEFT ] automatic physical availability.\n`);

    // ------------------------------------------------------------------------
    // TEST 12: Set override = 0 -> Grid = SOLD OUT, Customer search unavailable, Physical inventory unchanged
    // ------------------------------------------------------------------------
    console.log('TEST 12: Set override = 0 -> Grid = SOLD OUT, Customer booking unavailable, Physical inventory unchanged');
    const { req: req12, res: res12 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 0,
    });
    await AdminController.quickUpdateCell(req12, res12);

    let grid12 = await getGrid(testDate1, 1);
    let row12 = grid12.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell12 = row12?.dates[0];
    if (cell12?.availableRooms !== 0) {
      throw new Error(`TEST 12 FAILED: Expected 0 available on grid, got ${cell12?.availableRooms}`);
    }

    // Verify customer website availability check via AvailabilityEngine.checkAvailability
    const customerStay = await AvailabilityEngine.checkAvailability(
      premDbl._id,
      new Date('2026-10-05T00:00:00+05:30'),
      new Date('2026-10-06T00:00:00+05:30')
    );
    if (customerStay.availableRooms !== 0 || customerStay.isAvailable !== false) {
      throw new Error(
        `TEST 12 FAILED: Customer stay expected availableRooms 0 and isAvailable false, got ${customerStay.availableRooms}, ${customerStay.isAvailable}`
      );
    }

    // Verify physical inventory unchanged
    const currentPhysical = await Room.countDocuments({
      roomTypeId: premDbl._id,
      roomNumber: { $in: OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber) },
      isActive: true,
      isVenue: { $ne: true },
    });
    if (currentPhysical !== 7) {
      throw new Error(`TEST 12 FAILED: Physical room count was altered! Expected 7, got ${currentPhysical}`);
    }
    console.log(`✓ TEST 12 PASSED: Grid = [ SOLD OUT ], Customer booking is unavailable, Physical rooms remain 7.\n`);

    // ------------------------------------------------------------------------
    // TEST 13: Change inventory using quick-edit button, then open Date Details & Instant Edit -> same value
    // ------------------------------------------------------------------------
    console.log('TEST 13: Change inventory using quick-edit button, verify Date Details sees same value');
    const { req: req13, res: res13 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 4,
    });
    await AdminController.quickUpdateCell(req13, res13);

    // Both quick edit and Date details query getDateWiseGrid
    let grid13 = await getGrid(testDate1, 1);
    let row13 = grid13.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell13 = row13?.dates[0];
    if (cell13?.inventoryOverride !== 4 || cell13?.availableRooms !== 4) {
      throw new Error(`TEST 13 FAILED: Expected inventoryOverride 4, got ${cell13?.inventoryOverride}`);
    }
    console.log(`✓ TEST 13 PASSED: Quick edit set override to 4, Date Details query reflects inventoryOverride = 4.\n`);

    // ------------------------------------------------------------------------
    // TEST 14: Change inventoryOverride through Date Details modal, then return to grid -> quick edit button reflects same value
    // ------------------------------------------------------------------------
    console.log('TEST 14: Change inventoryOverride through Date Details modal, verify grid reflects same value');
    // Date Details modal submits to the exact same cell-update endpoint with full details
    const { req: req14, res: res14 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      ratePlanCode: 'ROOM_ONLY',
      rates: {
        singleAdult: 1600,
        doubleAdult: 1600,
        tripleAdult: 2200,
        childRate: 0,
        extraAdultRate: 600,
      },
      inventoryOverride: 6,
      stopSell: false,
      minStay: 1,
    });
    await AdminController.quickUpdateCell(req14, res14);

    let grid14 = await getGrid(testDate1, 1);
    let row14 = grid14.rows.find((r) => r.roomType._id.toString() === premDbl._id.toString());
    let cell14 = row14?.dates[0];
    if (cell14?.inventoryOverride !== 6 || cell14?.availableRooms !== 6) {
      throw new Error(`TEST 14 FAILED: Expected inventoryOverride 6 on grid, got ${cell14?.inventoryOverride}`);
    }
    console.log(`✓ TEST 14 PASSED: Date Details modal set override to 6, grid reflects [ 6 LEFT ] with override = 6.\n`);

    // ------------------------------------------------------------------------
    // VERIFICATION: Check final physical room count
    // ------------------------------------------------------------------------
    const finalPhysicalCount = await Room.countDocuments({
      roomNumber: { $in: OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber) },
      isActive: true,
      isVenue: { $ne: true },
    });
    if (finalPhysicalCount !== initialPhysicalCount) {
      throw new Error(`CRITICAL FAILURE: Physical room count changed from ${initialPhysicalCount} to ${finalPhysicalCount}!`);
    }
    console.log(`✓ CRITICAL CHECK PASSED: Physical room inventory strictly unchanged (${finalPhysicalCount} rooms).\n`);

    console.log('========================================================================');
    console.log('ALL 14 TESTS PASSED SUCCESSFULLY! DIRECT ONLINE INVENTORY EDITING VERIFIED.');
    console.log('========================================================================\n');
  } finally {
    // Cleanup
    if (createdBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
    await DailyInventory.deleteMany({
      date: { $in: [testDate1, testDate2] },
    });
    await mongoose.disconnect();
  }
}

runOnlineInventoryQuickEditTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
