"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = exports.app = void 0;
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
const rateLimiter_1 = require("./middleware/rateLimiter");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = http_1.default.createServer(app);
exports.httpServer = httpServer;
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
// 1. Security & Body Middlewares
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests from any origin (mobile phones, local IP, domain)
        callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json());
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
// 3. Initialize Socket.IO Server & Cron Job
SocketService_1.SocketService.init(httpServer, CLIENT_URL);
(0, CleanupHoldJob_1.initCleanupHoldJob)();
const Room_1 = require("./models/Room");
const RoomType_1 = require("./models/RoomType");
// Helper to ensure special venue QR codes always exist in active database
const ensureSpecialVenues = async () => {
    try {
        const existingBoardRoom = await Room_1.Room.findOne({ roomNumber: 'Board Room' });
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
                });
                console.log('[Setup] Created Board Room QR code entry.');
            }
        }
    }
    catch (err) {
        console.warn('[Setup] Special venue check warning:', err);
    }
};
// 4. Connect MongoDB & Start HTTP Server
mongoose_1.default
    .connect(MONGODB_URI)
    .then(async () => {
    console.log('[MongoDB] Connected successfully to hotel_raama database.');
    await ensureSpecialVenues();
    httpServer.listen(PORT, () => {
        console.log(`[Server] Hotel Raama Backend API running at http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error('[MongoDB Error] Connection failed:', err);
    process.exit(1);
});
