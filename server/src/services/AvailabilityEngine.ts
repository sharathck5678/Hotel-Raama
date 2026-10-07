import { Types } from 'mongoose';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { Booking } from '../models/Booking';
import { DailyInventory } from '../models/DailyInventory';
import { DailyRate } from '../models/DailyRate';
import { RatePlan } from '../models/RatePlan';
import { OFFICIAL_ROOMS_SPEC } from '../seed/seedDatabase';
import { RatePlanService } from './RatePlanService';

export interface IAvailabilityResult {
  roomTypeId: string;
  totalRooms: number;
  bookedRooms: number;
  availableRooms: number;
  isAvailable: boolean;
  assignedRoomId?: Types.ObjectId;
  restrictionError?: string;
  minStay?: number;
  stopSell?: boolean;
  nightlyBreakdown?: Array<{
    date: string;
    total: number;
    booked: number;
    held: number;
    maintenance: number;
    available: number;
    stopSell: boolean;
    minStay: number;
  }>;
}

export interface IDateWiseGridCell {
  date: string; // "YYYY-MM-DD"
  dayOfWeek: string; // "Mon", "Tue", etc.
  dayOfMonth: number;
  physicalRooms: number;
  maintenanceRooms: number;
  bookedRooms: number;
  heldRooms: number;
  sellableCapacity: number;
  availableRooms: number;
  inventoryOverride: number | null;
  stopSell: boolean;
  minStay: number;
  notes?: string;
  rates: {
    singleAdult: number;
    doubleAdult: number;
    tripleAdult: number;
    childRate: number;
    extraAdultRate: number;
    isCustomRate: boolean;
  };
  ratePlanCode: string;
}

export interface ICategoryGridRow {
  roomType: {
    _id: string;
    name: string;
    code: string;
    description: string;
    basePrice: number;
    cpPrice: number;
    maxOccupancy: number;
    isAc: boolean;
  };
  totalPhysical: number;
  dates: IDateWiseGridCell[];
}

export class AvailabilityEngine {
  /**
   * Helper: format a Date into "YYYY-MM-DD" string in Hotel Raama local timezone (Asia/Kolkata)
   */
  static formatDateStr(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
    }).format(d);
  }

  /**
   * Helper: generates ISO "YYYY-MM-DD" dates for all stay nights between checkIn and checkOut using Asia/Kolkata timezone.
   */
  static getStayDateStrings(checkIn: Date, checkOut: Date): string[] {
    const dates: string[] = [];
    const startStr = this.formatDateStr(new Date(checkIn));
    const endStr = this.formatDateStr(new Date(checkOut));

    if (startStr >= endStr) {
      return dates;
    }

    const [sY, sM, sD] = startStr.split('-').map(Number);
    // Midday UTC (12:00 UTC = 17:30 IST) to safely step day-by-day without timezone edge transitions
    const curr = new Date(Date.UTC(sY, sM - 1, sD, 12, 0, 0, 0));
    let currStr = this.formatDateStr(curr);

    while (currStr < endStr) {
      dates.push(currStr);
      curr.setUTCDate(curr.getUTCDate() + 1);
      currStr = this.formatDateStr(curr);
    }
    return dates;
  }

  /**
   * Helper: generates an inclusive list of date strings ["YYYY-MM-DD", ...] from startDateStr to endDateStr (inclusive).
   */
  static getDateRangeStrings(startDateStr: string, endDateStr: string): string[] {
    const dates: string[] = [];
    const [sY, sM, sD] = startDateStr.split('-').map(Number);
    const curr = new Date(Date.UTC(sY, sM - 1, sD, 12, 0, 0, 0));
    let currStr = this.formatDateStr(curr);

    while (currStr <= endDateStr) {
      dates.push(currStr);
      curr.setUTCDate(curr.getUTCDate() + 1);
      currStr = this.formatDateStr(curr);
    }
    return dates;
  }

  /**
   * Resolves target RoomType ObjectId, its shared inventoryGroup, all pooled room types, and physical rooms in this pool.
   */
  static async resolvePooledRoomTypes(
    roomTypeId: string | Types.ObjectId,
    preloadedContext?: {
      allRoomTypes?: any[];
      allOfficialRooms?: any[];
    }
  ): Promise<{
    primaryType: any;
    pooledTypes: any[];
    pooledTypeIds: Types.ObjectId[];
    inventoryGroup: string;
    poolRooms: any[];
    poolRoomIds: Types.ObjectId[];
    totalPhysical: number;
  }> {
    let rTypeId: Types.ObjectId | null = null;
    let primaryType: any = null;

    if (preloadedContext?.allRoomTypes && preloadedContext.allRoomTypes.length > 0) {
      if (roomTypeId instanceof Types.ObjectId) {
        primaryType = preloadedContext.allRoomTypes.find((t: any) => t._id.toString() === roomTypeId.toString());
      } else if (typeof roomTypeId === 'string' && Types.ObjectId.isValid(roomTypeId) && roomTypeId.length === 24) {
        primaryType = preloadedContext.allRoomTypes.find((t: any) => t._id.toString() === roomTypeId);
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
        primaryType = preloadedContext.allRoomTypes.find((t: any) => t.code === searchCode);
      }
      if (primaryType) {
        rTypeId = primaryType._id as Types.ObjectId;
      }
    }

    if (!primaryType) {
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
        if (!foundType) {
          throw new Error(`Room type '${roomTypeId}' not found`);
        }
        rTypeId = foundType._id as Types.ObjectId;
      }

      primaryType = await RoomType.findById(rTypeId);
      if (!primaryType) {
        throw new Error(`Room type with id '${rTypeId}' not found`);
      }
    }

    const targetCode = primaryType.code;
    let inventoryGroup = primaryType.inventoryGroup?.trim().toUpperCase();
    if (!inventoryGroup) {
      if (targetCode === 'EXEC_SGL_AC' || targetCode === 'EXEC_DBL_AC') {
        inventoryGroup = 'EXECUTIVE_AC';
      } else if (targetCode === 'PREM_SGL_NONAC' || targetCode === 'PREM_DBL_NONAC') {
        inventoryGroup = 'PREMIUM_NONAC';
      } else {
        inventoryGroup = targetCode;
      }
    }

    let pooledTypes: any[];
    if (preloadedContext?.allRoomTypes && preloadedContext.allRoomTypes.length > 0) {
      pooledTypes = preloadedContext.allRoomTypes.filter(
        (t: any) => t.isActive && t.inventoryGroup?.trim().toUpperCase() === inventoryGroup
      );

      if (!pooledTypes || pooledTypes.length === 0) {
        let pooledCodes: string[] = [targetCode];
        if (targetCode === 'EXEC_SGL_AC' || targetCode === 'EXEC_DBL_AC') {
          pooledCodes = ['EXEC_DBL_AC', 'EXEC_SGL_AC'];
        } else if (targetCode === 'PREM_SGL_NONAC' || targetCode === 'PREM_DBL_NONAC') {
          pooledCodes = ['PREM_DBL_NONAC', 'PREM_SGL_NONAC'];
        }
        pooledTypes = preloadedContext.allRoomTypes.filter(
          (t: any) => t.isActive && pooledCodes.includes(t.code)
        );
      }
    } else {
      pooledTypes = await RoomType.find({
        inventoryGroup,
        isActive: true,
      });

      if (!pooledTypes || pooledTypes.length === 0) {
        let pooledCodes: string[] = [targetCode];
        if (targetCode === 'EXEC_SGL_AC' || targetCode === 'EXEC_DBL_AC') {
          pooledCodes = ['EXEC_DBL_AC', 'EXEC_SGL_AC'];
        } else if (targetCode === 'PREM_SGL_NONAC' || targetCode === 'PREM_DBL_NONAC') {
          pooledCodes = ['PREM_DBL_NONAC', 'PREM_SGL_NONAC'];
        }
        pooledTypes = await RoomType.find({ code: { $in: pooledCodes }, isActive: true });
      }
    }

    const pooledTypeIds = pooledTypes.map((t) => t._id as Types.ObjectId);
    const pooledTypeIdStrs = new Set(pooledTypeIds.map((id) => id.toString()));

    // Official active guest rooms for this pool
    let poolRooms: any[];
    const officialRoomNumbers = OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber);
    if (preloadedContext?.allOfficialRooms) {
      poolRooms = preloadedContext.allOfficialRooms.filter((r: any) =>
        pooledTypeIdStrs.has(r.roomTypeId.toString())
      );
    } else {
      poolRooms = await Room.find({
        roomTypeId: { $in: pooledTypeIds },
        isActive: true,
        isVenue: { $ne: true },
        roomNumber: { $in: officialRoomNumbers },
      }).sort({ floor: 1, roomNumber: 1 });
    }

    const poolRoomIds = poolRooms.map((r) => r._id as Types.ObjectId);
    const totalPhysical = poolRooms.length;

    return {
      primaryType,
      pooledTypes,
      pooledTypeIds,
      inventoryGroup,
      poolRooms,
      poolRoomIds,
      totalPhysical,
    };
  }

  /**
   * Check room availability for a specific room type between checkIn and checkOut dates.
   * Authoritative multi-night calculation: checks each stay night, applies Stop Sell & Minimum Stay,
   * excludes maintenance rooms, checks sellable overrides, and finds an available physical room.
   */
  static async checkAvailability(
    roomTypeId: string | Types.ObjectId,
    checkIn: Date,
    checkOut: Date,
    preloadedContext?: {
      allRoomTypes?: any[];
      allOfficialRooms?: any[];
      allStayBookings?: any[];
      allDailyInventories?: any[];
    }
  ): Promise<IAvailabilityResult> {
    const now = new Date();
    const stayDates = this.getStayDateStrings(checkIn, checkOut);
    const numNights = stayDates.length;

    let primaryType: any;
    let pooledTypes: any[];
    let pooledTypeIds: Types.ObjectId[];
    let poolRooms: any[];
    let poolRoomIds: Types.ObjectId[];
    let totalRooms: number;

    try {
      const resolved = await this.resolvePooledRoomTypes(roomTypeId, preloadedContext);
      primaryType = resolved.primaryType;
      pooledTypes = resolved.pooledTypes;
      pooledTypeIds = resolved.pooledTypeIds;
      poolRooms = resolved.poolRooms;
      poolRoomIds = resolved.poolRoomIds;
      totalRooms = resolved.totalPhysical;
    } catch {
      return {
        roomTypeId: String(roomTypeId),
        totalRooms: 0,
        bookedRooms: 0,
        availableRooms: 0,
        isAvailable: false,
        restrictionError: 'Invalid room type.',
      };
    }

    if (totalRooms === 0) {
      return {
        roomTypeId: primaryType._id.toString(),
        totalRooms: 0,
        bookedRooms: 0,
        availableRooms: 0,
        isAvailable: false,
        restrictionError: 'No active rooms found for this category.',
      };
    }

    // Identify rooms currently marked as MAINTENANCE or OUT_OF_SERVICE (current operational status)
    const maintenanceRoomIds = new Set(
      poolRooms
        .filter((r) => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_SERVICE')
        .map((r) => r._id.toString())
    );
    const maintenanceCount = maintenanceRoomIds.size;
    const todayStr = this.formatDateStr(now);

    // 2. Fetch all conflicting bookings for this shared pool across the stay window
    let conflictingBookings: any[];
    if (preloadedContext?.allStayBookings) {
      const poolRoomIdStrs = new Set(poolRoomIds.map((id) => id.toString()));
      const pooledTypeIdStrs = new Set(pooledTypeIds.map((id) => id.toString()));
      conflictingBookings = preloadedContext.allStayBookings.filter((b: any) => {
        const matchesRoomOrType =
          (b.assignedRoomId && poolRoomIdStrs.has(b.assignedRoomId.toString())) ||
          (b.roomTypeId && pooledTypeIdStrs.has(b.roomTypeId.toString()));
        if (!matchesRoomOrType) return false;

        const isStatusValid =
          b.bookingStatus === 'CONFIRMED' ||
          b.bookingStatus === 'CHECKED_IN' ||
          (b.bookingStatus === 'PENDING' && b.expiresAt && new Date(b.expiresAt) > now);
        if (!isStatusValid) return false;

        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);
        return bIn < checkOut && bOut > checkIn;
      });
    } else {
      conflictingBookings = await Booking.find({
        $and: [
          {
            $or: [
              { assignedRoomId: { $in: poolRoomIds } },
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
      })
        .select('checkIn checkOut bookingStatus assignedRoomId')
        .lean();
    }

    // 3. Fetch DailyInventory records for these stay dates across all pooled room types
    let dailyInventories: any[];
    if (preloadedContext?.allDailyInventories) {
      const pooledTypeIdStrs = new Set(pooledTypeIds.map((id) => id.toString()));
      dailyInventories = preloadedContext.allDailyInventories.filter((inv: any) =>
        pooledTypeIdStrs.has(inv.roomTypeId.toString()) && stayDates.includes(inv.date)
      );
    } else {
      dailyInventories = await DailyInventory.find({
        roomTypeId: { $in: pooledTypeIds },
        date: { $in: stayDates },
      })
        .select('roomTypeId date stopSell minStay blockedRooms inventoryOverride notes')
        .lean();
    }

    // Aggregate DailyInventory records per stay date across all pooled room types
    const invMap = new Map<string, {
      stopSell: boolean;
      minStay: number;
      blockedRooms: number;
      inventoryOverride: number | null;
      notes?: string;
    }>();

    for (const nightStr of stayDates) {
      const invsForDate = dailyInventories.filter((inv) => inv.date === nightStr);
      // Stop Sell is strictly specific to the requested room category (primaryType)
      const thisTypeInv = invsForDate.find((inv) => inv.roomTypeId.toString() === primaryType._id.toString());
      const isStopSell = !!thisTypeInv?.stopSell;
      const minStay = thisTypeInv?.minStay || (invsForDate.length > 0 ? Math.max(...invsForDate.map((inv) => inv.minStay || 1)) : 1);
      const blockedRooms = invsForDate.length > 0 ? Math.max(...invsForDate.map((inv) => inv.blockedRooms || 0)) : 0;
      const overrides = invsForDate
        .map((inv) => inv.inventoryOverride)
        .filter((o) => o !== undefined && o !== null) as number[];
      const inventoryOverride = overrides.length > 0 ? Math.min(...overrides) : null;
      const notes = thisTypeInv?.notes || invsForDate.find((inv) => inv.notes)?.notes;

      invMap.set(nightStr, {
        stopSell: isStopSell,
        minStay,
        blockedRooms,
        inventoryOverride,
        notes,
      });
    }

    // 4. Verify Minimum Stay restriction on arrival date
    let restrictionError: string | undefined;
    const arrivalDateStr = stayDates[0];
    const arrivalInv = arrivalDateStr ? invMap.get(arrivalDateStr) : null;
    const minStay = arrivalInv?.minStay || 1;

    if (numNights < minStay) {
      restrictionError = `A minimum stay of ${minStay} night${minStay > 1 ? 's' : ''} is required for check-in on this date.`;
    }

    // 5. Evaluate availability for EVERY NIGHT of the stay
    const nightlyBreakdown: Array<{
      date: string;
      total: number;
      booked: number;
      held: number;
      maintenance: number;
      available: number;
      stopSell: boolean;
      minStay: number;
    }> = [];

    let minAvailableAcrossStay = Infinity;
    let stopSellActive = false;

    // Track assigned rooms that are booked on ANY night of the stay
    const bookedAssignedRoomIdsAcrossStay = new Set<string>();

    for (const nightStr of stayDates) {
      const inv = invMap.get(nightStr);
      const isStopSell = !!inv?.stopSell;
      if (isStopSell) {
        stopSellActive = true;
        if (!restrictionError) {
          restrictionError = 'This room category is not available for online reservation on the selected dates (Stop Sell).';
        }
      }

      // Check bookings overlapping this exact night:
      let bookedOnNight = 0;
      let heldOnNight = 0;

      for (const b of conflictingBookings) {
        const bInStr = AvailabilityEngine.formatDateStr(new Date(b.checkIn));
        const bOutStr = AvailabilityEngine.formatDateStr(new Date(b.checkOut));
        if (bInStr <= nightStr && bOutStr > nightStr) {
          if (b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN') {
            bookedOnNight++;
          } else if (b.bookingStatus === 'PENDING') {
            heldOnNight++;
          }
          if (b.assignedRoomId) {
            bookedAssignedRoomIdsAcrossStay.add(b.assignedRoomId.toString());
          }
        }
      }

      // Admin sellable inventory override for shared pool:
      let sellableCap = totalRooms;
      if (inv?.inventoryOverride !== undefined && inv?.inventoryOverride !== null) {
        sellableCap = Math.min(totalRooms, Math.max(0, inv.inventoryOverride));
      }

      // Date-aware maintenance & blocking:
      const maintToday = nightStr === todayStr ? maintenanceCount : 0;
      const blockedOnNight = Math.min(totalRooms, Math.max(0, (inv?.blockedRooms || 0) + maintToday));

      const availableOnNight = isStopSell
        ? 0
        : Math.max(0, sellableCap - (bookedOnNight + heldOnNight + blockedOnNight));

      if (availableOnNight < minAvailableAcrossStay) {
        minAvailableAcrossStay = availableOnNight;
      }

      nightlyBreakdown.push({
        date: nightStr,
        total: totalRooms,
        booked: bookedOnNight,
        held: heldOnNight,
        maintenance: blockedOnNight,
        available: availableOnNight,
        stopSell: isStopSell,
        minStay: inv?.minStay || 1,
      });
    }

    const availableRoomsCount = Math.max(0, minAvailableAcrossStay === Infinity ? 0 : minAvailableAcrossStay);
    const isAvailable = availableRoomsCount > 0 && !restrictionError && !stopSellActive;

    // Find an unassigned physical room from the shared pool that is completely free throughout this stay.
    let assignedRoom: any = undefined;
    if (isAvailable) {
      assignedRoom = poolRooms.find((r) => {
        const inMaintToday = stayDates.includes(todayStr) && maintenanceRoomIds.has(r._id.toString());
        return !inMaintToday && !bookedAssignedRoomIdsAcrossStay.has(r._id.toString());
      });
    }

    const bookedCountOverall = conflictingBookings.filter(
      (b) => b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN'
    ).length;

    return {
      roomTypeId: primaryType._id.toString(),
      totalRooms,
      bookedRooms: bookedCountOverall,
      availableRooms: isAvailable ? availableRoomsCount : 0,
      isAvailable,
      assignedRoomId: assignedRoom ? (assignedRoom._id as Types.ObjectId) : undefined,
      restrictionError,
      minStay,
      stopSell: stopSellActive,
      nightlyBreakdown,
    };
  }

  /**
   * Generates full date-wise grid data for the admin Availability & Rates matrix.
   * Returns a row for each room category, and within each row, a cell for each date in range.
   */
  static async getDateWiseGridData(
    startDate: Date,
    endDate: Date,
    filterRoomTypeId?: string,
    filterRatePlanCode: string = 'ROOM_ONLY'
  ): Promise<{
    dateRange: { start: string; end: string; days: number };
    ratePlans: any[];
    activeRatePlanCode: string;
    rows: ICategoryGridRow[];
  }> {
    const now = new Date();
    const activeRatePlans = await RatePlanService.getActiveRatePlans();
    const selectedPlan =
      activeRatePlans.find((p) => p.code === filterRatePlanCode) ||
      activeRatePlans.find((p) => p.isDefault) ||
      activeRatePlans[0];
    const ratePlanCode = selectedPlan?.code || 'ROOM_ONLY';
    const ratePlanId = selectedPlan?._id;

    // Generate date strings list
    const stayDates = this.getStayDateStrings(startDate, endDate);
    if (stayDates.length === 0) {
      // Default to at least the start date
      stayDates.push(this.formatDateStr(startDate));
    }

    // Fetch official room types
    let roomTypeQuery: any = { isActive: true };
    if (filterRoomTypeId && filterRoomTypeId !== 'ALL') {
      roomTypeQuery._id = filterRoomTypeId;
    }
    const allRoomTypes = await RoomType.find(roomTypeQuery).sort({ basePrice: 1 }).lean();

    // Standard ordering for admin grid display: Single and Double categories paired together
    const CODE_ORDER = [
      'PREM_SGL_NONAC',
      'PREM_DBL_NONAC',
      'EXEC_SGL_AC',
      'EXEC_DBL_AC',
      'TRIPLE_PREM',
      'TRIPLE_EXEC',
      'SUITE_ROOM',
    ];

    const displayTypes = filterRoomTypeId && filterRoomTypeId !== 'ALL'
      ? allRoomTypes
      : allRoomTypes
          .filter((rt) => CODE_ORDER.includes(rt.code))
          .sort((a, b) => CODE_ORDER.indexOf(a.code) - CODE_ORDER.indexOf(b.code));

    // Fetch all bookings overlapping this full date range
    const rangeBookings = await Booking.find({
      checkIn: { $lt: endDate },
      checkOut: { $gt: startDate },
      $or: [
        { bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
        { bookingStatus: 'PENDING', expiresAt: { $gt: now } },
      ],
    }).lean();

    // Fetch all DailyInventory records for date range
    const dailyInventories = await DailyInventory.find({
      date: { $in: stayDates },
    }).lean();

    // Fetch all DailyRate records for date range & selected rate plan
    const dailyRates = await DailyRate.find({
      ratePlanCode,
      date: { $in: stayDates },
    }).lean();
    const rateMap = new Map<string, any>(); // key: `${roomTypeId}_${date}`
    for (const dr of dailyRates) {
      rateMap.set(`${dr.roomTypeId.toString()}_${dr.date}`, dr);
    }

    const rows: ICategoryGridRow[] = [];

    for (const rt of displayTypes) {
      const rtIdStr = rt._id.toString();

      // Resolve shared inventory pool for this room type
      const resolved = await this.resolvePooledRoomTypes(rt._id);
      const pooledTypeIds = resolved.pooledTypeIds;
      const pooledTypeIdStrs = new Set(pooledTypeIds.map((id) => id.toString()));
      const poolRooms = resolved.poolRooms;
      const poolRoomIds = new Set(resolved.poolRoomIds.map((id) => id.toString()));
      const totalPhysical = resolved.totalPhysical;

      const maintenanceRoomsCount = poolRooms.filter(
        (r) => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_SERVICE'
      ).length;

      const cells: IDateWiseGridCell[] = [];

      for (const dateStr of stayDates) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const cellDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayOfWeek = dayNames[cellDate.getUTCDay()];
        const dayOfMonth = d;

        // DailyInventory records across pooled types for this date (for shared physical inventory)
        const pooledInvs = dailyInventories.filter(
          (inv) => inv.date === dateStr && pooledTypeIdStrs.has(inv.roomTypeId.toString())
        );

        // Room-type-specific DailyInventory for THIS row's room type (rt)
        const thisTypeInv = dailyInventories.find(
          (inv) => inv.date === dateStr && inv.roomTypeId.toString() === rtIdStr
        );

        // Stop Sell is strictly room-type-specific:
        const stopSell = !!thisTypeInv?.stopSell;
        const minStay = thisTypeInv?.minStay || (pooledInvs.length > 0 ? Math.max(...pooledInvs.map((inv) => inv.minStay || 1)) : 1);
        const rawBlocked = pooledInvs.length > 0 ? Math.max(...pooledInvs.map((inv) => inv.blockedRooms || 0)) : 0;
        const overrides = pooledInvs
          .map((inv) => inv.inventoryOverride)
          .filter((o) => o !== undefined && o !== null) as number[];
        const overrideVal = overrides.length > 0 ? Math.min(...overrides) : null;
        const notes = thisTypeInv?.notes || pooledInvs.find((inv) => inv.notes)?.notes || undefined;

        // Date-aware maintenance & blocking
        const todayStr = AvailabilityEngine.formatDateStr(now);
        const isToday = dateStr === todayStr;
        const maintOnDate = isToday ? maintenanceRoomsCount : 0;
        const blockedRooms = Math.min(totalPhysical, Math.max(0, rawBlocked + maintOnDate));

        // Effective sellable capacity (total physical or override cap)
        let sellableCap = totalPhysical;
        if (overrideVal !== null) {
          sellableCap = Math.min(totalPhysical, Math.max(0, overrideVal));
        }

        // Count bookings and holds on this night across shared pool
        let bookedCount = 0;
        let heldCount = 0;

        for (const b of rangeBookings) {
          const bTypeId = b.roomTypeId?.toString();
          const bAssignedId = b.assignedRoomId?.toString();

          const matchesPool =
            (bAssignedId && poolRoomIds.has(bAssignedId)) ||
            (bTypeId && pooledTypeIdStrs.has(bTypeId));

          const bInStr = AvailabilityEngine.formatDateStr(new Date(b.checkIn));
          const bOutStr = AvailabilityEngine.formatDateStr(new Date(b.checkOut));

          if (matchesPool && bInStr <= dateStr && bOutStr > dateStr) {
            if (b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN') {
              bookedCount++;
            } else if (b.bookingStatus === 'PENDING') {
              heldCount++;
            }
          }
        }

        const availableRooms = stopSell
          ? 0
          : Math.max(0, sellableCap - (bookedCount + heldCount + blockedRooms));

        // Rates are STRICTLY INDEPENDENT per room type:
        const customRate = rateMap.get(`${rtIdStr}_${dateStr}`);
        const isCP = ratePlanCode === 'BREAKFAST_INCLUDED';
        const defaultDouble = isCP ? rt.cpPrice : rt.basePrice;
        const defaultSingle = rt.code.includes('SGL') ? defaultDouble : Math.max(0, defaultDouble - 200);
        const defaultTriple = defaultDouble;

        const rateObj = {
          singleAdult: customRate ? customRate.singleAdult : defaultSingle,
          doubleAdult: customRate ? customRate.doubleAdult : defaultDouble,
          tripleAdult: customRate?.tripleAdult ?? (customRate ? customRate.doubleAdult : defaultDouble),
          childRate: customRate ? customRate.childRate : 0,
          extraAdultRate: customRate ? customRate.extraAdultRate : 600,
          isCustomRate: !!customRate,
        };

        cells.push({
          date: dateStr,
          dayOfWeek,
          dayOfMonth,
          physicalRooms: totalPhysical,
          maintenanceRooms: blockedRooms,
          bookedRooms: bookedCount,
          heldRooms: heldCount,
          sellableCapacity: sellableCap,
          availableRooms,
          inventoryOverride: overrideVal,
          stopSell,
          minStay,
          notes,
          rates: rateObj,
          ratePlanCode,
        });
      }

      rows.push({
        roomType: {
          _id: rt._id.toString(),
          name: rt.name,
          code: rt.code,
          description: rt.description,
          basePrice: rt.basePrice,
          cpPrice: rt.cpPrice,
          maxOccupancy: rt.maxOccupancy,
          isAc: rt.isAc,
        },
        totalPhysical,
        dates: cells,
      });
    }

    return {
      dateRange: {
        start: stayDates[0] || this.formatDateStr(startDate),
        end: stayDates[stayDates.length - 1] || this.formatDateStr(endDate),
        days: stayDates.length,
      },
      ratePlans: activeRatePlans,
      activeRatePlanCode: ratePlanCode,
      rows,
    };
  }

  /**
   * Batch check availability for multiple room types (strictly guest rooms, excluding venues)
   * Enforces shared inventory groups for Single and Double occupancy.
   */
  static async checkAllRoomTypesAvailability(checkIn: Date, checkOut: Date) {
    const officialRoomNumbers = OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber);
    const rooms = await Room.find({
      isActive: true,
      isVenue: { $ne: true },
      roomNumber: { $in: officialRoomNumbers },
    })
      .select('_id roomNumber floor status roomTypeId')
      .lean();
    const now = new Date();

    const conflictingBookings = await Booking.find({
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
      $or: [
        { bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
        { bookingStatus: 'PENDING', expiresAt: { $gt: now } },
      ],
    })
      .select('checkIn checkOut bookingStatus assignedRoomId')
      .lean();

    const roomTypes = await RoomType.find({ isActive: true })
      .select('_id code inventoryGroup')
      .lean();
    const typeById = new Map<string, any>(roomTypes.map((rt) => [rt._id.toString(), rt]));

    const groupOf = (rt: any): string => {
      const grp = rt?.inventoryGroup?.trim().toUpperCase();
      if (grp) return grp;
      if (rt?.code === 'EXEC_DBL_AC' || rt?.code === 'EXEC_SGL_AC') return 'EXECUTIVE_AC';
      if (rt?.code === 'PREM_DBL_NONAC' || rt?.code === 'PREM_SGL_NONAC') return 'PREMIUM_NONAC';
      return rt?.code || 'DEFAULT';
    };

    // Calculate physical room totals per inventoryGroup
    const groupTotals: Record<string, number> = {};
    const roomToGroup = new Map<string, string>();
    for (const room of rooms) {
      const rt = typeById.get(room.roomTypeId.toString());
      const grp = groupOf(rt);
      groupTotals[grp] = (groupTotals[grp] || 0) + 1;
      roomToGroup.set(room._id.toString(), grp);
    }

    // Calculate bookings per inventoryGroup
    const groupBooked: Record<string, number> = {};
    for (const booking of conflictingBookings) {
      let grp: string | undefined;
      if (booking.assignedRoomId && roomToGroup.has(booking.assignedRoomId.toString())) {
        grp = roomToGroup.get(booking.assignedRoomId.toString());
      } else if (booking.roomTypeId) {
        const rt = typeById.get(booking.roomTypeId.toString());
        grp = groupOf(rt);
      }
      if (grp) {
        groupBooked[grp] = (groupBooked[grp] || 0) + 1;
      }
    }

    const roomTypeStats: Record<string, { total: number; booked: number }> = {};
    for (const rt of roomTypes) {
      const grp = groupOf(rt);
      roomTypeStats[rt._id.toString()] = {
        total: groupTotals[grp] || 0,
        booked: groupBooked[grp] || 0,
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
   * PRESERVES EXISTING PHYSICAL INVENTORY FUNCTIONALITY COMPLETELY.
   */
  static async getPhysicalInventoryStatus(checkIn: Date, checkOut: Date) {
    const now = new Date();

    // Fetch all 37 official active guest rooms
    const officialRoomNumbers = OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber);
    const rooms = await Room.find({
      isActive: true,
      isVenue: { $ne: true },
      roomNumber: { $in: officialRoomNumbers },
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
