import { HotelSetting, IHotelSetting } from '../models/HotelSetting';

/**
 * In-memory cache for HotelSetting.
 * 
 * Invariant Rules:
 * - Only caches application-level static configuration (hotel name, contact, tax rate).
 * - NEVER caches booking availability, room inventory, pricing, or payments.
 * - Cache has a short TTL (30 seconds) and is explicitly invalidated whenever
 *   HotelSetting is updated or saved.
 */

let cachedSettings: (IHotelSetting & { _id: any }) | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Retrieve hotel settings from cache or database.
 * Returns a lean plain object.
 */
export const getHotelSettings = async (): Promise<any | null> => {
  const now = Date.now();
  if (cachedSettings !== null && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const doc = await HotelSetting.findOne().lean();
    cachedSettings = (doc as any) || null;
    lastFetchTime = now;
    return cachedSettings;
  } catch (err) {
    // If database read fails but stale cache exists, safely fallback to stale cache
    if (cachedSettings !== null) {
      return cachedSettings;
    }
    throw err;
  }
};

/**
 * Explicitly invalidate the in-memory cache.
 * Called on any updates to HotelSetting.
 */
export const invalidateHotelSettingsCache = (): void => {
  cachedSettings = null;
  lastFetchTime = 0;
};
