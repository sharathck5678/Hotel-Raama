"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const mongoose_1 = require("mongoose");
const RoomSchema = new mongoose_1.Schema({
    roomNumber: { type: String, required: true, unique: true, trim: true },
    roomTypeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    floor: { type: Number, required: true, default: 1 },
    status: {
        type: String,
        enum: ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'],
        default: 'AVAILABLE',
    },
    qrToken: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isVenue: { type: Boolean, default: false },
}, { timestamps: true });
RoomSchema.index({ status: 1 });
RoomSchema.index({ isActive: 1, isVenue: 1 });
RoomSchema.index({ roomTypeId: 1, isActive: 1 });
exports.Room = (0, mongoose_1.model)('Room', RoomSchema);
