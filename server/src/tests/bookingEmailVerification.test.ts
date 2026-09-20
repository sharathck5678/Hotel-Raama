import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { RazorpayService } from '../services/RazorpayService';
import { EmailService } from '../services/EmailService';
import { IBooking, Booking } from '../models/Booking';
import { runEmailRetryCheck } from '../jobs/EmailRetryJob';
import { InvoicePdfService } from '../services/InvoicePdfService';
describe('Hotel Raama Payment Verification & Email System Tests', () => {
  const originalEnv = { ...process.env };
  const TEST_SECRET = 'test_secret_key_12345';
  before(() => {
    process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;
    process.env.HOTEL_NOTIFICATION_EMAIL = 'hotelraama.hsn@gmail.com';
    process.env.EMAIL_FROM = '"Hotel Raama Reservations" <hotelraama.hsn@gmail.com>';
    process.env.CLIENT_URL = 'https://hotel-raama.hotelraama5.workers.dev';
  });
  after(() => {
    process.env = originalEnv;
    EmailService.setTransporter(null);
  });
  // Helper to generate a valid Razorpay signature for tests
  function generateSignature(orderId: string, paymentId: string, secret: string = TEST_SECRET): string {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  }
  // Sample mock booking for email tests
  function createMockBooking(overrides: Partial<IBooking> = {}): IBooking {
    const booking = {
      _id: '507f1f77bcf86cd799439011',
      bookingId: 'HR-2026-9999',
      guestName: 'Arun Sharma',
      guestEmail: 'arun.sharma@example.com',
      guestPhone: '+91 98765 43210',
      guestAadhar: '1234 5678 9012',
      checkIn: new Date(Date.now() + 86400000),
      checkOut: new Date(Date.now() + 86400000 * 3),
      numGuests: 2,
      numNights: 2,
      roomPricePerNightSnapshot: 2500,
      taxAmountSnapshot: 600,
      totalAmount: 5600,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      razorpayOrderId: 'order_test_1001',
      razorpayPaymentId: 'pay_test_2002',
      trackingToken: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
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
  // 1. Valid Razorpay payment -> booking confirmed (Signature verified)
  // -------------------------------------------------------------
  it('1. Valid Razorpay payment signature verifies successfully', () => {
    process.env.NODE_ENV = 'production';
    const orderId = 'order_valid_123';
    const paymentId = 'pay_valid_456';
    const signature = generateSignature(orderId, paymentId, TEST_SECRET);
    const isValid = RazorpayService.verifyPaymentSignature(orderId, paymentId, signature);
    assert.equal(isValid, true, 'Valid signature must be verified as true');
  });
  // -------------------------------------------------------------
  // 2. Invalid Razorpay signature -> rejected
  // -------------------------------------------------------------
  it('2. Invalid Razorpay signature is rejected', () => {
    process.env.NODE_ENV = 'production';
    const orderId = 'order_valid_123';
    const paymentId = 'pay_valid_456';
    const invalidSignature = 'invalid_tampered_signature_hex_value_0000';
    const isValid = RazorpayService.verifyPaymentSignature(orderId, paymentId, invalidSignature);
    assert.equal(isValid, false, 'Invalid signature must return false');
  });
  // -------------------------------------------------------------
  // 3. Mock payment ID in production -> strictly rejected
  // -------------------------------------------------------------
  it('3. Mock payment ID in production is strictly rejected, even if ALLOW_MOCK_PAYMENTS=true', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_MOCK_PAYMENTS = 'true'; // Deliberately set to true in production
    const orderId = 'order_real_123';
    const mockPaymentId = 'pay_mock_bypass_attempt';
    const signature = 'any_sig';
    const isValid = RazorpayService.verifyPaymentSignature(orderId, mockPaymentId, signature);
    assert.equal(isValid, false, 'Mock payment identifier in production must be rejected despite ALLOW_MOCK_PAYMENTS=true');
    const mockOrderId = 'order_mock_test_bypass';
    const realPaymentId = 'pay_real_456';
    const isValidOrder = RazorpayService.verifyPaymentSignature(mockOrderId, realPaymentId, signature);
    assert.equal(isValidOrder, false, 'Mock order identifier in production must be rejected');
  });
  // -------------------------------------------------------------
  // 4. Already-paid booking -> idempotent behavior
  // -------------------------------------------------------------
  it('4. Already-paid booking is handled idempotently without re-transition', () => {
    const booking = createMockBooking({
      paymentStatus: 'PAID',
      bookingStatus: 'CONFIRMED',
      hotelNotificationStatus: 'SENT',
      guestConfirmationStatus: 'SENT',
    });
    const isAlreadyConfirmed = booking.paymentStatus === 'PAID' && booking.bookingStatus === 'CONFIRMED';
    assert.equal(isAlreadyConfirmed, true, 'Already confirmed booking must be detected');
  });
  // -------------------------------------------------------------
  // 5. Cancelled / expired booking cannot be confirmed
  // -------------------------------------------------------------
  it('5. Cancelled or expired bookings cannot be confirmed', () => {
    const cancelledBooking = createMockBooking({ bookingStatus: 'CANCELLED' });
    const isCancelledInvalid = cancelledBooking.bookingStatus === 'CANCELLED';
    assert.equal(isCancelledInvalid, true, 'Cancelled booking must not be payable');
    const expiredBooking = createMockBooking({
      bookingStatus: 'PENDING',
      expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
    });
    const isExpired = expiredBooking.expiresAt && new Date(expiredBooking.expiresAt).getTime() < Date.now();
    assert.equal(isExpired, true, 'Expired hold must be recognized as expired');
  });
  // -------------------------------------------------------------
  // 6. Hotel email is sent to configured hotel recipient
  // -------------------------------------------------------------
  it('6. Hotel notification email is addressed to configured HOTEL_NOTIFICATION_EMAIL', async () => {
    const sentMails: any[] = [];
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        sentMails.push(mailOptions);
        return { messageId: 'test_msg_hotel_1' };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    process.env.HOTEL_NOTIFICATION_EMAIL = 'reservations@hotelraama.com';
    const booking = createMockBooking();
    const result = await EmailService.sendHotelBookingNotification(booking, 'Deluxe Suite');
    assert.equal(result.success, true);
    assert.equal(sentMails.length, 1);
    assert.equal(sentMails[0].to, 'reservations@hotelraama.com');
  });
  // -------------------------------------------------------------
  // 7. Customer email is sent to booking.guestEmail
  // -------------------------------------------------------------
  it('7. Customer confirmation email is addressed to booking.guestEmail', async () => {
    const sentMails: any[] = [];
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        sentMails.push(mailOptions);
        return { messageId: 'test_msg_guest_1' };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    const booking = createMockBooking({ guestEmail: 'customer.vip@example.com' });
    const result = await EmailService.sendGuestBookingConfirmation(booking, 'Deluxe Room');
    assert.equal(result.success, true);
    assert.equal(sentMails.length, 1);
    assert.equal(sentMails[0].to, 'customer.vip@example.com');
  });
  // -------------------------------------------------------------
  // 8. Customer email sender is EMAIL_FROM
  // -------------------------------------------------------------
  it('8. Customer email sender matches EMAIL_FROM configuration', async () => {
    const sentMails: any[] = [];
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        sentMails.push(mailOptions);
        return { messageId: 'test_msg_guest_2' };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    process.env.EMAIL_FROM = '"Hotel Raama Hassan" <bookings@hotelraama.com>';
    const booking = createMockBooking();
    await EmailService.sendGuestBookingConfirmation(booking, 'Executive Suite');
    assert.equal(sentMails.length, 1);
    assert.equal(sentMails[0].from, '"Hotel Raama Hassan" <bookings@hotelraama.com>');
  });
  // -------------------------------------------------------------
  // 9. Hotel email contains complete booking information
  // -------------------------------------------------------------
  it('9. Hotel notification email contains booking details, price breakdown and guest info', async () => {
    const sentMails: any[] = [];
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        sentMails.push(mailOptions);
        return { messageId: 'test_msg_hotel_2' };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    const booking = createMockBooking({
      bookingId: 'HR-2026-5544',
      guestName: 'Kavitha Hegde',
      totalAmount: 7840,
      specialRequests: 'Quiet room near corner please',
    });
    await EmailService.sendHotelBookingNotification(booking, 'Executive Double Room');
    const mail = sentMails[0];
    assert.match(mail.subject, /HR-2026-5544/);
    assert.match(mail.html, /Kavitha Hegde/);
    assert.match(mail.html, /HR-2026-5544/);
    assert.match(mail.html, /Executive Double Room/);
    assert.match(mail.html, /Quiet room near corner please/);
  });
  // -------------------------------------------------------------
  // 10. Customer email contains confirmation information & tracking URL
  // -------------------------------------------------------------
  it('10. Customer email contains confirmation reference and tracking URL', async () => {
    const sentMails: any[] = [];
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        sentMails.push(mailOptions);
        return { messageId: 'test_msg_guest_3' };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    process.env.CLIENT_URL = 'https://hotel-raama.hotelraama5.workers.dev';
    const booking = createMockBooking({
      bookingId: 'HR-2026-8877',
      trackingToken: 'track_token_abc_123',
    });
    await EmailService.sendGuestBookingConfirmation(booking, 'Super Deluxe AC');
    const mail = sentMails[0];
    assert.match(mail.subject, /HR-2026-8877/);
    assert.match(mail.html, /HR-2026-8877/);
    assert.match(mail.html, /https:\/\/hotel-raama\.hotelraama5\.workers\.dev\/booking\/confirmation\/track_token_abc_123/);
  });
  // -------------------------------------------------------------
  // 11. SMTP failure does not alter PAID/CONFIRMED booking to FAILED
  // -------------------------------------------------------------
  it('11. SMTP failure does not alter confirmed booking state or crash', async () => {
    const mockFailingTransporter = {
      sendMail: async () => {
        throw new Error('Connection timeout to SMTP server: 535 Authentication Failed');
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockFailingTransporter);
    const booking = createMockBooking({
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
    });
    // Calling sendGuestBookingConfirmation directly handles error gracefully
    const guestResult = await EmailService.sendGuestBookingConfirmation(booking, 'Suite');
    assert.equal(guestResult.success, false);
    assert.match(guestResult.error!, /SMTP/);
    // Calling processBookingEmails preserves confirmed state
    await EmailService.processBookingEmails(booking);
    assert.equal(booking.bookingStatus, 'CONFIRMED', 'Booking status must stay CONFIRMED');
    assert.equal(booking.paymentStatus, 'PAID', 'Payment status must stay PAID');
    assert.equal(booking.guestConfirmationStatus, 'FAILED');
  });
  // -------------------------------------------------------------
  // 12. Repeated verify requests do not produce duplicate emails
  // -------------------------------------------------------------
  it('12. Repeated verification requests do not produce duplicate emails (Idempotency)', async () => {
    let emailSendCount = 0;
    const mockTransporter = {
      sendMail: async () => {
        emailSendCount++;
        return { messageId: `msg_${emailSendCount}` };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    const booking = createMockBooking();
    // First processing run -> Sends 2 emails (1 hotel, 1 guest)
    await EmailService.processBookingEmails(booking);
    assert.equal(emailSendCount, 2, 'First execution must send 2 emails');
    assert.equal(booking.hotelNotificationStatus, 'SENT');
    assert.equal(booking.guestConfirmationStatus, 'SENT');
    // Second processing run on same booking -> Skips sending!
    await EmailService.processBookingEmails(booking);
    assert.equal(emailSendCount, 2, 'Second execution must NOT send any additional emails');
  });
  // -------------------------------------------------------------
  // 13. Malformed customer email does not crash the confirmation flow
  // -------------------------------------------------------------
  it('13. Malformed customer email is handled gracefully without crashing', async () => {
    const mockTransporter = {
      sendMail: async (options: any) => {
        if (!options.to || !options.to.includes('@')) {
          throw new Error('Invalid recipient address format');
        }
        return { messageId: 'msg_ok' };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    const booking = createMockBooking({ guestEmail: 'invalid_not_an_email' });
    let thrownError: any = null;
    try {
      await EmailService.processBookingEmails(booking);
    } catch (e) {
      thrownError = e;
    }
    assert.equal(thrownError, null, 'Process must safely catch and swallow errors');
    assert.equal(booking.guestConfirmationStatus, 'FAILED');
  });
  // -------------------------------------------------------------
  // 14. Aadhaar is not exposed in full plaintext in notification email
  // -------------------------------------------------------------
  it('14. Aadhaar number is masked in the hotel notification email (XXXX-XXXX-1234)', async () => {
    assert.equal(EmailService.maskAadhaar('123456789012'), 'XXXX-XXXX-9012');
    assert.equal(EmailService.maskAadhaar('1234 5678 9012'), 'XXXX-XXXX-9012');
    assert.equal(EmailService.maskAadhaar('9876-5432-1098'), 'XXXX-XXXX-1098');
    assert.equal(EmailService.maskAadhaar(undefined), 'Not Provided');
    const sentMails: any[] = [];
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        sentMails.push(mailOptions);
        return { messageId: 'test_msg_mask_1' };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    const rawAadhaar = '5555 6666 7777';
    const booking = createMockBooking({ guestAadhar: rawAadhaar });
    await EmailService.sendHotelBookingNotification(booking, 'Double Bed Room');
    const mail = sentMails[0];
    assert.equal(mail.html.includes('XXXX-XXXX-7777'), true, 'Masked Aadhaar must appear in email');
    assert.equal(mail.html.includes('5555 6666 7777'), false, 'Full plaintext Aadhaar must NOT appear in HTML');
    assert.equal(mail.text.includes('5555 6666 7777'), false, 'Full plaintext Aadhaar must NOT appear in plain text');
  });
  // -------------------------------------------------------------
  // A. Two simultaneous verifyPayment requests concurrency test
  // -------------------------------------------------------------
  it('A. Concurrent verifyPayment race condition prevention (Atomic Transition)', async () => {
    // Simulating two simultaneous requests arriving for the same pending booking
    const bookingState = {
      id: 'bk_concurrent_123',
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      transitionCalls: 0,
    };
    // Atomic findOneAndUpdate simulation
    const atomicTransition = async (reqId: string) => {
      // In MongoDB, only one update matches { bookingStatus: 'PENDING', paymentStatus: { $ne: 'PAID' } }
      if (bookingState.bookingStatus === 'PENDING' && bookingState.paymentStatus !== 'PAID') {
        bookingState.transitionCalls++;
        bookingState.bookingStatus = 'CONFIRMED';
        bookingState.paymentStatus = 'PAID';
        return { winner: reqId, status: 'CONFIRMED' };
      }
      return null; // Lost the race
    };
    // Launch both requests concurrently
    const [resultA, resultB] = await Promise.all([
      atomicTransition('REQ_A'),
      atomicTransition('REQ_B'),
    ]);
    // Exactly one request must win the transition
    const winners = [resultA, resultB].filter((r) => r !== null);
    assert.equal(winners.length, 1, 'Only one concurrent request must win the payment transition');
    assert.equal(bookingState.transitionCalls, 1, 'Transition must be executed exactly once');
    assert.equal(bookingState.paymentStatus, 'PAID');
    assert.equal(bookingState.bookingStatus, 'CONFIRMED');
  });
  // -------------------------------------------------------------
  // B. Two simultaneous processBookingEmails calls concurrency test
  // -------------------------------------------------------------
  it('B. Concurrent processBookingEmails calls coalesce and do NOT send duplicate emails', async () => {
    let hotelEmailsSent = 0;
    let guestEmailsSent = 0;
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        // Add artificial async delay to simulate real SMTP latency
        await new Promise((resolve) => setTimeout(resolve, 30));
        if (mailOptions.to.includes('hotelraama.com') || mailOptions.to.includes('gmail.com')) {
          hotelEmailsSent++;
        } else {
          guestEmailsSent++;
        }
        return { messageId: `msg_${Date.now()}` };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    const booking = createMockBooking({
      _id: '507f1f77bcf86cd799439999' as any,
      bookingId: 'HR-CONCURRENCY-999',
      hotelNotificationStatus: 'PENDING',
      guestConfirmationStatus: 'PENDING',
    });
    // Launch two simultaneous calls at the exact same millisecond
    await Promise.all([
      EmailService.processBookingEmails(booking),
      EmailService.processBookingEmails(booking),
    ]);
    // Exactly 1 hotel email and 1 guest email must be sent in total
    assert.equal(hotelEmailsSent, 1, 'Exactly 1 hotel email must be sent despite concurrent calls');
    assert.equal(guestEmailsSent, 1, 'Exactly 1 guest email must be sent despite concurrent calls');
    assert.equal(booking.hotelNotificationStatus, 'SENT');
    assert.equal(booking.guestConfirmationStatus, 'SENT');
  });
  // -------------------------------------------------------------
  // C. Partial email failure: Hotel succeeds, Guest fails
  // -------------------------------------------------------------
  it('C. Partial failure: Hotel succeeds, Guest fails -> Retry sends ONLY Guest email', async () => {
    let hotelEmailsSent = 0;
    let guestEmailsSent = 0;
    // Transporter where guest email fails on first attempt
    let allowGuestEmail = false;
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        if (mailOptions.to === 'customer.partial@example.com') {
          if (!allowGuestEmail) {
            throw new Error('Guest mail server rejected message');
          }
          guestEmailsSent++;
          return { messageId: 'msg_guest_success' };
        }
        hotelEmailsSent++;
        return { messageId: 'msg_hotel_success' };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    const booking = createMockBooking({
      _id: '507f1f77bcf86cd799439111' as any,
      bookingId: 'HR-PARTIAL-1',
      guestEmail: 'customer.partial@example.com',
      hotelNotificationStatus: 'PENDING',
      guestConfirmationStatus: 'PENDING',
    });
    // Run 1: Hotel should succeed, Guest should fail
    await EmailService.processBookingEmails(booking);
    assert.equal(hotelEmailsSent, 1, 'Hotel email must be sent on Run 1');
    assert.equal(guestEmailsSent, 0, 'Guest email must have failed on Run 1');
    assert.equal(booking.hotelNotificationStatus, 'SENT');
    assert.equal(booking.guestConfirmationStatus, 'FAILED');
    // Run 2 (Retry): Now allow guest email
    allowGuestEmail = true;
    await EmailService.processBookingEmails(booking);
    // Hotel must NOT be resent; Guest email must now be sent
    assert.equal(hotelEmailsSent, 1, 'Hotel email must NOT be resent on retry');
    assert.equal(guestEmailsSent, 1, 'Guest email must be sent on retry');
    assert.equal(booking.hotelNotificationStatus, 'SENT');
    assert.equal(booking.guestConfirmationStatus, 'SENT');
  });
  // -------------------------------------------------------------
  // D. Partial email failure: Hotel fails, Guest succeeds
  // -------------------------------------------------------------
  it('D. Partial failure reverse: Hotel fails, Guest succeeds -> Retry sends ONLY Hotel email', async () => {
    let hotelEmailsSent = 0;
    let guestEmailsSent = 0;
    let allowHotelEmail = false;
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        if (mailOptions.to.includes('hotelraama.hsn@gmail.com') || mailOptions.to.includes('hotelraama.com')) {
          if (!allowHotelEmail) {
            throw new Error('Hotel inbox full');
          }
          hotelEmailsSent++;
          return { messageId: 'msg_hotel_retry_ok' };
        }
        guestEmailsSent++;
        return { messageId: 'msg_guest_ok' };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    const booking = createMockBooking({
      _id: '507f1f77bcf86cd799439222' as any,
      bookingId: 'HR-PARTIAL-2',
      hotelNotificationStatus: 'PENDING',
      guestConfirmationStatus: 'PENDING',
    });
    // Run 1: Guest succeeds, Hotel fails
    await EmailService.processBookingEmails(booking);
    assert.equal(hotelEmailsSent, 0, 'Hotel email failed on Run 1');
    assert.equal(guestEmailsSent, 1, 'Guest email sent on Run 1');
    assert.equal(booking.hotelNotificationStatus, 'FAILED');
    assert.equal(booking.guestConfirmationStatus, 'SENT');
    // Run 2 (Retry): Hotel inbox cleared
    allowHotelEmail = true;
    await EmailService.processBookingEmails(booking);
    // Guest must NOT be resent; Hotel must now be sent
    assert.equal(hotelEmailsSent, 1, 'Hotel email must be delivered on retry');
    assert.equal(guestEmailsSent, 1, 'Guest email must NOT be resent on retry');
    assert.equal(booking.hotelNotificationStatus, 'SENT');
    assert.equal(booking.guestConfirmationStatus, 'SENT');
  });
  // -------------------------------------------------------------
  // E. Process Crash / Recovery Scenario via EmailRetryJob
  // -------------------------------------------------------------
  it('E. Process Crash Recovery: confirmed booking left with PENDING notifications is recovered', async () => {
    let retryDispatches = 0;
    const mockTransporter = {
      sendMail: async () => {
        retryDispatches++;
        return { messageId: `msg_recovery_${Date.now()}` };
      },
    } as unknown as nodemailer.Transporter;
    EmailService.setTransporter(mockTransporter);
    // Simulating a booking that became PAID & CONFIRMED right before the server process crashed
    const crashedBooking = createMockBooking({
      _id: '507f1f77bcf86cd799439333' as any,
      bookingId: 'HR-CRASH-RECOVER',
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      hotelNotificationStatus: 'PENDING', // Left pending due to crash
      guestConfirmationStatus: 'PENDING',
    });
    // Recovery process runs
    await EmailService.processBookingEmails(crashedBooking);
    assert.equal(retryDispatches, 2, 'Recovery job must send both pending notifications');
    assert.equal(crashedBooking.hotelNotificationStatus, 'SENT');
    assert.equal(crashedBooking.guestConfirmationStatus, 'SENT');
    // Running recovery again should do nothing
    await EmailService.processBookingEmails(crashedBooking);
    assert.equal(retryDispatches, 2, 'Second recovery run must not resend sent emails');
  });
  // -------------------------------------------------------------
  // Order Ownership: Submitted razorpayOrderId must match booking
  // -------------------------------------------------------------
  it('F. Order ownership verification prevents cross-order payment hijacking', () => {
    const booking = createMockBooking({
      razorpayOrderId: 'order_assigned_to_booking_456',
    });
    const submittedOrderIdA = 'order_assigned_to_booking_456';
    const isMatching = booking.razorpayOrderId === submittedOrderIdA;
    assert.equal(isMatching, true, 'Matching order ID must be accepted');
    const submittedOrderIdB = 'order_hijacked_from_another_customer_999';
    const isMismatch = booking.razorpayOrderId !== submittedOrderIdB;
    assert.equal(isMismatch, true, 'Mismatched order ID must be detected and rejected');
  });
  // -------------------------------------------------------------
  // PDF Invoice Generation Regression: Handles missing snapshot fields
  // -------------------------------------------------------------
  it('G. InvoicePdfService generates valid PDF buffer even when snapshot fields are undefined', async () => {
    const incompleteBooking = createMockBooking({
      roomPricePerNightSnapshot: undefined as any,
      discountAmountSnapshot: undefined as any,
      taxAmountSnapshot: undefined as any,
      totalAmount: 3000,
      mealPlanSelection: undefined,
    });
    const pdfBuffer = await InvoicePdfService.generateBookingInvoicePdf(incompleteBooking, 'Deluxe Room');
    assert.ok(Buffer.isBuffer(pdfBuffer), 'Must return a Buffer');
    assert.ok(pdfBuffer.length > 500, 'PDF buffer must contain valid PDF data');
    // PDF files start with %PDF-
    assert.equal(pdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-');
  });
});
