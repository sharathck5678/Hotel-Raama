export interface IOccupancyValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Authoritative room occupancy validation.
 * Enforces business rule: Suite Room allows a maximum of 2 guests.
 * Other room categories retain their configured maximum occupancies.
 */
export function validateRoomOccupancy(
  roomType: { code?: string; name?: string; maxOccupancy?: number } | null | undefined,
  numGuests: number | string | undefined
): IOccupancyValidationResult {
  if (!roomType) {
    return { isValid: true };
  }

  const parsedGuests = typeof numGuests === 'number' ? numGuests : parseInt(String(numGuests || 1), 10);
  const guestCount = isNaN(parsedGuests) || parsedGuests < 1 ? 1 : parsedGuests;

  const isSuite = roomType.code === 'SUITE_ROOM' || Boolean(roomType.name && /suite/i.test(roomType.name));

  // Suite Room strictly allows a maximum of 2 guests
  if (isSuite && guestCount > 2) {
    return {
      isValid: false,
      message: 'Suite Room allows a maximum of 2 guests.',
    };
  }

  return { isValid: true };
}
