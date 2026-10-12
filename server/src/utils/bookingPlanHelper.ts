/**
 * Resolves the authoritative room booking plan display label.
 *
 * Requirements:
 * - 'EP Plan (Room Only)' when EP / NON_CP / ROOM_ONLY
 * - 'CP Plan (With Breakfast)' when CP / BREAKFAST_INCLUDED
 * - null when missing, empty, undefined, or unrecognized
 * - Authoritative saved booking plan must be used; never inferred from meal add-ons.
 * - Safely handles missing/unknown values without crashing or silently mislabeling.
 */
export function resolveBookingPlanLabel(booking: any): string | null {
  if (!booking) return null;
  const raw = booking.bookingPlan || booking.planType;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (
    upper === 'EP' ||
    upper === 'NON_CP' ||
    upper === 'ROOM_ONLY' ||
    upper === 'EP PLAN (ROOM ONLY)' ||
    upper === 'ROOM ONLY'
  ) {
    return 'EP Plan (Room Only)';
  }
  if (
    upper === 'CP' ||
    upper === 'BREAKFAST_INCLUDED' ||
    upper === 'CP PLAN (WITH BREAKFAST)' ||
    upper === 'BREAKFAST INCLUDED'
  ) {
    return 'CP Plan (With Breakfast)';
  }
  return null;
}
