"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attraction = void 0;
const mongoose_1 = require("mongoose");
const AttractionSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, default: 'Sightseeing' },
    distance: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    googleMapsUrl: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
AttractionSchema.index({ isActive: 1, sortOrder: 1 });
exports.Attraction = (0, mongoose_1.model)('Attraction', AttractionSchema);
