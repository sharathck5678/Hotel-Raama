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
import { apiLimiter } from './middleware/rateLimiter';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Security & Body Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from any origin (mobile phones, local IP, domain)
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api', apiLimiter);

// 2. Register Routes
app.use('/api', publicRoutes);
app.use('/api', qrRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), service: 'Hotel Raama Backend API' });
});

// 3. Initialize Socket.IO Server & Cron Job
SocketService.init(httpServer, CLIENT_URL);
initCleanupHoldJob();

import { Room } from './models/Room';
import { RoomType } from './models/RoomType';
import { Coupon } from './models/Coupon';

// Helper to ensure coupons in active database
const ensureCoupons = async () => {
  try {
    await Coupon.deleteMany({ code: { $ne: 'RAAMA5' } });
    const existing = await Coupon.findOne({ code: 'RAAMA5' });
    if (!existing) {
      const now = new Date();
      const nextYear = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
      await Coupon.create({
        code: 'RAAMA5',
        discountType: 'PERCENTAGE',
        discountValue: 5,
        minBookingAmount: 0,
        startDate: new Date(2020, 0, 1),
        endDate: nextYear,
        maxUsage: 10000,
        usedCount: 0,
        isActive: true,
      });
      console.log('[Setup] Created RAAMA5 5% coupon entry.');
    }
  } catch (err) {
    console.warn('[Setup] Coupon sync warning:', err);
  }
};

// Helper to ensure special venue QR codes always exist in active database
const ensureSpecialVenues = async () => {
  try {
    const existingPartyHall = await Room.findOne({
      $or: [
        { roomNumber: 'Sambhrama Party Hall' },
        { roomNumber: { $regex: /party|hall|sambhrama/i } },
        { qrToken: 'qr_token_party_hall' },
      ],
    });
    if (!existingPartyHall) {
      const roomType = (await RoomType.findOne({ code: 'SUITE_ROOM' })) || (await RoomType.findOne());
      if (roomType) {
        await Room.create({
          roomNumber: 'Sambhrama Party Hall',
          roomTypeId: roomType._id,
          floor: 1,
          status: 'AVAILABLE',
          qrToken: 'qr_token_party_hall',
          isActive: true,
        });
        console.log('[Setup] Created Sambhrama Party Hall QR code entry.');
      }
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
        });
        console.log('[Setup] Created Board Room QR code entry.');
      }
    }
  } catch (err) {
    console.warn('[Setup] Special venue check warning:', err);
  }
};

// 4. Connect MongoDB & Start HTTP Server
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('[MongoDB] Connected successfully to hotel_raama database.');
    await ensureSpecialVenues();
    await ensureCoupons();
    httpServer.listen(PORT, () => {
      console.log(`[Server] Hotel Raama Backend API running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB Error] Connection failed:', err);
    process.exit(1);
  });

export { app, httpServer };

