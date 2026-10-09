import { Router } from 'express';
import { PublicController } from '../controllers/publicController';
import { bookingLimiter, feedbackLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/rooms', PublicController.getRoomTypes);
router.post('/availability/check', PublicController.checkAvailabilityAndPrice);
router.post('/bookings/check-availability', PublicController.checkAvailabilityAndPrice);
router.post('/coupons/validate', PublicController.validateCoupon);
router.post('/bookings', bookingLimiter, PublicController.createBooking);
router.post('/bookings/create', bookingLimiter, PublicController.createBooking);
router.post('/bookings/hold', bookingLimiter, PublicController.createBooking);
router.post('/bookings/verify-payment', PublicController.verifyPayment);
router.post('/bookings/cancel', PublicController.cancelBooking);
router.post('/bookings/release-hold', PublicController.cancelBooking);
router.get('/bookings/track/:token', PublicController.trackBooking);
router.get('/menu', PublicController.getMenu);
router.get('/party-packages', PublicController.getPartyPackages);
router.get('/attractions', PublicController.getAttractions);
router.get('/hotel-info', PublicController.getHotelInfo);
router.get('/billing/invoice/booking/:idOrToken', PublicController.downloadBookingInvoicePdf);
router.get('/billing/invoice/order/:idOrToken', PublicController.downloadOrderInvoicePdf);
router.post('/webhooks/razorpay', PublicController.handleRazorpayWebhook);

// Meal Addon Pricing (Read-only)
router.get('/meals/effective-rates', PublicController.getEffectiveMealRates);
router.get('/meals/base-rates', PublicController.getBaseMealRates);

// Customer Private Feedback (No Login Required)
router.get('/feedback/:token', feedbackLimiter, PublicController.validateFeedbackToken);
router.post('/feedback/:token', feedbackLimiter, PublicController.submitFeedback);

export default router;
