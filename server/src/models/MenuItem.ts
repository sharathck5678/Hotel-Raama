import { Schema, model, Document, Types } from 'mongoose';

export interface IMenuItem extends Document {
  name: string;
  categoryId: Types.ObjectId;
  section: 'SWAAD' | 'HOTEL_RAAMA' | 'LIQUID_LOUNGE' | 'SAMBHRAMA';
  description?: string;
  price: number; // Regular price or 30ml base price for bar items
  price60ml?: number; // Optional 60ml price for bar beverages
  isVeg: boolean;
  isAvailable: boolean;
  featured: boolean;
  image?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    section: {
      type: String,
      enum: ['SWAAD', 'HOTEL_RAAMA', 'LIQUID_LOUNGE', 'SAMBHRAMA'],
      required: true,
    },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    price60ml: { type: Number, min: 0 },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    image: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MenuItemSchema.index({ categoryId: 1 });
MenuItemSchema.index({ section: 1 });
MenuItemSchema.index({ isAvailable: 1 });

export const MenuItem = model<IMenuItem>('MenuItem', MenuItemSchema);
