import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { RoomType } from '../models/RoomType';
import { Room } from '../models/Room';
import { Booking } from '../models/Booking';
import { Order } from '../models/Order';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';
import { Attraction } from '../models/Attraction';
import { HotelSetting } from '../models/HotelSetting';
import { AvailabilityEngine } from '../services/AvailabilityEngine';
import { PricingEngine } from '../services/PricingEngine';
import { RazorpayService } from '../services/RazorpayService';
import { InvoicePdfService } from '../services/InvoicePdfService';
import { EmailService } from '../services/EmailService';
import { ensureDatabaseSeeded } from '../seed/seedDatabase';
import { validateAadhar } from '../utils/aadharValidator';

export class PublicController {
  private static async resolveRoomTypeId(roomTypeId: any): Promise<string | null> {
    if (!roomTypeId) return null;
    if (typeof roomTypeId === 'string' && mongoose.Types.ObjectId.isValid(roomTypeId) && roomTypeId.length === 24) {
      const foundById = await RoomType.findById(roomTypeId);
      if (foundById) return foundById._id.toString();
    }
    const MOCK_MAP: Record<string, string> = {
      rt_1: 'PREM_SGL_NONAC',
      rt_2: 'PREM_DBL_NONAC',
      rt_3: 'EXEC_SGL_AC',
      rt_4: 'EXEC_DBL_AC',
      rt_5: 'TRIPLE_PREM',
      rt_6: 'TRIPLE_EXEC',
      rt_7: 'SUITE_ROOM',
    };
    const searchCode = typeof roomTypeId === 'string' ? (MOCK_MAP[roomTypeId] || roomTypeId) : '';
    const found = await RoomType.findOne({ code: searchCode });
    return found ? found._id.toString() : null;
  }

  /**
   * GET /api/rooms
   */
  static async getRoomTypes(req: Request, res: Response) {
    try {
      let roomTypes = await RoomType.find({ isActive: true });
      if (roomTypes.length === 0) {
        await ensureDatabaseSeeded();
        roomTypes = await RoomType.find({ isActive: true });
      }
      return res.json({ success: true, data: roomTypes });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
    }
  }

  /**
   * POST /api/availability/check
   */
  static async checkAvailabilityAndPrice(req: Request, res: Response) {
    try {
      const { roomTypeId, checkIn, checkOut, numGuests, mealSelection, couponCode, planType, extraPerson } = req.body;

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
      const availability = await AvailabilityEngine.checkAvailability(resolvedRoomTypeId, checkInDate, checkOutDate);
      
      // Calculate server pricing
      const pricing = await PricingEngine.calculateBookingPrice(
        resolvedRoomTypeId,
        checkInDate,
        checkOutDate,
        numGuests || 1,
        mealSelection,
        couponCode,
        planType || 'NON_CP',
        !!extraPerson
      );

      return res.json({
        success: true,
        data: {
          availability,
          pricing,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Error checking availability.' });
    }
  }

  /**
   * POST /api/bookings
   */
  static async createBooking(req: Request, res: Response) {
    try {
      const {
        guestName,
        guestEmail,
        guestPhone,
        guestAadhar,
        roomTypeId,
        checkIn,
        checkOut,
        numGuests,
        mealSelection,
        couponCode,
        specialRequests,
        planType,
        extraPerson,
      } = req.body;

      if (!guestName || !guestEmail || !guestPhone || !roomTypeId || !checkIn || !checkOut) {
        return res.status(400).json({ success: false, message: 'Missing required booking fields.' });
      }

      if (guestAadhar) {
        const aadharCheck = validateAadhar(guestAadhar);
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
      const availability = await AvailabilityEngine.checkAvailability(resolvedRoomTypeId, checkInDate, checkOutDate);
      if (!availability.isAvailable) {
        return res.status(400).json({ success: false, message: 'Selected room type is fully booked for these dates.' });
      }

      // 2. Strict Server-side Price Engine Calculation
      const pricing = await PricingEngine.calculateBookingPrice(
        resolvedRoomTypeId,
        checkInDate,
        checkOutDate,
        numGuests || 1,
        mealSelection,
        couponCode,
        planType || 'NON_CP',
        !!extraPerson
      );

      // Generate IDs
      const bookingId = `HR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const trackingToken = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes hold

      // 3. Create Razorpay Payment Order
      const razorpayOrder = await RazorpayService.createOrder(pricing.totalAmount, bookingId);

      // 4. Create PENDING Booking Record
      const booking = await Booking.create({
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
        discountAmountSnapshot: pricing.discountAmount,
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
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to create booking.' });
    }
  }

  /**
   * POST /api/bookings/verify-payment
   */
  static async verifyPayment(req: Request, res: Response) {
    try {
      const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
      }

      const booking = await Booking.findOne({ bookingId });
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
      const isValid = RazorpayService.verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        booking.paymentStatus = 'FAILED';
        booking.bookingStatus = 'CANCELLED';
        await booking.save();
        return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
      }

      // 6. Atomic Transition to CONFIRMED & PAID
      // Only one concurrent request can match { bookingStatus: 'PENDING', paymentStatus: { $ne: 'PAID' } }
      const confirmedBooking = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          bookingStatus: 'PENDING',
          paymentStatus: { $ne: 'PAID' },
        },
        {
          $set: {
            paymentStatus: 'PAID',
            bookingStatus: 'CONFIRMED',
            razorpayPaymentId,
            razorpaySignature,
          },
          $unset: {
            expiresAt: 1,
          },
        },
        { new: true }
      );

      // If another concurrent request already updated this booking, fetch current state and return idempotently
      if (!confirmedBooking) {
        const latestBooking = await Booking.findOne({ bookingId });
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
        await Room.findByIdAndUpdate(confirmedBooking.assignedRoomId, { status: 'RESERVED' });
      }

      // 8. Downstream Async Email Notifications (Hotel & Guest)
      // Only the single atomic transition winner triggers email dispatch
      // Failure to send email will NOT roll back payment or corrupt confirmed booking state
      EmailService.processBookingEmails(confirmedBooking._id.toString()).catch((emailErr) => {
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
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Payment verification error.' });
    }
  }

  /**
   * GET /api/bookings/track/:token
   */
  static async trackBooking(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const booking = await Booking.findOne({ trackingToken: token }).populate('roomTypeId assignedRoomId');
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }
      return res.json({ success: true, data: booking });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error fetching booking.' });
    }
  }

  /**
   * POST /api/bookings/cancel
   * Allows releasing a pending booking hold when payment is cancelled or dismissed by the user
   */
  static async cancelBooking(req: Request, res: Response) {
    try {
      const { bookingId, trackingToken } = req.body;
      if (!bookingId && !trackingToken) {
        return res.status(400).json({ success: false, message: 'Booking ID or tracking token required.' });
      }

      const query: any = {};
      if (bookingId) query.bookingId = bookingId;
      if (trackingToken) query.trackingToken = trackingToken;

      const booking = await Booking.findOne(query);
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
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to cancel booking hold.' });
    }
  }


  /**
   * GET /api/menu
   */
  static async getMenu(req: Request, res: Response) {
    try {
      let categories = await MenuCategory.find({ isActive: true }).sort({ sortOrder: 1 });
      let items = await MenuItem.find({ isAvailable: true }).sort({ sortOrder: 1 });

      if (items.length === 0) {
        await ensureDatabaseSeeded();
        categories = await MenuCategory.find({ isActive: true }).sort({ sortOrder: 1 });
        items = await MenuItem.find({ isAvailable: true }).sort({ sortOrder: 1 });
      }

      return res.json({ success: true, data: { categories, items } });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch menu.' });
    }
  }

  /**
   * GET /api/party-packages
   */
  static async getPartyPackages(req: Request, res: Response) {
    try {
      const packages = await MenuItem.find({ section: 'SAMBHRAMA', isAvailable: true });
      return res.json({ success: true, data: packages });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch party packages.' });
    }
  }

  /**
   * GET /api/attractions
   */
  static async getAttractions(req: Request, res: Response) {
    try {
      const attractions = await Attraction.find({ isActive: true }).sort({ sortOrder: 1 });
      return res.json({ success: true, data: attractions });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch attractions.' });
    }
  }

  /**
   * GET /api/hotel-info
   */
  static async getHotelInfo(req: Request, res: Response) {
    try {
      const info = await HotelSetting.findOne() || {
        hotelName: 'Hotel Raama',
        address: 'B.M. Road, Thanneeruhalla, Hassan',
        phone: '+91 78995 11330',
        email: 'hotelraama.hsn@gmail.com',
      };
      return res.json({ success: true, data: info });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch hotel info.' });
    }
  }
  static async downloadBookingInvoicePdf(req: Request, res: Response) {
    try {
      const { idOrToken } = req.params;
      const isObjectId = mongoose.isValidObjectId(idOrToken);
      const booking = await Booking.findOne({
        $or: [
          { trackingToken: idOrToken },
          { bookingId: idOrToken },
          ...(isObjectId ? [{ _id: idOrToken }] : []),
        ],
      }).populate('roomTypeId');

      if (!booking) return res.status(404).send('Booking invoice not found');

      const roomTypeName = (booking.roomTypeId as any)?.name || 'Executive Room';
      const pdfBuffer = await InvoicePdfService.generateBookingInvoicePdf(booking, roomTypeName);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=Invoice-${booking.bookingId}.pdf`);
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating booking PDF invoice:', error);
      return res.status(500).send('Failed to generate booking PDF invoice');
    }
  }

  /**
   * GET /api/billing/invoice/order/:idOrToken
   */
  static async downloadOrderInvoicePdf(req: Request, res: Response) {
    try {
      const { idOrToken } = req.params;
      const isObjectId = mongoose.isValidObjectId(idOrToken);
      const order = await Order.findOne({
        $or: [
          { trackingToken: idOrToken },
          { orderId: idOrToken },
          ...(isObjectId ? [{ _id: idOrToken }] : []),
        ],
      });

      if (!order) return res.status(404).send('Order receipt not found');

      const pdfBuffer = await InvoicePdfService.generateOrderInvoicePdf(order);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=Receipt-${order.orderId}.pdf`);
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating order PDF receipt:', error);
      return res.status(500).send('Failed to generate order PDF receipt');
    }
  }

  /**
   * POST /api/webhooks/razorpay
   * Reconciles payment events securely from Razorpay webhook notifications
   */
  static async handleRazorpayWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));

      if (!signature) {
        console.warn('[Razorpay Webhook] Rejected webhook missing x-razorpay-signature header');
        return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header.' });
      }

      const isValidSignature = RazorpayService.verifyWebhookSignature(rawBody, signature);
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
        booking = await Booking.findOne({ razorpayOrderId });
      }
      if (!booking && noteBookingId) {
        booking = await Booking.findOne({ bookingId: noteBookingId });
      }

      if (!booking) {
        console.warn(`[Razorpay Webhook] No matching booking found for order=${razorpayOrderId}, noteId=${noteBookingId}`);
        return res.status(200).json({
          success: true,
          message: 'No matching booking found for reconciliation.',
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
      const confirmedBooking = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          bookingStatus: 'PENDING',
          paymentStatus: { $ne: 'PAID' },
        },
        {
          $set: {
            paymentStatus: 'PAID',
            bookingStatus: 'CONFIRMED',
            ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
            ...(signature ? { razorpaySignature: signature } : {}),
          },
          $unset: {
            expiresAt: 1,
          },
        },
        { new: true }
      );

      if (!confirmedBooking) {
        console.log(`[Razorpay Webhook] Concurrent confirmation won by another handler for booking ${booking.bookingId}`);
        return res.status(200).json({
          success: true,
          message: 'Booking already confirmed concurrently.',
        });
      }

      // 4. Update assigned physical room status to RESERVED
      if (confirmedBooking.assignedRoomId) {
        await Room.findByIdAndUpdate(confirmedBooking.assignedRoomId, { status: 'RESERVED' });
      }

      // 5. Downstream Async Email Notifications (Hotel & Guest)
      // Only the single atomic transition winner triggers email dispatch
      EmailService.processBookingEmails(confirmedBooking._id.toString()).catch((emailErr) => {
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
    } catch (error: any) {
      console.error('[Razorpay Webhook] Internal server error handling webhook:', error);
      return res.status(500).json({ success: false, message: 'Internal error processing webhook' });
    }
  }
}
