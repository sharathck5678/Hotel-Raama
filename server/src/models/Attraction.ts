import { Schema, model, Document } from 'mongoose';

export interface IAttraction extends Document {
  name: string;
  category: string; // e.g. "Heritage", "Temple", "Nature"
  distance: string; // e.g. "38 km"
  image: string;
  description: string;
  googleMapsUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttractionSchema = new Schema<IAttraction>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, default: 'Sightseeing' },
    distance: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    googleMapsUrl: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AttractionSchema.index({ isActive: 1, sortOrder: 1 });

export const Attraction = model<IAttraction>('Attraction', AttractionSchema);
