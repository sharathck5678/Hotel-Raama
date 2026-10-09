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
router.post('/bookings/:id/send-feedback-request', AdminController.sendBookingFeedbackRequest);

// Customer Private Feedback (Admin Only)
router.get('/feedback', AdminController.getFeedbacks);
router.get('/feedback/:id', AdminController.getFeedbackById);
router.patch('/feedback/:id/status', AdminController.updateFeedbackStatus);
router.delete('/feedback/:id', AdminController.deleteFeedback);

// Orders
router.get('/orders', AdminController.getOrders);
router.patch('/orders/:id/status', AdminController.updateOrderStatus);
router.patch('/orders/:id/payment', AdminController.updateOrderPayment);

// Rooms & Inventory Management
router.get('/rooms', AdminController.getRooms);
router.patch('/rooms/:id/status', AdminController.updateRoomStatus);
router.get('/room-types', AdminController.getRoomTypes);
router.patch('/room-types/:id/base-rates', AdminController.updateRoomTypeBaseRates);
router.get('/inventory', AdminController.getInventoryStatus);
router.post('/inventory/offline-booking', AdminController.createOfflineBooking);
router.get('/inventory/offline-bookings', AdminController.getOfflineBookings);
router.patch('/inventory/offline-booking/:id', AdminController.updateOfflineBooking);
router.post('/inventory/offline-booking/:id/cancel', AdminController.cancelOfflineBooking);

// Date-Wise Inventory, Rates & Restrictions Layer
router.get('/inventory/date-wise', AdminController.getDateWiseInventory);
router.get('/inventory/rate-plans', AdminController.getRatePlans);
router.post('/rates/bulk-update', AdminController.bulkUpdateRates);
router.post('/inventory/bulk-update', AdminController.bulkUpdateInventory);
router.post('/restrictions/bulk-update', AdminController.bulkUpdateRestrictions);
router.post('/inventory/quick-update', AdminController.quickUpdateCell);
router.post('/inventory/cell-update', AdminController.quickUpdateCell);

// Meal Addon Pricing Management (Base & Date-Wise Overrides)
router.get('/meals/base-rates', AdminController.getBaseMealPrices);
router.put('/meals/base-rates', AdminController.updateBaseMealPrices);
router.patch('/meals/base-rates', AdminController.updateBaseMealPrices);
router.get('/meals/date-wise', AdminController.getDateWiseMealPrices);
router.post('/meals/bulk-update', AdminController.bulkUpdateDateWiseMealPrices);
router.delete('/meals/date-wise/:date', AdminController.deleteDateWiseMealPrice);
router.get('/meals/effective-rates', AdminController.getEffectiveMealRates);

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
router.post('/seed', AdminController.triggerSeed);

export default router;
