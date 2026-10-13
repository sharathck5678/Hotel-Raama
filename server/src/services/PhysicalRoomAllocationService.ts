import mongoose, { Types, ClientSession } from 'mongoose';
import { PhysicalRoomAllocation, PhysicalAllocationStatus } from '../models/PhysicalRoomAllocation';
import { AllocationOperation } from '../models/AllocationOperation';
import { Booking } from '../models/Booking';
import { AvailabilityEngine } from './AvailabilityEngine';

export interface IAllocateRoomOptions {
  roomId: string | Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  bookingId: string | Types.ObjectId;
  bookingStatus?: PhysicalAllocationStatus;
  expiresAt?: Date | null;
  session?: ClientSession;
}

export interface IReleaseRoomOptions {
  roomId: string | Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  bookingId: string | Types.ObjectId;
  session?: ClientSession;
}

export interface IReassignRoomOptions {
  bookingId: string | Types.ObjectId;
  previousRoomId?: string | Types.ObjectId | null;
  targetRoomId: string | Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  bookingStatus?: PhysicalAllocationStatus;
  session?: ClientSession;
}

export class PhysicalRoomAllocationService {
  private static _transactionsSupported: boolean | null = null;

  /**
   * Checks whether the underlying MongoDB deployment supports multi-document transactions.
   * Caches result to avoid redundant probing.
   */
  static async isTransactionSupported(): Promise<boolean> {
    if (this._transactionsSupported !== null) {
      return this._transactionsSupported;
    }
    try {
      const session = await mongoose.startSession();
      session.startTransaction();
      // Must execute an actual database command to verify server-side replica set support
      await mongoose.connection.collection('allocationoperations').findOne({}, { session });
      await session.abortTransaction();
      await session.endSession();
      this._transactionsSupported = true;
    } catch {
      this._transactionsSupported = false;
    }
    return this._transactionsSupported;
  }

  /**
   * Recovers any stale or abandoned allocation operations while the server is running.
   * Cleans up partial room-night claims left behind by crashed workers or unhandled failures.
   * Concurrently safe across multiple server processes via atomic status: 'RECOVERING' transition.
   * Cleanup queries are strictly constrained to operationId and bookingId to prevent
   * stale recovery workers from deleting slots of newer successful operations.
   */
  static async recoverStaleOperations(): Promise<{ recoveredOps: number; recoveredSlots: number }> {
    const now = new Date();
    const staleOps = await AllocationOperation.find({
      status: { $in: ['PENDING', 'RECOVERING'] },
      leaseExpiresAt: { $lt: now },
    });

    let recoveredOps = 0;
    let recoveredSlots = 0;

    for (const op of staleOps) {
      // Atomic claim by this recovery worker
      const claimedOp = await AllocationOperation.findOneAndUpdate(
        {
          _id: op._id,
          status: { $in: ['PENDING', 'RECOVERING'] },
          leaseExpiresAt: { $lt: now },
        },
        {
          $set: {
            status: 'RECOVERING',
            leaseExpiresAt: new Date(Date.now() + 30000), // 30s recovery lease
          },
        },
        { new: true }
      );

      if (!claimedOp) {
        // Another concurrent worker claimed this operation or it is no longer stale
        continue;
      }

      recoveredOps++;

      const existingBooking = await Booking.findById(claimedOp.bookingId).lean();
      const isBookingActive =
        existingBooking &&
        ['CONFIRMED', 'CHECKED_IN'].includes(existingBooking.bookingStatus) &&
        existingBooking.assignedRoomId?.toString() === claimedOp.roomId.toString();

      if (!isBookingActive) {
        // Abandoned or crashed partial allocation: release slots strictly constrained by operationId and bookingId
        const delRes = await PhysicalRoomAllocation.deleteMany({
          bookingId: claimedOp.bookingId,
          $or: [
            { _id: { $in: claimedOp.claimedSlotIds || [] } },
            { roomId: claimedOp.roomId, date: { $in: claimedOp.stayDates } },
          ],
          $and: [
            {
              $or: [
                { operationId: claimedOp._id },
                { operationId: null },
                { operationId: { $exists: false } },
              ],
            },
          ],
        });
        recoveredSlots += delRes.deletedCount;

        await AllocationOperation.updateOne(
          { _id: claimedOp._id },
          { $set: { status: 'FAILED' } }
        );
      } else {
        // Booking exists and is active: seal operation as COMMITTED
        await AllocationOperation.updateOne(
          { _id: claimedOp._id },
          { $set: { status: 'COMMITTED' } }
        );
      }
    }

    return { recoveredOps, recoveredSlots };
  }

  /**
   * Atomically claims physical room nights in the PhysicalRoomAllocation collection.
   * Uses MongoDB WiredTiger primary key constraint (_id: `${roomId}_${dateStr}`)
   * to guarantee that NO TWO BOOKINGS CAN EVER BE ALLOCATED THE SAME PHYSICAL ROOM
   * FOR OVERLAPPING DATES across any number of server processes or concurrent requests.
   * 
   * When transactions are supported, the entire multi-night allocation executes in an
   * atomic transaction with session.abortTransaction on failure.
   * When transactions are unsupported, uses durable AllocationOperation state with
   * compensating rollback and runtime lease recovery.
   */
  static async allocateRoom(options: IAllocateRoomOptions): Promise<string[]> {
    const {
      roomId,
      checkIn,
      checkOut,
      bookingId,
      bookingStatus = 'CONFIRMED',
      expiresAt = null,
      session: callerSession,
    } = options;

    const rId = typeof roomId === 'string' ? new Types.ObjectId(roomId) : roomId;
    const bId = typeof bookingId === 'string' ? new Types.ObjectId(bookingId) : bookingId;
    const stayDates = AvailabilityEngine.getStayDateStrings(checkIn, checkOut);

    if (stayDates.length === 0) {
      return [];
    }

    // Recover any stale operations before claiming
    await this.recoverStaleOperations().catch(() => {});

    const opId = `alloc_${bId.toString()}_${rId.toString()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const leaseDurationMs = 60000; // 60s lease for allocation phase
    const leaseExpiresAt = new Date(Date.now() + leaseDurationMs);

    // 1. Create durable AllocationOperation intent record
    await AllocationOperation.create({
      _id: opId,
      bookingId: bId,
      roomId: rId,
      checkIn,
      checkOut,
      stayDates,
      expectedNights: stayDates.length,
      claimedSlotIds: [],
      status: 'PENDING',
      leaseExpiresAt,
    });

    const isTxSupported = await this.isTransactionSupported();
    let activeSession: ClientSession | undefined = callerSession;
    let ownsSession = false;

    if (!activeSession && isTxSupported) {
      activeSession = await mongoose.startSession();
      ownsSession = true;
      activeSession.startTransaction();
    }

    const claimedSlotIds: string[] = [];

    try {
      for (const dateStr of stayDates) {
        const slotId = `${rId.toString()}_${dateStr}`;

        // Attempt atomic claim. This matches:
        // 1) An existing document already belonging to this bookingId (idempotent retry)
        // 2) An expired PENDING hold (reclaimable)
        // 3) Or upserts if no document exists for slotId
        // If a CONFIRMED or active PENDING booking holds this slotId, the query does not match,
        // causing MongoDB to attempt an insert of the duplicate _id, which is immediately
        // rejected with an E11000 duplicate key error at the storage engine level.
        const filter: any = {
          _id: slotId,
          $or: [
            { bookingId: bId },
            { bookingStatus: 'PENDING', expiresAt: { $lte: new Date() } },
          ],
        };

        const update: any = {
          $set: {
            roomId: rId,
            date: dateStr,
            bookingId: bId,
            bookingStatus,
            expiresAt: expiresAt || null,
            operationId: opId,
          },
        };

        await PhysicalRoomAllocation.findOneAndUpdate(filter, update, {
          upsert: true,
          new: true,
          session: activeSession,
        });

        claimedSlotIds.push(slotId);

        // Durably track claimed slot progress on AllocationOperation in non-transactional mode
        if (!ownsSession) {
          await AllocationOperation.updateOne(
            { _id: opId },
            { $addToSet: { claimedSlotIds: slotId } }
          ).catch(() => {});
        }
      }

      // Verify all nights were claimed
      if (claimedSlotIds.length !== stayDates.length) {
        throw new Error(
          `[PhysicalRoomAllocation] Incomplete allocation: expected ${stayDates.length} nights, claimed ${claimedSlotIds.length}`
        );
      }

      // Mark operation COMMITTED
      if (ownsSession && activeSession) {
        await AllocationOperation.updateOne(
          { _id: opId },
          { $set: { status: 'COMMITTED', claimedSlotIds } },
          { session: activeSession }
        );
        await activeSession.commitTransaction();
      } else {
        await AllocationOperation.updateOne(
          { _id: opId },
          { $set: { status: 'COMMITTED', claimedSlotIds } }
        ).catch(() => {});
      }

      return stayDates;
    } catch (err: any) {
      if (ownsSession && activeSession && activeSession.inTransaction()) {
        try {
          await activeSession.abortTransaction();
        } catch (abortErr) {
          console.error('[PhysicalRoomAllocation] Error aborting transaction:', abortErr);
        }
      }

      // Non-transactional fallback compensation: immediately release any slots claimed during this attempt
      if (claimedSlotIds.length > 0) {
        try {
          await PhysicalRoomAllocation.deleteMany(
            {
              _id: { $in: claimedSlotIds },
              bookingId: bId,
              operationId: opId,
            },
            { session: callerSession }
          );
        } catch (cleanupErr) {
          console.error('[PhysicalRoomAllocation] Error cleaning up partial allocation:', cleanupErr);
        }
      }

      await AllocationOperation.updateOne(
        { _id: opId },
        { $set: { status: 'FAILED' } }
      ).catch(() => {});

      const isDup = err.code === 11000 || err.message?.includes('E11000');
      if (isDup) {
        throw new Error(
          `[PhysicalRoomAllocation] Room ${rId.toString()} is already occupied for overlapping dates. Database unique constraint strictly prevented double allocation.`
        );
      }
      throw err;
    } finally {
      if (ownsSession && activeSession) {
        await activeSession.endSession();
      }
    }
  }

  /**
   * Safely releases allocations for a room, constrained strictly to the specified bookingId.
   * CANNOT accidentally release another booking's room night.
   */
  static async releaseRoom(options: IReleaseRoomOptions): Promise<number> {
    const { roomId, checkIn, checkOut, bookingId, session } = options;
    const rId = typeof roomId === 'string' ? new Types.ObjectId(roomId) : roomId;
    const bId = typeof bookingId === 'string' ? new Types.ObjectId(bookingId) : bookingId;
    const stayDates = AvailabilityEngine.getStayDateStrings(checkIn, checkOut);

    if (stayDates.length === 0) return 0;

    const res = await PhysicalRoomAllocation.deleteMany(
      {
        roomId: rId,
        date: { $in: stayDates },
        bookingId: bId,
      },
      { session }
    );

    return res.deletedCount;
  }

  /**
   * Atomically reassigns a booking from previousRoomId to targetRoomId.
   * Allocates targetRoomId first; only if targetRoomId is successfully secured without
   * conflict does it release previousRoomId. If targetRoomId has an overlap, previousRoomId
   * is untouched and preserved.
   */
  static async reassignRoom(options: IReassignRoomOptions): Promise<void> {
    const {
      bookingId,
      previousRoomId,
      targetRoomId,
      checkIn,
      checkOut,
      bookingStatus = 'CONFIRMED',
      session,
    } = options;

    // 1. Allocate all stay nights for target room first
    await this.allocateRoom({
      roomId: targetRoomId,
      checkIn,
      checkOut,
      bookingId,
      bookingStatus,
      session,
    });

    // 2. Only after new room is completely secured, release previous room
    if (previousRoomId && previousRoomId.toString() !== targetRoomId.toString()) {
      await this.releaseRoom({
        roomId: previousRoomId,
        checkIn,
        checkOut,
        bookingId,
        session,
      });
    }
  }

  /**
   * Releases all physical allocations held by a specific booking (on cancellation / refund).
   * Strictly constrained by bookingId so it can never delete another booking's slots.
   */
  static async releaseBooking(bookingId: string | Types.ObjectId, session?: ClientSession): Promise<number> {
    const bId = typeof bookingId === 'string' ? new Types.ObjectId(bookingId) : bookingId;
    const res = await PhysicalRoomAllocation.deleteMany({ bookingId: bId }, { session });
    return res.deletedCount;
  }

  /**
   * Promotes a PENDING hold to CONFIRMED (on successful payment verification).
   * Verifies that all expected stay nights are currently held or already confirmed by this booking.
   * If all nights are already CONFIRMED (e.g. from a concurrent or duplicate payment callback),
   * returns success: true immediately without modifying or corrupting allocations.
   * If any night expired or was lost, it returns success: false and cleans up.
   */
  static async confirmHold(
    bookingId: string | Types.ObjectId,
    expectedStayDates?: string[],
    session?: ClientSession
  ): Promise<{ success: boolean; modifiedCount: number; reason?: string }> {
    const bId = typeof bookingId === 'string' ? new Types.ObjectId(bookingId) : bookingId;

    // 1. Idempotency Check: if all expected stay dates are ALREADY confirmed for this booking, return success
    if (expectedStayDates && expectedStayDates.length > 0) {
      const alreadyConfirmed = await PhysicalRoomAllocation.countDocuments(
        {
          bookingId: bId,
          bookingStatus: 'CONFIRMED',
          date: { $in: expectedStayDates },
        },
        { session }
      );
      if (alreadyConfirmed === expectedStayDates.length) {
        return {
          success: true,
          modifiedCount: 0,
        };
      }
    }

    const filter: any = {
      bookingId: bId,
      bookingStatus: 'PENDING',
    };
    if (expectedStayDates && expectedStayDates.length > 0) {
      filter.date = { $in: expectedStayDates };
    }

    // 2. Atomically promote PENDING to CONFIRMED and unset expiresAt
    const res = await PhysicalRoomAllocation.updateMany(
      filter,
      {
        $set: { bookingStatus: 'CONFIRMED' },
        $unset: { expiresAt: 1 },
      },
      { session }
    );

    // 3. Verify total confirmed count covers all stay dates
    if (expectedStayDates && expectedStayDates.length > 0) {
      const totalConfirmed = await PhysicalRoomAllocation.countDocuments(
        {
          bookingId: bId,
          bookingStatus: 'CONFIRMED',
          date: { $in: expectedStayDates },
        },
        { session }
      );

      if (totalConfirmed < expectedStayDates.length) {
        // Revert any partially confirmed slots to avoid corrupted state
        await PhysicalRoomAllocation.deleteMany({ bookingId: bId }, { session });
        return {
          success: false,
          modifiedCount: res.modifiedCount,
          reason: `Expected ${expectedStayDates.length} confirmed nights, but only ${totalConfirmed} could be secured.`,
        };
      }
    }

    return {
      success: true,
      modifiedCount: res.modifiedCount,
    };
  }

  /**
   * Populates PhysicalRoomAllocation from existing confirmed/checked-in bookings in MongoDB.
   * Also ensures proper TTL index definition and recovers any stale operations.
   * Safe to call on system startup.
   */
  static async syncExistingBookings(): Promise<number> {
    // 1. Ensure correct TTL index exists on expiresAt with partialFilterExpression
    try {
      const collection = PhysicalRoomAllocation.collection;
      const indexes = await collection.indexes();
      const ttlIdx = indexes.find((idx: any) => idx.name === 'expiresAt_1');
      if (ttlIdx && (!ttlIdx.partialFilterExpression || ttlIdx.expireAfterSeconds === undefined)) {
        await collection.dropIndex('expiresAt_1');
        await collection.createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0, partialFilterExpression: { bookingStatus: 'PENDING' } }
        );
      }
    } catch (idxErr: any) {
      console.warn('[PhysicalRoomAllocation] Index recreation notice:', idxErr.message);
    }

    // 2. Recover any stale or interrupted operations
    await this.recoverStaleOperations().catch(() => {});

    // 3. Prune stale/orphaned allocations whose booking is cancelled or missing
    const allAllocs = await PhysicalRoomAllocation.find().lean();
    for (const alloc of allAllocs) {
      const b = await Booking.findById(alloc.bookingId).lean();
      if (!b || ['CANCELLED', 'CHECKED_OUT'].includes(b.bookingStatus)) {
        await PhysicalRoomAllocation.deleteOne({ _id: alloc._id });
      }
    }

    // 4. Populate PhysicalRoomAllocation from existing confirmed/checked-in bookings
    const activeBookings = await Booking.find({
      assignedRoomId: { $ne: null },
      bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] },
    }).lean();

    let totalNightsSynced = 0;

    for (const b of activeBookings) {
      if (!b.assignedRoomId || !b.checkIn || !b.checkOut) continue;
      const stayDates = AvailabilityEngine.getStayDateStrings(b.checkIn, b.checkOut);
      for (const d of stayDates) {
        const slotId = `${b.assignedRoomId.toString()}_${d}`;
        await PhysicalRoomAllocation.findOneAndUpdate(
          { _id: slotId },
          {
            $set: {
              roomId: b.assignedRoomId,
              date: d,
              bookingId: b._id,
              bookingStatus: b.bookingStatus as PhysicalAllocationStatus,
              expiresAt: null,
            },
          },
          { upsert: true }
        );
        totalNightsSynced++;
      }
    }

    return totalNightsSynced;
  }
}
