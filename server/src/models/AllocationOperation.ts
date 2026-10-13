import { Schema, model, Types } from 'mongoose';

export type AllocationOpStatus = 'PENDING' | 'RECOVERING' | 'COMMITTED' | 'ROLLED_BACK' | 'FAILED';

export interface IAllocationOperation {
  _id: string; // Deterministic operation ID, e.g. "op_${bookingId}_${roomId}_${timestamp}"
  bookingId: Types.ObjectId;
  roomId: Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  stayDates: string[];
  expectedNights: number;
  claimedSlotIds: string[];
  status: AllocationOpStatus;
  leaseExpiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const AllocationOperationSchema = new Schema<IAllocationOperation>(
  {
    _id: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    stayDates: { type: [String], required: true },
    expectedNights: { type: Number, required: true },
    claimedSlotIds: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['PENDING', 'RECOVERING', 'COMMITTED', 'ROLLED_BACK', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    leaseExpiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

AllocationOperationSchema.index({ status: 1, leaseExpiresAt: 1 });

export const AllocationOperation = model<IAllocationOperation>(
  'AllocationOperation',
  AllocationOperationSchema
);
