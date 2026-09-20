import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { IBooking, Booking } from '../models/Booking';
import { HotelSetting } from '../models/HotelSetting';
import { RoomType } from '../models/RoomType';
import { InvoicePdfService } from './InvoicePdfService';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Helper to mask Aadhaar number to prevent exposing sensitive personal data
   * Format: XXXX-XXXX-1234
   */
  public static maskAadhaar(aadhaar?: string): string {
    if (!aadhaar) return 'Not Provided';
    const digits = aadhaar.replace(/\D/g, '');
    if (digits.length < 4) return 'XXXX-XXXX-XXXX';
    const last4 = digits.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }

  /**
   * Format currency amounts safely
   */
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }

  /**
   * Initialize or retrieve the active Nodemailer SMTP transporter
   */
  public static getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  /**
   * Set custom transporter (useful for isolated unit testing)
   */
  public static setTransporter(customTransporter: nodemailer.Transporter | null) {
    this.transporter = customTransporter;
  }

  /**
   * Resolve the configured hotel notification recipient email address
   */
  public static async resolveHotelNotificationEmail(): Promise<string> {
    if (process.env.HOTEL_NOTIFICATION_EMAIL && process.env.HOTEL_NOTIFICATION_EMAIL.trim()) {
      return process.env.HOTEL_NOTIFICATION_EMAIL.trim();
    }

    try {
      const setting = await HotelSetting.findOne();
      if (setting?.notificationEmail) return setting.notificationEmail.trim();
      if (setting?.email) return setting.email.trim();
    } catch {
      // Fallback
    }

    return 'hotelraama.hsn@gmail.com';
  }

  /**
   * Resolve the official sender email address (EMAIL_FROM)
   */
  public static resolveSenderEmail(): string {
    if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) {
      return process.env.EMAIL_FROM.trim();
    }
    return '"Hotel Raama Reservations" <hotelraama.hsn@gmail.com>';
  }

  /**
   * Resolve customer booking tracking URL based on CLIENT_URL environment variable
   */
  public static getTrackingUrl(trackingToken: string): string {
    const clientBase = (process.env.CLIENT_URL || 'https://hotel-raama.hotelraama5.workers.dev').replace(/\/+$/, '');
    return `${clientBase}/booking/confirmation/${trackingToken}`;
  }

  /**
   * REQUIREMENT 1: Send comprehensive booking details to Hotel's notification email
   */
  public static async sendHotelBookingNotification(
    booking: IBooking,
    roomTypeName: string = 'Room'
  ): Promise<EmailResult> {
    const transporter = this.getTransporter();
    const recipient = await this.resolveHotelNotificationEmail();
    const sender = this.resolveSenderEmail();
    const maskedAadhaar = this.maskAadhaar(booking.guestAadhar);

    const checkInStr = new Date(booking.checkIn).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const checkOutStr = new Date(booking.checkOut).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const mealPlans = [];
    if (booking.mealPlanSelection?.breakfast) mealPlans.push('Breakfast');
    if (booking.mealPlanSelection?.lunch) mealPlans.push('Lunch');
    if (booking.mealPlanSelection?.dinner) mealPlans.push('Dinner');
    const mealPlanText = mealPlans.length > 0 ? mealPlans.join(', ') : 'None (Room Only)';

    const subject = `[New Booking Confirmed] ${booking.bookingId} - ${booking.guestName} (${roomTypeName})`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5f0; margin: 0; padding: 20px; color: #1a202c; }
    .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #0b1849; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #d4af37; text-transform: uppercase; font-weight: bold; }
    .content { padding: 24px; }
    .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0b1849; border-bottom: 2px solid #d4af37; padding-bottom: 6px; margin-top: 20px; margin-bottom: 12px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; }
    .grid-table td { padding: 8px 10px; border-bottom: 1px solid #edf2f7; }
    .grid-table td.label { font-weight: 600; color: #4a5568; width: 40%; background-color: #f8fafc; }
    .grid-table td.value { color: #1a202c; }
    .highlight-box { background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin-bottom: 18px; border-radius: 4px; }
    .highlight-box strong { color: #065f46; font-size: 14px; }
    .footer { background-color: #edf2f7; padding: 14px; text-align: center; font-size: 11px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HOTEL RAAMA, HASSAN</h1>
      <p>Official Reservation Alert — Verified Direct Booking</p>
    </div>

    <div class="content">
      <div class="highlight-box">
        <strong>Booking Confirmed & Payment Verified</strong><br/>
        <span>A new room reservation has been confirmed and paid online via Razorpay.</span>
      </div>

      <div class="section-title">Reservation Overview</div>
      <table class="grid-table">
        <tr><td class="label">Booking ID</td><td class="value"><strong>${booking.bookingId}</strong></td></tr>
        <tr><td class="label">Payment Status</td><td class="value" style="color: #059669; font-weight: bold;">PAID</td></tr>
        <tr><td class="label">Booking Status</td><td class="value"><strong>CONFIRMED</strong></td></tr>
        <tr><td class="label">Razorpay Payment ID</td><td class="value"><code>${booking.razorpayPaymentId || 'N/A'}</code></td></tr>
        <tr><td class="label">Razorpay Order ID</td><td class="value"><code>${booking.razorpayOrderId || 'N/A'}</code></td></tr>
        <tr><td class="label">Confirmation Timestamp</td><td class="value">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
      </table>

      <div class="section-title">Guest Details</div>
      <table class="grid-table">
        <tr><td class="label">Guest Name</td><td class="value"><strong>${booking.guestName}</strong></td></tr>
        <tr><td class="label">Guest Email</td><td class="value"><a href="mailto:${booking.guestEmail}">${booking.guestEmail}</a></td></tr>
        <tr><td class="label">Guest Phone</td><td class="value"><a href="tel:${booking.guestPhone}">${booking.guestPhone}</a></td></tr>
        <tr><td class="label">Aadhaar ID (Masked)</td><td class="value"><code>${maskedAadhaar}</code></td></tr>
      </table>

      <div class="section-title">Stay & Room Details</div>
      <table class="grid-table">
        <tr><td class="label">Room Category</td><td class="value"><strong>${roomTypeName}</strong></td></tr>
        <tr><td class="label">Check-In Date</td><td class="value"><strong>${checkInStr}</strong> (Standard: 12:00 PM)</td></tr>
        <tr><td class="label">Check-Out Date</td><td class="value"><strong>${checkOutStr}</strong> (Standard: 12:00 PM)</td></tr>
        <tr><td class="label">Duration</td><td class="value">${booking.numNights} Night(s)</td></tr>
        <tr><td class="label">Number of Guests</td><td class="value">${booking.numGuests} Guest(s)</td></tr>
        <tr><td class="label">Extra Person</td><td class="value">${booking.extraPerson ? 'Yes (+1 Extra Bed)' : 'No'}</td></tr>
        <tr><td class="label">Meal Plan Selection</td><td class="value">${mealPlanText}</td></tr>
        <tr><td class="label">Special Requests</td><td class="value">${booking.specialRequests ? booking.specialRequests : 'None'}</td></tr>
      </table>

      <div class="section-title">Financial & Tax Breakdown</div>
      <table class="grid-table">
        <tr><td class="label">Room Tariff (Snapshot)</td><td class="value">${this.formatCurrency(booking.roomPricePerNightSnapshot)} / night</td></tr>
        ${booking.extraPerson ? `<tr><td class="label">Extra Person Total</td><td class="value">${this.formatCurrency(booking.extraPersonChargeSnapshot || 0)}</td></tr>` : ''}
        ${booking.mealPlanSelection?.pricePerNight ? `<tr><td class="label">Meal Plan Total</td><td class="value">${this.formatCurrency((booking.mealPlanSelection.pricePerNight || 0) * booking.numNights)}</td></tr>` : ''}
        ${booking.discountAmountSnapshot ? `<tr><td class="label">Discount Applied (${booking.couponCodeSnapshot || 'Coupon'})</td><td class="value" style="color: #dc2626;">-${this.formatCurrency(booking.discountAmountSnapshot)}</td></tr>` : ''}
        <tr><td class="label">GST (12% Snapshot)</td><td class="value">${this.formatCurrency(booking.taxAmountSnapshot)}</td></tr>
        <tr style="background-color: #fefce8;"><td class="label" style="font-size: 14px; color: #0b1849;"><strong>Total Amount Collected</strong></td><td class="value" style="font-size: 16px; color: #0b1849; font-weight: bold;">${this.formatCurrency(booking.totalAmount)}</td></tr>
      </table>
    </div>

    <div class="footer">
      This is an automated operational notification generated by the Hotel Raama reservation platform.
    </div>
  </div>
</body>
</html>
    `.trim();

    const plainText = `
HOTEL RAAMA - NEW VERIFIED BOOKING NOTIFICATION
===============================================
Booking ID: ${booking.bookingId}
Payment Status: PAID
Booking Status: CONFIRMED
Razorpay Payment ID: ${booking.razorpayPaymentId || 'N/A'}
Razorpay Order ID: ${booking.razorpayOrderId || 'N/A'}

GUEST DETAILS:
- Name: ${booking.guestName}
- Email: ${booking.guestEmail}
- Phone: ${booking.guestPhone}
- Aadhaar (Masked): ${maskedAadhaar}

STAY DETAILS:
- Room Category: ${roomTypeName}
- Check-In: ${checkInStr} (12:00 PM)
- Check-Out: ${checkOutStr} (12:00 PM)
- Duration: ${booking.numNights} Night(s)
- Guests: ${booking.numGuests}
- Extra Person: ${booking.extraPerson ? 'Yes' : 'No'}
- Meal Plan: ${mealPlanText}
- Special Requests: ${booking.specialRequests || 'None'}

FINANCIAL BREAKDOWN:
- Room Rate per Night: ${this.formatCurrency(booking.roomPricePerNightSnapshot)}
- GST Tax: ${this.formatCurrency(booking.taxAmountSnapshot)}
- Total Amount Paid: ${this.formatCurrency(booking.totalAmount)}
===============================================
    `.trim();

    if (!transporter) {
      console.warn(
        `[EmailService] SMTP not configured. Skipped sending hotel booking email for booking ${booking.bookingId}. (Target: ${recipient})`
      );
      return { success: false, error: 'SMTP credentials not configured on server.' };
    }

    try {
      const info = await transporter.sendMail({
        from: sender,
        to: recipient,
        subject,
        text: plainText,
        html: htmlContent,
      });

      console.log(`[EmailService] Hotel notification sent for ${booking.bookingId} to ${recipient} (msgId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailService Error] Failed to send hotel notification for ${booking.bookingId}:`, err.message || err);
      return { success: false, error: err.message || 'SMTP delivery failed' };
    }
  }

  /**
   * REQUIREMENT 2: Send guest confirmation email to client with branded layout and optional PDF invoice
   */
  public static async sendGuestBookingConfirmation(
    booking: IBooking,
    roomTypeName: string = 'Executive Room',
    pdfBuffer?: Buffer
  ): Promise<EmailResult> {
    const transporter = this.getTransporter();
    const recipient = booking.guestEmail;
    const sender = this.resolveSenderEmail();
    const trackingUrl = this.getTrackingUrl(booking.trackingToken);

    const checkInStr = new Date(booking.checkIn).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const checkOutStr = new Date(booking.checkOut).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const mealPlans = [];
    if (booking.mealPlanSelection?.breakfast) mealPlans.push('Breakfast Included');
    if (booking.mealPlanSelection?.lunch) mealPlans.push('Lunch Included');
    if (booking.mealPlanSelection?.dinner) mealPlans.push('Dinner Included');
    const mealPlanSummary = mealPlans.length > 0 ? mealPlans.join(', ') : 'Room Only (EP Plan)';

    const subject = `Booking Confirmation - Hotel Raama, Hassan (${booking.bookingId})`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5f0; margin: 0; padding: 20px; color: #0b1849; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 4px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(11,24,73,0.06); }
    .header { background-color: #0b1849; color: #fffce1; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-family: Georgia, serif; font-size: 26px; letter-spacing: 1.5px; color: #fffce1; }
    .header .subtitle { margin: 6px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #d4af37; font-weight: bold; }
    .banner { background-color: #10b981; color: #ffffff; text-align: center; padding: 10px 16px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; }
    .body { padding: 28px 24px; }
    .greeting { font-size: 16px; line-height: 1.6; margin-bottom: 20px; color: #1f2937; }
    .booking-card { background-color: #faf9f6; border: 1px solid #e7e2d6; border-radius: 4px; padding: 18px; margin-bottom: 24px; }
    .booking-ref-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; margin: 0 0 4px; }
    .booking-ref-val { font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #0b1849; margin: 0 0 14px; }
    .details-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e5e7eb; font-size: 13px; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #4b5563; }
    .details-value { font-weight: 600; color: #111827; }
    .btn-container { text-align: center; margin: 28px 0 20px; }
    .btn { display: inline-block; background-color: #0b1849; color: #fffce1 !important; text-decoration: none; padding: 14px 28px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 2px; }
    .hotel-info-box { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; font-size: 12px; color: #475569; line-height: 1.6; }
    .footer { background-color: #0b1849; color: #94a3b8; padding: 16px; text-align: center; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HOTEL RAAMA</h1>
      <div class="subtitle">Luxury Hospitality & Fine Dining • Hassan, Karnataka</div>
    </div>

    <div class="banner">
      ✓ RESERVATION CONFIRMED & PAYMENT RECEIVED
    </div>

    <div class="body">
      <div class="greeting">
        Dear <strong>${booking.guestName}</strong>,<br/><br/>
        Thank you for choosing Hotel Raama. We are pleased to confirm your upcoming reservation. Your booking details and payment receipt are summarized below.
      </div>

      <div class="booking-card">
        <div class="booking-ref-title">Booking Confirmation Reference</div>
        <div class="booking-ref-val">${booking.bookingId}</div>

        <div class="details-row"><span class="details-label">Room Category</span><span class="details-value">${roomTypeName}</span></div>
        <div class="details-row"><span class="details-label">Check-In Date</span><span class="details-value">${checkInStr} (From 12:00 PM)</span></div>
        <div class="details-row"><span class="details-label">Check-Out Date</span><span class="details-value">${checkOutStr} (Until 12:00 PM)</span></div>
        <div class="details-row"><span class="details-label">Guests</span><span class="details-value">${booking.numGuests} Guest(s)${booking.extraPerson ? ' + Extra Bed' : ''}</span></div>
        <div class="details-row"><span class="details-label">Duration</span><span class="details-value">${booking.numNights} Night(s)</span></div>
        <div class="details-row"><span class="details-label">Meal Inclusions</span><span class="details-value">${mealPlanSummary}</span></div>
        <div class="details-row"><span class="details-label">Payment Status</span><span class="details-value" style="color: #059669;">PAID IN FULL</span></div>
        <div class="details-row"><span class="details-label">GST Tax (12%)</span><span class="details-value">${this.formatCurrency(booking.taxAmountSnapshot)}</span></div>
        <div class="details-row" style="padding-top: 10px;"><span class="details-label" style="font-size: 14px; font-weight: bold; color: #0b1849;">Total Paid</span><span class="details-value" style="font-size: 15px; color: #0b1849;">${this.formatCurrency(booking.totalAmount)}</span></div>
      </div>

      <div class="btn-container">
        <a href="${trackingUrl}" class="btn" target="_blank">Manage / Track Reservation Online</a>
      </div>

      <div class="hotel-info-box">
        <strong>Important Check-In Information:</strong><br/>
        • Standard Check-In time is 12:00 PM; Check-Out time is 12:00 PM.<br/>
        • Government-issued photo ID (such as Aadhaar, Voter ID, or Passport) is required for all adult guests at check-in.<br/>
        • Address: B.M. Road, Thanneeruhalla, Opp. S.D.M. Ayurvedic Hospital, Hassan, Karnataka - 573201.<br/>
        • 24/7 Front Desk Phone: <a href="tel:7899511330" style="color: #0b1849; font-weight: bold;">+91 78995 11330</a><br/>
        • WhatsApp Reception: <a href="https://wa.me/917899511330" style="color: #059669; font-weight: bold;">+91 78995 11330</a>
      </div>
    </div>

    <div class="footer">
      Hotel Raama • Hassan, Karnataka • Contact: hotelraama.hsn@gmail.com<br/>
      ${pdfBuffer ? 'An official Tax Invoice is attached to this email for your convenience.' : ''}
    </div>
  </div>
</body>
</html>
    `.trim();

    const plainText = `
HOTEL RAAMA - BOOKING CONFIRMATION
==================================
Dear ${booking.guestName},

Your reservation at Hotel Raama has been confirmed and paid in full.

Booking Reference: ${booking.bookingId}
Room Category: ${roomTypeName}
Check-In: ${checkInStr} (From 12:00 PM)
Check-Out: ${checkOutStr} (Until 12:00 PM)
Guests: ${booking.numGuests} (${booking.numNights} nights)
Meal Plan: ${mealPlanSummary}
Total Amount Paid: ${this.formatCurrency(booking.totalAmount)} (Includes 12% GST)

View or track your booking online:
${trackingUrl}

HOTEL CONTACT & LOCATION:
Hotel Raama, B.M. Road, Thanneeruhalla, Opp. SDM Ayurvedic Hospital, Hassan, Karnataka - 573201
Phone: +91 78995 11330 | WhatsApp: +91 78995 11330
Email: hotelraama.hsn@gmail.com
==================================
    `.trim();

    if (!transporter) {
      console.warn(
        `[EmailService] SMTP not configured. Skipped sending guest confirmation email for booking ${booking.bookingId}. (Target: ${recipient})`
      );
      return { success: false, error: 'SMTP credentials not configured on server.' };
    }

    try {
      const attachments = [];
      if (pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
        attachments.push({
          filename: `Invoice-${booking.bookingId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      }

      const info = await transporter.sendMail({
        from: sender,
        to: recipient,
        subject,
        text: plainText,
        html: htmlContent,
        attachments,
      });

      console.log(`[EmailService] Guest confirmation sent for ${booking.bookingId} to ${recipient} (msgId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EmailService Error] Failed to send guest confirmation for ${booking.bookingId}:`, err.message || err);
      return { success: false, error: err.message || 'SMTP delivery failed' };
    }
  }

  private static inFlightMap = new Map<string, Promise<void>>();

  /**
   * Idempotent, concurrency-safe, non-blocking background coordinator for all booking emails
   * Guaranteed:
   * 1. Coalesces concurrent calls for the same booking into a single execution
   * 2. Uses atomic document updates so multiple worker threads/processes cannot send duplicate emails
   * 3. Does not throw errors out to caller
   * 4. Does not roll back payment or confirmed booking
   * 5. Prevents duplicate email sending if already sent
   */
  public static async processBookingEmails(bookingIdOrDoc: string | IBooking): Promise<void> {
    const key =
      typeof bookingIdOrDoc === 'string'
        ? bookingIdOrDoc
        : (bookingIdOrDoc as any)._id?.toString() || bookingIdOrDoc.bookingId || 'booking_key';

    if (this.inFlightMap.has(key)) {
      return this.inFlightMap.get(key)!;
    }

    const execution = (async () => {
      try {
        await this.doProcessBookingEmails(bookingIdOrDoc);
      } finally {
        this.inFlightMap.delete(key);
      }
    })();

    this.inFlightMap.set(key, execution);
    return execution;
  }

  private static async doProcessBookingEmails(bookingIdOrDoc: string | IBooking): Promise<void> {
    try {
      const isDoc = typeof bookingIdOrDoc !== 'string';
      const bookingId = isDoc ? (bookingIdOrDoc as any)._id : bookingIdOrDoc;
      const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

      // 1. Fetch latest booking document from DB or use provided document
      let booking: IBooking | null = null;
      if (isDbConnected && typeof bookingId === 'string') {
        try {
          booking = await Booking.findById(bookingId).populate('roomTypeId');
        } catch {
          if (isDoc) booking = bookingIdOrDoc as IBooking;
        }
      } else if (isDoc) {
        booking = bookingIdOrDoc as IBooking;
      }

      if (!booking) {
        console.warn('[EmailService] Cannot process booking emails: Booking not found.');
        return;
      }

      // Populate roomTypeName
      let roomTypeName = 'Executive Room';
      if (booking.roomTypeId) {
        if (typeof booking.roomTypeId === 'object' && (booking.roomTypeId as any).name) {
          roomTypeName = (booking.roomTypeId as any).name;
        } else if (isDbConnected) {
          try {
            const rt = await RoomType.findById(booking.roomTypeId);
            if (rt) roomTypeName = rt.name;
          } catch {
            // Keep default
          }
        }
      }

      // Check if both emails are already sent
      if (booking.hotelNotificationStatus === 'SENT' && booking.guestConfirmationStatus === 'SENT') {
        return;
      }

      // Attempt PDF generation independently so a PDF failure does not stop email dispatch
      let invoicePdfBuffer: Buffer | undefined;
      try {
        invoicePdfBuffer = await InvoicePdfService.generateBookingInvoicePdf(booking, roomTypeName);
      } catch (pdfErr: any) {
        console.warn(`[EmailService] PDF Invoice generation notice for ${booking.bookingId} (sending email without attachment):`, pdfErr.message);
      }

      // -------------------------------------------------------------
      // 2. Hotel Notification with Atomic Claim
      // -------------------------------------------------------------
      let claimHotel = false;
      if (booking.hotelNotificationStatus !== 'SENT') {
        if (isDbConnected) {
          try {
            const claimed = await Booking.findOneAndUpdate(
              {
                _id: booking._id,
                hotelNotificationStatus: { $in: ['PENDING', 'FAILED'] },
              },
              {
                $set: { hotelNotificationStatus: 'PROCESSING' },
                $inc: { notificationAttempts: 1 },
              },
              { new: true }
            );
            if (claimed) {
              claimHotel = true;
            }
          } catch {
            // Fallback
          }
        } else {
          // Offline / unit test mode without active MongoDB
          if (booking.hotelNotificationStatus !== 'PROCESSING') {
            booking.hotelNotificationStatus = 'PROCESSING';
            claimHotel = true;
          }
        }
      }

      if (claimHotel) {
        const hotelResult = await this.sendHotelBookingNotification(booking, roomTypeName);
        if (isDbConnected) {
          try {
            if (hotelResult.success) {
              await Booking.findByIdAndUpdate(booking._id, {
                $set: { hotelNotificationStatus: 'SENT', emailSentAt: new Date() },
                $unset: { hotelNotificationError: 1 },
              });
            } else {
              await Booking.findByIdAndUpdate(booking._id, {
                $set: { hotelNotificationStatus: 'FAILED', hotelNotificationError: hotelResult.error?.slice(0, 500) },
              });
            }
          } catch {
            // Fallback
          }
        }
        booking.hotelNotificationStatus = hotelResult.success ? 'SENT' : 'FAILED';
        booking.hotelNotificationError = hotelResult.error;
        if (typeof booking.save === 'function') await booking.save();
      }

      // -------------------------------------------------------------
      // 3. Guest Confirmation with Atomic Claim
      // -------------------------------------------------------------
      let claimGuest = false;
      if (booking.guestConfirmationStatus !== 'SENT') {
        if (isDbConnected) {
          try {
            const claimed = await Booking.findOneAndUpdate(
              {
                _id: booking._id,
                guestConfirmationStatus: { $in: ['PENDING', 'FAILED'] },
              },
              {
                $set: { guestConfirmationStatus: 'PROCESSING' },
                $inc: { notificationAttempts: 1 },
              },
              { new: true }
            );
            if (claimed) {
              claimGuest = true;
            }
          } catch {
            // Fallback
          }
        } else {
          // Offline / unit test mode without active MongoDB
          if (booking.guestConfirmationStatus !== 'PROCESSING') {
            booking.guestConfirmationStatus = 'PROCESSING';
            claimGuest = true;
          }
        }
      }

      if (claimGuest) {
        const guestResult = await this.sendGuestBookingConfirmation(booking, roomTypeName, invoicePdfBuffer);
        if (isDbConnected) {
          try {
            if (guestResult.success) {
              await Booking.findByIdAndUpdate(booking._id, {
                $set: { guestConfirmationStatus: 'SENT', emailSentAt: new Date() },
                $unset: { guestConfirmationError: 1 },
              });
            } else {
              await Booking.findByIdAndUpdate(booking._id, {
                $set: { guestConfirmationStatus: 'FAILED', guestConfirmationError: guestResult.error?.slice(0, 500) },
              });
            }
          } catch {
            // Fallback
          }
        }
        booking.guestConfirmationStatus = guestResult.success ? 'SENT' : 'FAILED';
        booking.guestConfirmationError = guestResult.error;
        if (typeof booking.save === 'function') await booking.save();
      }
    } catch (err: any) {
      console.error('[EmailService Unexpected Error] Failed in processBookingEmails:', err.message || err);
      // Swallow error to protect the confirmed booking status
    }
  }
}
