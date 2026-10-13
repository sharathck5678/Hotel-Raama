import { Schema, model, Document, Types } from 'mongoose';

export type PhysicalAllocationStatus = 'CONFIRMED' | 'CHECKED_IN' | 'PENDING';

export interface IPhysicalRoomAllocation {
  _id: string; // Deterministic primary key: `${roomId.toString()}_${dateStr}` (e.g. "6ac084329daf5c368095652f_2026-11-20")
  roomId: Types.ObjectId;
  date: string; // ISO format "YYYY-MM-DD"
  bookingId: Types.ObjectId;
  bookingStatus: PhysicalAllocationStatus;
  expiresAt?: Date | null;
  operationId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PhysicalRoomAllocationSchema = new Schema<IPhysicalRoomAllocation>(
  {
    _id: { type: String, required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    bookingStatus: {
      type: String,
      enum: ['CONFIRMED', 'CHECKED_IN', 'PENDING'],
      required: true,
      default: 'CONFIRMED',
    },
    expiresAt: { type: Date, default: null },
    operationId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically garbage-collects expired holds in background,
// STRICTLY filtered to PENDING allocations so CONFIRMED / CHECKED_IN records are completely immune
PhysicalRoomAllocationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { bookingStatus: 'PENDING' } }
);
// Compound unique index ensuring database engine-enforced uniqueness per physical room and date
PhysicalRoomAllocationSchema.index({ roomId: 1, date: 1 }, { unique: true });
PhysicalRoomAllocationSchema.index({ date: 1, roomId: 1 });

export const PhysicalRoomAllocation = model<IPhysicalRoomAllocation>(
  'PhysicalRoomAllocation',
  PhysicalRoomAllocationSchema
);
