/**
 * Image optimization helper for Hotel Raama.
 * Automatically resolves static public image assets to their high-performance WebP equivalents.
 */

const OPTIMIZED_WEBP_ASSETS = new Set([
  'sambhrama-party-hall',
  'chennakeshava-temple-belur',
  'hoysaleswara-temple-halebidu',
  'bisle-ghat',
  'liquid-lounge-bar',
  'shettihalli-church',
  'shravanabelagola',
  'triple-room-angle',
  'suite-room-angle',
  'double-occupancy-room',
  'single-occupancy-room',
  'suite-room',
  'double-room-angle',
  'triple-occupancy-ac',
  'swaad-restaurant',
  'hotel-raama-dining',
  'manjarabad-fort',
  'single-room-angle',
  'hotel-corridor',
]);

/**
 * Returns the WebP image path if an optimized version exists; otherwise returns the original URL.
 */
export const getOptimizedImageUrl = (src: string | undefined): string => {
  if (!src) return '';
  // Only process local absolute public paths starting with '/'
  if (src.startsWith('/') && !src.startsWith('//')) {
    const pathWithoutSlash = src.slice(1);
    const dotIdx = pathWithoutSlash.lastIndexOf('.');
    if (dotIdx > 0) {
      const baseName = pathWithoutSlash.slice(0, dotIdx);
      if (OPTIMIZED_WEBP_ASSETS.has(baseName)) {
        return `/${baseName}.webp`;
      }
    }
  }
  return src;
};
