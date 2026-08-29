import { Schema, model, Document, Types } from 'mongoose';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface IBookingMealSelection {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  pricePerNight: number;
}

export interface IBooking extends Document {
  bookingId: string; // e.g. "HR-2026-8942"
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomTypeId: Types.ObjectId;
  assignedRoomId?: Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  numGuests: number;
  numNights: number;
  specialRequests?: string;
  
  // Historical Snapshots (Locked at booking creation)
  roomPricePerNightSnapshot: number;
  mealPlanSelection?: IBookingMealSelection;
  extraPerson?: boolean;
  extraPersonChargeSnapshot?: number;
  couponCodeSnapshot?: string;
  discountAmountSnapshot: number;

  taxAmountSnapshot: number;
  totalAmount: number;

  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  
  // Payment Integration Data
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;

  trackingToken: string;
  expiresAt?: Date; // Temporary hold expiry for unpaid PENDING bookings
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    bookingId: { type: String, required: true, unique: true },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, lowercase: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    roomTypeId: { type: Schema.Types.ObjectId, ref: 'RoomType', required: true },
    assignedRoomId: { type: Schema.Types.ObjectId, ref: 'Room' },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    numGuests: { type: Number, required: true, default: 1 },
    numNights: { type: Number, required: true, default: 1 },
    specialRequests: { type: String },

    roomPricePerNightSnapshot: { type: Number, required: true },
    mealPlanSelection: {
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: false },
      dinner: { type: Boolean, default: false },
      pricePerNight: { type: Number, default: 0 },
    },
    extraPerson: { type: Boolean, default: false },
    extraPersonChargeSnapshot: { type: Number, default: 0 },
    couponCodeSnapshot: { type: String },

    discountAmountSnapshot: { type: Number, default: 0 },
    taxAmountSnapshot: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    bookingStatus: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'],
      default: 'PENDING',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },

    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    trackingToken: { type: String, required: true, unique: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

BookingSchema.index({ checkIn: 1, checkOut: 1 });
BookingSchema.index({ guestPhone: 1 });
BookingSchema.index({ guestEmail: 1 });
BookingSchema.index({ bookingStatus: 1, paymentStatus: 1 });

export const Booking = model<IBooking>('Booking', BookingSchema);
