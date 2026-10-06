"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomType = void 0;
const mongoose_1 = require("mongoose");
const RoomTypeSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    inventoryGroup: { type: String, trim: true, uppercase: true },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    cpPrice: { type: Number, required: true, min: 0 },
    maxOccupancy: { type: Number, required: true, default: 2 },
    isAc: { type: Boolean, default: true },
    amenities: [{ type: String }],
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.RoomType = (0, mongoose_1.model)('RoomType', RoomTypeSchema);
