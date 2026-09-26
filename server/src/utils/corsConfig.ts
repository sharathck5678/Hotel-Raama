import dotenv from 'dotenv';
dotenv.config();

const ALLOWED_PRODUCTION_ORIGINS = [
  'https://hotel-raama.hotelraama5.workers.dev',
];

export const getAllowedOrigins = (): string[] => {
  const list = [...ALLOWED_PRODUCTION_ORIGINS];
  if (process.env.CLIENT_URL) {
    const envUrl = process.env.CLIENT_URL.trim().replace(/\/$/, '');
    if (envUrl && !list.includes(envUrl)) {
      list.push(envUrl);
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
