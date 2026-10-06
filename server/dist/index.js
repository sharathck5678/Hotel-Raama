"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.app = exports.ensureHotelSettings = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const qrRoutes_1 = __importDefault(require("./routes/qrRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const SocketService_1 = require("./services/SocketService");
const CleanupHoldJob_1 = require("./jobs/CleanupHoldJob");
const EmailRetryJob_1 = require("./jobs/EmailRetryJob");
const FeedbackSchedulerJob_1 = require("./jobs/FeedbackSchedulerJob");
const rateLimiter_1 = require("./middleware/rateLimiter");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = http_1.default.createServer(app);
exports.httpServer = httpServer;
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const corsConfig_1 = require("./utils/corsConfig");
// 1. Security & Body Middlewares
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if ((0, corsConfig_1.isOriginAllowed)(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express_1.default.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
app.use('/api', rateLimiter_1.apiLimiter);
// 2. Register Routes
app.use('/api', publicRoutes_1.default);
app.use('/api', qrRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), service: 'Hotel Raama Backend API' });
});
// Global JSON Error Handler
app.use((err, req, res, _next) => {
    console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err.message || err);
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({
        success: false,
        message: err.message || 'An internal server error occurred.',
    });
});
// 3. Initialize Socket.IO Server & Cron Jobs
SocketService_1.SocketService.init(httpServer, CLIENT_URL);
(0, CleanupHoldJob_1.initCleanupHoldJob)();
(0, EmailRetryJob_1.initEmailRetryJob)();
(0, FeedbackSchedulerJob_1.initFeedbackSchedulerJob)();
const Room_1 = require("./models/Room");
const RoomType_1 = require("./models/RoomType");
const Coupon_1 = require("./models/Coupon");
const HotelSetting_1 = require("./models/HotelSetting");
// Helper to ensure official coupons in active database (WELCOME10 and WELCOME15 only)
const ensureCoupons = async () => {
    try {
        // Delete any old corporate/promotional coupons such as RAAMA5, HotelRaama5, etc.
        await Coupon_1.Coupon.deleteMany({ code: { $nin: ['WELCOME10', 'WELCOME15'] } });
        const now = new Date(2020, 0, 1);
        const futureDate = new Date(new Date().getFullYear() + 5, 11, 31);
        // Ensure WELCOME10 (10% discount)
        await Coupon_1.Coupon.findOneAndUpdate({ code: 'WELCOME10' }, {
            code: 'WELCOME10',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minBookingAmount: 0,
            startDate: now,
            endDate: futureDate,
            maxUsage: 100000,
            isActive: true,
        }, { upsert: true, new: true });
        // Ensure WELCOME15 (15% discount)
        await Coupon_1.Coupon.findOneAndUpdate({ code: 'WELCOME15' }, {
            code: 'WELCOME15',
            discountType: 'PERCENTAGE',
            discountValue: 15,
            minBookingAmount: 0,
            startDate: now,
            endDate: futureDate,
            maxUsage: 100000,
            isActive: true,
        }, { upsert: true, new: true });
        console.log('[Setup] Verified active coupons: WELCOME10 (10%) and WELCOME15 (15%).');
    }
    catch (err) {
        console.warn('[Setup] Coupon sync warning:', err);
    }
};
// Helper to ensure HotelSetting exists and preserves custom tax percentage
const ensureHotelSettings = async () => {
    try {
        const existing = await HotelSetting_1.HotelSetting.findOne();
        const envTax = process.env.TAX_PERCENTAGE !== undefined && process.env.TAX_PERCENTAGE.trim() !== ''
            ? Number(process.env.TAX_PERCENTAGE)
            : NaN;
        const defaultTax = !isNaN(envTax) && envTax >= 0 ? envTax : 5;
        if (!existing) {
            await HotelSetting_1.HotelSetting.create({
                taxPercentage: defaultTax,
            });
            console.log(`[Setup] Initialized default HotelSetting with taxPercentage: ${defaultTax}%.`);
        }
        else if (existing.taxPercentage === undefined || existing.taxPercentage === null || isNaN(existing.taxPercentage)) {
            existing.taxPercentage = defaultTax;
            await existing.save();
            console.log(`[Setup] Configured missing HotelSetting tax rate to ${defaultTax}%.`);
        }
        else {
            console.log(`[Setup] Preserved existing HotelSetting tax rate at ${existing.taxPercentage}%.`);
        }
    }
    catch (err) {
        console.warn('[Setup] HotelSetting sync warning:', err);
    }
};
exports.ensureHotelSettings = ensureHotelSettings;
// Helper to ensure special venue QR codes always exist in active database
const ensureSpecialVenues = async () => {
    try {
        const existingPartyHall = await Room_1.Room.findOne({
            $or: [
                { roomNumber: 'Sambhrama Banquet Hall' },
                { roomNumber: 'Sambhrama Party Hall' },
                { roomNumber: { $regex: /party|hall|sambhrama/i } },
                { qrToken: 'qr_token_party_hall' },
            ],
        });
        if (!existingPartyHall) {
            const roomType = (await RoomType_1.RoomType.findOne({ code: 'SUITE_ROOM' })) || (await RoomType_1.RoomType.findOne());
            if (roomType) {
                await Room_1.Room.create({
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
        }
        else if (!existingPartyHall.isVenue) {
            existingPartyHall.isVenue = true;
            await existingPartyHall.save();
        }
        const existingBoardRoom = await Room_1.Room.findOne({
            $or: [
                { roomNumber: 'Board Room' },
                { roomNumber: { $regex: /board/i } },
                { qrToken: 'qr_token_board_room' },
            ],
        });
        if (!existingBoardRoom) {
            const roomType = (await RoomType_1.RoomType.findOne({ code: 'EXEC_DBL_AC' })) || (await RoomType_1.RoomType.findOne());
            if (roomType) {
                await Room_1.Room.create({
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
        }
        else if (!existingBoardRoom.isVenue) {
            existingBoardRoom.isVenue = true;
            await existingBoardRoom.save();
        }
    }
    catch (err) {
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
        const updateResult = await RoomType_1.RoomType.updateMany({}, { $set: { amenities: HOTEL_FACILITIES } });
        if (updateResult.modifiedCount > 0) {
            console.log(`[Setup] Synced ${updateResult.modifiedCount} room types with official hotel facilities.`);
        }
    }
    catch (err) {
        console.warn('[Setup] Room facilities sync warning:', err);
    }
};
const seedDatabase_1 = require("./seed/seedDatabase");
// 4. Connect MongoDB & Start HTTP Server
mongoose_1.default
    .connect(MONGODB_URI)
    .then(async () => {
    console.log('[MongoDB] Connected successfully to hotel_raama database.');
    await (0, seedDatabase_1.ensureDatabaseSeeded)();
    await ensureRoomAmenities();
    await ensureSpecialVenues();
    await (0, exports.ensureHotelSettings)();
    await ensureCoupons();
    httpServer.listen(PORT, () => {
        console.log(`[Server] Hotel Raama Backend API running at http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error('[MongoDB Error] Connection failed:', err);
    process.exit(1);
});
