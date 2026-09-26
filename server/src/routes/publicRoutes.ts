import { Router } from 'express';
import { PublicController } from '../controllers/publicController';
import { bookingLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/rooms', PublicController.getRoomTypes);
router.post('/availability/check', PublicController.checkAvailabilityAndPrice);
router.post('/bookings', bookingLimiter, PublicController.createBooking);
router.post('/bookings/verify-payment', PublicController.verifyPayment);
router.get('/bookings/track/:token', PublicController.trackBooking);
router.get('/menu', PublicController.getMenu);
router.get('/party-packages', PublicController.getPartyPackages);
router.get('/attractions', PublicController.getAttractions);
router.get('/hotel-info', PublicController.getHotelInfo);
router.get('/billing/invoice/booking/:idOrToken', PublicController.downloadBookingInvoicePdf);
router.get('/billing/invoice/order/:idOrToken', PublicController.downloadOrderInvoicePdf);
router.post('/webhooks/razorpay', PublicController.handleRazorpayWebhook);

export default router;
