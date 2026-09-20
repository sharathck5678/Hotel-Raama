import cron from 'node-cron';
import { Booking } from '../models/Booking';
import { EmailService } from '../services/EmailService';

/**
 * Scan for confirmed bookings with pending or failed email notifications
 * and attempt recovery/retry.
 * Returns the count of processed bookings.
 */
export const runEmailRetryCheck = async (): Promise<number> => {
  try {
    const staleProcessingTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    // Find confirmed & paid bookings that still need email dispatch
    const pendingBookings = await Booking.find({
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
      $or: [
        // Pending or failed notifications (with retry cap of 5 attempts)
        {
          hotelNotificationStatus: { $in: ['PENDING', 'FAILED'] },
          notificationAttempts: { $lt: 5 },
        },
        {
          guestConfirmationStatus: { $in: ['PENDING', 'FAILED'] },
          notificationAttempts: { $lt: 5 },
        },
        // Crash recovery: Left in PROCESSING before a server restart or crash > 5m ago
        {
          hotelNotificationStatus: 'PROCESSING',
          updatedAt: { $lt: staleProcessingTime },
        },
        {
          guestConfirmationStatus: 'PROCESSING',
          updatedAt: { $lt: staleProcessingTime },
        },
      ],
    }).limit(20);

    if (pendingBookings.length === 0) {
      return 0;
    }

    console.log(`[EmailRetryJob] Found ${pendingBookings.length} bookings requiring email recovery.`);

    for (const booking of pendingBookings) {
      // If a notification was stuck in PROCESSING due to a prior crash, reset it to PENDING for retry
      if (booking.hotelNotificationStatus === 'PROCESSING') {
        booking.hotelNotificationStatus = 'PENDING';
      }
      if (booking.guestConfirmationStatus === 'PROCESSING') {
        booking.guestConfirmationStatus = 'PENDING';
      }
      await booking.save();

      // Process emails safely (idempotent - will skip anything already marked SENT)
      await EmailService.processBookingEmails(booking._id.toString());
    }

    return pendingBookings.length;
  } catch (error: any) {
    console.error('[EmailRetryJob Error] Error running email retry sweep:', error.message || error);
    return 0;
  }
};

/**
 * Initialize the recurring cron job (runs every 2 minutes)
 */
export const initEmailRetryJob = () => {
  cron.schedule('*/2 * * * *', async () => {
    await runEmailRetryCheck();
  });

  console.log('[EmailRetryJob] Confirmed booking email recovery job initialized (runs every 2m).');
};
