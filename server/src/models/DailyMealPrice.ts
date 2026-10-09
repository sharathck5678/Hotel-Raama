import { Schema, model, Document } from 'mongoose';

export interface IDailyMealPrice extends Document {
  date: string; // ISO date string "YYYY-MM-DD"
  dateValue: Date;
  breakfastPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyMealPriceSchema = new Schema<IDailyMealPrice>(
  {
    date: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dateValue: { type: Date, required: true },
    breakfastPrice: { type: Number, min: 0 },
    lunchPrice: { type: Number, min: 0 },
    dinnerPrice: { type: Number, min: 0 },
    createdBy: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

export const DailyMealPrice = model<IDailyMealPrice>('DailyMealPrice', DailyMealPriceSchema);
