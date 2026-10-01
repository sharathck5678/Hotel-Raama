import { Schema, model, Document, Types } from 'mongoose';

export type FeedbackStatus = 'new' | 'read' | 'archived';

export interface IFeedback extends Document {
  bookingObjectId: Types.ObjectId;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  overallRating: number;
  roomRating: number;
  foodRating: number;
  cleanlinessRating: number;
  serviceRating: number;
  recommendation: boolean;
  comment?: string;
  submittedAt: Date;
  status: FeedbackStatus;
  emailNotificationSent: boolean;
  emailNotificationError?: string;
  emailNotificationSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    bookingObjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // Guarantees exactly one feedback entry per booking
    },
    bookingId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    roomRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    foodRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    cleanlinessRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    serviceRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    recommendation: {
      type: Boolean,
      required: true,
      default: true,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'archived'],
      default: 'new',
      index: true,
    },
    emailNotificationSent: {
      type: Boolean,
      default: false,
    },
    emailNotificationError: {
      type: String,
    },
    emailNotificationSentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

FeedbackSchema.index({ overallRating: 1 });
FeedbackSchema.index({ submittedAt: -1 });

export const Feedback = model<IFeedback>('Feedback', FeedbackSchema);
