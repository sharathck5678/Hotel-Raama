import { Request, Response } from 'express';
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

export class PublicController {
  /**
   * GET /api/rooms
   */
  static async getRoomTypes(req: Request, res: Response) {
    try {
      const roomTypes = await RoomType.find({ isActive: true });
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

      // Check availability
      const availability = await AvailabilityEngine.checkAvailability(roomTypeId, checkInDate, checkOutDate);
      
      // Calculate server pricing
      const pricing = await PricingEngine.calculateBookingPrice(
        roomTypeId,
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

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      // 1. Transactional Availability Check
      const availability = await AvailabilityEngine.checkAvailability(roomTypeId, checkInDate, checkOutDate);
      if (!availability.isAvailable) {
        return res.status(400).json({ success: false, message: 'Selected room type is fully booked for these dates.' });
      }

      // 2. Strict Server-side Price Engine Calculation
      const pricing = await PricingEngine.calculateBookingPrice(
        roomTypeId,
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
        roomTypeId,
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
          razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key_id',
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

      if (!bookingId || !razorpayOrderId || !razorpayPaymentId) {
        return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
      }

      const booking = await Booking.findOne({ bookingId });
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      // Verify Razorpay signature
      const isValid = RazorpayService.verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature || 'mock_sig'
      );

      if (!isValid) {
        booking.paymentStatus = 'FAILED';
        booking.bookingStatus = 'CANCELLED';
        await booking.save();
        return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
      }

      // Transition to CONFIRMED
      booking.paymentStatus = 'PAID';
      booking.bookingStatus = 'CONFIRMED';
      booking.razorpayPaymentId = razorpayPaymentId;
      booking.razorpaySignature = razorpaySignature;
      booking.expiresAt = undefined;
      await booking.save();

      // If room is assigned, update room status to RESERVED
      if (booking.assignedRoomId) {
        await Room.findByIdAndUpdate(booking.assignedRoomId, { status: 'RESERVED' });
      }

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
   * GET /api/menu
   */
  static async getMenu(req: Request, res: Response) {
    try {
      const categories = await MenuCategory.find({ isActive: true }).sort({ sortOrder: 1 });
      const items = await MenuItem.find({ isAvailable: true }).sort({ sortOrder: 1 });
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
        phone: '081722 57001',
        email: 'reservations@hotelraama.com',
      };
      return res.json({ success: true, data: info });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch hotel info.' });
    }
  }
  static async downloadBookingInvoicePdf(req: Request, res: Response) {
    try {
      const { idOrToken } = req.params;
      let booking = await Booking.findOne({ trackingToken: idOrToken }).populate('roomTypeId');
      if (!booking) {
        booking = await Booking.findById(idOrToken).populate('roomTypeId');
      }
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
      let order = await Order.findOne({ trackingToken: idOrToken });
      if (!order) {
        order = await Order.findById(idOrToken);
      }
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
}
