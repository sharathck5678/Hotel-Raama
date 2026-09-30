import dotenv from 'dotenv';
dotenv.config();

const ALLOWED_PRODUCTION_ORIGINS = [
  'https://hotelraama.com',
  'https://www.hotelraama.com',
  'http://hotelraama.com',
  'http://www.hotelraama.com',
  'https://hotel-raama.hotelraama5.workers.dev',
  'https://hotel-raama.pages.dev',
];

export const getAllowedOrigins = (): string[] => {
  const list = [...ALLOWED_PRODUCTION_ORIGINS];
  if (process.env.CLIENT_URL) {
    const envUrls = process.env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/$/, ''));
    for (const envUrl of envUrls) {
      if (envUrl && !list.includes(envUrl)) {
        list.push(envUrl);
      }
    }
  }
  return list;
};

export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, Postman, webhooks)
  if (!origin) return true;

  const normalized = origin.trim().replace(/\/$/, '');

  const allowedProduction = getAllowedOrigins();
  if (allowedProduction.includes(normalized)) {
    return true;
  }

  // Allow hotelraama.com and any subdomains (e.g., www.hotelraama.com, admin.hotelraama.com)
  if (/^https?:\/\/([a-zA-Z0-9-]+\.)*hotelraama\.com$/.test(normalized)) {
    return true;
  }

  // Allow Cloudflare Workers and Pages deployments for Hotel Raama
  if (
    /^https?:\/\/([a-zA-Z0-9-]+\.)*hotelraama.*\.workers\.dev$/.test(normalized) ||
    /^https?:\/\/([a-zA-Z0-9-]+\.)*hotel-raama.*\.workers\.dev$/.test(normalized) ||
    /^https?:\/\/([a-zA-Z0-9-]+\.)*hotel-raama.*\.pages\.dev$/.test(normalized)
  ) {
    return true;
  }

  // In non-production environments, allow localhost and local private network addresses
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (!isProd) {
    if (
      /^https?:\/\/localhost(:\d+)?$/.test(normalized) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalized) ||
      /^https?:\/\/(192\.168|10\.\d+|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+(:\d+)?$/.test(normalized)
    ) {
      return true;
    }
  }

  return false;
};
