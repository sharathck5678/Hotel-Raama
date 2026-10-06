import { Schema, model, Document, Types } from 'mongoose';

export interface IDailyInventory extends Document {
  roomTypeId: Types.ObjectId;
  date: string; // ISO date string "YYYY-MM-DD"
  dateValue: Date;

  inventoryOverride?: number | null; // Sellable inventory cap set by admin
  blockedRooms: number;
  stopSell: boolean;
  minStay: number;
  notes?: string;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyInventorySchema = new Schema<IDailyInventory>(
  {
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dateValue: { type: Date, required: true },

    inventoryOverride: { type: Number, default: null, min: 0 },
    blockedRooms: { type: Number, default: 0, min: 0 },
    stopSell: { type: Boolean, default: false },
    minStay: { type: Number, default: 1, min: 1 },
    notes: { type: String, trim: true },

    createdBy: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

DailyInventorySchema.index({ roomTypeId: 1, date: 1 }, { unique: true });
DailyInventorySchema.index({ date: 1, roomTypeId: 1 });

export const DailyInventory = model<IDailyInventory>('DailyInventory', DailyInventorySchema);
