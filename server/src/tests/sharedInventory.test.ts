import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';
import { Room } from '../models/Room';
import { DailyInventory } from '../models/DailyInventory';
import { DailyRate } from '../models/DailyRate';
import { Booking } from '../models/Booking';
import { AvailabilityEngine } from '../services/AvailabilityEngine';
import { AdminController } from '../controllers/adminController';
import { PublicController } from '../controllers/publicController';
import { OFFICIAL_ROOMS_SPEC } from '../seed/seedDatabase';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

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

async function runSharedInventoryTests() {
  console.log('========================================================================');
  console.log('HOTEL RAAMA — SHARED INVENTORY (SINGLE/DOUBLE) 12-TEST SUITE');
  console.log('========================================================================\n');

  await mongoose.connect(MONGODB_URI);

  const testDate1 = '2026-11-20';
  const testDate2 = '2026-11-21';
  const testDate3 = '2026-11-22';
  const testDates = [testDate1, testDate2, testDate3];

  const d1In = new Date(Date.UTC(2026, 10, 20, 0, 0, 0, 0));
  const d1Out = new Date(Date.UTC(2026, 10, 21, 0, 0, 0, 0));
  const d2In = new Date(Date.UTC(2026, 10, 21, 0, 0, 0, 0));
  const d2Out = new Date(Date.UTC(2026, 10, 22, 0, 0, 0, 0));
  const dMultiIn = new Date(Date.UTC(2026, 10, 20, 0, 0, 0, 0));
  const dMultiOut = new Date(Date.UTC(2026, 10, 22, 0, 0, 0, 0)); // 2 nights

  const createdBookingIds: Types.ObjectId[] = [];

  try {
    // 0. Verify Room Types and Physical Rooms
    const premSgl = await RoomType.findOne({ code: 'PREM_SGL_NONAC' });
    const premDbl = await RoomType.findOne({ code: 'PREM_DBL_NONAC' });
    const execSgl = await RoomType.findOne({ code: 'EXEC_SGL_AC' });
    const execDbl = await RoomType.findOne({ code: 'EXEC_DBL_AC' });

    if (!premSgl || !premDbl || !execSgl || !execDbl) {
      throw new Error('Required room types PREM_SGL_NONAC, PREM_DBL_NONAC, EXEC_SGL_AC, EXEC_DBL_AC must exist.');
    }

    const officialNumbers = OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber);
    const initialGuestRoomsCount = await Room.countDocuments({
      roomNumber: { $in: officialNumbers },
      isActive: true,
      isVenue: { $ne: true },
    });
    console.log(`[Setup] Total official physical guest rooms in DB: ${initialGuestRoomsCount} (Expected: 37)`);
    if (initialGuestRoomsCount !== 37) {
      throw new Error(`Expected exactly 37 official guest rooms, found ${initialGuestRoomsCount}`);
    }

    const { totalPhysical: premPhysical } = await AvailabilityEngine.resolvePooledRoomTypes(premDbl._id);
    const { totalPhysical: execPhysical } = await AvailabilityEngine.resolvePooledRoomTypes(execDbl._id);
    console.log(`[Setup] Premium Non A/C shared physical rooms: ${premPhysical} (Expected: 7)`);
    console.log(`[Setup] Executive A/C shared physical rooms: ${execPhysical} (Expected: 22)\n`);

    if (premPhysical !== 7) throw new Error(`Expected 7 physical rooms for Premium Non-A/C, got ${premPhysical}`);
    if (execPhysical !== 22) throw new Error(`Expected 22 physical rooms for Executive A/C, got ${execPhysical}`);

    // Helper cleanup for test dates
    const cleanup = async () => {
      if (createdBookingIds.length > 0) {
        await Booking.deleteMany({ _id: { $in: createdBookingIds } });
        createdBookingIds.length = 0;
      }
      await DailyInventory.deleteMany({
        date: { $in: testDates },
      });
    };

    await cleanup();

    // Helper to create a test booking
    let counter = 1;
    const createBooking = async (roomTypeId: Types.ObjectId, checkIn: Date, checkOut: Date, status = 'CONFIRMED', custom: any = {}) => {
      const idx = counter++;
      const bk = await Booking.create({
        bookingId: `BK-TEST-SH-${Date.now()}-${idx}`,
        source: 'ONLINE',
        guestName: `Test Guest ${idx}`,
        guestEmail: `guest${idx}@example.com`,
        guestPhone: `98765432${(idx % 90 + 10).toString().padStart(2, '0')}`,
        roomTypeId,
        checkIn,
        checkOut,
        numGuests: 1,
        numNights: 1,
        roomPricePerNightSnapshot: 1600,
        discountAmountSnapshot: 0,
        taxAmountSnapshot: 0,
        totalAmount: 1600,
        bookingStatus: status,
        paymentStatus: status === 'CONFIRMED' ? 'PAID' : 'PENDING',
        expiresAt: status === 'PENDING' ? new Date(Date.now() + 15 * 60 * 1000) : undefined,
        trackingToken: `tok-${Date.now()}-${idx}`,
        ...custom,
      });
      createdBookingIds.push(bk._id as Types.ObjectId);
      return bk;
    };

    // ------------------------------------------------------------------------
    // TEST 1: Shared inventory = 5. Single booking = 1.
    // Expected: Single available = 4, Double available = 4.
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Shared inventory = 5. Single booking = 1 ---');
    // Set sellable override = 5 on testDate1
    const { req: r1, res: s1 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 5,
    });
    await AdminController.quickUpdateCell(r1, s1);

    // Book 1 Single room
    await createBooking(premSgl._id, d1In, d1Out, 'CONFIRMED');

    const avail1Sgl = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    const avail1Dbl = await AvailabilityEngine.checkAvailability(premDbl._id, d1In, d1Out);

    console.log(`[TEST 1] Single available: ${avail1Sgl.availableRooms}, Double available: ${avail1Dbl.availableRooms}`);
    if (avail1Sgl.availableRooms !== 4 || avail1Dbl.availableRooms !== 4) {
      throw new Error(`TEST 1 FAILED: Expected 4 available for both Single and Double, got Single=${avail1Sgl.availableRooms}, Double=${avail1Dbl.availableRooms}`);
    }
    console.log('✓ TEST 1 PASSED: Single available = 4, Double available = 4.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 2: Shared inventory = 5. Double booking = 1.
    // Expected: Single available = 4, Double available = 4.
    // ------------------------------------------------------------------------
    console.log('--- TEST 2: Shared inventory = 5. Double booking = 1 ---');
    const { req: r2, res: s2 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 5,
    });
    await AdminController.quickUpdateCell(r2, s2);

    // Book 1 Double room
    await createBooking(premDbl._id, d1In, d1Out, 'CONFIRMED');

    const avail2Sgl = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    const avail2Dbl = await AvailabilityEngine.checkAvailability(premDbl._id, d1In, d1Out);

    console.log(`[TEST 2] Single available: ${avail2Sgl.availableRooms}, Double available: ${avail2Dbl.availableRooms}`);
    if (avail2Sgl.availableRooms !== 4 || avail2Dbl.availableRooms !== 4) {
      throw new Error(`TEST 2 FAILED: Expected 4 available for both, got Single=${avail2Sgl.availableRooms}, Double=${avail2Dbl.availableRooms}`);
    }
    console.log('✓ TEST 2 PASSED: Single available = 4, Double available = 4.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 3: Shared inventory = 1. Single booking = 1.
    // Expected: Single = SOLD OUT, Double = SOLD OUT.
    // ------------------------------------------------------------------------
    console.log('--- TEST 3: Shared inventory = 1. Single booking = 1 ---');
    const { req: r3, res: s3 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 1,
    });
    await AdminController.quickUpdateCell(r3, s3);

    // Book 1 Single room
    await createBooking(premSgl._id, d1In, d1Out, 'CONFIRMED');

    const avail3Sgl = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    const avail3Dbl = await AvailabilityEngine.checkAvailability(premDbl._id, d1In, d1Out);

    console.log(`[TEST 3] Single isAvailable: ${avail3Sgl.isAvailable} (avail: ${avail3Sgl.availableRooms}), Double isAvailable: ${avail3Dbl.isAvailable} (avail: ${avail3Dbl.availableRooms})`);
    if (avail3Sgl.isAvailable || avail3Sgl.availableRooms !== 0 || avail3Dbl.isAvailable || avail3Dbl.availableRooms !== 0) {
      throw new Error(`TEST 3 FAILED: Expected both SOLD OUT (isAvailable=false, avail=0)`);
    }
    console.log('✓ TEST 3 PASSED: Both Single and Double report SOLD OUT.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 4: Shared inventory = 1. Double booking = 1.
    // Expected: Single = SOLD OUT, Double = SOLD OUT.
    // ------------------------------------------------------------------------
    console.log('--- TEST 4: Shared inventory = 1. Double booking = 1 ---');
    const { req: r4, res: s4 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 1,
    });
    await AdminController.quickUpdateCell(r4, s4);

    // Book 1 Double room
    await createBooking(premDbl._id, d1In, d1Out, 'CONFIRMED');

    const avail4Sgl = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    const avail4Dbl = await AvailabilityEngine.checkAvailability(premDbl._id, d1In, d1Out);

    console.log(`[TEST 4] Single isAvailable: ${avail4Sgl.isAvailable} (avail: ${avail4Sgl.availableRooms}), Double isAvailable: ${avail4Dbl.isAvailable} (avail: ${avail4Dbl.availableRooms})`);
    if (avail4Sgl.isAvailable || avail4Sgl.availableRooms !== 0 || avail4Dbl.isAvailable || avail4Dbl.availableRooms !== 0) {
      throw new Error(`TEST 4 FAILED: Expected both SOLD OUT (isAvailable=false, avail=0)`);
    }
    console.log('✓ TEST 4 PASSED: Both Single and Double report SOLD OUT.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 5: Shared inventory = 1. Single hold exists. Attempt Double booking.
    // Expected: REJECTED.
    // ------------------------------------------------------------------------
    console.log('--- TEST 5: Shared inventory = 1. Single hold exists. Attempt Double booking ---');
    const { req: r5, res: s5 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 1,
    });
    await AdminController.quickUpdateCell(r5, s5);

    // Guest A creates PENDING hold for Single room
    await createBooking(premSgl._id, d1In, d1Out, 'PENDING');

    // Guest B attempts to book Double room via PublicController
    const { req: bReq5, res: bRes5 } = mockReqRes({}, {
      guestName: 'Guest B',
      guestEmail: 'guestb@example.com',
      guestPhone: '9876543210',
      roomTypeId: premDbl._id.toString(),
      checkIn: testDate1,
      checkOut: testDate2,
      numGuests: 2,
    });
    await PublicController.createBooking(bReq5, bRes5);

    console.log(`[TEST 5] Attempt status code: ${bRes5.getStatusCode()}, Message: ${bRes5.getData()?.message}`);
    if (bRes5.getStatusCode() === 201) {
      throw new Error('TEST 5 FAILED: Double booking was accepted when Single hold exhausted inventory!');
    }
    console.log('✓ TEST 5 PASSED: Double booking strictly rejected due to active Single hold.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 6: Shared inventory = 1. Double hold exists. Attempt Single booking.
    // Expected: REJECTED.
    // ------------------------------------------------------------------------
    console.log('--- TEST 6: Shared inventory = 1. Double hold exists. Attempt Single booking ---');
    const { req: r6, res: s6 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 1,
    });
    await AdminController.quickUpdateCell(r6, s6);

    // Guest A creates PENDING hold for Double room
    await createBooking(premDbl._id, d1In, d1Out, 'PENDING');

    // Guest B attempts to book Single room via PublicController
    const { req: bReq6, res: bRes6 } = mockReqRes({}, {
      guestName: 'Guest B',
      guestEmail: 'guestb@example.com',
      guestPhone: '9876543210',
      roomTypeId: premSgl._id.toString(),
      checkIn: testDate1,
      checkOut: testDate2,
      numGuests: 1,
    });
    await PublicController.createBooking(bReq6, bRes6);

    console.log(`[TEST 6] Attempt status code: ${bRes6.getStatusCode()}, Message: ${bRes6.getData()?.message}`);
    if (bRes6.getStatusCode() === 201) {
      throw new Error('TEST 6 FAILED: Single booking was accepted when Double hold exhausted inventory!');
    }
    console.log('✓ TEST 6 PASSED: Single booking strictly rejected due to active Double hold.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 7: Cancel Single booking.
    // Expected: Shared availability restored. Both Single and Double show restored quantity.
    // ------------------------------------------------------------------------
    console.log('--- TEST 7: Cancel Single booking -> Restores shared availability ---');
    const { req: r7, res: s7 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 5,
    });
    await AdminController.quickUpdateCell(r7, s7);

    // Create 2 Single bookings
    const bkSgl1 = await createBooking(premSgl._id, d1In, d1Out, 'CONFIRMED');
    const bkSgl2 = await createBooking(premSgl._id, d1In, d1Out, 'CONFIRMED');

    let checkPreCancel = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    console.log(`[TEST 7] Before cancel: Available = ${checkPreCancel.availableRooms} (Expected: 3)`);
    if (checkPreCancel.availableRooms !== 3) throw new Error(`Expected 3 available, got ${checkPreCancel.availableRooms}`);

    // Cancel 1 Single booking
    await Booking.findByIdAndUpdate(bkSgl1._id, { bookingStatus: 'CANCELLED' });

    const checkPostCancelSgl = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    const checkPostCancelDbl = await AvailabilityEngine.checkAvailability(premDbl._id, d1In, d1Out);
    console.log(`[TEST 7] After cancel: Single available = ${checkPostCancelSgl.availableRooms}, Double available = ${checkPostCancelDbl.availableRooms}`);
    if (checkPostCancelSgl.availableRooms !== 4 || checkPostCancelDbl.availableRooms !== 4) {
      throw new Error(`TEST 7 FAILED: Expected 4 available for both, got Single=${checkPostCancelSgl.availableRooms}, Double=${checkPostCancelDbl.availableRooms}`);
    }
    console.log('✓ TEST 7 PASSED: Cancelled Single booking restored shared availability for both Single and Double.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 8: Cancel Double booking.
    // Expected: Shared availability restored for both Single and Double.
    // ------------------------------------------------------------------------
    console.log('--- TEST 8: Cancel Double booking -> Restores shared availability ---');
    const { req: r8, res: s8 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 5,
    });
    await AdminController.quickUpdateCell(r8, s8);

    const bkDbl1 = await createBooking(premDbl._id, d1In, d1Out, 'CONFIRMED');
    await createBooking(premDbl._id, d1In, d1Out, 'CONFIRMED');

    // Cancel 1 Double booking
    await Booking.findByIdAndUpdate(bkDbl1._id, { bookingStatus: 'CANCELLED' });

    const checkPostCancelDblSgl = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    const checkPostCancelDblDbl = await AvailabilityEngine.checkAvailability(premDbl._id, d1In, d1Out);
    console.log(`[TEST 8] After cancel: Single available = ${checkPostCancelDblSgl.availableRooms}, Double available = ${checkPostCancelDblDbl.availableRooms}`);
    if (checkPostCancelDblSgl.availableRooms !== 4 || checkPostCancelDblDbl.availableRooms !== 4) {
      throw new Error(`TEST 8 FAILED: Expected 4 available for both, got Single=${checkPostCancelDblSgl.availableRooms}, Double=${checkPostCancelDblDbl.availableRooms}`);
    }
    console.log('✓ TEST 8 PASSED: Cancelled Double booking restored shared availability for both Single and Double.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 9: Multi-night booking where one night has zero shared inventory.
    // Expected: entire booking rejected.
    // ------------------------------------------------------------------------
    console.log('--- TEST 9: Multi-night booking where one night has zero shared inventory ---');
    // Night 1 (Nov 20): 2 rooms cap
    const { req: r9a, res: s9a } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 2,
    });
    await AdminController.quickUpdateCell(r9a, s9a);

    // Night 2 (Nov 21): 1 room cap
    const { req: r9b, res: s9b } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate2,
      inventoryOverride: 1,
    });
    await AdminController.quickUpdateCell(r9b, s9b);

    // Book 1 room on Night 2 only (exhausting Night 2)
    await createBooking(premDbl._id, d2In, d2Out, 'CONFIRMED');

    // Attempt multi-night booking across Nov 20 -> Nov 22 (2 nights)
    const multiAvailSgl = await AvailabilityEngine.checkAvailability(premSgl._id, dMultiIn, dMultiOut);
    const multiAvailDbl = await AvailabilityEngine.checkAvailability(premDbl._id, dMultiIn, dMultiOut);

    console.log(`[TEST 9] Multi-night availability: Single isAvailable=${multiAvailSgl.isAvailable}, Double isAvailable=${multiAvailDbl.isAvailable}`);
    if (multiAvailSgl.isAvailable || multiAvailDbl.isAvailable) {
      throw new Error('TEST 9 FAILED: Multi-night booking was available even though night 2 has 0 inventory!');
    }

    // Try booking multi-night via PublicController
    const { req: bReq9, res: bRes9 } = mockReqRes({}, {
      guestName: 'Guest Multi',
      guestEmail: 'guestmulti@example.com',
      guestPhone: '9876543210',
      roomTypeId: premDbl._id.toString(),
      checkIn: testDate1,
      checkOut: testDate3,
      numGuests: 2,
    });
    await PublicController.createBooking(bReq9, bRes9);

    console.log(`[TEST 9] Controller response: status = ${bRes9.getStatusCode()}, message = ${bRes9.getData()?.message}`);
    if (bRes9.getStatusCode() === 201) {
      throw new Error('TEST 9 FAILED: Controller allowed multi-night booking when one night was zero!');
    }
    console.log('✓ TEST 9 PASSED: Entire multi-night booking strictly rejected when any night has zero shared inventory.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 10: inventoryOverride = 0.
    // Expected: both Single and Double are unavailable.
    // ------------------------------------------------------------------------
    console.log('--- TEST 10: inventoryOverride = 0 -> Both Single and Double unavailable ---');
    const { req: r10, res: s10 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      inventoryOverride: 0,
    });
    await AdminController.quickUpdateCell(r10, s10);

    const avail10Sgl = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    const avail10Dbl = await AvailabilityEngine.checkAvailability(premDbl._id, d1In, d1Out);

    console.log(`[TEST 10] Single isAvailable: ${avail10Sgl.isAvailable}, Double isAvailable: ${avail10Dbl.isAvailable}`);
    if (avail10Sgl.isAvailable || avail10Dbl.isAvailable || avail10Sgl.availableRooms !== 0 || avail10Dbl.availableRooms !== 0) {
      throw new Error('TEST 10 FAILED: Expected both unavailable when override = 0');
    }
    console.log('✓ TEST 10 PASSED: Both Single and Double unavailable when inventoryOverride = 0.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 11: Stop Sell enabled.
    // Expected: both Single and Double are unavailable for that shared inventory.
    // ------------------------------------------------------------------------
    console.log('--- TEST 11: Stop Sell enabled -> Both Single and Double unavailable ---');
    // Enable Stop Sell via quickUpdateCell on Double
    const { req: r11, res: s11 } = mockReqRes({}, {
      roomTypeId: premDbl._id.toString(),
      date: testDate1,
      stopSell: true,
    });
    await AdminController.quickUpdateCell(r11, s11);

    const avail11Sgl = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    const avail11Dbl = await AvailabilityEngine.checkAvailability(premDbl._id, d1In, d1Out);

    console.log(`[TEST 11] Single stopSell: ${avail11Sgl.stopSell} (isAvailable: ${avail11Sgl.isAvailable})`);
    console.log(`[TEST 11] Double stopSell: ${avail11Dbl.stopSell} (isAvailable: ${avail11Dbl.isAvailable})`);
    if (avail11Sgl.isAvailable || avail11Dbl.isAvailable || !avail11Sgl.stopSell || !avail11Dbl.stopSell) {
      throw new Error('TEST 11 FAILED: Expected both Single and Double to enforce Stop Sell');
    }
    console.log('✓ TEST 11 PASSED: Stop Sell cannot be bypassed through the other occupancy representation.\n');

    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 12: Normal available shared inventory.
    // Expected: both Single and Double can be booked normally, subject to their individual occupancy/rate rules.
    // ------------------------------------------------------------------------
    console.log('--- TEST 12: Normal available shared inventory -> Both can be booked independently ---');
    const avail12Sgl = await AvailabilityEngine.checkAvailability(premSgl._id, d1In, d1Out);
    const avail12Dbl = await AvailabilityEngine.checkAvailability(premDbl._id, d1In, d1Out);

    console.log(`[TEST 12] Base physical capacity: Single avail = ${avail12Sgl.availableRooms}, Double avail = ${avail12Dbl.availableRooms}`);
    if (avail12Sgl.availableRooms !== 7 || avail12Dbl.availableRooms !== 7) {
      throw new Error(`TEST 12 FAILED: Expected 7 available rooms for Premium Non-A/C, got ${avail12Sgl.availableRooms}`);
    }

    // Verify independent pricing between Single and Double
    if (premSgl.basePrice === premDbl.basePrice) {
      throw new Error(`TEST 12 FAILED: Single and Double rates should be separate (got Sgl: ${premSgl.basePrice}, Dbl: ${premDbl.basePrice})`);
    }
    console.log(`[TEST 12] Verified distinct rates: Single = ₹${premSgl.basePrice}, Double = ₹${premDbl.basePrice}`);
    console.log('✓ TEST 12 PASSED: Both Single and Double bookable under separate rates.\n');

    // ------------------------------------------------------------------------
    // TEST 13: Admin Grid displays both Single and Double rows with shared inventory and distinct rates
    // ------------------------------------------------------------------------
    console.log('--- TEST 13: Admin Grid displays Single & Double rows with shared inventory ---');
    // Set custom rate on Single only for testDate1: ₹1400 (base is ₹1200)
    await DailyRate.findOneAndUpdate(
      { roomTypeId: premSgl._id, date: testDate1, ratePlanCode: 'ROOM_ONLY' },
      { singleAdult: 1400, doubleAdult: 1400, tripleAdult: 1400, childRate: 0, extraAdultRate: 600, ratePlanCode: 'ROOM_ONLY' },
      { upsert: true }
    );
    // Create 1 booking on Double
    await createBooking(premDbl._id, d1In, d1Out, 'CONFIRMED');

    const gridData = await AvailabilityEngine.getDateWiseGridData(d1In, d1Out, 'ALL', 'ROOM_ONLY');
    const sglRow = gridData.rows.find((r) => r.roomType.code === 'PREM_SGL_NONAC');
    const dblRow = gridData.rows.find((r) => r.roomType.code === 'PREM_DBL_NONAC');

    if (!sglRow || !dblRow) {
      throw new Error(`TEST 13 FAILED: Both PREM_SGL_NONAC and PREM_DBL_NONAC rows must exist in grid when filter is ALL`);
    }

    const sglCell = sglRow.dates.find((c) => c.date === testDate1);
    const dblCell = dblRow.dates.find((c) => c.date === testDate1);

    console.log(`[TEST 13] Single Row: Physical=${sglCell?.physicalRooms}, Booked=${sglCell?.bookedRooms}, Avail=${sglCell?.availableRooms}, SingleRate=₹${sglCell?.rates.singleAdult}`);
    console.log(`[TEST 13] Double Row: Physical=${dblCell?.physicalRooms}, Booked=${dblCell?.bookedRooms}, Avail=${dblCell?.availableRooms}, DoubleRate=₹${dblCell?.rates.doubleAdult}`);

    if (sglCell?.physicalRooms !== 7 || dblCell?.physicalRooms !== 7) {
      throw new Error('TEST 13 FAILED: Physical rooms must be 7 for both');
    }
    if (sglCell?.bookedRooms !== 1 || dblCell?.bookedRooms !== 1) {
      throw new Error('TEST 13 FAILED: Booked rooms must be 1 for both');
    }
    if (sglCell?.availableRooms !== 6 || dblCell?.availableRooms !== 6) {
      throw new Error('TEST 13 FAILED: Available rooms must be 6 for both');
    }
    if (sglCell?.rates.singleAdult !== 1400 || dblCell?.rates.doubleAdult !== premDbl.basePrice) {
      throw new Error(`TEST 13 FAILED: Rates must remain distinct! (Sgl: ${sglCell?.rates.singleAdult}, Dbl: ${dblCell?.rates.doubleAdult})`);
    }
    console.log('✓ TEST 13 PASSED: Admin grid reflects identical shared pool while maintaining distinct rates.\n');

    // Clean up custom rate
    await DailyRate.deleteMany({ roomTypeId: premSgl._id, date: testDate1 });
    await cleanup();

    // ------------------------------------------------------------------------
    // TEST 14: Strict Physical Room Integrity Verification
    // ------------------------------------------------------------------------
    console.log('--- TEST 14: Strict Physical Room Integrity Verification ---');
    const finalPhysicalGuestRooms = await Room.countDocuments({
      roomNumber: { $in: officialNumbers },
      isActive: true,
      isVenue: { $ne: true },
    });
    console.log(`[TEST 14] Final physical guest rooms in DB: ${finalPhysicalGuestRooms} (Expected: 37)`);
    if (finalPhysicalGuestRooms !== 37) {
      throw new Error(`Physical room count altered! Expected 37, found ${finalPhysicalGuestRooms}`);
    }
    console.log('✓ TEST 14 PASSED: Exactly 37 physical guest rooms remain in database (0 duplicates created).\n');

  } finally {
    // Final cleanup
    if (createdBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
    await DailyInventory.deleteMany({
      date: { $in: testDates },
    });
    await DailyRate.deleteMany({
      date: { $in: testDates },
    });
  }

  console.log('========================================================================');
  console.log('ALL 14 SHARED INVENTORY TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================================================');
}

runSharedInventoryTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
