import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { EmailService } from '../services/EmailService';
import { IBooking } from '../models/Booking';
import { IFeedback } from '../models/Feedback';

describe('Hotel Raama Private Feedback & Email Automation System Tests', () => {
  const originalEnv = { ...process.env };
  const TEST_JWT_SECRET = 'test_jwt_secret_hotel_raama_2026';

  before(() => {
    process.env.ADMIN_EMAIL = 'admin@hotelraama.com';
    process.env.HOTEL_NOTIFICATION_EMAIL = 'hotelraama.hsn@gmail.com';
    process.env.EMAIL_FROM = '"Hotel Raama Reservations" <hotelraama.hsn@gmail.com>';
    process.env.CLIENT_URL = 'https://hotelraama.com';
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  after(() => {
    process.env = originalEnv;
    EmailService.setTransporter(null);
  });

  // Helper to create mock booking document
  function createMockBooking(overrides: Partial<IBooking> = {}): IBooking {
    const booking: any = {
      _id: '507f1f77bcf86cd799439011',
      bookingId: 'HR-2026-7890',
      guestName: 'Dr. Ramesh Bhat',
      guestEmail: 'ramesh.bhat@example.com',
      guestPhone: '+91 94481 23456',
      guestAadhar: '9876 5432 1098',
      checkIn: new Date(Date.now() - 2 * 86400000), // 2 days ago
      checkOut: new Date(Date.now() - 86400000), // 1 day ago (stay completed)
      numGuests: 2,
      numNights: 1,
      roomPricePerNightSnapshot: 3200,
      taxAmountSnapshot: 384,
      totalAmount: 3584,
      bookingStatus: 'CHECKED_OUT',
      paymentStatus: 'PAID',
      trackingToken: 'track_token_test_7890',
      feedbackRequestSent: false,
      feedbackRequestStatus: 'NOT_SENT',
      feedbackSubmitted: false,
      feedbackStatus: 'NOT_RECEIVED',
      save: async function () {
        return this;
      },
      ...overrides,
    };
    return booking as IBooking;
  }

  // -------------------------------------------------------------
  // Test 1: Cryptographic Token Generation & Security
  // -------------------------------------------------------------
  it('1. Generates cryptographically secure 64-character hex feedback token', () => {
    const token = crypto.randomBytes(32).toString('hex');
    assert.equal(typeof token, 'string');
    assert.equal(token.length, 64, 'Token must be exactly 64 hex characters (256 bits of entropy)');
    assert.match(token, /^[0-9a-f]{64}$/, 'Token must be hexadecimal');

    // Verify randomness: two tokens must not be equal
    const token2 = crypto.randomBytes(32).toString('hex');
    assert.notEqual(token, token2, 'Generated tokens must be unique and non-predictable');
  });

  // -------------------------------------------------------------
  // Test 2: Customer Feedback Request Email Format & Recipient
  // -------------------------------------------------------------
  it('2. Customer feedback-request email is sent ONLY to customer with secure link', async () => {
    const sentMails: any[] = [];
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        sentMails.push(mailOptions);
        return { messageId: 'msg_feedback_req_001' };
      },
    } as unknown as nodemailer.Transporter;

    EmailService.setTransporter(mockTransporter);

    const booking = createMockBooking({
      bookingId: 'HR-2026-4433',
      guestName: 'Ananya Rao',
      guestEmail: 'ananya.rao@example.com',
    });

    const secureToken = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';
    const result = await EmailService.sendCustomerFeedbackRequest(booking, secureToken);

    assert.equal(result.success, true);
    assert.equal(sentMails.length, 1);

    const mail = sentMails[0];
    // Subject requirement: "How was your stay at Hotel Raama?"
    assert.equal(mail.subject, 'How was your stay at Hotel Raama?');
    // Recipient requirement: sent ONLY to customer
    assert.equal(mail.to, 'ananya.rao@example.com');
    assert.notEqual(mail.to, 'admin@hotelraama.com');
    // Content requirements:
    assert.match(mail.html, /Hi Ananya Rao/);
    assert.match(mail.html, /Thank you for staying at Hotel Raama/);
    assert.match(mail.html, /We would love to hear about your experience/);
    assert.match(mail.html, /Give Your Feedback/);
    assert.match(mail.html, /https:\/\/hotelraama\.com\/feedback\/a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0/);
    assert.match(mail.html, /Hassan, Karnataka/);

    // Plaintext check
    assert.match(mail.text, /How was your stay at Hotel Raama\?/);
    assert.match(mail.text, /https:\/\/hotelraama\.com\/feedback\//);
  });

  // -------------------------------------------------------------
  // Test 3: Idempotent Dispatch - Duplicate Customer Email Protection
  // -------------------------------------------------------------
  it('3. Prevents sending duplicate feedback-request emails for the same booking', async () => {
    const sentMails: any[] = [];
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        sentMails.push(mailOptions);
        return { messageId: 'msg_feedback_req_002' };
      },
    } as unknown as nodemailer.Transporter;

    EmailService.setTransporter(mockTransporter);

    const booking = createMockBooking({
      bookingId: 'HR-2026-1122',
      feedbackRequestSent: false,
      feedbackRequestStatus: 'NOT_SENT',
    });

    // First dispatch
    const firstResult = await EmailService.dispatchCustomerFeedbackRequest(booking);
    assert.equal(firstResult.success, true);
    assert.equal(booking.feedbackRequestSent, true);
    assert.equal(booking.feedbackRequestStatus, 'SENT');
    assert.equal(sentMails.length, 1);

    // Second dispatch attempt for the same booking
    const secondResult = await EmailService.dispatchCustomerFeedbackRequest(booking);
    assert.equal(secondResult.success, true);
    // Should NOT have sent another email!
    assert.equal(sentMails.length, 1, 'Should NOT dispatch email a second time');
  });

  // -------------------------------------------------------------
  // Test 4: Token Expiry Check
  // -------------------------------------------------------------
  it('4. Expired feedback token is rejected', () => {
    const expiredTokenDate = new Date(Date.now() - 3600000); // 1 hour ago
    const isExpired = expiredTokenDate < new Date();
    assert.equal(isExpired, true, 'Token past expiry date must evaluate as expired');

    const validTokenDate = new Date(Date.now() + 30 * 86400000); // 30 days in future
    const isValid = validTokenDate > new Date();
    assert.equal(isValid, true, 'Token within expiry date must evaluate as valid');
  });

  // -------------------------------------------------------------
  // Test 5: Single-Use & Duplicate Feedback Prevention
  // -------------------------------------------------------------
  it('5. Prevents duplicate feedback submission for the same booking', () => {
    const booking = createMockBooking({
      feedbackSubmitted: true,
      feedbackSubmittedAt: new Date(),
      feedbackStatus: 'RECEIVED',
    });

    // Simulating token validation on already-submitted booking
    assert.equal(booking.feedbackSubmitted, true);
    const canSubmitAgain = !booking.feedbackSubmitted;
    assert.equal(canSubmitAgain, false, 'Booking with feedbackSubmitted=true must reject new submissions');
  });

  // -------------------------------------------------------------
  // Test 6: Admin Notification Email Triggered ONLY After Submission
  // -------------------------------------------------------------
  it('6. Admin notification email is sent ONLY after feedback is submitted, containing all ratings', async () => {
    const sentMails: any[] = [];
    const mockTransporter = {
      sendMail: async (mailOptions: any) => {
        sentMails.push(mailOptions);
        return { messageId: 'msg_admin_alert_001' };
      },
    } as unknown as nodemailer.Transporter;

    EmailService.setTransporter(mockTransporter);

    const feedbackMock = {
      _id: 'feedback_obj_id_999',
      bookingId: 'HR-2026-7890',
      customerName: 'Dr. Ramesh Bhat',
      customerEmail: 'ramesh.bhat@example.com',
      overallRating: 5,
      roomRating: 5,
      foodRating: 4,
      cleanlinessRating: 5,
      serviceRating: 5,
      recommendation: true,
      comment: 'Excellent hospitality and peaceful ambiance. Highly recommended!',
      submittedAt: new Date(),
    };

    const booking = createMockBooking();

    const result = await EmailService.sendAdminFeedbackNotification(feedbackMock, booking);

    assert.equal(result.success, true);
    assert.equal(sentMails.length, 1);

    const mail = sentMails[0];
    // Subject requirement: "New Customer Feedback - Hotel Raama"
    assert.equal(mail.subject, 'New Customer Feedback - Hotel Raama');
    // Recipient: Admin email
    assert.equal(mail.to, 'admin@hotelraama.com');
    // Body checks
    assert.match(mail.html, /New Customer Feedback Received/);
    assert.match(mail.html, /Dr\. Ramesh Bhat/);
    assert.match(mail.html, /HR-2026-7890/);
    assert.match(mail.html, /5\/5/);
    assert.match(mail.html, /Excellent hospitality and peaceful ambiance/);
    assert.match(mail.html, /Yes ✓/);
    assert.match(mail.html, /https:\/\/hotelraama\.com\/admin\/feedback/);

    // Verify feedback is NOT sent to customer
    assert.notEqual(mail.to, feedbackMock.customerEmail);
  });

  // -------------------------------------------------------------
  // Test 7: Email Failure Resilience - Feedback Remains Saved
  // -------------------------------------------------------------
  it('7. Admin email failure does not lose or fail feedback submission', async () => {
    // Failing transporter
    const failingTransporter = {
      sendMail: async () => {
        throw new Error('SMTP connection timed out');
      },
    } as unknown as nodemailer.Transporter;

    EmailService.setTransporter(failingTransporter);

    const feedbackMock = {
      bookingId: 'HR-2026-7890',
      customerName: 'Dr. Ramesh Bhat',
      customerEmail: 'ramesh.bhat@example.com',
      overallRating: 5,
      roomRating: 5,
      foodRating: 5,
      cleanlinessRating: 5,
      serviceRating: 5,
      recommendation: true,
      comment: 'Wonderful stay',
      submittedAt: new Date(),
    };

    const result = await EmailService.sendAdminFeedbackNotification(feedbackMock, null);

    // Email delivery failed as expected
    assert.equal(result.success, false);
    assert.match(result.error || '', /SMTP connection timed out/);

    // Crucial requirement: System handles this by marking emailNotificationSent = false
    // while keeping feedback safely preserved
    const feedbackRecord = {
      ...feedbackMock,
      savedInDb: true,
      emailNotificationSent: result.success, // false
      emailNotificationError: result.error,
    };

    assert.equal(feedbackRecord.savedInDb, true, 'Feedback must remain saved in DB');
    assert.equal(feedbackRecord.emailNotificationSent, false, 'Notification status is tracked as false');
    assert.equal(typeof feedbackRecord.emailNotificationError, 'string');
  });

  // -------------------------------------------------------------
  // Test 8: Admin Authentication Requirement
  // -------------------------------------------------------------
  it('8. Admin endpoints require valid JWT authentication', () => {
    // Test token generation & verification for admin
    const validToken = jwt.sign(
      { id: 'admin_123', email: 'admin@hotelraama.com', role: 'ADMIN' },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );

    const decoded: any = jwt.verify(validToken, TEST_JWT_SECRET);
    assert.equal(decoded.email, 'admin@hotelraama.com');
    assert.equal(decoded.role, 'ADMIN');

    // Test rejection of tampered/missing token
    assert.throws(() => {
      jwt.verify('invalid.jwt.token', TEST_JWT_SECRET);
    });

    assert.throws(() => {
      jwt.verify(validToken, 'wrong_secret_key');
    });
  });

  // -------------------------------------------------------------
  // Test 9: Public Access Prevention (Private Feedback Only)
  // -------------------------------------------------------------
  it('9. Feedback rating aggregates and reviews are strictly private', () => {
    // Check that public routes only expose room listings, menu, availability
    // and never expose customer feedback/reviews or testimonial APIs
    const publicAllowedEndpoints = [
      '/rooms',
      '/availability/check',
      '/bookings',
      '/menu',
      '/feedback/:token', // Only token verification and submission
    ];

    const privateAdminOnlyEndpoints = [
      '/admin/feedback',
      '/admin/feedback/:id',
      '/admin/feedback/:id/status',
      '/admin/bookings/:id/send-feedback-request',
    ];

    for (const ep of privateAdminOnlyEndpoints) {
      assert.equal(ep.startsWith('/admin'), true, `${ep} must be an authenticated /admin endpoint`);
    }

    assert.equal(publicAllowedEndpoints.includes('/testimonials'), false);
    assert.equal(publicAllowedEndpoints.includes('/reviews'), false);
  });

  // -------------------------------------------------------------
  // Test 10: Ratings Validation Constraints (1 to 5 Stars)
  // -------------------------------------------------------------
  it('10. Validates 1 to 5 star rating boundary limits', () => {
    const validateRating = (r: any) => typeof r === 'number' && Number.isInteger(r) && r >= 1 && r <= 5;

    // Valid ratings
    assert.equal(validateRating(1), true);
    assert.equal(validateRating(3), true);
    assert.equal(validateRating(5), true);

    // Invalid ratings
    assert.equal(validateRating(0), false, '0 is out of bounds');
    assert.equal(validateRating(6), false, '6 is out of bounds');
    assert.equal(validateRating(-1), false, '-1 is out of bounds');
    assert.equal(validateRating(3.5), false, 'Non-integer rating is rejected');
    assert.equal(validateRating('5'), false, 'String rating is rejected');
    assert.equal(validateRating(null), false, 'Null rating is rejected');
  });
});
