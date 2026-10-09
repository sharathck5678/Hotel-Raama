import { Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/authMiddleware';
import { Admin } from '../models/Admin';
import { Booking } from '../models/Booking';
import { Order } from '../models/Order';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { MenuItem } from '../models/MenuItem';
import { MenuCategory } from '../models/MenuCategory';
import { Coupon } from '../models/Coupon';
import { MealPlan } from '../models/MealPlan';
import { AuditLog } from '../models/AuditLog';
import { HotelSetting } from '../models/HotelSetting';
import { Feedback } from '../models/Feedback';
import { DailyRate } from '../models/DailyRate';
import { DailyInventory } from '../models/DailyInventory';
import { RatePlan } from '../models/RatePlan';
import { RatePlanService } from '../services/RatePlanService';
import crypto from 'crypto';
import { EmailService } from '../services/EmailService';
import { SocketService } from '../services/SocketService';
import { InvoicePdfService } from '../services/InvoicePdfService';
import { AvailabilityEngine } from '../services/AvailabilityEngine';
import { MealPricingService } from '../services/MealPricingService';
import { ensureDatabaseSeeded, runSeedLogic, OFFICIAL_ROOMS_SPEC } from '../seed/seedDatabase';

const JWT_SECRET = process.env.JWT_SECRET || 'raama_super_secret_jwt_key_2026_production';

export class AdminController {
  /**
   * POST /api/admin/login
   */
  static async login(req: AuthRequest, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const inputEmail = email.toLowerCase().trim();
      const envEmail = (process.env.ADMIN_EMAIL || 'admin@hotelraama.com').toLowerCase().trim();
      const envPass = process.env.ADMIN_PASSWORD || 'AdminRaama@2026';

      let admin = await Admin.findOne({ email: inputEmail });

      // Check if credentials match env credentials
      const isEnvMatch = (inputEmail === envEmail && password === envPass);

      if (isEnvMatch) {
        if (!admin) {
          const passwordHash = await bcrypt.hash(envPass, 10);
          admin = await Admin.create({
            email: envEmail,
            passwordHash,
            name: 'Hotel Raama Admin',
            role: 'ADMIN',
          });
        }
      } else {
        if (!admin) {
          return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
      }

      admin.lastLogin = new Date();
      await admin.save();

      const token = jwt.sign(
        { id: admin._id, email: admin.email, role: admin.role },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      // Set HTTP-only Cookie
      res.cookie('jwt_admin', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 12 * 60 * 60 * 1000, // 12 hours
      });

      // Audit Log
      await AuditLog.create({
        adminId: admin._id,
        adminEmail: admin.email,
        action: 'ADMIN_LOGIN',
        entity: 'Admin',
        entityId: admin._id.toString(),
        details: { ip: req.ip },
      });

      return res.json({
        success: true,
        message: 'Login successful.',
        data: {
          token,
          admin: {
            id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
          },
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
  }

  /**
   * POST /api/admin/logout
   */
  static async logout(req: AuthRequest, res: Response) {
    res.clearCookie('jwt_admin');
    return res.json({ success: true, message: 'Logged out successfully.' });
  }

  /**
   * GET /api/admin/me
   */
  static async getMe(req: AuthRequest, res: Response) {
    return res.json({ success: true, data: req.admin });
  }

  /**
   * GET /api/admin/dashboard
   */
  static async getDashboardMetrics(req: AuthRequest, res: Response) {
    try {
      const totalRooms = await Room.countDocuments({ isActive: true, isVenue: { $ne: true } });
      const occupiedRooms = await Room.countDocuments({ status: 'OCCUPIED', isActive: true, isVenue: { $ne: true } });
      const reservedRooms = await Room.countDocuments({ status: 'RESERVED', isActive: true, isVenue: { $ne: true } });
      
      const occupancyRate = totalRooms > 0 ? Math.round(((occupiedRooms + reservedRooms) / totalRooms) * 100) : 0;

      const pendingOrdersCount = await Order.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } });
      const totalConfirmedBookings = await Booking.countDocuments({ bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } });

      // Calculate Real Revenue from Database
      const paidBookings = await Booking.find({ paymentStatus: 'PAID' }).select('totalAmount createdAt').lean();
      const totalBookingRevenue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

      const allOrders = await Order.find().select('totalAmount createdAt items').lean();
      const totalOrderRevenue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalCombinedRevenue = totalBookingRevenue + totalOrderRevenue;

      // Group Real Transactions by Month
      const monthlyRevenueMap: Record<string, number> = {};

      paidBookings.forEach((b) => {
        const monthKey = new Date(b.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + (b.totalAmount || 0);
      });

      allOrders.forEach((o) => {
        const monthKey = new Date(o.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + (o.totalAmount || 0);
      });

      const revenueChart = Object.keys(monthlyRevenueMap).map((month) => ({
        month,
        revenue: monthlyRevenueMap[month],
      }));

      // Aggregate Category Sales from Real Orders
      let vegRev = 0;
      let nonVegRev = 0;
      let drinksRev = 0;

      const itemSalesMap: Record<string, { name: string; category: string; ordersCount: number; revenue: number }> = {};

      allOrders.forEach((order) => {
        if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const qty = item.quantity || 1;
            const itemPrice = item.price || 0;
            const lineTotal = itemPrice * qty;

            const name = item.name || 'Menu Item';
            if (!itemSalesMap[name]) {
              itemSalesMap[name] = { name, category: 'Dining', ordersCount: 0, revenue: 0 };
            }
            itemSalesMap[name].ordersCount += qty;
            itemSalesMap[name].revenue += lineTotal;

            // Simple heuristic for category breakdown
            const lowerName = name.toLowerCase();
            if (lowerName.includes('veg') || lowerName.includes('paneer') || lowerName.includes('idli') || lowerName.includes('dosa') || lowerName.includes('roti') || lowerName.includes('naan')) {
              vegRev += lineTotal;
            } else if (lowerName.includes('chicken') || lowerName.includes('mutton') || lowerName.includes('fish') || lowerName.includes('biryani') || lowerName.includes('egg')) {
              nonVegRev += lineTotal;
            } else {
              drinksRev += lineTotal;
            }
          });
        }
      });

      const categoryBreakdown = [
        { name: 'Swaad Pure Veg', value: vegRev, color: '#FFDE74' },
        { name: 'Swaad Non-Veg', value: nonVegRev, color: '#F59E0B' },
        { name: 'Liquid Lounge (LLB)', value: drinksRev, color: '#3B82F6' },
        { name: 'Room Stays & Suites', value: totalBookingRevenue, color: '#10B981' },
      ].filter((cat) => cat.value > 0);

      const topSellingItems = Object.values(itemSalesMap)
        .sort((a, b) => b.ordersCount - a.ordersCount)
        .slice(0, 5);

      return res.json({
        success: true,
        data: {
          totalRooms,
          occupiedRooms,
          reservedRooms,
          availableRooms: Math.max(0, totalRooms - occupiedRooms - reservedRooms),
          occupancyRate,
          pendingOrdersCount,
          totalConfirmedBookings,
          totalBookingRevenue,
          totalOrderRevenue,
          totalCombinedRevenue,
          revenueChart,
          categoryBreakdown,
          topSellingItems,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics.' });
    }
  }

  /**
   * GET /api/admin/bookings
   * Only return bookings where payment has been successfully completed (PAID).
   * Unpaid pending holds and cancelled payment attempts are excluded from admin portal.
   */
  static async getBookings(req: AuthRequest, res: Response) {
    try {
      const { paymentStatus, bookingStatus } = req.query;
      const filter: any = {
        paymentStatus: 'PAID',
      };

      if (paymentStatus && typeof paymentStatus === 'string') {
        filter.paymentStatus = paymentStatus;
      }
      if (bookingStatus && typeof bookingStatus === 'string') {
        filter.bookingStatus = bookingStatus;
      }

      const bookings = await Booking.find(filter).populate('roomTypeId assignedRoomId').sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: bookings });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
    }
  }

  /**
   * PATCH /api/admin/bookings/:id/status
   */
  static async updateBookingStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { bookingStatus, paymentStatus, assignedRoomId } = req.body;

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      if (bookingStatus) booking.bookingStatus = bookingStatus;
      if (paymentStatus) booking.paymentStatus = paymentStatus;
      if (assignedRoomId) booking.assignedRoomId = assignedRoomId;

      await booking.save();

      // Sync Room status if assigned
      if (booking.assignedRoomId) {
        if (booking.bookingStatus === 'CHECKED_IN') {
          await Room.findByIdAndUpdate(booking.assignedRoomId, { status: 'OCCUPIED' });
        } else if (booking.bookingStatus === 'CHECKED_OUT') {
          await Room.findByIdAndUpdate(booking.assignedRoomId, { status: 'CLEANING' });
        } else if (booking.bookingStatus === 'CANCELLED') {
          await Room.findByIdAndUpdate(booking.assignedRoomId, { status: 'AVAILABLE' });
        }
      }

      // Automatically dispatch private feedback request email upon guest checkout
      if (booking.bookingStatus === 'CHECKED_OUT' && booking.paymentStatus === 'PAID' && !booking.feedbackRequestSent) {
        EmailService.dispatchCustomerFeedbackRequest(booking._id.toString()).catch((err) => {
          console.warn('[AdminController] Background feedback dispatch notice:', err.message || err);
        });
      }

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'UPDATE_BOOKING_STATUS',
        entity: 'Booking',
        entityId: booking._id.toString(),
        details: { bookingId: booking.bookingId, bookingStatus, paymentStatus },
      });

      return res.json({ success: true, data: booking });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update booking status.' });
    }
  }

  /**
   * GET /api/admin/orders
   */
  static async getOrders(req: AuthRequest, res: Response) {
    try {
      const orders = await Order.find().sort({ createdAt: -1 }).lean();
      return res.json({ success: true, data: orders });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
    }
  }

  /**
   * PATCH /api/admin/orders/:id/status
   */
  static async updateOrderStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      order.status = status;
      await order.save();

      SocketService.emitOrderStatusUpdate(order.trackingToken, order);

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'UPDATE_ORDER_STATUS',
        entity: 'Order',
        entityId: order._id.toString(),
        details: { orderId: order.orderId, newStatus: status },
      });

      return res.json({ success: true, data: order });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update order status.' });
    }
  }

  /**
   * PATCH /api/admin/orders/:id/payment
   */
  static async updateOrderPayment(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { paymentStatus, paymentMethod } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }

      order.paymentStatus = paymentStatus;
      if (paymentMethod) order.paymentMethod = paymentMethod;
      await order.save();

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'SETTLE_ORDER_PAYMENT',
        entity: 'Order',
        entityId: order._id.toString(),
        details: { orderId: order.orderId, paymentStatus, paymentMethod },
      });

      return res.json({ success: true, data: order });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update order payment.' });
    }
  }

  /**
   * GET /api/admin/reports/customer-history
   * "Customer Last Ordered" table & spend history
   */
  static async getCustomerHistory(req: AuthRequest, res: Response) {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      const customerMap = new Map<string, any>();

      orders.forEach(order => {
        const phone = order.guestPhone.trim();
        if (!customerMap.has(phone)) {
          customerMap.set(phone, {
            guestName: order.guestName,
            guestPhone: phone,
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: order.createdAt,
            lastOrderRoom: order.roomNumber,
            lastOrderId: order.orderId,
          });
        }
        const cust = customerMap.get(phone);
        cust.totalOrders += 1;
        if (order.paymentStatus === 'PAID') {
          cust.totalSpent += order.totalAmount;
        }
      });

      const customerHistory = Array.from(customerMap.values());
      return res.json({ success: true, data: customerHistory });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch customer history.' });
    }
  }

  /**
   * GET /api/admin/billing/invoice/:type/:id
   */
  static async downloadInvoicePdf(req: AuthRequest, res: Response) {
    try {
      const { type, id } = req.params;
      const isObjectId = mongoose.isValidObjectId(id);

      if (type === 'booking') {
        const booking = await Booking.findOne({
          $or: [
            { bookingId: id },
            { trackingToken: id },
            ...(isObjectId ? [{ _id: id }] : []),
          ],
        }).populate('roomTypeId');
        if (!booking) return res.status(404).send('Booking not found');

        const roomTypeName = (booking.roomTypeId as any)?.name || 'Executive Room';
        const pdfBuffer = await InvoicePdfService.generateBookingInvoicePdf(booking, roomTypeName);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${booking.bookingId}.pdf`);
        return res.send(pdfBuffer);
      } else if (type === 'order') {
        const order = await Order.findOne({
          $or: [
            { orderId: id },
            { trackingToken: id },
            ...(isObjectId ? [{ _id: id }] : []),
          ],
        });
        if (!order) return res.status(404).send('Order not found');

        const pdfBuffer = await InvoicePdfService.generateOrderInvoicePdf(order);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderId}.pdf`);
        return res.send(pdfBuffer);
      } else {
        return res.status(400).send('Invalid invoice type');
      }
    } catch (error) {
      console.error('Error generating admin PDF invoice:', error);
      return res.status(500).send('Failed to generate PDF');
    }
  }

  /**
   * GET /api/admin/rooms
   */
  static async getRooms(req: AuthRequest, res: Response) {
    try {
      const officialRoomNumbers = OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber);
      const validVenueNames = ['Sambhrama Banquet Hall', 'Sambhrama Party Hall', 'Board Room'];
      const rooms = await Room.find({
        isActive: true,
        roomNumber: { $in: [...officialRoomNumbers, ...validVenueNames] },
      }).populate('roomTypeId').lean();
      rooms.sort((a, b) => {
        const numA = parseInt(a.roomNumber, 10);
        const numB = parseInt(b.roomNumber, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (!isNaN(numA)) return -1;
        if (!isNaN(numB)) return 1;
        return a.roomNumber.localeCompare(b.roomNumber);
      });
      return res.json({ success: true, data: rooms });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
    }
  }

  /**
   * PATCH /api/admin/rooms/:id/status
   */
  static async updateRoomStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const room = await Room.findByIdAndUpdate(id, { status }, { new: true });
      return res.json({ success: true, data: room });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update room.' });
    }
  }

  /**
   * GET /api/admin/room-types
   * Returns all active room categories with base pricing (EP basePrice and CP cpPrice)
   */
  static async getRoomTypes(req: AuthRequest, res: Response) {
    try {
      let roomTypes = await RoomType.find({ isActive: true }).sort({ basePrice: 1, name: 1 }).lean();
      if (roomTypes.length === 0) {
        await ensureDatabaseSeeded();
        roomTypes = await RoomType.find({ isActive: true }).sort({ basePrice: 1, name: 1 }).lean();
      }
      return res.json({ success: true, data: roomTypes });
    } catch (error) {
      console.error('[AdminController] Error fetching room types:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch room categories.' });
    }
  }

  /**
   * PATCH /api/admin/room-types/:id/base-rates
   * Permanently updates the default/base price of a room category (RoomType.basePrice / cpPrice)
   * This updates ONLY the RoomType model. Does NOT modify or overwrite any DailyRate documents.
   */
  static async updateRoomTypeBaseRates(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { basePrice, cpPrice } = req.body;

      if (basePrice === undefined && cpPrice === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one of basePrice or cpPrice must be provided.',
        });
      }

      // Find room category by ID or code (supports 24-char ObjectId or room type code)
      let roomType = null;
      if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
        roomType = await RoomType.findById(id);
      }
      if (!roomType) {
        roomType = await RoomType.findOne({ code: id });
      }
      if (!roomType) {
        return res.status(404).json({ success: false, message: 'Room category not found.' });
      }

      const auditChanges: Array<{ plan: string; oldRate: number; newRate: number }> = [];

      // Validate basePrice (EP / Room Only)
      if (basePrice !== undefined) {
        const numBase = Number(basePrice);
        if (
          typeof basePrice === 'boolean' ||
          basePrice === null ||
          basePrice === '' ||
          isNaN(numBase) ||
          !isFinite(numBase) ||
          numBase <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: 'Enter a valid base rate greater than ₹0.',
          });
        }
        const roundedBase = Math.round(numBase);
        if (roundedBase <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Enter a valid base rate greater than ₹0.',
          });
        }
        auditChanges.push({
          plan: 'ROOM_ONLY',
          oldRate: roomType.basePrice,
          newRate: roundedBase,
        });
        roomType.basePrice = roundedBase;
      }

      // Validate cpPrice (CP / Breakfast Included)
      if (cpPrice !== undefined) {
        const numCp = Number(cpPrice);
        if (
          typeof cpPrice === 'boolean' ||
          cpPrice === null ||
          cpPrice === '' ||
          isNaN(numCp) ||
          !isFinite(numCp) ||
          numCp <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: 'Enter a valid base rate greater than ₹0.',
          });
        }
        const roundedCp = Math.round(numCp);
        if (roundedCp <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Enter a valid base rate greater than ₹0.',
          });
        }
        auditChanges.push({
          plan: 'BREAKFAST_INCLUDED',
          oldRate: roomType.cpPrice,
          newRate: roundedCp,
        });
        roomType.cpPrice = roundedCp;
      }

      await roomType.save();

      // Audit Log for each plan changed
      if (req.admin) {
        for (const change of auditChanges) {
          try {
            await AuditLog.create({
              adminId: req.admin.id,
              adminEmail: req.admin.email,
              action: 'BASE_RATE_UPDATED',
              entity: 'RoomType',
              entityId: roomType._id.toString(),
              details: {
                roomCategory: roomType.name,
                roomTypeCode: roomType.code,
                plan: change.plan,
                oldRate: change.oldRate,
                newRate: change.newRate,
                ip: req.ip,
              },
            });
          } catch (auditErr) {
            console.error('[AdminController] Base rate audit log creation error (non-fatal):', auditErr);
          }
        }
      }

      return res.json({
        success: true,
        message: 'Base rate updated successfully.',
        data: roomType,
      });
    } catch (error: any) {
      console.error('[AdminController] Error updating base rates:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update base rate.',
      });
    }
  }

  /**
   * GET /api/admin/audit-logs
   */
  static async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();
      return res.json({ success: true, data: logs });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
    }
  }

  /**
   * GET /api/admin/menu-items
   */
  static async getMenuItems(req: AuthRequest, res: Response) {
    try {
      let items = await MenuItem.find().sort({ section: 1, sortOrder: 1, name: 1 }).lean();
      let categories = await MenuCategory.find().sort({ sortOrder: 1, name: 1 }).lean();

      if (items.length === 0) {
        await ensureDatabaseSeeded();
        items = await MenuItem.find().sort({ section: 1, sortOrder: 1, name: 1 }).lean();
        categories = await MenuCategory.find().sort({ sortOrder: 1, name: 1 }).lean();
      }

      return res.json({ success: true, data: { items, categories } });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch menu items.' });
    }
  }

  /**
   * POST /api/admin/seed
   */
  static async triggerSeed(req: AuthRequest, res: Response) {
    try {
      await runSeedLogic(false);
      return res.json({ success: true, message: 'Database successfully seeded with menu and catalog data.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Seeding failed.' });
    }
  }

  /**
   * POST /api/admin/menu-items
   */
  static async createMenuItem(req: AuthRequest, res: Response) {
    try {
      const { name, code, description, categoryId, price, halfPrice, isHalfAvailable, isVeg, section, isAvailable } = req.body;
      if (!name || price === undefined) {
        return res.status(400).json({ success: false, message: 'Name and price are required.' });
      }

      const newItem = await MenuItem.create({
        name,
        code: code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20),
        description: description || '',
        categoryId: categoryId || null,
        price: Number(price),
        halfPrice: halfPrice !== undefined && halfPrice !== null && halfPrice !== '' ? Number(halfPrice) : undefined,
        isHalfAvailable: !!isHalfAvailable,
        isVeg: isVeg !== undefined ? !!isVeg : true,
        section: section === 'LLB' ? 'LIQUID_LOUNGE' : section || 'SWAAD',
        isAvailable: isAvailable !== undefined ? !!isAvailable : true,
      });

      return res.json({ success: true, data: newItem, message: 'Menu item created successfully.' });
    } catch (error) {
      console.error('Create MenuItem Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create menu item.' });
    }
  }

  /**
   * PUT /api/admin/menu-items/:id
   */
  static async updateMenuItem(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, description, categoryId, price, halfPrice, isHalfAvailable, isVeg, section, isAvailable } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (description !== undefined) updateData.description = description;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (price !== undefined) updateData.price = Number(price);
      if (halfPrice !== undefined) updateData.halfPrice = halfPrice ? Number(halfPrice) : null;
      if (isHalfAvailable !== undefined) updateData.isHalfAvailable = !!isHalfAvailable;
      if (isVeg !== undefined) updateData.isVeg = !!isVeg;
      if (section !== undefined) updateData.section = section === 'LLB' ? 'LIQUID_LOUNGE' : section;
      if (isAvailable !== undefined) updateData.isAvailable = !!isAvailable;

      const updated = await MenuItem.findByIdAndUpdate(id, updateData, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Menu item not found.' });
      }

      return res.json({ success: true, data: updated, message: 'Menu item updated successfully.' });
    } catch (error) {
      console.error('Update MenuItem Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update menu item.' });
    }
  }

  /**
   * DELETE /api/admin/menu-items/:id
   */
  static async deleteMenuItem(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await MenuItem.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Menu item not found.' });
      }
      return res.json({ success: true, message: 'Menu item deleted successfully.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to delete menu item.' });
    }
  }

  /**
   * PATCH /api/admin/menu-items/:id/availability
   */
  static async toggleMenuItemAvailability(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const item = await MenuItem.findById(id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Menu item not found.' });
      }
      item.isAvailable = !item.isAvailable;
      await item.save();
      return res.json({ success: true, data: item, message: `Item is now ${item.isAvailable ? 'Available' : 'Unavailable'}.` });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update availability.' });
    }
  }

  /**
   * GET /api/admin/feedback
   * Retrieve customer feedback with filtering, sorting, and summary metrics.
   * Strictly private - authenticated admin access only.
   */
  static async getFeedbacks(req: AuthRequest, res: Response) {
    try {
      const { status, rating, search, sort = 'newest', page = '1', limit = '100' } = req.query;

      const filter: any = {};

      if (status && ['new', 'read', 'archived'].includes(String(status))) {
        filter.status = status;
      }

      if (rating) {
        const ratingNum = parseInt(String(rating), 10);
        if (!isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 5) {
          filter.overallRating = ratingNum;
        }
      }

      if (search && typeof search === 'string' && search.trim()) {
        const term = search.trim();
        const searchRegex = new RegExp(term, 'i');
        filter.$or = [
          { customerName: searchRegex },
          { customerEmail: searchRegex },
          { bookingId: searchRegex },
          { comment: searchRegex },
        ];
      }

      // Determine sort order
      let sortObj: any = { submittedAt: -1 };
      if (sort === 'oldest') sortObj = { submittedAt: 1 };
      else if (sort === 'rating_desc') sortObj = { overallRating: -1, submittedAt: -1 };
      else if (sort === 'rating_asc') sortObj = { overallRating: 1, submittedAt: -1 };

      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(String(limit), 10) || 100));
      const skip = (pageNum - 1) * limitNum;

      const [feedbacks, totalCount, allFeedbacksForMetrics] = await Promise.all([
        Feedback.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
        Feedback.countDocuments(filter),
        Feedback.find({}, 'overallRating roomRating foodRating cleanlinessRating serviceRating recommendation status').lean(),
      ]);

      // Calculate summary metrics across all received feedback
      const totalAll = allFeedbacksForMetrics.length;
      let totalRatingSum = 0;
      let recommendCount = 0;
      let newCount = 0;
      const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      for (const f of allFeedbacksForMetrics) {
        totalRatingSum += f.overallRating || 0;
        if (f.recommendation) recommendCount++;
        if (f.status === 'new') newCount++;
        const rounded = Math.min(5, Math.max(1, Math.round(f.overallRating || 0)));
        ratingDistribution[rounded] = (ratingDistribution[rounded] || 0) + 1;
      }

      const averageRating = totalAll > 0 ? parseFloat((totalRatingSum / totalAll).toFixed(1)) : 0;
      const recommendPercentage = totalAll > 0 ? Math.round((recommendCount / totalAll) * 100) : 0;

      return res.json({
        success: true,
        data: {
          feedbacks,
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          summary: {
            totalFeedback: totalAll,
            averageRating,
            recommendCount,
            recommendPercentage,
            newCount,
            ratingDistribution,
          },
        },
      });
    } catch (error) {
      console.error('[AdminController] Failed to fetch feedback list:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch customer feedback.' });
    }
  }

  /**
   * GET /api/admin/feedback/:id
   * Retrieve single feedback by ID and mark as read if new
   */
  static async getFeedbackById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const feedback = await Feedback.findById(id);
      if (!feedback) {
        return res.status(404).json({ success: false, message: 'Feedback not found.' });
      }

      if (feedback.status === 'new') {
        feedback.status = 'read';
        await feedback.save();
      }

      return res.json({ success: true, data: feedback });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch feedback details.' });
    }
  }

  /**
   * PATCH /api/admin/feedback/:id/status
   * Update feedback status (new, read, archived)
   */
  static async updateFeedbackStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['new', 'read', 'archived'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status. Must be new, read, or archived.' });
      }

      const feedback = await Feedback.findByIdAndUpdate(id, { status }, { new: true });
      if (!feedback) {
        return res.status(404).json({ success: false, message: 'Feedback not found.' });
      }

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'UPDATE_FEEDBACK_STATUS',
        entity: 'Feedback',
        entityId: feedback._id.toString(),
        details: { bookingId: feedback.bookingId, newStatus: status },
      });

      return res.json({ success: true, data: feedback, message: `Feedback marked as ${status}.` });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update feedback status.' });
    }
  }

  /**
   * DELETE /api/admin/feedback/:id
   * Delete feedback entry
   */
  static async deleteFeedback(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const feedback = await Feedback.findByIdAndDelete(id);
      if (!feedback) {
        return res.status(404).json({ success: false, message: 'Feedback not found.' });
      }

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'DELETE_FEEDBACK',
        entity: 'Feedback',
        entityId: feedback._id.toString(),
        details: { bookingId: feedback.bookingId },
      });

      return res.json({ success: true, message: 'Feedback removed successfully.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to delete feedback.' });
    }
  }

  /**
   * POST /api/admin/bookings/:id/send-feedback-request
   * Manually dispatch or retry sending private feedback request email to guest
   */
  static async sendBookingFeedbackRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const booking = await Booking.findById(id);

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      if (booking.paymentStatus !== 'PAID') {
        return res.status(400).json({
          success: false,
          message: 'Feedback requests can only be sent for paid confirmed bookings.',
        });
      }

      if (booking.feedbackSubmitted) {
        return res.status(400).json({
          success: false,
          message: 'Guest has already submitted feedback for this stay.',
        });
      }

      // Reset request status if admin explicitly wants to retry or force dispatch
      if (booking.feedbackRequestStatus === 'FAILED') {
        booking.feedbackRequestStatus = 'NOT_SENT';
        booking.feedbackRequestSent = false;
        await booking.save();
      }

      const result = await EmailService.dispatchCustomerFeedbackRequest(booking);

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'DISPATCH_FEEDBACK_REQUEST',
        entity: 'Booking',
        entityId: booking._id.toString(),
        details: {
          bookingId: booking.bookingId,
          guestEmail: booking.guestEmail,
          success: result.success,
          error: result.error,
        },
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'Failed to dispatch feedback request email.',
        });
      }

      return res.json({
        success: true,
        message: `Feedback request email sent to ${booking.guestEmail}.`,
        data: {
          feedbackToken: result.token,
          feedbackRequestSent: true,
        },
      });
    } catch (error: any) {
      console.error('[AdminController] Error dispatching manual feedback request:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal error dispatching feedback request.',
      });
    }
  }

  /**
   * GET /api/admin/inventory
   * Retrieves physical room status for all 37 active guest rooms for a selected date range.
   * Strictly returns only TWO statuses: 'AVAILABLE' or 'OCCUPIED'.
   */
  static async getInventoryStatus(req: AuthRequest, res: Response) {
    try {
      const { checkIn, checkOut } = req.query;

      let checkInDate: Date;
      let checkOutDate: Date;

      const now = new Date();
      if (checkIn && typeof checkIn === 'string' && checkOut && typeof checkOut === 'string') {
        const [ciY, ciM, ciD] = checkIn.split('-').map(Number);
        const [coY, coM, coD] = checkOut.split('-').map(Number);
        if (!isNaN(ciY) && !isNaN(ciM) && !isNaN(ciD) && !isNaN(coY) && !isNaN(coM) && !isNaN(coD)) {
          checkInDate = new Date(Date.UTC(ciY, ciM - 1, ciD, 0, 0, 0, 0));
          checkOutDate = new Date(Date.UTC(coY, coM - 1, coD, 0, 0, 0, 0));
        } else {
          checkInDate = new Date(checkIn);
          checkOutDate = new Date(checkOut);
        }
      } else {
        // Default to today and tomorrow (UTC midnight)
        checkInDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        checkOutDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
      }

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid check-in or check-out date format.' });
      }

      if (checkOutDate <= checkInDate) {
        return res.status(400).json({ success: false, message: 'Check-out date must be strictly after check-in date.' });
      }

      const result = await AvailabilityEngine.getPhysicalInventoryStatus(checkInDate, checkOutDate);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[AdminController] Error fetching inventory status:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch inventory status.' });
    }
  }

  /**
   * POST /api/admin/inventory/offline-booking
   * Manually records a physical/walk-in booking directly into the Booking architecture.
   */
  static async createOfflineBooking(req: AuthRequest, res: Response) {
    try {
      const { roomId, checkIn, checkOut, guestName, guestPhone, guestEmail, adminNotes } = req.body;

      if (!roomId || !checkIn || !checkOut) {
        return res.status(400).json({ success: false, message: 'roomId, checkIn, and checkOut are required.' });
      }

      let checkInDate: Date;
      let checkOutDate: Date;
      if (typeof checkIn === 'string' && typeof checkOut === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
        const [ciY, ciM, ciD] = checkIn.split('-').map(Number);
        const [coY, coM, coD] = checkOut.split('-').map(Number);
        checkInDate = new Date(Date.UTC(ciY, ciM - 1, ciD, 0, 0, 0, 0));
        checkOutDate = new Date(Date.UTC(coY, coM - 1, coD, 0, 0, 0, 0));
      } else {
        checkInDate = new Date(checkIn);
        checkOutDate = new Date(checkOut);
      }

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid check-in or check-out date.' });
      }

      if (checkOutDate <= checkInDate) {
        return res.status(400).json({ success: false, message: 'Check-out must be strictly after check-in.' });
      }

      // 1. Verify Room exists and is an active guest room
      const room = await Room.findById(roomId).populate('roomTypeId');
      if (!room) {
        return res.status(404).json({ success: false, message: 'Room not found.' });
      }

      if (!room.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot book an inactive or legacy room.' });
      }

      if (room.isVenue) {
        return res.status(400).json({ success: false, message: 'Cannot book a venue (Banquet Hall / Board Room) as a guest room.' });
      }

      if (room.roomNumber === '104') {
        return res.status(400).json({ success: false, message: 'Room 104 does not exist.' });
      }

      // 2. Strict concurrency & date-overlap check on this physical room
      const { available, conflictingBooking } = await AvailabilityEngine.isPhysicalRoomAvailable(
        room._id,
        checkInDate,
        checkOutDate
      );

      if (!available) {
        return res.status(409).json({
          success: false,
          message: `Room #${room.roomNumber} is already occupied for these dates (Booking: ${conflictingBooking?.bookingId || 'Active Reservation'}).`,
        });
      }

      // 3. Compute duration & snapshot rates
      const numNights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
      const rt = room.roomTypeId as any;
      const basePrice = rt?.basePrice || 2200;
      const totalAmount = basePrice * numNights;
      const bookingId = `HR-OFF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const trackingToken = crypto.randomBytes(16).toString('hex');

      // 4. Create confirmed offline booking record
      const booking = await Booking.create({
        bookingId,
        source: 'OFFLINE',
        guestName: (guestName && guestName.trim()) || 'Walk-in Guest',
        guestEmail: (guestEmail && guestEmail.trim()) || 'offline@hotelraama.com',
        guestPhone: (guestPhone && guestPhone.trim()) || 'Offline Guest',
        roomTypeId: rt?._id || room.roomTypeId,
        assignedRoomId: room._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        numGuests: 2,
        numNights,
        roomPricePerNightSnapshot: basePrice,
        totalAmount,
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        trackingToken,
        adminNotes: adminNotes?.trim() || undefined,
        createdBy: req.admin?.email || 'admin',
      });

      // 5. Audit Log
      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'CREATE_OFFLINE_BOOKING',
        entity: 'Booking',
        entityId: booking._id.toString(),
        details: {
          bookingId: booking.bookingId,
          roomNumber: room.roomNumber,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guestName: booking.guestName,
        },
      });

      const populatedBooking = await Booking.findById(booking._id).populate('roomTypeId assignedRoomId');

      return res.status(201).json({
        success: true,
        message: `Physical booking ${booking.bookingId} created for Room #${room.roomNumber}.`,
        data: populatedBooking,
      });
    } catch (error: any) {
      console.error('[AdminController] Error creating offline booking:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to create offline booking.' });
    }
  }

  /**
   * GET /api/admin/inventory/offline-bookings
   */
  static async getOfflineBookings(req: AuthRequest, res: Response) {
    try {
      const { status } = req.query;
      const filter: any = { source: 'OFFLINE' };
      if (status && typeof status === 'string' && status !== 'ALL') {
        filter.bookingStatus = status;
      }

      const bookings = await Booking.find(filter)
        .populate('roomTypeId assignedRoomId')
        .sort({ createdAt: -1 });

      return res.json({ success: true, data: bookings });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch offline bookings.' });
    }
  }

  /**
   * PATCH /api/admin/inventory/offline-booking/:id
   */
  static async updateOfflineBooking(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { roomId, checkIn, checkOut, guestName, guestPhone, guestEmail, adminNotes, bookingStatus } = req.body;

      const booking = await Booking.findOne({ _id: id, source: 'OFFLINE' });
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Offline booking not found.' });
      }

      let targetRoomId = booking.assignedRoomId;
      let checkInDate = booking.checkIn;
      let checkOutDate = booking.checkOut;
      let datesOrRoomChanged = false;

      if (roomId && roomId.toString() !== booking.assignedRoomId?.toString()) {
        const room = await Room.findById(roomId);
        if (!room || !room.isActive || room.isVenue || room.roomNumber === '104') {
          return res.status(400).json({ success: false, message: 'Invalid target room.' });
        }
        targetRoomId = room._id as any;
        booking.assignedRoomId = room._id as any;
        booking.roomTypeId = room.roomTypeId;
        datesOrRoomChanged = true;
      }

      if (checkIn && checkOut) {
        let ci: Date;
        let co: Date;
        if (typeof checkIn === 'string' && typeof checkOut === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
          const [ciY, ciM, ciD] = checkIn.split('-').map(Number);
          const [coY, coM, coD] = checkOut.split('-').map(Number);
          ci = new Date(Date.UTC(ciY, ciM - 1, ciD, 0, 0, 0, 0));
          co = new Date(Date.UTC(coY, coM - 1, coD, 0, 0, 0, 0));
        } else {
          ci = new Date(checkIn);
          co = new Date(checkOut);
        }

        if (isNaN(ci.getTime()) || isNaN(co.getTime()) || co <= ci) {
          return res.status(400).json({ success: false, message: 'Invalid check-in or check-out dates.' });
        }

        checkInDate = ci;
        checkOutDate = co;
        booking.checkIn = ci;
        booking.checkOut = co;
        booking.numNights = Math.max(1, Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)));
        booking.totalAmount = booking.roomPricePerNightSnapshot * booking.numNights;
        datesOrRoomChanged = true;
      }

      if (datesOrRoomChanged && targetRoomId && booking.bookingStatus !== 'CANCELLED') {
        const { available, conflictingBooking } = await AvailabilityEngine.isPhysicalRoomAvailable(
          targetRoomId,
          checkInDate,
          checkOutDate,
          booking._id
        );

        if (!available) {
          return res.status(409).json({
            success: false,
            message: `Room is already occupied for these dates (Booking: ${conflictingBooking?.bookingId}).`,
          });
        }
      }

      if (guestName !== undefined) booking.guestName = guestName.trim();
      if (guestPhone !== undefined) booking.guestPhone = guestPhone.trim();
      if (guestEmail !== undefined) booking.guestEmail = guestEmail.trim();
      if (adminNotes !== undefined) booking.adminNotes = adminNotes.trim();
      if (bookingStatus && ['CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'CHECKED_OUT'].includes(bookingStatus)) {
        booking.bookingStatus = bookingStatus as any;
      }

      await booking.save();

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'UPDATE_OFFLINE_BOOKING',
        entity: 'Booking',
        entityId: booking._id.toString(),
        details: { bookingId: booking.bookingId, changes: req.body },
      });

      const updated = await Booking.findById(booking._id).populate('roomTypeId assignedRoomId');
      return res.json({ success: true, message: 'Offline booking updated successfully.', data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to update offline booking.' });
    }
  }

  /**
   * POST /api/admin/inventory/offline-booking/:id/cancel
   */
  static async cancelOfflineBooking(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const booking = await Booking.findOne({ _id: id, source: 'OFFLINE' }).populate('assignedRoomId');
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Offline booking not found.' });
      }

      booking.bookingStatus = 'CANCELLED';
      await booking.save();

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'CANCEL_OFFLINE_BOOKING',
        entity: 'Booking',
        entityId: booking._id.toString(),
        details: { bookingId: booking.bookingId, reason: req.body.reason || 'Admin cancelled' },
      });

      return res.json({
        success: true,
        message: `Offline booking ${booking.bookingId} cancelled. Physical room availability restored.`,
        data: booking,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to cancel offline booking.' });
    }
  }

  /**
   * GET /api/admin/inventory/date-wise
   * Returns date-wise availability and rates grid across all room categories
   */
  static async getDateWiseInventory(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, roomTypeId, ratePlanCode } = req.query;

      const now = new Date();
      let start: Date;
      let end: Date;

      if (startDate && typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        const [sy, sm, sd] = startDate.split('-').map(Number);
        start = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
      } else {
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      }

      if (endDate && typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        const [ey, em, ed] = endDate.split('-').map(Number);
        end = new Date(Date.UTC(ey, em - 1, ed, 0, 0, 0, 0));
      } else {
        // Default to 14 days
        end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 14, 0, 0, 0, 0));
      }

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({ success: false, message: 'Invalid start date or end date range.' });
      }

      const typeFilter = typeof roomTypeId === 'string' ? roomTypeId : 'ALL';
      const planCode = typeof ratePlanCode === 'string' ? ratePlanCode : 'ROOM_ONLY';

      const data = await AvailabilityEngine.getDateWiseGridData(start, end, typeFilter, planCode);
      return res.json({ success: true, data });
    } catch (error: any) {
      console.error('[AdminController] Error fetching date-wise inventory:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch date-wise inventory.' });
    }
  }

  /**
   * GET /api/admin/inventory/rate-plans
   */
  static async getRatePlans(req: AuthRequest, res: Response) {
    try {
      const plans = await RatePlanService.getActiveRatePlans();
      return res.json({ success: true, data: plans });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to fetch rate plans.' });
    }
  }

  /**
   * POST /api/admin/rates/bulk-update
   * Bulk updates date-wise pricing for a room category and rate plan
   */
  static async bulkUpdateRates(req: AuthRequest, res: Response) {
    try {
      const {
        roomTypeId,
        ratePlanCode,
        startDate,
        endDate,
        singleAdult,
        doubleAdult,
        tripleAdult,
        childRate,
        extraAdultRate,
      } = req.body;

      if (!roomTypeId || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'roomTypeId, startDate, and endDate are required.' });
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
        return res.status(400).json({ success: false, message: 'Invalid date range. End date must be on or after start date.' });
      }

      const roomType = await RoomType.findById(roomTypeId);
      if (!roomType) {
        return res.status(404).json({ success: false, message: 'Room category not found.' });
      }

      const planCode = ratePlanCode || 'ROOM_ONLY';
      const activePlans = await RatePlanService.getActiveRatePlans();
      const plan = activePlans.find((p) => p.code === planCode) || activePlans[0];

      const sAdult = Number(singleAdult ?? (doubleAdult !== undefined ? doubleAdult : roomType.basePrice));
      const dAdult = Number(doubleAdult ?? roomType.basePrice);
      const tAdult = Number(tripleAdult ?? dAdult);
      const cRate = Number(childRate ?? 0);
      const eaRate = Number(extraAdultRate ?? 600);

      if (isNaN(sAdult) || isNaN(dAdult) || isNaN(tAdult) || sAdult < 0 || dAdult < 0 || tAdult < 0) {
        return res.status(400).json({ success: false, message: 'Rates must be valid non-negative numbers.' });
      }

      const stayDates = AvailabilityEngine.getDateRangeStrings(startDate, endDate);

      const bulkOps = stayDates.map((dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateVal = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

        return {
          updateOne: {
            filter: {
              roomTypeId: roomType._id,
              ratePlanId: plan._id,
              date: dateStr,
            },
            update: {
              $set: {
                ratePlanCode: plan.code,
                dateValue: dateVal,
                singleAdult: sAdult,
                doubleAdult: dAdult,
                tripleAdult: tAdult,
                childRate: cRate,
                extraAdultRate: eaRate,
                updatedBy: req.admin?.email || 'admin',
              },
              $setOnInsert: {
                createdBy: req.admin?.email || 'admin',
              },
            },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await DailyRate.bulkWrite(bulkOps);
      }

      // Record Audit Log
      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'BULK_RATE_UPDATE',
        entity: 'DailyRate',
        entityId: roomType._id.toString(),
        details: {
          roomCategory: roomType.name,
          roomTypeCode: roomType.code,
          ratePlanCode: plan.code,
          startDate,
          endDate,
          datesCount: bulkOps.length,
          rates: { singleAdult: sAdult, doubleAdult: dAdult, tripleAdult: tAdult, childRate: cRate, extraAdultRate: eaRate },
        },
      });

      return res.json({
        success: true,
        message: `Updated rates for ${roomType.name} (${plan.name}) across ${bulkOps.length} date(s) from ${startDate} to ${endDate}.`,
      });
    } catch (error: any) {
      console.error('[AdminController] Bulk rate update error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to bulk update rates.' });
    }
  }

  /**
   * POST /api/admin/inventory/bulk-update
   * Bulk updates sellable inventory override for a room category
   */
  static async bulkUpdateInventory(req: AuthRequest, res: Response) {
    try {
      const { roomTypeId, startDate, endDate, inventoryOverride, notes } = req.body;

      if (!roomTypeId || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'roomTypeId, startDate, and endDate are required.' });
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
        return res.status(400).json({ success: false, message: 'Invalid date range.' });
      }

      const roomType = await RoomType.findById(roomTypeId);
      if (!roomType) {
        return res.status(404).json({ success: false, message: 'Room category not found.' });
      }

      const { pooledTypeIds, poolRooms, poolRoomIds, totalPhysical } = await AvailabilityEngine.resolvePooledRoomTypes(roomTypeId);
      const stayDates = AvailabilityEngine.getDateRangeStrings(startDate, endDate);

      const hasOverride = inventoryOverride !== null && inventoryOverride !== undefined && inventoryOverride !== '';
      const overrideVal = hasOverride ? Number(inventoryOverride) : null;

      if (overrideVal !== null) {
        if (isNaN(overrideVal) || overrideVal < 0) {
          return res.status(400).json({ success: false, message: 'Sellable inventory override cannot be negative.' });
        }
        if (overrideVal > totalPhysical) {
          return res.status(400).json({
            success: false,
            message: `Sellable inventory override (${overrideVal}) cannot exceed the total physical rooms count (${totalPhysical}) for ${roomType.name}.`,
          });
        }

        // Safety check: ensure override does not violate booked rooms (available < booked) across shared pool
        const conflictingBookings = await Booking.find({
          $and: [
            {
              $or: [
                { assignedRoomId: { $in: poolRoomIds } },
                { roomTypeId: { $in: pooledTypeIds } },
              ],
            },
            { bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
          ],
        }).lean();

        for (const dateStr of stayDates) {
          const bookedOnNight = conflictingBookings.filter((b) => {
            const bInStr = AvailabilityEngine.formatDateStr(new Date(b.checkIn));
            const bOutStr = AvailabilityEngine.formatDateStr(new Date(b.checkOut));
            return bInStr <= dateStr && bOutStr > dateStr;
          }).length;

          if (overrideVal < bookedOnNight) {
            return res.status(400).json({
              success: false,
              message: `Cannot set sellable inventory to ${overrideVal} on ${dateStr}. There are already ${bookedOnNight} confirmed bookings for this date (override cannot be lower than booked rooms).`,
            });
          }
        }
      }

      // Synchronize DailyInventory across all pooled room types in this shared inventory group
      const bulkOps: any[] = [];
      for (const pTypeId of pooledTypeIds) {
        for (const dateStr of stayDates) {
          const [y, m, d] = dateStr.split('-').map(Number);
          const dateVal = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

          bulkOps.push({
            updateOne: {
              filter: {
                roomTypeId: pTypeId,
                date: dateStr,
              },
              update: {
                $set: {
                  dateValue: dateVal,
                  inventoryOverride: overrideVal,
                  ...(notes !== undefined ? { notes: notes.trim() } : {}),
                  updatedBy: req.admin?.email || 'admin',
                },
                $setOnInsert: {
                  stopSell: false,
                  minStay: 1,
                  blockedRooms: 0,
                  createdBy: req.admin?.email || 'admin',
                },
              },
              upsert: true,
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await DailyInventory.bulkWrite(bulkOps);
      }

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'BULK_INVENTORY_UPDATE',
        entity: 'DailyInventory',
        entityId: roomType._id.toString(),
        details: {
          roomCategory: roomType.name,
          startDate,
          endDate,
          datesCount: bulkOps.length,
          inventoryOverride: overrideVal,
          totalPhysicalRooms: totalPhysical,
        },
      });

      return res.json({
        success: true,
        message: `Sellable inventory updated for ${roomType.name} across ${bulkOps.length} date(s) from ${startDate} to ${endDate}.`,
      });
    } catch (error: any) {
      console.error('[AdminController] Bulk inventory update error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to bulk update inventory.' });
    }
  }

  /**
   * POST /api/admin/restrictions/bulk-update
   * Bulk updates Stop Sell and/or Minimum Stay restrictions
   */
  static async bulkUpdateRestrictions(req: AuthRequest, res: Response) {
    try {
      const { roomTypeId, startDate, endDate, stopSell, minStay, blockedRooms, notes } = req.body;

      if (!roomTypeId || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'roomTypeId, startDate, and endDate are required.' });
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) {
        return res.status(400).json({ success: false, message: 'Invalid date range.' });
      }

      const roomType = await RoomType.findById(roomTypeId);
      if (!roomType) {
        return res.status(404).json({ success: false, message: 'Room category not found.' });
      }

      if (minStay !== undefined && (isNaN(Number(minStay)) || Number(minStay) < 1)) {
        return res.status(400).json({ success: false, message: 'Minimum stay must be at least 1 night.' });
      }

      const stayDates = AvailabilityEngine.getDateRangeStrings(startDate, endDate);

      const updateFields: any = {
        updatedBy: req.admin?.email || 'admin',
      };
      if (stopSell !== undefined) updateFields.stopSell = Boolean(stopSell);
      if (minStay !== undefined) updateFields.minStay = Number(minStay);
      if (blockedRooms !== undefined && !isNaN(Number(blockedRooms))) {
        updateFields.blockedRooms = Math.max(0, Number(blockedRooms));
      }
      if (notes !== undefined) updateFields.notes = String(notes).trim();

      // Restrictions (including Stop Sell) are strictly specific to the selected room category (roomType._id)
      const bulkOps = stayDates.map((dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateVal = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

        return {
          updateOne: {
            filter: {
              roomTypeId: roomType._id,
              date: dateStr,
            },
            update: {
              $set: {
                ...updateFields,
                dateValue: dateVal,
              },
              $setOnInsert: {
                inventoryOverride: null,
                blockedRooms: 0,
                createdBy: req.admin?.email || 'admin',
              },
            },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await DailyInventory.bulkWrite(bulkOps);
      }

      await AuditLog.create({
        adminId: req.admin!.id,
        adminEmail: req.admin!.email,
        action: 'BULK_RESTRICTIONS_UPDATE',
        entity: 'DailyInventory',
        entityId: roomType._id.toString(),
        details: {
          roomCategory: roomType.name,
          startDate,
          endDate,
          datesCount: bulkOps.length,
          stopSell,
          minStay,
        },
      });

      return res.json({
        success: true,
        message: `Restrictions updated for ${roomType.name} across ${bulkOps.length} date(s) from ${startDate} to ${endDate}.`,
      });
    } catch (error: any) {
      console.error('[AdminController] Bulk restrictions update error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to bulk update restrictions.' });
    }
  }

  /**
   * POST /api/admin/inventory/quick-update
   * Updates an individual date cell's rates, inventory override, and restrictions
   */
  static async quickUpdateCell(req: AuthRequest, res: Response) {
    try {
      const {
        roomTypeId,
        date,
        ratePlanCode,
        rates,
        inventoryOverride,
        blockedRooms,
        stopSell,
        minStay,
        notes,
      } = req.body;

      if (!roomTypeId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'roomTypeId and valid date (YYYY-MM-DD) are required.' });
      }

      const roomType = await RoomType.findById(roomTypeId);
      if (!roomType) {
        return res.status(404).json({ success: false, message: 'Room category not found.' });
      }

      const [y, m, d] = date.split('-').map(Number);
      const dateVal = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));

      // 1. Update Rates if provided
      if (rates && typeof rates === 'object') {
        const planCode = ratePlanCode || 'ROOM_ONLY';
        const activePlans = await RatePlanService.getActiveRatePlans();
        const plan = activePlans.find((p) => p.code === planCode) || activePlans[0];

        const sAdult = Number(rates.singleAdult ?? roomType.basePrice);
        const dAdult = Number(rates.doubleAdult ?? roomType.basePrice);
        const tAdult = Number(rates.tripleAdult ?? dAdult);
        const cRate = Number(rates.childRate ?? 0);
        const eaRate = Number(rates.extraAdultRate ?? 600);

        await DailyRate.findOneAndUpdate(
          {
            roomTypeId: roomType._id,
            ratePlanId: plan._id,
            date,
          },
          {
            $set: {
              ratePlanCode: plan.code,
              dateValue: dateVal,
              singleAdult: sAdult,
              doubleAdult: dAdult,
              tripleAdult: tAdult,
              childRate: cRate,
              extraAdultRate: eaRate,
              updatedBy: req.admin?.email || 'admin',
            },
            $setOnInsert: {
              createdBy: req.admin?.email || 'admin',
            },
          },
          { upsert: true, new: true }
        );

        await AuditLog.create({
          adminId: req.admin!.id,
          adminEmail: req.admin!.email,
          action: 'RATE_UPDATED',
          entity: 'DailyRate',
          entityId: roomType._id.toString(),
          details: {
            roomCategory: roomType.name,
            date,
            ratePlanCode: plan.code,
            rates: { singleAdult: sAdult, doubleAdult: dAdult, tripleAdult: tAdult },
          },
        });
      }

      // 2. Update Inventory / Restrictions if provided
      const invFields: any = {
        dateValue: dateVal,
        updatedBy: req.admin?.email || 'admin',
      };
      let hasInvChange = false;

      if (inventoryOverride !== undefined) {
        hasInvChange = true;
        const { pooledTypeIds } = await AvailabilityEngine.resolvePooledRoomTypes(roomTypeId);
        const officialRoomNumbers = OFFICIAL_ROOMS_SPEC.map((r) => r.roomNumber);
        const physicalRooms = await Room.find({
          roomTypeId: { $in: pooledTypeIds },
          isActive: true,
          isVenue: { $ne: true },
          roomNumber: { $in: officialRoomNumbers },
        });
        const totalPhysical = physicalRooms.length;

        if (inventoryOverride !== null && inventoryOverride !== '') {
          const num = Number(inventoryOverride);
          if (isNaN(num) || !Number.isInteger(num) || num < 0 || num > totalPhysical) {
            return res.status(400).json({
              success: false,
              message: `Enter a number between 0 and ${totalPhysical}.`,
            });
          }

          // Count already confirmed bookings for this room category/pool on this date
          const poolRoomIds = physicalRooms.map((r) => r._id);
          const [yr, mo, da] = date.split('-').map(Number);
          const startOfNight = new Date(Date.UTC(yr, mo - 1, da, 0, 0, 0, 0));
          const endOfNight = new Date(Date.UTC(yr, mo - 1, da, 23, 59, 59, 999));

          const confirmedBookings = await Booking.find({
            $and: [
              {
                $or: [
                  { assignedRoomId: { $in: poolRoomIds } },
                  { roomTypeId: { $in: pooledTypeIds } },
                ],
              },
              { bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } },
            ],
            checkIn: { $lte: endOfNight },
            checkOut: { $gt: startOfNight },
          });

          let confirmedCount = 0;
          for (const b of confirmedBookings) {
            const bInStr = AvailabilityEngine.formatDateStr(new Date(b.checkIn));
            const bOutStr = AvailabilityEngine.formatDateStr(new Date(b.checkOut));
            if (bInStr <= date && bOutStr > date) {
              confirmedCount++;
            }
          }

          if (num < confirmedCount) {
            return res.status(400).json({
              success: false,
              message: `Online inventory cannot be lower than the ${confirmedCount} rooms already booked for this date.`,
            });
          }

          invFields.inventoryOverride = num;
        } else {
          invFields.inventoryOverride = null;
        }
      }

      if (stopSell !== undefined) {
        hasInvChange = true;
        invFields.stopSell = Boolean(stopSell);
      }

      if (minStay !== undefined) {
        hasInvChange = true;
        const ms = Number(minStay);
        if (ms < 1) {
          return res.status(400).json({ success: false, message: 'Minimum stay must be at least 1 night.' });
        }
        invFields.minStay = ms;
      }

      if (blockedRooms !== undefined) {
        hasInvChange = true;
        const br = Number(blockedRooms);
        invFields.blockedRooms = isNaN(br) || br < 0 ? 0 : br;
      }

      if (notes !== undefined) {
        hasInvChange = true;
        invFields.notes = String(notes).trim();
      }

      if (hasInvChange) {
        // Physical inventory override cap is shared across all pooled room types
        if (invFields.inventoryOverride !== undefined) {
          const { pooledTypeIds } = await AvailabilityEngine.resolvePooledRoomTypes(roomTypeId);
          const overrideOps = pooledTypeIds.map((pId) => ({
            updateOne: {
              filter: {
                roomTypeId: pId,
                date,
              },
              update: {
                $set: {
                  dateValue: dateVal,
                  inventoryOverride: invFields.inventoryOverride,
                  updatedBy: req.admin?.email || 'admin',
                },
                $setOnInsert: {
                  stopSell: false,
                  minStay: 1,
                  blockedRooms: 0,
                  createdBy: req.admin?.email || 'admin',
                },
              },
              upsert: true,
            },
          }));
          await DailyInventory.bulkWrite(overrideOps);
        }

        // Room-category-specific fields (stopSell, minStay, blockedRooms, notes)
        // are updated ONLY for the exact requested room category (roomType._id)
        const specificFields: any = {
          dateValue: dateVal,
          updatedBy: req.admin?.email || 'admin',
        };
        let hasSpecificFields = false;

        if (stopSell !== undefined) {
          hasSpecificFields = true;
          specificFields.stopSell = Boolean(stopSell);
        }
        if (minStay !== undefined) {
          hasSpecificFields = true;
          specificFields.minStay = Number(minStay);
        }
        if (blockedRooms !== undefined) {
          hasSpecificFields = true;
          specificFields.blockedRooms = Math.max(0, Number(blockedRooms));
        }
        if (notes !== undefined) {
          hasSpecificFields = true;
          specificFields.notes = String(notes).trim();
        }

        if (hasSpecificFields) {
          await DailyInventory.findOneAndUpdate(
            {
              roomTypeId: roomType._id,
              date,
            },
            {
              $set: specificFields,
              $setOnInsert: {
                inventoryOverride: null,
                createdBy: req.admin?.email || 'admin',
              },
            },
            { upsert: true, new: true }
          );
        }

        await AuditLog.create({
          adminId: req.admin!.id,
          adminEmail: req.admin!.email,
          action: 'INVENTORY_RESTRICTION_UPDATED',
          entity: 'DailyInventory',
          entityId: roomType._id.toString(),
          details: {
            roomCategory: roomType.name,
            date,
            updates: invFields,
          },
        });
      }

      return res.json({
        success: true,
        message: `Updated availability and rates for ${roomType.name} on ${date}.`,
      });
    } catch (error: any) {
      console.error('[AdminController] Quick cell update error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to update cell.' });
    }
  }

  /**
   * GET /api/admin/meals/base-rates
   * Fetches permanent base meal prices (Breakfast, Lunch, Dinner)
   */
  static async getBaseMealPrices(req: AuthRequest, res: Response) {
    try {
      const prices = await MealPricingService.getBasePrices();
      return res.json({ success: true, data: prices });
    } catch (error: any) {
      console.error('[AdminController] Error fetching base meal prices:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch base meal prices.' });
    }
  }

  /**
   * PUT /api/admin/meals/base-rates
   * Permanently updates base meal prices (Breakfast, Lunch, Dinner)
   */
  static async updateBaseMealPrices(req: AuthRequest, res: Response) {
    try {
      const { breakfast, lunch, dinner } = req.body;

      if (breakfast === undefined && lunch === undefined && dinner === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one meal price (breakfast, lunch, or dinner) must be provided.',
        });
      }

      const oldPrices = await MealPricingService.getBasePrices();
      const updated = await MealPricingService.updateBasePrices(
        { breakfast, lunch, dinner },
        req.admin?.email || 'admin'
      );

      // Audit Log
      if (req.admin) {
        try {
          await AuditLog.create({
            adminId: req.admin.id,
            adminEmail: req.admin.email,
            action: 'BASE_MEAL_RATES_UPDATED',
            entity: 'MealPlan',
            details: {
              oldPrices,
              newPrices: updated,
              ip: req.ip,
            },
          });
        } catch (auditErr) {
          console.error('[AdminController] Base meal rate audit log error (non-fatal):', auditErr);
        }
      }

      return res.json({
        success: true,
        message: 'Base meal prices updated successfully.',
        data: updated,
      });
    } catch (error: any) {
      console.error('[AdminController] Error updating base meal prices:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update base meal prices.',
      });
    }
  }

  /**
   * GET /api/admin/meals/date-wise
   * Returns date-specific meal price overrides
   */
  static async getDateWiseMealPrices(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const overrides = await MealPricingService.getDateWiseOverrides(
        startDate as string | undefined,
        endDate as string | undefined
      );
      return res.json({ success: true, data: overrides });
    } catch (error: any) {
      console.error('[AdminController] Error fetching date-wise meal prices:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch date-wise meal prices.' });
    }
  }

  /**
   * POST /api/admin/meals/bulk-update
   * Bulk updates date-range meal prices
   */
  static async bulkUpdateDateWiseMealPrices(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, breakfastPrice, lunchPrice, dinnerPrice } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required.' });
      }

      const result = await MealPricingService.bulkUpdateDateWisePrices({
        startDate,
        endDate,
        breakfastPrice,
        lunchPrice,
        dinnerPrice,
        adminEmail: req.admin?.email || 'admin',
      });

      // Audit Log
      if (req.admin) {
        try {
          await AuditLog.create({
            adminId: req.admin.id,
            adminEmail: req.admin.email,
            action: 'BULK_MEAL_RATE_UPDATE',
            entity: 'DailyMealPrice',
            details: {
              startDate,
              endDate,
              datesCount: result.updatedCount,
              prices: { breakfastPrice, lunchPrice, dinnerPrice },
              ip: req.ip,
            },
          });
        } catch (auditErr) {
          console.error('[AdminController] Bulk meal rate audit log error (non-fatal):', auditErr);
        }
      }

      return res.json({
        success: true,
        message: `Successfully applied meal prices across ${result.updatedCount} date(s) from ${startDate} to ${endDate}.`,
        data: result,
      });
    } catch (error: any) {
      console.error('[AdminController] Bulk meal price update error:', error);
      return res.status(400).json({ success: false, message: error.message || 'Failed to update date-wise meal prices.' });
    }
  }

  /**
   * DELETE /api/admin/meals/date-wise/:date
   * Removes date override, naturally reverting to base prices
   */
  static async deleteDateWiseMealPrice(req: AuthRequest, res: Response) {
    try {
      const { date } = req.params;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, message: 'Invalid date format (must be YYYY-MM-DD).' });
      }

      const deleted = await MealPricingService.deleteDateWiseOverride(date);

      if (req.admin) {
        try {
          await AuditLog.create({
            adminId: req.admin.id,
            adminEmail: req.admin.email,
            action: 'DELETE_MEAL_RATE_OVERRIDE',
            entity: 'DailyMealPrice',
            details: { date, revertedToBase: true, ip: req.ip },
          });
        } catch (auditErr) {
          console.error('[AdminController] Delete meal override audit log error (non-fatal):', auditErr);
        }
      }

      return res.json({
        success: true,
        message: deleted ? `Date override for ${date} removed. Reverted to base meal prices.` : `No override found for ${date}.`,
      });
    } catch (error: any) {
      console.error('[AdminController] Error removing date-wise meal override:', error);
      return res.status(500).json({ success: false, message: error.message || 'Failed to delete date override.' });
    }
  }

  /**
   * GET /api/admin/meals/effective-rates?checkIn=...&checkOut=...
   */
  static async getEffectiveMealRates(req: AuthRequest, res: Response) {
    try {
      const { checkIn, checkOut } = req.query;
      if (!checkIn || typeof checkIn !== 'string') {
        const base = await MealPricingService.getBasePrices();
        return res.json({ success: true, data: { basePrices: base } });
      }

      const rates = await MealPricingService.getEffectiveMealPrices(
        checkIn,
        typeof checkOut === 'string' ? checkOut : undefined
      );
      return res.json({ success: true, data: rates });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to fetch effective rates.' });
    }
  }
}

