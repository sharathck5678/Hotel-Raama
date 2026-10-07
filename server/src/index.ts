import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import publicRoutes from './routes/publicRoutes';
import qrRoutes from './routes/qrRoutes';
import adminRoutes from './routes/adminRoutes';
import { SocketService } from './services/SocketService';
import { initCleanupHoldJob } from './jobs/CleanupHoldJob';
import { initEmailRetryJob } from './jobs/EmailRetryJob';
import { initFeedbackSchedulerJob } from './jobs/FeedbackSchedulerJob';
import { apiLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

import { isOriginAllowed } from './utils/corsConfig';

// 1. Security & Body Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api', apiLimiter);

// 2. Register Routes
app.use('/api', publicRoutes);
app.use('/api', qrRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'ok' : 'degraded',
    timestamp: new Date(),
    service: 'Hotel Raama Backend API',
    database: isDbConnected ? 'connected' : 'disconnected',
  });
});

// Global JSON Error Handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err.message || err);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'An internal server error occurred.',
  });
});

// 3. Initialize Socket.IO Server & Cron Jobs
SocketService.init(httpServer, CLIENT_URL);
initCleanupHoldJob();
initEmailRetryJob();
initFeedbackSchedulerJob();

import { Room } from './models/Room';
import { RoomType } from './models/RoomType';
import { Coupon } from './models/Coupon';
import { HotelSetting } from './models/HotelSetting';

// Helper to ensure official coupons in active database (WELCOME10 and WELCOME15 only)
const ensureCoupons = async () => {
  try {
    // Delete any old corporate/promotional coupons such as RAAMA5, HotelRaama5, etc.
    await Coupon.deleteMany({ code: { $nin: ['WELCOME10', 'WELCOME15'] } });

    const now = new Date(2020, 0, 1);
    const futureDate = new Date(new Date().getFullYear() + 5, 11, 31);

    // Ensure WELCOME10 (10% discount)
    await Coupon.findOneAndUpdate(
      { code: 'WELCOME10' },
      {
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minBookingAmount: 0,
        startDate: now,
        endDate: futureDate,
        maxUsage: 100000,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Ensure WELCOME15 (15% discount)
    await Coupon.findOneAndUpdate(
      { code: 'WELCOME15' },
      {
        code: 'WELCOME15',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minBookingAmount: 0,
        startDate: now,
        endDate: futureDate,
        maxUsage: 100000,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log('[Setup] Verified active coupons: WELCOME10 (10%) and WELCOME15 (15%).');
  } catch (err) {
    console.warn('[Setup] Coupon sync warning:', err);
  }
};

import { invalidateHotelSettingsCache } from './services/HotelSettingService';

// Helper to ensure HotelSetting exists and preserves custom tax percentage
export const ensureHotelSettings = async () => {
  try {
    const existing = await HotelSetting.findOne();
    const envTax = process.env.TAX_PERCENTAGE !== undefined && process.env.TAX_PERCENTAGE.trim() !== ''
      ? Number(process.env.TAX_PERCENTAGE)
      : NaN;
    const defaultTax = !isNaN(envTax) && envTax >= 0 ? envTax : 5;

    if (!existing) {
      await HotelSetting.create({
        taxPercentage: defaultTax,
      });
      console.log(`[Setup] Initialized default HotelSetting with taxPercentage: ${defaultTax}%.`);
    } else if (existing.taxPercentage === undefined || existing.taxPercentage === null || isNaN(existing.taxPercentage)) {
      existing.taxPercentage = defaultTax;
      await existing.save();
      console.log(`[Setup] Configured missing HotelSetting tax rate to ${defaultTax}%.`);
    } else {
      console.log(`[Setup] Preserved existing HotelSetting tax rate at ${existing.taxPercentage}%.`);
    }
    invalidateHotelSettingsCache();
  } catch (err) {
    console.warn('[Setup] HotelSetting sync warning:', err);
  }
};

// Helper to ensure special venue QR codes always exist in active database
const ensureSpecialVenues = async () => {
  try {
    const existingPartyHall = await Room.findOne({
      $or: [
        { roomNumber: 'Sambhrama Banquet Hall' },
        { roomNumber: 'Sambhrama Party Hall' },
        { roomNumber: { $regex: /party|hall|sambhrama/i } },
        { qrToken: 'qr_token_party_hall' },
      ],
    });
    if (!existingPartyHall) {
      const roomType = (await RoomType.findOne({ code: 'SUITE_ROOM' })) || (await RoomType.findOne());
      if (roomType) {
        await Room.create({
          roomNumber: 'Sambhrama Banquet Hall',
          roomTypeId: roomType._id,
          floor: 1,
          status: 'AVAILABLE',
          qrToken: 'qr_token_party_hall',
          isActive: true,
          isVenue: true,
        });
        console.log('[Setup] Created Sambhrama Banquet Hall QR code entry.');
      }
    } else if (!existingPartyHall.isVenue) {
      existingPartyHall.isVenue = true;
      await existingPartyHall.save();
    }

    const existingBoardRoom = await Room.findOne({
      $or: [
        { roomNumber: 'Board Room' },
        { roomNumber: { $regex: /board/i } },
        { qrToken: 'qr_token_board_room' },
      ],
    });
    if (!existingBoardRoom) {
      const roomType = (await RoomType.findOne({ code: 'EXEC_DBL_AC' })) || (await RoomType.findOne());
      if (roomType) {
        await Room.create({
          roomNumber: 'Board Room',
          roomTypeId: roomType._id,
          floor: 1,
          status: 'AVAILABLE',
          qrToken: 'qr_token_board_room',
          isActive: true,
          isVenue: true,
        });
        console.log('[Setup] Created Board Room QR code entry.');
      }
    } else if (!existingBoardRoom.isVenue) {
      existingBoardRoom.isVenue = true;
      await existingBoardRoom.save();
    }
  } catch (err) {
    console.warn('[Setup] Special venue check warning:', err);
  }
};

// Helper to ensure all room types have the official hotel facilities
const ensureRoomAmenities = async () => {
  try {
    const HOTEL_FACILITIES = [
      'Iron/Iron Boarding',
      'Laundry Service',
      '24Hour Hot Water',
      'Free Wifi',
      'Tv',
      'Kettle',
    ];
    const updateResult = await RoomType.updateMany({}, { $set: { amenities: HOTEL_FACILITIES } });
    if (updateResult.modifiedCount > 0) {
      console.log(`[Setup] Synced ${updateResult.modifiedCount} room types with official hotel facilities.`);
    }
  } catch (err) {
    console.warn('[Setup] Room facilities sync warning:', err);
  }
};

import { ensureDatabaseSeeded } from './seed/seedDatabase';

/**
 * Asynchronously execute non-critical reference and seed synchronizations in the background.
 * Preserves dependency order:
 * 1. ensureDatabaseSeeded (catalog/menu/room data)
 * 2. ensureRoomAmenities (updates room type amenities)
 * 3. ensureSpecialVenues (depends on room types existing)
 * 4. ensureHotelSettings (independent settings check)
 * 5. ensureCoupons (independent promotional coupons check)
 */
async function runNonCriticalStartupTasks(): Promise<void> {
  const syncStartTime = Date.now();
  console.log('[Startup] Starting background database synchronization tasks...');

  try {
    await ensureDatabaseSeeded();
    console.log('[Startup] ✓ ensureDatabaseSeeded completed.');
  } catch (err: any) {
    console.error('[Startup Error] ensureDatabaseSeeded failed:', err.message || err);
  }

  try {
    await ensureRoomAmenities();
    console.log('[Startup] ✓ ensureRoomAmenities completed.');
  } catch (err: any) {
    console.error('[Startup Error] ensureRoomAmenities failed:', err.message || err);
  }

  try {
    await ensureSpecialVenues();
    console.log('[Startup] ✓ ensureSpecialVenues completed.');
  } catch (err: any) {
    console.error('[Startup Error] ensureSpecialVenues failed:', err.message || err);
  }

  try {
    await ensureHotelSettings();
    console.log('[Startup] ✓ ensureHotelSettings completed.');
  } catch (err: any) {
    console.error('[Startup Error] ensureHotelSettings failed:', err.message || err);
  }

  try {
    await ensureCoupons();
    console.log('[Startup] ✓ ensureCoupons completed.');
  } catch (err: any) {
    console.error('[Startup Error] ensureCoupons failed:', err.message || err);
  }

  const syncDuration = Date.now() - syncStartTime;
  console.log(`[Startup] Background synchronization completed in ${syncDuration}ms.`);
}

// 4. Connect MongoDB & Start HTTP Server
const mongoStartTime = Date.now();
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    const mongoDuration = Date.now() - mongoStartTime;
    console.log(`[MongoDB] Connected successfully to database in ${mongoDuration}ms.`);

    const listenStartTime = Date.now();
    httpServer.listen(PORT, () => {
      const listenDuration = Date.now() - listenStartTime;
      console.log(`[Server] Hotel Raama Backend API running at http://localhost:${PORT} (ready to serve in ${listenDuration}ms, total boot: ${Date.now() - mongoStartTime}ms)`);

      // Run non-critical initializations asynchronously in background
      void runNonCriticalStartupTasks().catch((err: any) => {
        console.error('[Startup Error] Unhandled error during background initialization:', err.message || err);
      });
    });
  })
  .catch((err) => {
    console.error('[MongoDB Error] Connection failed:', err.message || err);
    process.exit(1);
  });

export { app, httpServer };
