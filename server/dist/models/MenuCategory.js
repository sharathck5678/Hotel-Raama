"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuCategory = void 0;
const mongoose_1 = require("mongoose");
const MenuCategorySchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    section: {
        type: String,
        enum: ['SWAAD', 'HOTEL_RAAMA', 'LIQUID_LOUNGE', 'SAMBHRAMA'],
        required: true,
    },
    description: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
exports.MenuCategory = (0, mongoose_1.model)('MenuCategory', MenuCategorySchema);
