"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
// Public auth routes
router.post('/login', rateLimiter_1.loginLimiter, adminController_1.AdminController.login);
router.post('/logout', adminController_1.AdminController.logout);
// Protected Admin Routes
router.use(authMiddleware_1.requireAdminAuth);
router.get('/me', adminController_1.AdminController.getMe);
router.get('/dashboard', adminController_1.AdminController.getDashboardMetrics);
// Bookings
router.get('/bookings', adminController_1.AdminController.getBookings);
router.patch('/bookings/:id/status', adminController_1.AdminController.updateBookingStatus);
// Orders
router.get('/orders', adminController_1.AdminController.getOrders);
router.patch('/orders/:id/status', adminController_1.AdminController.updateOrderStatus);
router.patch('/orders/:id/payment', adminController_1.AdminController.updateOrderPayment);
// Rooms
router.get('/rooms', adminController_1.AdminController.getRooms);
router.patch('/rooms/:id/status', adminController_1.AdminController.updateRoomStatus);
// Reports & Billing
router.get('/reports/customer-history', adminController_1.AdminController.getCustomerHistory);
router.get('/billing/invoice/:type/:id', adminController_1.AdminController.downloadInvoicePdf);
// Audit Logs
router.get('/audit-logs', adminController_1.AdminController.getAuditLogs);
// Menu Management
router.get('/menu-items', adminController_1.AdminController.getMenuItems);
router.post('/menu-items', adminController_1.AdminController.createMenuItem);
router.put('/menu-items/:id', adminController_1.AdminController.updateMenuItem);
router.delete('/menu-items/:id', adminController_1.AdminController.deleteMenuItem);
router.patch('/menu-items/:id/availability', adminController_1.AdminController.toggleMenuItemAvailability);
exports.default = router;
