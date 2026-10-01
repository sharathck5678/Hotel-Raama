import cron from 'node-cron';
import { Booking } from '../models/Booking';
import { EmailService } from '../services/EmailService';

/**
 * Scan for completed or checked-out bookings that are eligible for a feedback request email
 * and dispatch the email safely and idempotently.
 * Returns the count of processed bookings.
 */
export const runFeedbackSchedulerSweep = async (): Promise<number> => {
  try {
    const now = new Date();

    // Eligible bookings:
    // 1. Paid bookings
    // 2. Either explicitly marked CHECKED_OUT or checkOut date is now passed
    // 3. Booking is not cancelled or no-show
    // 4. Feedback request has not yet been sent
    // 5. Not currently processing
    const eligibleBookings = await Booking.find({
      paymentStatus: 'PAID',
      $or: [
        { bookingStatus: 'CHECKED_OUT' },
        {
          checkOut: { $lte: now },
          bookingStatus: { $in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      ],
      feedbackRequestSent: { $ne: true },
      feedbackRequestStatus: { $nin: ['PROCESSING', 'SENT'] },
      guestEmail: { $exists: true, $ne: '' },
    }).limit(25);

    if (eligibleBookings.length === 0) {
      return 0;
    }

    console.log(`[FeedbackSchedulerJob] Found ${eligibleBookings.length} bookings eligible for feedback request.`);

    let processedCount = 0;
    for (const booking of eligibleBookings) {
      try {
        const result = await EmailService.dispatchCustomerFeedbackRequest(booking);
        if (result.success) {
          processedCount++;
        }
      } catch (itemErr: any) {
        console.error(`[FeedbackSchedulerJob] Error dispatching feedback for booking ${booking.bookingId}:`, itemErr.message || itemErr);
      }
    }

    return processedCount;
  } catch (error: any) {
    console.error('[FeedbackSchedulerJob Error] Failed running feedback scheduler sweep:', error.message || error);
    return 0;
  }
};

/**
 * Initialize the recurring post-checkout feedback scheduler (runs every 10 minutes)
 */
export const initFeedbackSchedulerJob = () => {
  // Run on startup shortly after boot (e.g. 15 seconds) to catch up if server was rebooted
  setTimeout(async () => {
    try {
      await runFeedbackSchedulerSweep();
    } catch {
      // ignore
    }
  }, 15000);

  // Recurring schedule: every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    await runFeedbackSchedulerSweep();
  });

  console.log('[FeedbackSchedulerJob] Post-checkout feedback scheduler initialized (runs every 10m).');
};
