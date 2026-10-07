import { Schema, model, Document, Types } from 'mongoose';

export interface IDailyRate extends Document {
  roomTypeId: Types.ObjectId;
  ratePlanId: Types.ObjectId;
  ratePlanCode: string;
  date: string; // ISO date string "YYYY-MM-DD"
  dateValue: Date;

  singleAdult: number;
  doubleAdult: number;
  tripleAdult?: number;

  childRate: number;
  extraAdultRate: number;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyRateSchema = new Schema<IDailyRate>(
  {
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true },
    ratePlanId: { type: Schema.Types.ObjectId, ref: 'RatePlan', required: true },
    ratePlanCode: { type: String, required: true, uppercase: true, trim: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dateValue: { type: Date, required: true },

    singleAdult: { type: Number, required: true, min: 0 },
    doubleAdult: { type: Number, required: true, min: 0 },
    tripleAdult: { type: Number, required: false, min: 0 },

    childRate: { type: Number, default: 0, min: 0 },
    extraAdultRate: { type: Number, default: 600, min: 0 },

    createdBy: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

DailyRateSchema.index({ roomTypeId: 1, ratePlanId: 1, date: 1 }, { unique: true });
DailyRateSchema.index({ date: 1, roomTypeId: 1 });
DailyRateSchema.index({ roomTypeId: 1, date: 1 });

export const DailyRate = model<IDailyRate>('DailyRate', DailyRateSchema);
