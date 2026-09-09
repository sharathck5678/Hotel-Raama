import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { requireAdminAuth } from '../middleware/authMiddleware';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public auth routes
router.post('/login', loginLimiter, AdminController.login);
router.post('/logout', AdminController.logout);

// Protected Admin Routes
router.use(requireAdminAuth);

router.get('/me', AdminController.getMe);
router.get('/dashboard', AdminController.getDashboardMetrics);

// Bookings
router.get('/bookings', AdminController.getBookings);
router.patch('/bookings/:id/status', AdminController.updateBookingStatus);

// Orders
router.get('/orders', AdminController.getOrders);
router.patch('/orders/:id/status', AdminController.updateOrderStatus);
router.patch('/orders/:id/payment', AdminController.updateOrderPayment);

// Rooms
router.get('/rooms', AdminController.getRooms);
router.patch('/rooms/:id/status', AdminController.updateRoomStatus);

// Reports & Billing
router.get('/reports/customer-history', AdminController.getCustomerHistory);
router.get('/billing/invoice/:type/:id', AdminController.downloadInvoicePdf);

// Audit Logs
router.get('/audit-logs', AdminController.getAuditLogs);

// Menu Management
router.get('/menu-items', AdminController.getMenuItems);
router.post('/menu-items', AdminController.createMenuItem);
router.put('/menu-items/:id', AdminController.updateMenuItem);
router.delete('/menu-items/:id', AdminController.deleteMenuItem);
router.patch('/menu-items/:id/availability', AdminController.toggleMenuItemAvailability);

export default router;
