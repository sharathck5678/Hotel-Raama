"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Admin_1 = require("../models/Admin");
const Booking_1 = require("../models/Booking");
const Order_1 = require("../models/Order");
const Room_1 = require("../models/Room");
const MenuItem_1 = require("../models/MenuItem");
const MenuCategory_1 = require("../models/MenuCategory");
const AuditLog_1 = require("../models/AuditLog");
const SocketService_1 = require("../services/SocketService");
const InvoicePdfService_1 = require("../services/InvoicePdfService");
const JWT_SECRET = process.env.JWT_SECRET || 'raama_super_secret_jwt_key_2026_production';
class AdminController {
    /**
     * POST /api/admin/login
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email and password are required.' });
            }
            const inputEmail = email.toLowerCase().trim();
            const envEmail = (process.env.ADMIN_EMAIL || 'admin@hotelraama.com').toLowerCase().trim();
            const envPass = process.env.ADMIN_PASSWORD || 'AdminRaama@2026';
            let admin = await Admin_1.Admin.findOne({ email: inputEmail });
            // Check if credentials match env credentials
            const isEnvMatch = (inputEmail === envEmail && password === envPass);
            if (isEnvMatch) {
                if (!admin) {
                    const passwordHash = await bcryptjs_1.default.hash(envPass, 10);
                    admin = await Admin_1.Admin.create({
                        email: envEmail,
                        passwordHash,
                        name: 'Hotel Raama Admin',
                        role: 'ADMIN',
                    });
                }
            }
            else {
                if (!admin) {
                    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
                }
                const isMatch = await bcryptjs_1.default.compare(password, admin.passwordHash);
                if (!isMatch) {
                    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
                }
            }
            admin.lastLogin = new Date();
            await admin.save();
            const token = jsonwebtoken_1.default.sign({ id: admin._id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '12h' });
            // Set HTTP-only Cookie
            res.cookie('jwt_admin', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 12 * 60 * 60 * 1000, // 12 hours
            });
            // Audit Log
            await AuditLog_1.AuditLog.create({
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
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Server error during login.' });
        }
    }
    /**
     * POST /api/admin/logout
     */
    static async logout(req, res) {
        res.clearCookie('jwt_admin');
        return res.json({ success: true, message: 'Logged out successfully.' });
    }
    /**
     * GET /api/admin/me
     */
    static async getMe(req, res) {
        return res.json({ success: true, data: req.admin });
    }
    /**
     * GET /api/admin/dashboard
     */
    static async getDashboardMetrics(req, res) {
        try {
            const totalRooms = await Room_1.Room.countDocuments({ isActive: true });
            const occupiedRooms = await Room_1.Room.countDocuments({ status: 'OCCUPIED' });
            const reservedRooms = await Room_1.Room.countDocuments({ status: 'RESERVED' });
            const occupancyRate = totalRooms > 0 ? Math.round(((occupiedRooms + reservedRooms) / totalRooms) * 100) : 0;
            const pendingOrdersCount = await Order_1.Order.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] } });
            const totalConfirmedBookings = await Booking_1.Booking.countDocuments({ bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] } });
            // Calculate Real Revenue from Database
            const paidBookings = await Booking_1.Booking.find({ paymentStatus: 'PAID' });
            const totalBookingRevenue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
            const allOrders = await Order_1.Order.find();
            const totalOrderRevenue = allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            const totalCombinedRevenue = totalBookingRevenue + totalOrderRevenue;
            // Group Real Transactions by Month
            const monthlyRevenueMap = {};
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
            const itemSalesMap = {};
            allOrders.forEach((order) => {
                if (Array.isArray(order.items)) {
                    order.items.forEach((item) => {
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
                        }
                        else if (lowerName.includes('chicken') || lowerName.includes('mutton') || lowerName.includes('fish') || lowerName.includes('biryani') || lowerName.includes('egg')) {
                            nonVegRev += lineTotal;
                        }
                        else {
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
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics.' });
        }
    }
    /**
     * GET /api/admin/bookings
     */
    static async getBookings(req, res) {
        try {
            const bookings = await Booking_1.Booking.find().populate('roomTypeId assignedRoomId').sort({ createdAt: -1 });
            return res.json({ success: true, data: bookings });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
        }
    }
    /**
     * PATCH /api/admin/bookings/:id/status
     */
    static async updateBookingStatus(req, res) {
        try {
            const { id } = req.params;
            const { bookingStatus, paymentStatus, assignedRoomId } = req.body;
            const booking = await Booking_1.Booking.findById(id);
            if (!booking) {
                return res.status(404).json({ success: false, message: 'Booking not found.' });
            }
            if (bookingStatus)
                booking.bookingStatus = bookingStatus;
            if (paymentStatus)
                booking.paymentStatus = paymentStatus;
            if (assignedRoomId)
                booking.assignedRoomId = assignedRoomId;
            await booking.save();
            // Sync Room status if assigned
            if (booking.assignedRoomId) {
                if (booking.bookingStatus === 'CHECKED_IN') {
                    await Room_1.Room.findByIdAndUpdate(booking.assignedRoomId, { status: 'OCCUPIED' });
                }
                else if (booking.bookingStatus === 'CHECKED_OUT') {
                    await Room_1.Room.findByIdAndUpdate(booking.assignedRoomId, { status: 'CLEANING' });
                }
                else if (booking.bookingStatus === 'CANCELLED') {
                    await Room_1.Room.findByIdAndUpdate(booking.assignedRoomId, { status: 'AVAILABLE' });
                }
            }
            await AuditLog_1.AuditLog.create({
                adminId: req.admin.id,
                adminEmail: req.admin.email,
                action: 'UPDATE_BOOKING_STATUS',
                entity: 'Booking',
                entityId: booking._id.toString(),
                details: { bookingId: booking.bookingId, bookingStatus, paymentStatus },
            });
            return res.json({ success: true, data: booking });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to update booking status.' });
        }
    }
    /**
     * GET /api/admin/orders
     */
    static async getOrders(req, res) {
        try {
            const orders = await Order_1.Order.find().sort({ createdAt: -1 });
            return res.json({ success: true, data: orders });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
        }
    }
    /**
     * PATCH /api/admin/orders/:id/status
     */
    static async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const order = await Order_1.Order.findById(id);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found.' });
            }
            order.status = status;
            await order.save();
            SocketService_1.SocketService.emitOrderStatusUpdate(order.trackingToken, order);
            await AuditLog_1.AuditLog.create({
                adminId: req.admin.id,
                adminEmail: req.admin.email,
                action: 'UPDATE_ORDER_STATUS',
                entity: 'Order',
                entityId: order._id.toString(),
                details: { orderId: order.orderId, newStatus: status },
            });
            return res.json({ success: true, data: order });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to update order status.' });
        }
    }
    /**
     * PATCH /api/admin/orders/:id/payment
     */
    static async updateOrderPayment(req, res) {
        try {
            const { id } = req.params;
            const { paymentStatus, paymentMethod } = req.body;
            const order = await Order_1.Order.findById(id);
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found.' });
            }
            order.paymentStatus = paymentStatus;
            if (paymentMethod)
                order.paymentMethod = paymentMethod;
            await order.save();
            await AuditLog_1.AuditLog.create({
                adminId: req.admin.id,
                adminEmail: req.admin.email,
                action: 'SETTLE_ORDER_PAYMENT',
                entity: 'Order',
                entityId: order._id.toString(),
                details: { orderId: order.orderId, paymentStatus, paymentMethod },
            });
            return res.json({ success: true, data: order });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to update order payment.' });
        }
    }
    /**
     * GET /api/admin/reports/customer-history
     * "Customer Last Ordered" table & spend history
     */
    static async getCustomerHistory(req, res) {
        try {
            const orders = await Order_1.Order.find().sort({ createdAt: -1 });
            const customerMap = new Map();
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
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch customer history.' });
        }
    }
    /**
     * GET /api/admin/billing/invoice/:type/:id
     */
    static async downloadInvoicePdf(req, res) {
        try {
            const { type, id } = req.params;
            const isObjectId = mongoose_1.default.isValidObjectId(id);
            if (type === 'booking') {
                const booking = await Booking_1.Booking.findOne({
                    $or: [
                        { bookingId: id },
                        { trackingToken: id },
                        ...(isObjectId ? [{ _id: id }] : []),
                    ],
                }).populate('roomTypeId');
                if (!booking)
                    return res.status(404).send('Booking not found');
                const roomTypeName = booking.roomTypeId?.name || 'Executive Room';
                const pdfBuffer = await InvoicePdfService_1.InvoicePdfService.generateBookingInvoicePdf(booking, roomTypeName);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=Invoice-${booking.bookingId}.pdf`);
                return res.send(pdfBuffer);
            }
            else if (type === 'order') {
                const order = await Order_1.Order.findOne({
                    $or: [
                        { orderId: id },
                        { trackingToken: id },
                        ...(isObjectId ? [{ _id: id }] : []),
                    ],
                });
                if (!order)
                    return res.status(404).send('Order not found');
                const pdfBuffer = await InvoicePdfService_1.InvoicePdfService.generateOrderInvoicePdf(order);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderId}.pdf`);
                return res.send(pdfBuffer);
            }
            else {
                return res.status(400).send('Invalid invoice type');
            }
        }
        catch (error) {
            console.error('Error generating admin PDF invoice:', error);
            return res.status(500).send('Failed to generate PDF');
        }
    }
    /**
     * GET /api/admin/rooms
     */
    static async getRooms(req, res) {
        try {
            const rooms = await Room_1.Room.find().populate('roomTypeId');
            return res.json({ success: true, data: rooms });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
        }
    }
    /**
     * PATCH /api/admin/rooms/:id/status
     */
    static async updateRoomStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const room = await Room_1.Room.findByIdAndUpdate(id, { status }, { new: true });
            return res.json({ success: true, data: room });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to update room.' });
        }
    }
    /**
     * GET /api/admin/audit-logs
     */
    static async getAuditLogs(req, res) {
        try {
            const logs = await AuditLog_1.AuditLog.find().sort({ createdAt: -1 }).limit(100);
            return res.json({ success: true, data: logs });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
        }
    }
    /**
     * GET /api/admin/menu-items
     */
    static async getMenuItems(req, res) {
        try {
            const items = await MenuItem_1.MenuItem.find().sort({ section: 1, sortOrder: 1, name: 1 });
            const categories = await MenuCategory_1.MenuCategory.find().sort({ sortOrder: 1, name: 1 });
            return res.json({ success: true, data: { items, categories } });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to fetch menu items.' });
        }
    }
    /**
     * POST /api/admin/menu-items
     */
    static async createMenuItem(req, res) {
        try {
            const { name, code, description, categoryId, price, halfPrice, isHalfAvailable, isVeg, section, isAvailable } = req.body;
            if (!name || price === undefined) {
                return res.status(400).json({ success: false, message: 'Name and price are required.' });
            }
            const newItem = await MenuItem_1.MenuItem.create({
                name,
                code: code || name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20),
                description: description || '',
                categoryId: categoryId || null,
                price: Number(price),
                halfPrice: halfPrice !== undefined && halfPrice !== null && halfPrice !== '' ? Number(halfPrice) : undefined,
                isHalfAvailable: !!isHalfAvailable,
                isVeg: isVeg !== undefined ? !!isVeg : true,
                section: section || 'SWAAD',
                isAvailable: isAvailable !== undefined ? !!isAvailable : true,
            });
            return res.json({ success: true, data: newItem, message: 'Menu item created successfully.' });
        }
        catch (error) {
            console.error('Create MenuItem Error:', error);
            return res.status(500).json({ success: false, message: 'Failed to create menu item.' });
        }
    }
    /**
     * PUT /api/admin/menu-items/:id
     */
    static async updateMenuItem(req, res) {
        try {
            const { id } = req.params;
            const { name, code, description, categoryId, price, halfPrice, isHalfAvailable, isVeg, section, isAvailable } = req.body;
            const updateData = {};
            if (name !== undefined)
                updateData.name = name;
            if (code !== undefined)
                updateData.code = code;
            if (description !== undefined)
                updateData.description = description;
            if (categoryId !== undefined)
                updateData.categoryId = categoryId;
            if (price !== undefined)
                updateData.price = Number(price);
            if (halfPrice !== undefined)
                updateData.halfPrice = halfPrice ? Number(halfPrice) : null;
            if (isHalfAvailable !== undefined)
                updateData.isHalfAvailable = !!isHalfAvailable;
            if (isVeg !== undefined)
                updateData.isVeg = !!isVeg;
            if (section !== undefined)
                updateData.section = section;
            if (isAvailable !== undefined)
                updateData.isAvailable = !!isAvailable;
            const updated = await MenuItem_1.MenuItem.findByIdAndUpdate(id, updateData, { new: true });
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Menu item not found.' });
            }
            return res.json({ success: true, data: updated, message: 'Menu item updated successfully.' });
        }
        catch (error) {
            console.error('Update MenuItem Error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update menu item.' });
        }
    }
    /**
     * DELETE /api/admin/menu-items/:id
     */
    static async deleteMenuItem(req, res) {
        try {
            const { id } = req.params;
            const deleted = await MenuItem_1.MenuItem.findByIdAndDelete(id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Menu item not found.' });
            }
            return res.json({ success: true, message: 'Menu item deleted successfully.' });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to delete menu item.' });
        }
    }
    /**
     * PATCH /api/admin/menu-items/:id/availability
     */
    static async toggleMenuItemAvailability(req, res) {
        try {
            const { id } = req.params;
            const item = await MenuItem_1.MenuItem.findById(id);
            if (!item) {
                return res.status(404).json({ success: false, message: 'Menu item not found.' });
            }
            item.isAvailable = !item.isAvailable;
            await item.save();
            return res.json({ success: true, data: item, message: `Item is now ${item.isAvailable ? 'Available' : 'Unavailable'}.` });
        }
        catch (error) {
            return res.status(500).json({ success: false, message: 'Failed to update availability.' });
        }
    }
}
exports.AdminController = AdminController;
