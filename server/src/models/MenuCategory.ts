import { Schema, model, Document } from 'mongoose';

export type MenuSection = 'SWAAD' | 'HOTEL_RAAMA' | 'LIQUID_LOUNGE' | 'SAMBHRAMA';

export interface IMenuCategory extends Document {
  name: string; // e.g. "South Indian", "Whisky", "Choice of Veg Menu"
  section: MenuSection;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MenuCategorySchema = new Schema<IMenuCategory>(
  {
    name: { type: String, required: true, trim: true },
    section: {
      type: String,
      enum: ['SWAAD', 'HOTEL_RAAMA', 'LIQUID_LOUNGE', 'SAMBHRAMA'],
      required: true,
    },
    description: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const MenuCategory = model<IMenuCategory>('MenuCategory', MenuCategorySchema);
