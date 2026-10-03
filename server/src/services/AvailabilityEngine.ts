import { Types } from 'mongoose';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';

export interface IAvailabilityResult {
  roomTypeId: string;
  totalRooms: number;
  bookedRooms: number;
  availableRooms: number;
  isAvailable: boolean;
  assignedRoomId?: Types.ObjectId;
}

export class AvailabilityEngine {
  /**
   * Check room availability for a specific room type between checkIn and checkOut dates
   */
  static async checkAvailability(
    roomTypeId: string | Types.ObjectId,
    checkIn: Date,
    checkOut: Date
  ): Promise<IAvailabilityResult> {
    let rTypeId: Types.ObjectId;
    if (roomTypeId instanceof Types.ObjectId) {
      rTypeId = roomTypeId;
    } else if (typeof roomTypeId === 'string' && Types.ObjectId.isValid(roomTypeId) && roomTypeId.length === 24) {
      rTypeId = new Types.ObjectId(roomTypeId);
    } else {
      const MOCK_MAP: Record<string, string> = {
        rt_1: 'PREM_SGL_NONAC',
        rt_2: 'PREM_DBL_NONAC',
        rt_3: 'EXEC_SGL_AC',
        rt_4: 'EXEC_DBL_AC',
        rt_5: 'TRIPLE_PREM',
        rt_6: 'TRIPLE_EXEC',
        rt_7: 'SUITE_ROOM',
      };
      const searchCode = typeof roomTypeId === 'string' ? (MOCK_MAP[roomTypeId] || roomTypeId) : '';
      const foundType = await RoomType.findOne({ code: searchCode });
      if (foundType) {
        rTypeId = foundType._id as Types.ObjectId;
      } else {
        return {
          roomTypeId: String(roomTypeId),
          totalRooms: 0,
          bookedRooms: 0,
          availableRooms: 0,
          isAvailable: false,
        };
      }
    }
    const now = new Date();

    // Determine target room type and any paired room types for single/double occupancy sharing
    const currentType = await RoomType.findById(rTypeId);
    const targetCode = currentType?.code || '';

    let pooledCodes: string[] = [targetCode];
    if (targetCode === 'EXEC_SGL_AC' || targetCode === 'EXEC_DBL_AC') {
      pooledCodes = ['EXEC_DBL_AC', 'EXEC_SGL_AC'];
    } else if (targetCode === 'PREM_SGL_NONAC' || targetCode === 'PREM_DBL_NONAC') {
      pooledCodes = ['PREM_DBL_NONAC', 'PREM_SGL_NONAC'];
    }

    const pooledTypes = await RoomType.find({ code: { $in: pooledCodes } });
    const pooledTypeIds = pooledTypes.map((t) => t._id);

    // 1. Get all active guest rooms of this pooled type (strictly excluding special venues)
    const rooms = await Room.find({
      roomTypeId: { $in: pooledTypeIds },
      isActive: true,
      isVenue: { $ne: true },
      roomNumber: { $nin: ['Sambhrama Banquet Hall', 'Sambhrama Party Hall', 'Board Room'] },
    });
    const totalRooms = rooms.length;

    if (totalRooms === 0) {
      return {
        roomTypeId: rTypeId.toString(),
        totalRooms: 0,
        bookedRooms: 0,
        availableRooms: 0,
        isAvailable: false,
      };
    }

    const roomIds = rooms.map(r => r._id);

    // 2. Find existing conflicting bookings across pooled type or assigned rooms
    // A booking overlaps if: checkIn < existing.checkOut AND checkOut > existing.checkIn
    const conflictingBookings = await Booking.find({
      $and: [
        {
          $or: [
            { assignedRoomId: { $in: roomIds } },
            { roomTypeId: { $in: pooledTypeIds } },
          ],
        },
        {
          $or: [
            { bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
            {
              bookingStatus: 'PENDING',
              expiresAt: { $gt: now },
            },
          ],
        },
      ],
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    });

    // Extract assigned room IDs that are already booked
    const bookedAssignedRoomIds = new Set(
      conflictingBookings
        .filter(b => b.assignedRoomId)
        .map(b => b.assignedRoomId!.toString())
    );

    const bookedCount = conflictingBookings.length;
    const availableRoomsCount = Math.max(0, totalRooms - bookedCount);

    // Find an unassigned room object to reserve (strictly from active guest rooms)
    const availableRoom = rooms.find(r => !bookedAssignedRoomIds.has(r._id.toString()));

    return {
      roomTypeId: rTypeId.toString(),
      totalRooms,
      bookedRooms: bookedCount,
      availableRooms: availableRoomsCount,
      isAvailable: availableRoomsCount > 0,
      assignedRoomId: availableRoom ? (availableRoom._id as Types.ObjectId) : undefined,
    };
  }

  /**
   * Batch check availability for multiple room types (strictly guest rooms, excluding venues)
   */
  static async checkAllRoomTypesAvailability(checkIn: Date, checkOut: Date) {
    const rooms = await Room.find({
      isActive: true,
      isVenue: { $ne: true },
      roomNumber: { $nin: ['Sambhrama Banquet Hall', 'Sambhrama Party Hall', 'Board Room'] },
    });
    const now = new Date();

    const conflictingBookings = await Booking.find({
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
      $or: [
        { bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
        { bookingStatus: 'PENDING', expiresAt: { $gt: now } },
      ],
    });

    const roomTypes = await RoomType.find({ isActive: true });
    const codeToId: Record<string, string> = {};
    const idToCode: Record<string, string> = {};
    for (const rt of roomTypes) {
      codeToId[rt.code] = rt._id.toString();
      idToCode[rt._id.toString()] = rt.code;
    }

    const roomTypeStats: Record<string, { total: number; booked: number }> = {};

    for (const room of rooms) {
      const typeIdStr = room.roomTypeId.toString();
      if (!roomTypeStats[typeIdStr]) {
        roomTypeStats[typeIdStr] = { total: 0, booked: 0 };
      }
      roomTypeStats[typeIdStr].total += 1;
    }

    for (const booking of conflictingBookings) {
      const typeIdStr = booking.roomTypeId.toString();
      if (roomTypeStats[typeIdStr]) {
        roomTypeStats[typeIdStr].booked += 1;
      }
    }

    // Mirror pooled single/double stats so single occupancy accurately reflects shared pool
    const execDblId = codeToId['EXEC_DBL_AC'];
    const execSglId = codeToId['EXEC_SGL_AC'];
    if (execDblId && execSglId && roomTypeStats[execDblId]) {
      roomTypeStats[execSglId] = {
        total: roomTypeStats[execDblId].total,
        booked: roomTypeStats[execDblId].booked + (roomTypeStats[execSglId]?.booked || 0),
      };
    }

    const premDblId = codeToId['PREM_DBL_NONAC'];
    const premSglId = codeToId['PREM_SGL_NONAC'];
    if (premDblId && premSglId && roomTypeStats[premDblId]) {
      roomTypeStats[premSglId] = {
        total: roomTypeStats[premDblId].total,
        booked: roomTypeStats[premDblId].booked + (roomTypeStats[premSglId]?.booked || 0),
      };
    }

    return roomTypeStats;
  }

  /**
   * Check if a specific physical room is available between checkIn and checkOut dates
   */
  static async isPhysicalRoomAvailable(
    roomId: string | Types.ObjectId,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string | Types.ObjectId
  ): Promise<{ available: boolean; conflictingBooking?: any }> {
    const rId = typeof roomId === 'string' ? new Types.ObjectId(roomId) : roomId;
    const now = new Date();

    const query: any = {
      assignedRoomId: rId,
      $or: [
        { bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
        { bookingStatus: 'PENDING', expiresAt: { $gt: now } },
      ],
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    };

    if (excludeBookingId) {
      const bId = typeof excludeBookingId === 'string' ? new Types.ObjectId(excludeBookingId) : excludeBookingId;
      query._id = { $ne: bId };
    }

    const conflictingBooking = await Booking.findOne(query).lean();
    return {
      available: !conflictingBooking,
      conflictingBooking: conflictingBooking || undefined,
    };
  }

  /**
   * Get physical room inventory status for all 37 active guest rooms for a date range.
   * Strictly returns only TWO statuses: 'AVAILABLE' or 'OCCUPIED'.
   */
  static async getPhysicalInventoryStatus(checkIn: Date, checkOut: Date) {
    const now = new Date();

    // Fetch all active guest rooms (excluding venues, Room 104, and legacy rooms 1-40)
    const rooms = await Room.find({
      isActive: true,
      isVenue: { $ne: true },
      roomNumber: { $nin: ['Sambhrama Banquet Hall', 'Sambhrama Party Hall', 'Board Room', '104'] },
    })
      .populate('roomTypeId')
      .lean();

    // Sort rooms by floor (1, 2, 3) and numerically by roomNumber
    rooms.sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      const numA = parseInt(a.roomNumber, 10);
      const numB = parseInt(b.roomNumber, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.roomNumber.localeCompare(b.roomNumber);
    });

    const activeRoomIds = rooms.map((r) => r._id);

    // Find all active conflicting bookings for the date range
    const conflictingBookings = await Booking.find({
      assignedRoomId: { $in: activeRoomIds },
      $or: [
        { bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
        { bookingStatus: 'PENDING', expiresAt: { $gt: now } },
      ],
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    })
      .populate('roomTypeId')
      .lean();

    const bookingMap = new Map<string, any>();
    for (const b of conflictingBookings) {
      if (b.assignedRoomId) {
        bookingMap.set(b.assignedRoomId.toString(), b);
      }
    }

    const inventoryRooms = rooms.map((room) => {
      const activeBooking = bookingMap.get(room._id.toString());
      const status: 'AVAILABLE' | 'OCCUPIED' = activeBooking ? 'OCCUPIED' : 'AVAILABLE';
      const rt: any = room.roomTypeId;

      return {
        _id: room._id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        status, // Strictly only 'AVAILABLE' or 'OCCUPIED'
        isAc: rt?.isAc ?? true,
        roomType: {
          _id: rt?._id,
          name: rt?.name || 'Executive Room',
          code: rt?.code || 'EXEC_DBL_AC',
          basePrice: rt?.basePrice || 2200,
          cpPrice: rt?.cpPrice || 2500,
          isAc: rt?.isAc ?? true,
        },
        activeBooking: activeBooking
          ? {
              _id: activeBooking._id,
              bookingId: activeBooking.bookingId,
              source: activeBooking.source || 'ONLINE',
              guestName: activeBooking.guestName,
              guestPhone: activeBooking.guestPhone,
              checkIn: activeBooking.checkIn,
              checkOut: activeBooking.checkOut,
              adminNotes: activeBooking.adminNotes,
              bookingStatus: activeBooking.bookingStatus,
            }
          : null,
      };
    });

    const total = inventoryRooms.length;
    const occupied = inventoryRooms.filter((r) => r.status === 'OCCUPIED').length;
    const available = total - occupied;

    return {
      summary: {
        total,
        available,
        occupied,
        checkIn,
        checkOut,
      },
      rooms: inventoryRooms,
    };
  }
}
