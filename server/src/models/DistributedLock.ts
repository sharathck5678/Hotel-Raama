import { Schema, model } from 'mongoose';

export interface IDistributedLock {
  _id: string; // The lock resource key, e.g. "room:66b...", "booking:66b..."
  owner: string; // Unique process/request identifier
  expiresAt: Date; // Timestamp when the lock automatically expires
  fenceToken: number; // Monotonically increasing fencing token for stale write detection
  createdAt?: Date;
  updatedAt?: Date;
}

const DistributedLockSchema = new Schema<IDistributedLock>(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    fenceToken: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically purges expired lock documents in background
DistributedLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DistributedLock = model<IDistributedLock>('DistributedLock', DistributedLockSchema);
