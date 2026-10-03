import { Schema, model, Document, Types } from 'mongoose';

export type RoomStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'OCCUPIED'
  | 'CLEANING'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE';

export interface IRoom extends Document {
  roomNumber: string; // e.g. "101", "Meeting Hall 1"
  roomTypeId: Types.ObjectId;
  floor: number;
  status: RoomStatus;
  qrToken: string; // Token used for QR food ordering (/order/:token)
  isActive: boolean;
  isVenue?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    roomNumber: { type: String, required: true, unique: true, trim: true },
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true },
    floor: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'],
      default: 'AVAILABLE',
    },
    qrToken: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isVenue: { type: Boolean, default: false },
  },
  { timestamps: true }
);

RoomSchema.index({ status: 1 });
RoomSchema.index({ isActive: 1, isVenue: 1 });
RoomSchema.index({ roomTypeId: 1, isActive: 1 });

export const Room = model<IRoom>('Room', RoomSchema);
