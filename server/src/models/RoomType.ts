import { Schema, model, Document } from 'mongoose';

/**
 * HOTEL RAAMA ROOM TYPE SPECIFICATIONS & INVENTORY RULES:
 * - Total Active Guest Rooms: 37 across Floors 1-3.
 * - Categories:
 *   - TRIPLE_EXEC (5 rooms): 101, 110, 206, 212, 213
 *   - TRIPLE_PREM (1 room): 305
 *   - SUITE_ROOM (2 rooms): 103, 205
 *   - PREM_DBL_NONAC (7 rooms): 105, 204, 207, 211, 216, 217, 302
 *   - EXEC_DBL_AC (22 rooms): 102, 106, 107, 108, 109, 111, 112, 113, 114, 115,
 *                             201, 202, 203, 208, 209, 210, 214, 215, 218,
 *                             301, 303, 304
 * 
 * BUSINESS RULE (Confirmed by Hotel Management):
 * Split-bed/twin-bed rooms are intentionally classified as Executive Double A/C inventory.
 * They use the same pricing, availability pool and booking rules as Executive Double A/C rooms.
 * No separate SPLIT_BED_AC room type exists.
 */
export interface IRoomType extends Document {
  name: string; // e.g. "Executive Double A/C"
  code: string; // e.g. "EXEC_DBL_AC"
  inventoryGroup?: string; // e.g. "EXECUTIVE_AC", "PREMIUM_NONAC" (shared physical inventory pool)
  description: string;
  basePrice: number; // Non-CP Plan (Room Only)
  cpPrice: number; // CP Plan (Breakfast Included)
  maxOccupancy: number;
  isAc: boolean;
  amenities: string[];
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomTypeSchema = new Schema<IRoomType>(
  {
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
  },
  { timestamps: true }
);

RoomTypeSchema.index({ isActive: 1 });

export const RoomType = model<IRoomType>('RoomType', RoomTypeSchema);
