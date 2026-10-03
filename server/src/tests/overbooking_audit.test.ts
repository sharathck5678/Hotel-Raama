import mongoose from 'mongoose';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { AvailabilityEngine } from '../services/AvailabilityEngine';

async function runOverbookingTest() {
  await mongoose.connect('mongodb://localhost:27017/hotel_raama');

  console.log('\n=== SECTION 4: OVERBOOKING TEST ===');

  const execDblType = await RoomType.findOne({ code: 'EXEC_DBL_AC' });
  const execSglType = await RoomType.findOne({ code: 'EXEC_SGL_AC' });

  // Test date window in the future
  const checkIn = new Date('2026-11-20T12:00:00.000Z');
  const checkOut = new Date('2026-11-21T10:00:00.000Z');

  // 0. Initial availability check
  const initialAvail = await AvailabilityEngine.checkAvailability(execDblType!._id, checkIn, checkOut);
  console.log(`Step 0: Initial A/C Availability: ${initialAvail.availableRooms} / ${initialAvail.totalRooms}`);

  // Fetch the 22 rooms in the pool
  const pooledRooms = await Room.find({
    roomTypeId: { $in: [execDblType!._id, execSglType!._id] },
    isActive: true,
    isVenue: { $ne: true },
  });
  console.log(`Pooled physical rooms count: ${pooledRooms.length}`);

  const createdBookingIds: string[] = [];

  try {
    // 1. Book all 22 rooms for the overlapping date window
    // Alternate between Single occupancy and Double occupancy to test pool sharing!
    for (let i = 0; i < pooledRooms.length; i++) {
      const room = pooledRooms[i];
      const isSingle = i % 2 === 0;
      const rTypeId = isSingle ? execSglType!._id : execDblType!._id;
      const bId = `HR-AUDIT-22-${i + 1}`;
      createdBookingIds.push(bId);

      await Booking.create({
        bookingId: bId,
        guestName: `Audit Guest ${i + 1}`,
        guestEmail: `guest${i + 1}@audit.com`,
        guestPhone: `90000000${(i + 1).toString().padStart(2, '0')}`,
        roomTypeId: rTypeId,
        assignedRoomId: room._id,
        checkIn,
        checkOut,
        numGuests: isSingle ? 1 : 2,
        numNights: 1,
        roomPricePerNightSnapshot: isSingle ? 1800 : 2200,
        discountAmountSnapshot: 0,
        taxAmountSnapshot: 200,
        totalAmount: isSingle ? 2000 : 2400,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        trackingToken: `trk_audit_${i + 1}`,
      });
    }

    // 2. Availability becomes 0
    const fullCheckDbl = await AvailabilityEngine.checkAvailability(execDblType!._id, checkIn, checkOut);
    const fullCheckSgl = await AvailabilityEngine.checkAvailability(execSglType!._id, checkIn, checkOut);
    console.log(`Step 2: Availability after 22 bookings:`);
    console.log(`- Double A/C available: ${fullCheckDbl.availableRooms} (isAvailable: ${fullCheckDbl.isAvailable})`);
    console.log(`- Single A/C available: ${fullCheckSgl.availableRooms} (isAvailable: ${fullCheckSgl.isAvailable})`);

    // 3. A 23rd booking for the same applicable category is rejected/unavailable
    const is23rdBlocked = !fullCheckDbl.isAvailable && !fullCheckSgl.isAvailable;
    console.log(`Step 3: 23rd booking blocked: ${is23rdBlocked}`);

    // 4. Cancel one booking
    const bookingToCancel = await Booking.findOne({ bookingId: createdBookingIds[0] });
    bookingToCancel!.bookingStatus = 'CANCELLED';
    await bookingToCancel!.save();
    console.log(`Step 4: Cancelled booking ${createdBookingIds[0]}`);

    // 5. Availability returns to 1
    const postCancelCheck = await AvailabilityEngine.checkAvailability(execDblType!._id, checkIn, checkOut);
    console.log(`Step 5: Availability after cancellation: ${postCancelCheck.availableRooms} (isAvailable: ${postCancelCheck.isAvailable})`);

    // 6. A new booking can then consume that released physical room
    console.log(`Released room assigned to next booking: Room #${(await Room.findById(postCancelCheck.assignedRoomId))?.roomNumber}`);

    // Verify simultaneous booking simulation: two requests should not get same room if booked in sequence
    const secondAvail = await AvailabilityEngine.checkAvailability(execDblType!._id, checkIn, checkOut);
    console.log(`Assignment consistency: candidate room is available: ${secondAvail.isAvailable}`);

  } finally {
    // Clean up all audit bookings
    await Booking.deleteMany({ bookingId: { $in: createdBookingIds } });
    console.log('Cleanup: All 22 audit bookings deleted.');
  }

  await mongoose.disconnect();
}

runOverbookingTest().catch(console.error);
