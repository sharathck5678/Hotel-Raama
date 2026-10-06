import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EmailService } from '../services/EmailService';
import { IBooking } from '../models/Booking';
import { IEmailProvider, SendEmailOptions, EmailSendResult, ResendEmailProvider } from '../services/email';

describe('Hotel Raama Resend HTTPS API Email Integration Tests', () => {
  const originalEnv = { ...process.env };
  const FAKE_RESEND_KEY = 're_live_secret_key_abcdef1234567890';

  before(() => {
    process.env.RESEND_API_KEY = FAKE_RESEND_KEY;
    process.env.HOTEL_NOTIFICATION_EMAIL = 'reservations@hotelraama.com';
    process.env.EMAIL_FROM = 'Hotel Raama Reservations <reservations@hotelraama.com>';
    process.env.ADMIN_EMAIL = 'admin@hotelraama.com';
    process.env.CLIENT_URL = 'https://hotelraama.com';
  });

  after(() => {
    process.env = originalEnv;
    EmailService.setEmailProvider(null);
    EmailService.setTransporter(null);
  });

  function createMockBooking(overrides: Partial<IBooking> = {}): IBooking {
    const booking = {
      _id: '607f1f77bcf86cd799439099',
      bookingId: 'HR-2026-7788',
      guestName: 'Priya Sharma',
      guestEmail: 'priya.sharma@example.com',
      guestPhone: '+91 98888 77777',
      guestAadhar: '9876 5432 1098',
      checkIn: new Date(Date.now() + 86400000),
      checkOut: new Date(Date.now() + 86400000 * 2),
      numGuests: 2,
      numNights: 1,
      roomPricePerNightSnapshot: 3200,
      taxAmountSnapshot: 160,
      totalAmount: 3360,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      razorpayOrderId: 'order_resend_101',
      razorpayPaymentId: 'pay_resend_202',
      trackingToken: 'token_resend_test_303',
      hotelNotificationStatus: 'PENDING',
      guestConfirmationStatus: 'PENDING',
      notificationAttempts: 0,
      save: async function () {
        return this;
      },
      ...overrides,
    };
    return booking as unknown as IBooking;
  }

  // -------------------------------------------------------------
  // Test 1: Customer confirmation succeeds via Resend HTTPS Provider
  // -------------------------------------------------------------
  it('1. Customer booking confirmation succeeds via Resend provider', async () => {
    const sentEmails: SendEmailOptions[] = [];
    const mockResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (options: SendEmailOptions): Promise<EmailSendResult> => {
        sentEmails.push(options);
        return { success: true, messageId: 'resend_msg_guest_001' };
      },
    };

    EmailService.setEmailProvider(mockResendProvider);

    const booking = createMockBooking();
    const pdfBuffer = Buffer.from('%PDF-1.4 test invoice buffer');
    const result = await EmailService.sendGuestBookingConfirmation(booking, 'Executive Double A/C', pdfBuffer);

    assert.equal(result.success, true);
    assert.equal(result.messageId, 'resend_msg_guest_001');
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, 'priya.sharma@example.com');
    assert.equal(sentEmails[0].from, 'Hotel Raama Reservations <reservations@hotelraama.com>');
    assert.match(sentEmails[0].subject, /HR-2026-7788/);
    assert.match(sentEmails[0].html, /Priya Sharma/);
    assert.equal(sentEmails[0].attachments?.length, 1);
    assert.equal(sentEmails[0].attachments?.[0].filename, 'Invoice-HR-2026-7788.pdf');
  });

  // -------------------------------------------------------------
  // Test 2: Hotel notification succeeds via Resend HTTPS Provider
  // -------------------------------------------------------------
  it('2. Hotel booking notification succeeds via Resend provider', async () => {
    const sentEmails: SendEmailOptions[] = [];
    const mockResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (options: SendEmailOptions): Promise<EmailSendResult> => {
        sentEmails.push(options);
        return { success: true, messageId: 'resend_msg_hotel_001' };
      },
    };

    EmailService.setEmailProvider(mockResendProvider);

    const booking = createMockBooking();
    const result = await EmailService.sendHotelBookingNotification(booking, 'Executive Double A/C');

    assert.equal(result.success, true);
    assert.equal(result.messageId, 'resend_msg_hotel_001');
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, 'reservations@hotelraama.com');
    assert.match(sentEmails[0].subject, /HR-2026-7788/);
    assert.match(sentEmails[0].html, /XXXX-XXXX-1098/); // Aadhaar masked
  });

  // -------------------------------------------------------------
  // Test 3: Customer feedback request succeeds via Resend
  // -------------------------------------------------------------
  it('3. Customer feedback request succeeds via Resend provider', async () => {
    const sentEmails: SendEmailOptions[] = [];
    const mockResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (options: SendEmailOptions): Promise<EmailSendResult> => {
        sentEmails.push(options);
        return { success: true, messageId: 'resend_msg_feedback_req_001' };
      },
    };

    EmailService.setEmailProvider(mockResendProvider);

    const booking = createMockBooking();
    const token = 'feedback_token_hex_123456';
    const result = await EmailService.sendCustomerFeedbackRequest(booking, token);

    assert.equal(result.success, true);
    assert.equal(result.messageId, 'resend_msg_feedback_req_001');
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, 'priya.sharma@example.com');
    assert.match(sentEmails[0].html, /feedback\/feedback_token_hex_123456/);
  });

  // -------------------------------------------------------------
  // Test 4: Admin feedback notification succeeds via Resend
  // -------------------------------------------------------------
  it('4. Admin feedback notification succeeds via Resend provider', async () => {
    const sentEmails: SendEmailOptions[] = [];
    const mockResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (options: SendEmailOptions): Promise<EmailSendResult> => {
        sentEmails.push(options);
        return { success: true, messageId: 'resend_msg_admin_alert_001' };
      },
    };

    EmailService.setEmailProvider(mockResendProvider);

    const feedbackMock = {
      customerName: 'Priya Sharma',
      customerEmail: 'priya.sharma@example.com',
      bookingId: 'HR-2026-7788',
      overallRating: 5,
      roomRating: 5,
      foodRating: 4,
      cleanlinessRating: 5,
      serviceRating: 5,
      recommendation: true,
      comment: 'Excellent stay at Hotel Raama, Swaad restaurant food was wonderful!',
      submittedAt: new Date(),
    };

    const result = await EmailService.sendAdminFeedbackNotification(feedbackMock);

    assert.equal(result.success, true);
    assert.equal(result.messageId, 'resend_msg_admin_alert_001');
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, 'admin@hotelraama.com');
    assert.match(sentEmails[0].html, /HR-2026-7788/);
    assert.match(sentEmails[0].html, /Swaad restaurant food was wonderful/);
  });

  // -------------------------------------------------------------
  // Test 5: Resend failure is handled gracefully with safe error details
  // -------------------------------------------------------------
  it('5. Resend provider failure is captured gracefully without throwing unhandled exceptions', async () => {
    const failingResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (): Promise<EmailSendResult> => {
        return {
          success: false,
          error: '[validation_error] The domain hotelraama.com is not verified in Resend.',
        };
      },
    };

    EmailService.setEmailProvider(failingResendProvider);

    const booking = createMockBooking();
    const result = await EmailService.sendGuestBookingConfirmation(booking, 'Suite');

    assert.equal(result.success, false);
    assert.match(result.error || '', /domain hotelraama\.com is not verified/);
  });

  // -------------------------------------------------------------
  // Test 6: Booking remains successful when email fails
  // -------------------------------------------------------------
  it('6. Booking remains confirmed/paid even if Resend email dispatch fails', async () => {
    const failingResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (): Promise<EmailSendResult> => {
        return {
          success: false,
          error: '[internal_server_error] Resend API temporarily unavailable',
        };
      },
    };

    EmailService.setEmailProvider(failingResendProvider);

    const booking = createMockBooking({
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
    });

    // Process emails (non-blocking)
    await EmailService.processBookingEmails(booking);

    // Booking must NOT be rolled back or cancelled
    assert.equal(booking.bookingStatus, 'CONFIRMED', 'Booking status must stay CONFIRMED');
    assert.equal(booking.paymentStatus, 'PAID', 'Payment status must stay PAID');
  });

  // -------------------------------------------------------------
  // Test 7: Failed email status is recorded on the booking record
  // -------------------------------------------------------------
  it('7. Failed email status and safe error are recorded on booking record', async () => {
    const failingResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (): Promise<EmailSendResult> => {
        return {
          success: false,
          error: '[rate_limit_exceeded] Too many requests',
        };
      },
    };

    EmailService.setEmailProvider(failingResendProvider);

    const booking = createMockBooking();
    await EmailService.processBookingEmails(booking);

    assert.equal(booking.hotelNotificationStatus, 'FAILED');
    assert.equal(booking.guestConfirmationStatus, 'FAILED');
    assert.match(booking.hotelNotificationError || '', /rate_limit_exceeded/);
    assert.match(booking.guestConfirmationError || '', /rate_limit_exceeded/);
  });

  // -------------------------------------------------------------
  // Test 8: Retry job can re-process failed emails successfully
  // -------------------------------------------------------------
  it('8. Retry can call processBookingEmails again and transition from FAILED to SENT', async () => {
    let callCount = 0;
    const recoveringResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (): Promise<EmailSendResult> => {
        callCount++;
        if (callCount <= 2) {
          // Fail initial attempt (hotel + guest)
          return { success: false, error: '[network_timeout] Temporary timeout' };
        }
        // Succeed on retry
        return { success: true, messageId: `resend_retry_success_${callCount}` };
      },
    };

    EmailService.setEmailProvider(recoveringResendProvider);

    const booking = createMockBooking();

    // 1. Initial attempt fails
    await EmailService.processBookingEmails(booking);
    assert.equal(booking.hotelNotificationStatus, 'FAILED');
    assert.equal(booking.guestConfirmationStatus, 'FAILED');

    // 2. Retry attempt (called by EmailRetryJob)
    await EmailService.processBookingEmails(booking);
    assert.equal(booking.hotelNotificationStatus, 'SENT');
    assert.equal(booking.guestConfirmationStatus, 'SENT');
  });

  // -------------------------------------------------------------
  // Test 9: API key is never included in logs
  // -------------------------------------------------------------
  it('9. Resend API key is never leaked in logs or error messages', async () => {
    const logs: string[] = [];
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args: any[]) => logs.push(args.map(String).join(' '));
    console.warn = (...args: any[]) => logs.push(args.map(String).join(' '));
    console.error = (...args: any[]) => logs.push(args.map(String).join(' '));

    try {
      const provider = new ResendEmailProvider(FAKE_RESEND_KEY);
      EmailService.setEmailProvider(provider);

      const booking = createMockBooking();
      await EmailService.processBookingEmails(booking);

      const joinedLogs = logs.join('\n');
      assert.equal(
        joinedLogs.includes(FAKE_RESEND_KEY),
        false,
        'API key must NEVER appear in console logs or error outputs'
      );
    } finally {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
    }
  });

  // -------------------------------------------------------------
  // Test 10: Existing recipient logic remains unchanged
  // -------------------------------------------------------------
  it('10. Existing recipient addresses and sender logic remain intact', async () => {
    const sentOptions: SendEmailOptions[] = [];
    const mockResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (options: SendEmailOptions): Promise<EmailSendResult> => {
        sentOptions.push(options);
        return { success: true, messageId: 'msg_recipient_test' };
      },
    };

    EmailService.setEmailProvider(mockResendProvider);

    const booking = createMockBooking({
      guestEmail: 'distinct.customer@example.org',
    });

    await EmailService.sendGuestBookingConfirmation(booking);
    await EmailService.sendHotelBookingNotification(booking);

    assert.equal(sentOptions[0].to, 'distinct.customer@example.org', 'Guest confirmation must go to guestEmail');
    assert.equal(sentOptions[0].from, process.env.EMAIL_FROM, 'Guest confirmation sender must match EMAIL_FROM');
    assert.equal(sentOptions[1].to, 'reservations@hotelraama.com', 'Hotel notification must go to HOTEL_NOTIFICATION_EMAIL');
  });

  // -------------------------------------------------------------
  // Test 11: Idempotency - already sent emails are not resent
  // -------------------------------------------------------------
  it('11. Idempotency: Bookings with SENT status are not resent', async () => {
    let dispatchCount = 0;
    const mockResendProvider: IEmailProvider = {
      providerName: 'Resend',
      isConfigured: () => true,
      sendEmail: async (): Promise<EmailSendResult> => {
        dispatchCount++;
        return { success: true, messageId: 'msg_idempotent' };
      },
    };

    EmailService.setEmailProvider(mockResendProvider);

    const booking = createMockBooking({
      hotelNotificationStatus: 'SENT',
      guestConfirmationStatus: 'SENT',
    });

    await EmailService.processBookingEmails(booking);

    assert.equal(dispatchCount, 0, 'No emails should be dispatched if already SENT');
  });
});
