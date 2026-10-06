import { Schema, model, Document } from 'mongoose';

export interface IRatePlan extends Document {
  name: string; // e.g. "Room Only", "Breakfast Included"
  code: string; // e.g. "ROOM_ONLY", "BREAKFAST_INCLUDED"
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RatePlanSchema = new Schema<IRatePlan>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RatePlanSchema.index({ code: 1, isActive: 1 });

export const RatePlan = model<IRatePlan>('RatePlan', RatePlanSchema);
