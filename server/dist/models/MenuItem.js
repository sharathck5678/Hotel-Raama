"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuItem = void 0;
const mongoose_1 = require("mongoose");
const MenuItemSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    categoryId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    section: {
        type: String,
        enum: ['SWAAD', 'HOTEL_RAAMA', 'LIQUID_LOUNGE', 'SAMBHRAMA'],
        required: true,
    },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    price60ml: { type: Number, min: 0 },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    image: { type: String },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
MenuItemSchema.index({ categoryId: 1 });
MenuItemSchema.index({ section: 1 });
MenuItemSchema.index({ isAvailable: 1 });
exports.MenuItem = (0, mongoose_1.model)('MenuItem', MenuItemSchema);
