"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Booking = void 0;
const mongoose_1 = require("mongoose");
const BookingSchema = new mongoose_1.Schema({
    bookingId: { type: String, required: true, unique: true },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, lowercase: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    guestAadhar: { type: String, trim: true },
    roomTypeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'RoomType', required: true },
    assignedRoomId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Room' },
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
    // Email Notification Status Tracking
    hotelNotificationStatus: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED'],
        default: 'PENDING',
    },
    guestConfirmationStatus: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED'],
        default: 'PENDING',
    },
    hotelNotificationError: { type: String },
    guestConfirmationError: { type: String },
    notificationAttempts: { type: Number, default: 0 },
    emailSentAt: { type: Date },
    // Feedback System Tracking
    feedbackToken: { type: String, sparse: true, unique: true },
    feedbackTokenExpiry: { type: Date },
    feedbackRequestSent: { type: Boolean, default: false },
    feedbackRequestSentAt: { type: Date },
    feedbackRequestStatus: {
        type: String,
        enum: ['NOT_SENT', 'PROCESSING', 'SENT', 'FAILED'],
        default: 'NOT_SENT',
    },
    feedbackRequestError: { type: String },
    feedbackSubmitted: { type: Boolean, default: false },
    feedbackSubmittedAt: { type: Date },
    feedbackStatus: {
        type: String,
        enum: ['NOT_RECEIVED', 'RECEIVED', 'ARCHIVED'],
        default: 'NOT_RECEIVED',
    },
}, { timestamps: true });
BookingSchema.index({ checkIn: 1, checkOut: 1 });
BookingSchema.index({ guestPhone: 1 });
BookingSchema.index({ guestEmail: 1 });
BookingSchema.index({ bookingStatus: 1, paymentStatus: 1 });
BookingSchema.index({ razorpayOrderId: 1 });
BookingSchema.index({ bookingStatus: 1, checkOut: 1, feedbackRequestSent: 1 });
exports.Booking = (0, mongoose_1.model)('Booking', BookingSchema);
