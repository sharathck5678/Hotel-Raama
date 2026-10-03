"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const RoomType_1 = require("../models/RoomType");
const Room_1 = require("../models/Room");
const Booking_1 = require("../models/Booking");
const Feedback_1 = require("../models/Feedback");
const Order_1 = require("../models/Order");
const MenuCategory_1 = require("../models/MenuCategory");
const MenuItem_1 = require("../models/MenuItem");
const Attraction_1 = require("../models/Attraction");
const HotelSetting_1 = require("../models/HotelSetting");
const AvailabilityEngine_1 = require("../services/AvailabilityEngine");
const PricingEngine_1 = require("../services/PricingEngine");
const RazorpayService_1 = require("../services/RazorpayService");
const InvoicePdfService_1 = require("../services/InvoicePdfService");
const EmailService_1 = require("../services/EmailService");
const seedDatabase_1 = require("../seed/seedDatabase");
const aadharValidator_1 = require("../utils/aadharValidator");
const gstinValidator_1 = require("../utils/gstinValidator");
class PublicController {
    static async resolveRoomTypeId(roomTypeId) {
        if (!roomTypeId)
            return null;
        if (typeof roomTypeId === 'string' && mongoose_1.default.Types.ObjectId.isValid(roomTypeId) && roomTypeId.length === 24) {
            const foundById = await RoomType_1.RoomType.findById(roomTypeId);
            if (foundById)
                return foundById._id.toString();
        }
        const MOCK_MAP = {
            rt_1: 'PREM_SGL_NONAC',
            rt_2: 'PREM_DBL_NONAC',
            rt_3: 'EXEC_SGL_AC',
            rt_4: 'EXEC_DBL_AC',
            rt_5: 'TRIPLE_PREM',
            rt_6: 'TRIPLE_EXEC',
            rt_7: 'SUITE_ROOM',
        };
        const searchCode = typeof roomTypeId === 'string' ? (MOCK_MAP[roomTypeId] || roomTypeId) : '';
        const found = await RoomType_1.RoomType.findOne({ code: searchCode });
        return found ? found._id.toString() : null;
    }
    /**
     * GET /api/rooms
     */
    static async getRoomTypes(req, res) {
        try {
            let roomTypes = await RoomType_1.RoomType.find({ isActive: true });
            if (roomTypes.length === 0) {
                await (0, seedDatabase_1.ensureDatabaseSeeded)();
                roomTypes = await RoomType_1.RoomType.find({ isActive: true });
            }
            return res.json({ success: true, data: roomTypes });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
        }
    }
    /**
     * POST /api/availability/check
     */
    static async checkAvailabilityAndPrice(req, res) {
        try {
            const { roomTypeId, checkIn, checkOut, numGuests, mealSelection, couponCode, planType, extraPerson, gstin } = req.body;
            if (!roomTypeId || !checkIn || !checkOut) {
                return res.status(400).json({ success: false, message: 'roomTypeId, checkIn, and checkOut are required.' });
            }
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);
            if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid dates.' });
            }
            if (checkOutDate <= checkInDate) {
                return res.status(400).json({ success: false, message: 'Check-out must be after check-in.' });
            }
            const resolvedRoomTypeId = await PublicController.resolveRoomTypeId(roomTypeId);
            if (!resolvedRoomTypeId) {
                return res.status(400).json({ success: false, message: 'Invalid or unrecognized room type.' });
            }
            // Check availability
            const availability = await AvailabilityEngine_1.AvailabilityEngine.checkAvailability(resolvedRoomTypeId, checkInDate, checkOutDate);
            // Calculate server pricing
            const pricing = await PricingEngine_1.PricingEngine.calculateBookingPrice(resolvedRoomTypeId, checkInDate, checkOutDate, numGuests || 1, mealSelection, couponCode, planType || 'NON_CP', !!extraPerson, gstin);
            return res.json({
                success: true,
                data: {
                    availability,
                    pricing,
                },
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message || 'Error checking availability.' });
        }
    }
    /**
     * POST /api/bookings
     */
    static async createBooking(req, res) {
        try {
            const { guestName, guestEmail, guestPhone, guestAadhar, roomTypeId, checkIn, checkOut, numGuests, mealSelection, couponCode, specialRequests, planType, extraPerson, gstin, } = req.body;
            if (!guestName || !guestEmail || !guestPhone || !roomTypeId || !checkIn || !checkOut) {
                return res.status(400).json({ success: false, message: 'Missing required booking fields.' });
            }
            if (guestAadhar) {
                const aadharCheck = (0, aadharValidator_1.validateAadhar)(guestAadhar);
                if (!aadharCheck.isValid) {
                    return res.status(400).json({ success: false, message: aadharCheck.message || 'Invalid Aadhaar number.' });
                }
            }
            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);
            const resolvedRoomTypeId = await PublicController.resolveRoomTypeId(roomTypeId);
            if (!resolvedRoomTypeId) {
                return res.status(400).json({ success: false, message: 'Invalid or unrecognized room type.' });
            }
            // 1. Transactional Availability Check
            const availability = await AvailabilityEngine_1.AvailabilityEngine.checkAvailability(resolvedRoomTypeId, checkInDate, checkOutDate);
            if (!availability.isAvailable) {
                return res.status(400).json({ success: false, message: 'Selected room type is fully booked for these dates.' });
            }
            // 2. Strict Server-side Price Engine Calculation
            const pricing = await PricingEngine_1.PricingEngine.calculateBookingPrice(resolvedRoomTypeId, checkInDate, checkOutDate, numGuests || 1, mealSelection, couponCode, planType || 'NON_CP', !!extraPerson, gstin);
            // Generate IDs
            const bookingId = `HR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const trackingToken = crypto_1.default.randomBytes(16).toString('hex');
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes hold
            // 3. Create Razorpay Payment Order
            const razorpayOrder = await RazorpayService_1.RazorpayService.createOrder(pricing.totalAmount, bookingId);
            // 4. Create PENDING Booking Record
            const booking = await Booking_1.Booking.create({
                bookingId,
                guestName,
                guestEmail,
                guestPhone,
                guestAadhar: guestAadhar ? guestAadhar.trim() : undefined,
                roomTypeId: resolvedRoomTypeId,
                assignedRoomId: availability.assignedRoomId,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                numGuests: numGuests || 1,
                numNights: pricing.numNights,
                specialRequests,
                roomPricePerNightSnapshot: pricing.roomPricePerNight,
                mealPlanSelection: {
                    breakfast: !!mealSelection?.breakfast,
                    lunch: !!mealSelection?.lunch,
                    dinner: !!mealSelection?.dinner,
                    pricePerNight: pricing.mealPlanPricePerNight,
                },
                extraPerson: !!extraPerson,
                extraPersonChargeSnapshot: pricing.extraPersonTotal,
                couponCodeSnapshot: pricing.couponCode,
                discountPercentageSnapshot: pricing.discountPercentage || 0,
                discountAmountSnapshot: pricing.discountAmount,
                gstin: pricing.gstin,
                taxRateSnapshot: pricing.taxPercentage,
                taxAmountSnapshot: pricing.taxAmount,
                totalAmount: pricing.totalAmount,
                bookingStatus: 'PENDING',
                paymentStatus: 'PENDING',
                razorpayOrderId: razorpayOrder.id,
                trackingToken,
                expiresAt,
            });
            return res.status(201).json({
                success: true,
                message: 'Booking hold created successfully.',
                data: {
                    bookingId: booking.bookingId,
                    trackingToken: booking.trackingToken,
                    totalAmount: booking.totalAmount,
                    razorpayOrderId: razorpayOrder.id,
                    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
                    expiresAt: booking.expiresAt,
                },
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message || 'Failed to create booking.' });
        }
    }
    /**
     * POST /api/bookings/verify-payment
     */
    static async verifyPayment(req, res) {
        try {
            const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
            if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
                return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
            }
            const booking = await Booking_1.Booking.findOne({ bookingId });
            if (!booking) {
                return res.status(404).json({ success: false, message: 'Booking not found.' });
            }
            // 1. Idempotency Check: Already verified & confirmed bookings must not re-run transitions or duplicate emails
            if (booking.paymentStatus === 'PAID' && booking.bookingStatus === 'CONFIRMED') {
                return res.json({
                    success: true,
                    message: 'Payment already verified! Booking confirmed.',
                    data: {
                        bookingId: booking.bookingId,
                        trackingToken: booking.trackingToken,
                        status: booking.bookingStatus,
                    },
                });
            }
            // 2. Pre-confirmation State Validation: Cannot confirm cancelled or invalid states
            if (booking.bookingStatus === 'CANCELLED') {
                return res.status(400).json({ success: false, message: 'Booking is cancelled and cannot be confirmed.' });
            }
            if (booking.bookingStatus !== 'PENDING') {
                return res.status(400).json({ success: false, message: 'Booking is not in a pending state for payment.' });
            }
            // 3. Expiration Check: Expired hold cannot reclaim room
            if (booking.expiresAt && new Date(booking.expiresAt).getTime() < Date.now()) {
                booking.paymentStatus = 'FAILED';
                booking.bookingStatus = 'CANCELLED';
                await booking.save();
                return res.status(400).json({ success: false, message: 'Booking hold has expired. Please initiate a new reservation.' });
            }
            // 4. Order ID Verification: Submitted razorpayOrderId must match the booking's order ID
            if (booking.razorpayOrderId && booking.razorpayOrderId !== razorpayOrderId) {
                return res.status(400).json({ success: false, message: 'Provided order ID does not match this booking.' });
            }
            // 5. Server-side HMAC-SHA256 Signature Verification
            const isValid = RazorpayService_1.RazorpayService.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
            if (!isValid) {
                booking.paymentStatus = 'FAILED';
                booking.bookingStatus = 'CANCELLED';
                await booking.save();
                return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
            }
            // 6. Atomic Transition to CONFIRMED & PAID
            // Only one concurrent request can match { bookingStatus: 'PENDING', paymentStatus: { $ne: 'PAID' } }
            const confirmedBooking = await Booking_1.Booking.findOneAndUpdate({
                _id: booking._id,
                bookingStatus: 'PENDING',
                paymentStatus: { $ne: 'PAID' },
            }, {
                $set: {
                    paymentStatus: 'PAID',
                    bookingStatus: 'CONFIRMED',
                    razorpayPaymentId,
                    razorpaySignature,
                },
                $unset: {
                    expiresAt: 1,
                },
            }, { new: true });
            // If another concurrent request already updated this booking, fetch current state and return idempotently
            if (!confirmedBooking) {
                const latestBooking = await Booking_1.Booking.findOne({ bookingId });
                if (latestBooking && latestBooking.paymentStatus === 'PAID') {
                    return res.json({
                        success: true,
                        message: 'Payment already verified! Booking confirmed.',
                        data: {
                            bookingId: latestBooking.bookingId,
                            trackingToken: latestBooking.trackingToken,
                            status: latestBooking.bookingStatus,
                        },
                    });
                }
                return res.status(400).json({ success: false, message: 'Booking state could not be confirmed.' });
            }
            // 7. Update assigned physical room status to RESERVED
            if (confirmedBooking.assignedRoomId) {
                await Room_1.Room.findByIdAndUpdate(confirmedBooking.assignedRoomId, { status: 'RESERVED' });
            }
            // 8. Downstream Async Email Notifications (Hotel & Guest)
            // Only the single atomic transition winner triggers email dispatch
            // Failure to send email will NOT roll back payment or corrupt confirmed booking state
            EmailService_1.EmailService.processBookingEmails(confirmedBooking._id.toString()).catch((emailErr) => {
                console.error(`[EmailService] Non-blocking dispatch error for booking ${confirmedBooking.bookingId}:`, emailErr.message || emailErr);
            });
            return res.json({
                success: true,
                message: 'Payment verified! Booking confirmed.',
                data: {
                    bookingId: booking.bookingId,
                    trackingToken: booking.trackingToken,
                    status: booking.bookingStatus,
                },
            });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message || 'Payment verification error.' });
        }
    }
    /**
     * GET /api/bookings/track/:token
     */
    static async trackBooking(req, res) {
        try {
            const { token } = req.params;
            const booking = await Booking_1.Booking.findOne({ trackingToken: token }).populate('roomTypeId assignedRoomId');
            if (!booking) {
                return res.status(404).json({ success: false, message: 'Booking not found.' });
            }
            return res.json({ success: true, data: booking });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Error fetching booking.' });
        }
    }
    /**
     * POST /api/bookings/cancel
     * Allows releasing a pending booking hold when payment is cancelled or dismissed by the user
     */
    static async cancelBooking(req, res) {
        try {
            const { bookingId, trackingToken } = req.body;
            if (!bookingId && !trackingToken) {
                return res.status(400).json({ success: false, message: 'Booking ID or tracking token required.' });
            }
            const query = {};
            if (bookingId)
                query.bookingId = bookingId;
            if (trackingToken)
                query.trackingToken = trackingToken;
            const booking = await Booking_1.Booking.findOne(query);
            if (!booking) {
                return res.status(404).json({ success: false, message: 'Booking not found.' });
            }
            // If booking was already paid, do not cancel via public endpoint
            if (booking.paymentStatus === 'PAID') {
                return res.status(400).json({ success: false, message: 'Paid bookings cannot be cancelled via this endpoint.' });
            }
            booking.bookingStatus = 'CANCELLED';
            booking.paymentStatus = 'FAILED';
            await booking.save();
            return res.json({ success: true, message: 'Booking hold cancelled successfully.' });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: error.message || 'Failed to cancel booking hold.' });
        }
    }
    /**
     * GET /api/menu
     */
    static async getMenu(req, res) {
        try {
            let categories = await MenuCategory_1.MenuCategory.find({ isActive: true }).sort({ sortOrder: 1 });
            let items = await MenuItem_1.MenuItem.find({ isAvailable: true }).sort({ sortOrder: 1 });
            if (items.length === 0) {
                await (0, seedDatabase_1.ensureDatabaseSeeded)();
                categories = await MenuCategory_1.MenuCategory.find({ isActive: true }).sort({ sortOrder: 1 });
                items = await MenuItem_1.MenuItem.find({ isAvailable: true }).sort({ sortOrder: 1 });
            }
            return res.json({ success: true, data: { categories, items } });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch menu.' });
        }
    }
    /**
     * GET /api/party-packages
     */
    static async getPartyPackages(req, res) {
        try {
            const packages = await MenuItem_1.MenuItem.find({ section: 'SAMBHRAMA', isAvailable: true });
            return res.json({ success: true, data: packages });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch party packages.' });
        }
    }
    /**
     * GET /api/attractions
     */
    static async getAttractions(req, res) {
        try {
            const attractions = await Attraction_1.Attraction.find({ isActive: true }).sort({ sortOrder: 1 });
            return res.json({ success: true, data: attractions });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch attractions.' });
        }
    }
    /**
     * GET /api/hotel-info
     */
    static async getHotelInfo(req, res) {
        try {
            const info = await HotelSetting_1.HotelSetting.findOne() || {
                hotelName: 'Hotel Raama',
                address: 'B.M. Road, Thanneeruhalla, Hassan',
                phone: '+91 78995 11330',
                email: 'hotelraama.hsn@gmail.com',
            };
            return res.json({ success: true, data: info });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch hotel info.' });
        }
    }
    static async downloadBookingInvoicePdf(req, res) {
        try {
            const { idOrToken } = req.params;
            const isObjectId = mongoose_1.default.isValidObjectId(idOrToken);
            const booking = await Booking_1.Booking.findOne({
                $or: [
                    { trackingToken: idOrToken },
                    { bookingId: idOrToken },
                    ...(isObjectId ? [{ _id: idOrToken }] : []),
                ],
            }).populate('roomTypeId');
            if (!booking)
                return res.status(404).send('Booking invoice not found');
            const roomTypeName = booking.roomTypeId?.name || 'Executive Room';
            const pdfBuffer = await InvoicePdfService_1.InvoicePdfService.generateBookingInvoicePdf(booking, roomTypeName);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Invoice-${booking.bookingId}.pdf`);
            return res.send(pdfBuffer);
        }
        catch (error) {
            console.error('Error generating booking PDF invoice:', error);
            return res.status(500).send('Failed to generate booking PDF invoice');
        }
    }
    /**
     * GET /api/billing/invoice/order/:idOrToken
     */
    static async downloadOrderInvoicePdf(req, res) {
        try {
            const { idOrToken } = req.params;
            const isObjectId = mongoose_1.default.isValidObjectId(idOrToken);
            const order = await Order_1.Order.findOne({
                $or: [
                    { trackingToken: idOrToken },
                    { orderId: idOrToken },
                    ...(isObjectId ? [{ _id: idOrToken }] : []),
                ],
            });
            if (!order)
                return res.status(404).send('Order receipt not found');
            const pdfBuffer = await InvoicePdfService_1.InvoicePdfService.generateOrderInvoicePdf(order);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=Receipt-${order.orderId}.pdf`);
            return res.send(pdfBuffer);
        }
        catch (error) {
            console.error('Error generating order PDF receipt:', error);
            return res.status(500).send('Failed to generate order PDF receipt');
        }
    }
    /**
     * POST /api/webhooks/razorpay
     * Reconciles payment events securely from Razorpay webhook notifications
     */
    static async handleRazorpayWebhook(req, res) {
        try {
            const signature = req.headers['x-razorpay-signature'];
            const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
            if (!signature) {
                console.warn('[Razorpay Webhook] Rejected webhook missing x-razorpay-signature header');
                return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header.' });
            }
            const isValidSignature = RazorpayService_1.RazorpayService.verifyWebhookSignature(rawBody, signature);
            if (!isValidSignature) {
                console.warn(`[Razorpay Webhook] Invalid webhook signature detected from IP: ${req.ip}`);
                return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
            }
            const event = req.body?.event;
            console.log(`[Razorpay Webhook] Validated event received: ${event}`);
            // Reconcile on payment.captured or order.paid
            if (event !== 'payment.captured' && event !== 'order.paid') {
                return res.status(200).json({
                    success: true,
                    message: `Webhook event '${event}' acknowledged. No reconciliation required.`,
                });
            }
            const paymentEntity = req.body?.payload?.payment?.entity;
            const orderEntity = req.body?.payload?.order?.entity;
            const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
            const razorpayPaymentId = paymentEntity?.id;
            const noteBookingId = paymentEntity?.notes?.bookingId || orderEntity?.notes?.bookingId;
            if (!razorpayOrderId && !noteBookingId) {
                console.warn('[Razorpay Webhook] Webhook payload missing order_id and notes.bookingId');
                return res.status(200).json({
                    success: true,
                    message: 'Payload missing order identifiers. Ignored.',
                });
            }
            // Match Razorpay order ID to the correct booking (or bookingId from notes)
            let booking = null;
            if (razorpayOrderId) {
                booking = await Booking_1.Booking.findOne({ razorpayOrderId });
            }
            if (!booking && noteBookingId) {
                booking = await Booking_1.Booking.findOne({ bookingId: noteBookingId });
            }
            if (!booking) {
                // Check if this payment belongs to a QR food order
                if (razorpayOrderId) {
                    const foodOrder = await Order_1.Order.findOne({ razorpayOrderId });
                    if (foodOrder) {
                        if (foodOrder.paymentStatus !== 'PAID') {
                            foodOrder.paymentStatus = 'PAID';
                            if (razorpayPaymentId)
                                foodOrder.razorpayPaymentId = razorpayPaymentId;
                            if (signature)
                                foodOrder.razorpaySignature = signature;
                            await foodOrder.save();
                            console.log(`[Razorpay Webhook] Successfully reconciled food order ${foodOrder.orderId}`);
                        }
                        return res.status(200).json({
                            success: true,
                            message: 'Food order successfully reconciled.',
                            data: { orderId: foodOrder.orderId, status: foodOrder.status },
                        });
                    }
                }
                console.warn(`[Razorpay Webhook] No matching booking or food order found for order=${razorpayOrderId}, noteId=${noteBookingId}`);
                return res.status(200).json({
                    success: true,
                    message: 'No matching booking or order found for reconciliation.',
                });
            }
            // 1. Idempotency Check: Already verified & confirmed bookings must not re-run transitions or duplicate emails
            if (booking.paymentStatus === 'PAID' && booking.bookingStatus === 'CONFIRMED') {
                console.log(`[Razorpay Webhook] Booking ${booking.bookingId} is already PAID & CONFIRMED. Webhook acknowledged idempotently.`);
                return res.status(200).json({
                    success: true,
                    message: 'Booking already confirmed.',
                    data: { bookingId: booking.bookingId, status: booking.bookingStatus },
                });
            }
            // 2. Pre-confirmation State Validation: Only transition valid PENDING bookings
            if (booking.bookingStatus !== 'PENDING') {
                console.warn(`[Razorpay Webhook] Booking ${booking.bookingId} status is '${booking.bookingStatus}' (not PENDING). Skipping.`);
                return res.status(200).json({
                    success: true,
                    message: `Booking is in state '${booking.bookingStatus}'. Reconciliation skipped.`,
                });
            }
            // 3. Atomic Transition to CONFIRMED & PAID
            const confirmedBooking = await Booking_1.Booking.findOneAndUpdate({
                _id: booking._id,
                bookingStatus: 'PENDING',
                paymentStatus: { $ne: 'PAID' },
            }, {
                $set: {
                    paymentStatus: 'PAID',
                    bookingStatus: 'CONFIRMED',
                    ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
                    ...(signature ? { razorpaySignature: signature } : {}),
                },
                $unset: {
                    expiresAt: 1,
                },
            }, { new: true });
            if (!confirmedBooking) {
                console.log(`[Razorpay Webhook] Concurrent confirmation won by another handler for booking ${booking.bookingId}`);
                return res.status(200).json({
                    success: true,
                    message: 'Booking already confirmed concurrently.',
                });
            }
            // 4. Update assigned physical room status to RESERVED
            if (confirmedBooking.assignedRoomId) {
                await Room_1.Room.findByIdAndUpdate(confirmedBooking.assignedRoomId, { status: 'RESERVED' });
            }
            // 5. Downstream Async Email Notifications (Hotel & Guest)
            // Only the single atomic transition winner triggers email dispatch
            EmailService_1.EmailService.processBookingEmails(confirmedBooking._id.toString()).catch((emailErr) => {
                console.error(`[Razorpay Webhook] Non-blocking dispatch error for booking ${confirmedBooking.bookingId}:`, emailErr.message || emailErr);
            });
            console.log(`[Razorpay Webhook] Successfully reconciled and confirmed booking ${confirmedBooking.bookingId}`);
            return res.status(200).json({
                success: true,
                message: 'Booking successfully reconciled and confirmed.',
                data: {
                    bookingId: confirmedBooking.bookingId,
                    trackingToken: confirmedBooking.trackingToken,
                    status: confirmedBooking.bookingStatus,
                },
            });
        }
        catch (error) {
            console.error('[Razorpay Webhook] Internal server error handling webhook:', error);
            return res.status(500).json({ success: false, message: 'Internal error processing webhook' });
        }
    }
    /**
     * GET /api/feedback/:token
     * Validates secure feedback token and returns minimal public stay metadata for the feedback form.
     * No customer login required.
     */
    static async validateFeedbackToken(req, res) {
        try {
            const { token } = req.params;
            if (!token || typeof token !== 'string' || token.trim().length < 16) {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_TOKEN',
                    message: 'This feedback link is invalid.',
                });
            }
            const cleanToken = token.trim();
            const booking = await Booking_1.Booking.findOne({ feedbackToken: cleanToken }).populate('roomTypeId');
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    code: 'INVALID_TOKEN',
                    message: 'This feedback link is invalid.',
                });
            }
            // 1. Check if feedback was already submitted
            if (booking.feedbackSubmitted) {
                return res.status(400).json({
                    success: false,
                    code: 'ALREADY_SUBMITTED',
                    message: 'Feedback has already been submitted for this stay. Thank you for sharing your experience.',
                });
            }
            // 2. Check if feedback link has expired
            if (booking.feedbackTokenExpiry && booking.feedbackTokenExpiry < new Date()) {
                return res.status(400).json({
                    success: false,
                    code: 'EXPIRED',
                    message: 'This feedback link has expired.',
                });
            }
            const roomTypeName = booking.roomTypeId && typeof booking.roomTypeId === 'object' && booking.roomTypeId.name
                ? booking.roomTypeId.name
                : 'Hotel Raama';
            // Return safe, non-sensitive booking summary strictly needed for the feedback UI
            return res.json({
                success: true,
                data: {
                    guestName: booking.guestName,
                    bookingId: booking.bookingId,
                    roomTypeName,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                },
            });
        }
        catch (error) {
            console.error('[PublicController] Error validating feedback token:', error);
            return res.status(500).json({
                success: false,
                code: 'SERVER_ERROR',
                message: 'Unable to validate feedback link. Please try again later.',
            });
        }
    }
    /**
     * POST /api/feedback/:token
     * Validates feedback payload and securely saves private customer feedback.
     * Idempotent & protected against duplicate submissions.
     * Dispatches admin notification email in the background without blocking or failing feedback save.
     */
    static async submitFeedback(req, res) {
        try {
            const { token } = req.params;
            if (!token || typeof token !== 'string' || token.trim().length < 16) {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_TOKEN',
                    message: 'This feedback link is invalid.',
                });
            }
            const cleanToken = token.trim();
            const { overallRating, roomRating, foodRating, cleanlinessRating, serviceRating, recommendation, comment, } = req.body;
            // 1. Validate Ratings (1 to 5 stars required)
            const parseRating = (val) => {
                const num = parseInt(val, 10);
                return !isNaN(num) && num >= 1 && num <= 5 ? num : null;
            };
            const oR = parseRating(overallRating);
            const rR = parseRating(roomRating);
            const fR = parseRating(foodRating);
            const cR = parseRating(cleanlinessRating);
            const sR = parseRating(serviceRating);
            if (!oR || !rR || !fR || !cR || !sR) {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_RATINGS',
                    message: 'Please provide valid 1 to 5 star ratings for Overall, Room, Food, Cleanliness, and Service.',
                });
            }
            // 2. Validate Recommendation
            let wouldRecommend;
            if (typeof recommendation === 'boolean') {
                wouldRecommend = recommendation;
            }
            else if (typeof recommendation === 'string') {
                const lower = recommendation.trim().toLowerCase();
                if (lower === 'yes' || lower === 'true')
                    wouldRecommend = true;
                else if (lower === 'no' || lower === 'false')
                    wouldRecommend = false;
                else {
                    return res.status(400).json({
                        success: false,
                        code: 'INVALID_RECOMMENDATION',
                        message: 'Please indicate whether you would recommend Hotel Raama.',
                    });
                }
            }
            else {
                return res.status(400).json({
                    success: false,
                    code: 'INVALID_RECOMMENDATION',
                    message: 'Please indicate whether you would recommend Hotel Raama.',
                });
            }
            // 3. Find booking & verify token validity
            const booking = await Booking_1.Booking.findOne({ feedbackToken: cleanToken });
            if (!booking) {
                return res.status(404).json({
                    success: false,
                    code: 'INVALID_TOKEN',
                    message: 'This feedback link is invalid.',
                });
            }
            if (booking.feedbackSubmitted) {
                return res.status(400).json({
                    success: false,
                    code: 'ALREADY_SUBMITTED',
                    message: 'Feedback has already been submitted for this stay. Thank you for sharing your experience.',
                });
            }
            if (booking.feedbackTokenExpiry && booking.feedbackTokenExpiry < new Date()) {
                return res.status(400).json({
                    success: false,
                    code: 'EXPIRED',
                    message: 'This feedback link has expired.',
                });
            }
            // 4. Atomic check-and-set: Lock booking so duplicate submissions cannot race
            const updatedBooking = await Booking_1.Booking.findOneAndUpdate({
                _id: booking._id,
                feedbackSubmitted: { $ne: true },
            }, {
                $set: {
                    feedbackSubmitted: true,
                    feedbackSubmittedAt: new Date(),
                    feedbackStatus: 'RECEIVED',
                },
            }, { new: true });
            if (!updatedBooking) {
                return res.status(400).json({
                    success: false,
                    code: 'ALREADY_SUBMITTED',
                    message: 'Feedback has already been submitted for this stay. Thank you for sharing your experience.',
                });
            }
            // 5. Save Feedback record in database
            const sanitizedComment = typeof comment === 'string' ? comment.trim().slice(0, 2000) : '';
            const feedback = await Feedback_1.Feedback.create({
                bookingObjectId: updatedBooking._id,
                bookingId: updatedBooking.bookingId,
                customerName: updatedBooking.guestName,
                customerEmail: updatedBooking.guestEmail,
                overallRating: oR,
                roomRating: rR,
                foodRating: fR,
                cleanlinessRating: cR,
                serviceRating: sR,
                recommendation: wouldRecommend,
                comment: sanitizedComment,
                submittedAt: new Date(),
                status: 'new',
                emailNotificationSent: false,
            });
            // 6. Asynchronously attempt Admin Email Notification (non-blocking, failure resilient)
            EmailService_1.EmailService.sendAdminFeedbackNotification(feedback, updatedBooking)
                .then(async (result) => {
                if (result.success) {
                    await Feedback_1.Feedback.findByIdAndUpdate(feedback._id, {
                        $set: {
                            emailNotificationSent: true,
                            emailNotificationSentAt: new Date(),
                        },
                        $unset: { emailNotificationError: 1 },
                    });
                }
                else {
                    await Feedback_1.Feedback.findByIdAndUpdate(feedback._id, {
                        $set: {
                            emailNotificationSent: false,
                            emailNotificationError: result.error?.slice(0, 500),
                        },
                    });
                }
            })
                .catch((err) => {
                console.error('[PublicController] Non-blocking admin notification dispatch error:', err.message || err);
            });
            return res.status(200).json({
                success: true,
                message: 'Thank you for your feedback! Your response has been received successfully. We appreciate you taking the time to share your experience with Hotel Raama.',
            });
        }
        catch (error) {
            console.error('[PublicController] Failed to process feedback submission:', error);
            // Handle duplicate key error gracefully
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    code: 'ALREADY_SUBMITTED',
                    message: 'Feedback has already been submitted for this stay. Thank you for sharing your experience.',
                });
            }
            return res.status(500).json({
                success: false,
                code: 'SERVER_ERROR',
                message: 'An error occurred while saving your feedback. Please try again.',
            });
        }
    }
    /**
     * POST /api/coupons/validate
     * Authoritative backend validation of coupon code, GSTIN requirement, and calculated discount.
     */
    static async validateCoupon(req, res) {
        try {
            const { couponCode, gstin, roomTypeId, checkIn, checkOut, numGuests, mealSelection, planType, extraPerson } = req.body;
            if (!couponCode || typeof couponCode !== 'string' || couponCode.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a coupon code.',
                    data: { valid: false },
                });
            }
            const rawCode = couponCode.trim();
            // Check for attempted coupon stacking
            if (rawCode.includes(',') || rawCode.includes('+') || rawCode.includes('&') || /\s+/.test(rawCode)) {
                return res.status(400).json({
                    success: false,
                    message: 'Only one coupon can be applied per booking.',
                    data: { valid: false },
                });
            }
            const cleanCode = rawCode.toUpperCase();
            // The ONLY permitted active coupons are WELCOME10 and WELCOME15
            if (!(cleanCode in PricingEngine_1.OFFICIAL_COUPONS)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid coupon code.',
                    data: { valid: false },
                });
            }
            // GSTIN is strictly required for promotional coupons
            if (!gstin || typeof gstin !== 'string' || gstin.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'GSTIN is required to apply this coupon.',
                    data: { valid: false, gstinValid: false },
                });
            }
            const gstinResult = (0, gstinValidator_1.validateGSTIN)(gstin);
            if (!gstinResult.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid GSTIN.',
                    data: { valid: false, gstinValid: false, code: gstinResult.code },
                });
            }
            const discountPercentage = PricingEngine_1.OFFICIAL_COUPONS[cleanCode];
            let pricingSummary = null;
            let discountAmount = 0;
            if (roomTypeId && checkIn && checkOut) {
                const resolvedRoomTypeId = await PublicController.resolveRoomTypeId(roomTypeId);
                if (resolvedRoomTypeId) {
                    const pricing = await PricingEngine_1.PricingEngine.calculateBookingPrice(resolvedRoomTypeId, new Date(checkIn), new Date(checkOut), numGuests || 1, mealSelection, cleanCode, planType || 'NON_CP', !!extraPerson, gstinResult.normalizedGstin);
                    pricingSummary = pricing;
                    discountAmount = pricing.discountAmount;
                }
            }
            return res.json({
                success: true,
                message: `Coupon ${cleanCode} applied! ${discountPercentage}% discount added.`,
                data: {
                    valid: true,
                    couponCode: cleanCode,
                    discountPercentage,
                    discountAmount,
                    gstinValid: true,
                    gstin: gstinResult.normalizedGstin,
                    message: `Coupon ${cleanCode} applied! ${discountPercentage}% discount added.`,
                    pricing: pricingSummary,
                },
            });
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Unable to apply coupon. Please try again.',
            });
        }
    }
}
exports.PublicController = PublicController;
