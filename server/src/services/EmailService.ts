import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { IBooking, Booking } from '../models/Booking';
import { getHotelSettings } from './HotelSettingService';
import { RoomType } from '../models/RoomType';
import { InvoicePdfService } from './InvoicePdfService';
import { IEmailProvider, ResendEmailProvider, NodemailerEmailProvider } from './email';

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  private static customEmailProvider: IEmailProvider | null = null;

  /**
   * Explicitly set email provider (for unit testing with mocks or custom providers)
   */
  public static setEmailProvider(provider: IEmailProvider | null): void {
    this.customEmailProvider = provider;
  }

  /**
   * Resolve active email delivery provider.
   * Priority:
   * 1. Explicitly configured custom email provider (e.g. in unit tests)
   * 2. Resend HTTPS API provider (when RESEND_API_KEY is configured)
   * 3. Nodemailer SMTP provider (legacy fallback when SMTP credentials are present or custom transporter set)
   * 4. Resend provider default
   */
  public static getEmailProvider(): IEmailProvider {
    if (this.customEmailProvider) {
      return this.customEmailProvider;
    }

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
      return new ResendEmailProvider();
    }

    if (this.transporter || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)) {
      return new NodemailerEmailProvider(this.transporter);
    }

    return new ResendEmailProvider();
  }

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
   * Set custom transporter (useful for isolated unit testing & backward compatibility)
   */
  public static setTransporter(customTransporter: nodemailer.Transporter | null) {
    this.transporter = customTransporter;
    if (customTransporter) {
      this.customEmailProvider = new NodemailerEmailProvider(customTransporter);
    } else {
      this.customEmailProvider = null;
    }
  }

  /**
   * Resolve the configured hotel notification recipient email address
   */
  public static async resolveHotelNotificationEmail(): Promise<string> {
    if (process.env.HOTEL_NOTIFICATION_EMAIL && process.env.HOTEL_NOTIFICATION_EMAIL.trim()) {
      return process.env.HOTEL_NOTIFICATION_EMAIL.trim();
    }

    try {
      const setting = await getHotelSettings();
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
   * Resolve customer-facing frontend / public URL base.
   * Priority: FRONTEND_URL -> CLIENT_URL.
   * Production strictly resolves to 'https://hotelraama.com'.
   * Prevents internal hosting hostnames (workers.dev) or development URLs from leaking into production emails.
   */
  public static resolveFrontendUrl(): string {
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    const rawUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;

    if (rawUrl && rawUrl !== 'undefined' && rawUrl.trim()) {
      const clean = rawUrl.trim().replace(/\/+$/, '');
      if (isProd) {
        // In production, customer-facing emails must never use workers.dev or localhost
        if (clean.includes('workers.dev') || clean.includes('localhost') || clean.includes('127.0.0.1')) {
          return 'https://hotelraama.com';
        }
      }
      return clean;
    }

    return isProd ? 'https://hotelraama.com' : 'http://localhost:5173';
  }

  /**
   * Resolve customer booking tracking URL based on FRONTEND_URL / CLIENT_URL environment variables
   */
  public static getTrackingUrl(trackingToken: string): string {
    const rawUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
    const clientBase = (rawUrl && rawUrl !== 'undefined' && rawUrl.trim())
      ? rawUrl.trim().replace(/\/+$/, '')
      : ((process.env.NODE_ENV || '').toLowerCase() === 'production' ? 'https://hotelraama.com' : 'http://localhost:5173');
    return `${clientBase}/booking/confirmation/${trackingToken}`;
  }

  /**
   * REQUIREMENT 1: Send comprehensive booking details to Hotel's notification email
   */
  public static async sendHotelBookingNotification(
    booking: IBooking,
    roomTypeName: string = 'Room'
  ): Promise<EmailResult> {
    const provider = this.getEmailProvider();
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
        ${booking.gstin ? `<tr><td class="label">Guest GSTIN</td><td class="value"><strong>${booking.gstin}</strong></td></tr>` : ''}
        ${booking.discountAmountSnapshot ? `<tr><td class="label">Discount Applied (${booking.couponCodeSnapshot || 'Coupon'} - ${booking.discountPercentageSnapshot || (booking.couponCodeSnapshot === 'WELCOME15' ? 15 : 10)}%)</td><td class="value" style="color: #dc2626;">-${this.formatCurrency(booking.discountAmountSnapshot)}</td></tr>` : ''}
        <tr><td class="label">GST (${booking.taxRateSnapshot ?? 5}% Snapshot)</td><td class="value">${this.formatCurrency(booking.taxAmountSnapshot)}</td></tr>
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
${booking.gstin ? `- Guest GSTIN: ${booking.gstin}\n` : ''}${booking.discountAmountSnapshot ? `- Coupon Applied: ${booking.couponCodeSnapshot} (${booking.discountPercentageSnapshot || (booking.couponCodeSnapshot === 'WELCOME15' ? 15 : 10)}%): -${this.formatCurrency(booking.discountAmountSnapshot)}\n` : ''}- GST Tax (${booking.taxRateSnapshot ?? 5}%): ${this.formatCurrency(booking.taxAmountSnapshot)}
- Total Amount Paid: ${this.formatCurrency(booking.totalAmount)}
===============================================
    `.trim();

    if (!provider.isConfigured()) {
      console.warn(
        `[EmailService] Email provider (${provider.providerName}) not configured. Skipped sending hotel booking email for booking ${booking.bookingId}. (Target: ${recipient})`
      );
      return { success: false, error: `${provider.providerName} credentials not configured on server.` };
    }

    try {
      console.log(`[EmailService] Sending hotel booking notification for ${booking.bookingId} to ${recipient}...`);
      const result = await provider.sendEmail({
        from: sender,
        to: recipient,
        subject,
        text: plainText,
        html: htmlContent,
      });

      if (result.success) {
        console.log(`[EmailService] Hotel notification sent successfully for ${booking.bookingId} to ${recipient} (msgId: ${result.messageId}) [Provider: ${provider.providerName}]`);
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`[EmailService] ${provider.providerName} request failed for hotel notification ${booking.bookingId}:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      console.error(`[EmailService Error] Failed to send hotel notification for ${booking.bookingId}:`, err.message || err);
      return { success: false, error: err.message || 'Email delivery failed' };
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
    const provider = this.getEmailProvider();
    const recipient = booking.guestEmail?.trim();
    if (!recipient) {
      console.warn(`[EmailService] Guest email is missing for booking ${booking.bookingId}. Skipped sending.`);
      return { success: false, error: 'Guest email is missing on booking record.' };
    }
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
        ${booking.gstin ? `<div class="details-row"><span class="details-label">GSTIN</span><span class="details-value">${booking.gstin}</span></div>` : ''}
        ${booking.discountAmountSnapshot ? `
        <div class="details-row"><span class="details-label">Coupon Code</span><span class="details-value">${booking.couponCodeSnapshot}</span></div>
        <div class="details-row"><span class="details-label">Discount (${booking.discountPercentageSnapshot || (booking.couponCodeSnapshot === 'WELCOME15' ? 15 : 10)}%)</span><span class="details-value" style="color: #dc2626;">-${this.formatCurrency(booking.discountAmountSnapshot)}</span></div>` : ''}
        <div class="details-row"><span class="details-label">GST Tax (${booking.taxRateSnapshot ?? 5}%)</span><span class="details-value">${this.formatCurrency(booking.taxAmountSnapshot)}</span></div>
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
${booking.gstin ? `GSTIN: ${booking.gstin}\n` : ''}${booking.discountAmountSnapshot ? `Coupon: ${booking.couponCodeSnapshot}\nDiscount (${booking.discountPercentageSnapshot || (booking.couponCodeSnapshot === 'WELCOME15' ? 15 : 10)}%): -${this.formatCurrency(booking.discountAmountSnapshot)}\n` : ''}GST Tax: ${this.formatCurrency(booking.taxAmountSnapshot)} (${booking.taxRateSnapshot ?? 5}%)
Total Amount Paid: ${this.formatCurrency(booking.totalAmount)} (Includes ${booking.taxRateSnapshot ?? 5}% GST)

View or track your booking online:
${trackingUrl}

HOTEL CONTACT & LOCATION:
Hotel Raama, B.M. Road, Thanneeruhalla, Opp. SDM Ayurvedic Hospital, Hassan, Karnataka - 573201
Phone: +91 78995 11330 | WhatsApp: +91 78995 11330
Email: hotelraama.hsn@gmail.com
==================================
    `.trim();

    if (!provider.isConfigured()) {
      console.warn(
        `[EmailService] Email provider (${provider.providerName}) not configured. Skipped sending guest confirmation email for booking ${booking.bookingId}. (Target: ${recipient})`
      );
      return { success: false, error: `${provider.providerName} credentials not configured on server.` };
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

      console.log(`[EmailService] Sending guest confirmation for ${booking.bookingId} to ${recipient}...`);
      const result = await provider.sendEmail({
        from: sender,
        to: recipient,
        subject,
        text: plainText,
        html: htmlContent,
        attachments,
      });

      if (result.success) {
        console.log(`[EmailService] Guest confirmation sent successfully for ${booking.bookingId} to ${recipient} (msgId: ${result.messageId}) [Provider: ${provider.providerName}]`);
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`[EmailService] ${provider.providerName} request failed for guest confirmation ${booking.bookingId}:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      console.error(`[EmailService Error] Failed to send guest confirmation for ${booking.bookingId}:`, err.message || err);
      return { success: false, error: err.message || 'Email delivery failed' };
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

  /**
   * Resolve customer feedback URL based on FRONTEND_URL / CLIENT_URL environment variables
   */
  public static getFeedbackUrl(token: string): string {
    const clientBase = this.resolveFrontendUrl();
    return `${clientBase}/feedback/${token}`;
  }

  /**
   * Helper to format rating into stars with numerical indicator
   */
  private static formatStarRating(rating: number): string {
    const fullStars = Math.min(5, Math.max(1, Math.round(rating)));
    const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
    return `${stars} (${rating}/5)`;
  }

  /**
   * Send private feedback request email to customer after stay completion
   */
  public static async sendCustomerFeedbackRequest(
    booking: IBooking,
    token: string
  ): Promise<EmailResult> {
    const provider = this.getEmailProvider();
    const recipient = booking.guestEmail?.trim();
    if (!recipient) {
      console.warn(`[EmailService] Guest email is missing for booking ${booking.bookingId}. Skipped sending feedback request.`);
      return { success: false, error: 'Guest email is missing on booking record.' };
    }
    const sender = this.resolveSenderEmail();
    const feedbackUrl = this.getFeedbackUrl(token);

    const subject = 'How was your stay at Hotel Raama?';

    const plainText = `
How was your stay at Hotel Raama?
================================

Hi ${booking.guestName},

Thank you for staying at Hotel Raama.

We would love to hear about your experience. Please take a moment to share your feedback.

Give Us a Feedback:
${feedbackUrl}

Thank you for choosing Hotel Raama.

Hotel Raama
Hassan, Karnataka
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5f0; margin: 0; padding: 24px; color: #1a202c; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.06); }
    .header { background-color: #0b1849; color: #ffffff; padding: 28px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; letter-spacing: 1.5px; font-weight: 700; }
    .header p { margin: 6px 0 0; font-size: 11px; color: #d4af37; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .greeting { font-size: 17px; font-weight: 600; color: #0b1849; margin-bottom: 16px; }
    .text { font-size: 14px; color: #4a5568; margin-bottom: 16px; line-height: 1.7; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #0b1849; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #d4af37; box-shadow: 0 4px 8px rgba(11,24,73,0.2); }
    .divider { height: 1px; background-color: #edf2f7; margin: 28px 0; }
    .signoff { font-size: 14px; color: #2d3748; }
    .signoff strong { color: #0b1849; }
    .footer { background-color: #edf2f7; padding: 18px; text-align: center; font-size: 11px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HOTEL RAAMA</h1>
      <p>Hassan, Karnataka • Guest Experience</p>
    </div>

    <div class="content">
      <div class="greeting">Hi ${booking.guestName},</div>

      <p class="text">Thank you for staying at Hotel Raama.</p>
      <p class="text">We would love to hear about your experience. Please take a moment to share your feedback with our management team.</p>

      <div class="btn-container">
        <a href="${feedbackUrl}" class="btn" target="_blank" rel="noopener noreferrer">Give Us a Feedback</a>
      </div>

      <div class="divider"></div>

      <div class="signoff">
        Thank you for choosing Hotel Raama.<br/><br/>
        <strong>Hotel Raama</strong><br/>
        Hassan, Karnataka
      </div>
    </div>

    <div class="footer">
      This is a private feedback invitation sent to ${booking.guestEmail}. Your review is private and will only be viewed by Hotel Raama management.
    </div>
  </div>
</body>
</html>
    `.trim();

    if (!provider.isConfigured()) {
      console.warn(
        `[EmailService] Email provider (${provider.providerName}) not configured. Skipped sending feedback request to ${recipient}.`
      );
      return { success: false, error: `${provider.providerName} credentials not configured on server.` };
    }

    try {
      console.log(`[EmailService] Sending customer feedback request for ${booking.bookingId} to ${recipient}...`);
      const result = await provider.sendEmail({
        from: sender,
        to: recipient,
        subject,
        text: plainText,
        html: htmlContent,
      });

      if (result.success) {
        console.log(`[EmailService] Customer feedback request sent successfully for booking ${booking.bookingId} to ${recipient} (msgId: ${result.messageId}) [Provider: ${provider.providerName}]`);
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`[EmailService] ${provider.providerName} request failed for customer feedback request ${booking.bookingId}:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      console.error(`[EmailService Error] Failed to send feedback request for ${booking.bookingId}:`, err.message || err);
      return { success: false, error: err.message || 'Email delivery failed' };
    }
  }

  /**
   * Send notification to Admin when customer submits private feedback
   */
  public static async sendAdminFeedbackNotification(
    feedback: any,
    booking?: IBooking | null
  ): Promise<EmailResult> {
    const provider = this.getEmailProvider();
    const recipient = process.env.ADMIN_EMAIL?.trim() || await this.resolveHotelNotificationEmail();
    const sender = this.resolveSenderEmail();

    const clientBase = this.resolveFrontendUrl();
    const adminFeedbackUrl = `${clientBase}/admin/feedback`;

    const subject = 'New Customer Feedback - Hotel Raama';

    const submissionDate = feedback.submittedAt
      ? new Date(feedback.submittedAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const plainText = `
New Customer Feedback Received

Hotel Raama

Customer: ${feedback.customerName}
Booking ID: ${feedback.bookingId}

Overall Rating: ${this.formatStarRating(feedback.overallRating)}
Room Rating: ${this.formatStarRating(feedback.roomRating)}
Food Rating: ${this.formatStarRating(feedback.foodRating)}
Cleanliness: ${this.formatStarRating(feedback.cleanlinessRating)}
Service: ${this.formatStarRating(feedback.serviceRating)}
Would Recommend: ${feedback.recommendation ? 'Yes' : 'No'}

Customer Feedback:
"${feedback.comment || 'No written suggestion provided.'}"

Submitted:
${submissionDate}

View this feedback in Admin Panel:
${adminFeedbackUrl}
    `.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5f0; margin: 0; padding: 24px; color: #1a202c; }
    .container { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.06); }
    .header { background-color: #0b1849; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; letter-spacing: 1px; font-weight: 700; }
    .header p { margin: 4px 0 0; font-size: 11px; color: #d4af37; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
    .content { padding: 28px; }
    .alert-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px; margin-bottom: 22px; border-radius: 4px; }
    .alert-box strong { color: #1e40af; font-size: 14px; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0b1849; border-bottom: 2px solid #d4af37; padding-bottom: 6px; margin-top: 18px; margin-bottom: 12px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 13px; }
    .grid-table td { padding: 8px 12px; border-bottom: 1px solid #edf2f7; }
    .grid-table td.label { font-weight: 600; color: #4a5568; width: 42%; background-color: #f8fafc; }
    .grid-table td.value { color: #1a202c; font-weight: 500; }
    .stars { color: #f59e0b; font-weight: 700; font-size: 14px; }
    .comment-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 16px 0; font-style: italic; color: #2d3748; line-height: 1.6; font-size: 13px; }
    .btn-container { text-align: center; margin: 28px 0 16px; }
    .btn { display: inline-block; background-color: #0b1849; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #d4af37; }
    .footer { background-color: #edf2f7; padding: 14px; text-align: center; font-size: 11px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HOTEL RAAMA</h1>
      <p>Private Customer Feedback Notification</p>
    </div>

    <div class="content">
      <div class="alert-box">
        <strong>New Customer Feedback Received</strong><br/>
        <span>A verified guest has submitted private feedback for their recent stay.</span>
      </div>

      <div class="section-title">Stay & Guest Details</div>
      <table class="grid-table">
        <tr><td class="label">Customer Name</td><td class="value"><strong>${feedback.customerName}</strong></td></tr>
        <tr><td class="label">Customer Email</td><td class="value">${feedback.customerEmail}</td></tr>
        <tr><td class="label">Booking Reference</td><td class="value"><strong>${feedback.bookingId}</strong></td></tr>
        <tr><td class="label">Submission Date</td><td class="value">${submissionDate}</td></tr>
      </table>

      <div class="section-title">Guest Ratings</div>
      <table class="grid-table">
        <tr><td class="label">Overall Rating</td><td class="value stars">${this.formatStarRating(feedback.overallRating)}</td></tr>
        <tr><td class="label">Room Rating</td><td class="value stars">${this.formatStarRating(feedback.roomRating)}</td></tr>
        <tr><td class="label">Food & Dining</td><td class="value stars">${this.formatStarRating(feedback.foodRating)}</td></tr>
        <tr><td class="label">Cleanliness</td><td class="value stars">${this.formatStarRating(feedback.cleanlinessRating)}</td></tr>
        <tr><td class="label">Staff & Service</td><td class="value stars">${this.formatStarRating(feedback.serviceRating)}</td></tr>
        <tr>
          <td class="label">Would Recommend</td>
          <td class="value" style="font-weight: 700; color: ${feedback.recommendation ? '#059669' : '#dc2626'};">
            ${feedback.recommendation ? 'Yes ✓' : 'No ✗'}
          </td>
        </tr>
      </table>

      <div class="section-title">Customer Feedback & Suggestions</div>
      <div class="comment-box">
        "${feedback.comment ? feedback.comment : 'No written suggestion was provided by the guest.'}"
      </div>

      <div class="btn-container">
        <a href="${adminFeedbackUrl}" class="btn" target="_blank" rel="noopener noreferrer">View Feedback in Admin Panel</a>
      </div>
    </div>

    <div class="footer">
      Private management notification • This feedback is strictly confidential and not visible on the public website.
    </div>
  </div>
</body>
</html>
    `.trim();

    if (!provider.isConfigured()) {
      console.warn(`[EmailService] Email provider (${provider.providerName}) not configured. Skipped sending admin feedback alert for booking ${feedback.bookingId}.`);
      return { success: false, error: `${provider.providerName} credentials not configured on server.` };
    }

    try {
      console.log(`[EmailService] Sending admin feedback alert for booking ${feedback.bookingId} to ${recipient}...`);
      const result = await provider.sendEmail({
        from: sender,
        to: recipient,
        subject,
        text: plainText,
        html: htmlContent,
      });

      if (result.success) {
        console.log(`[EmailService] Admin feedback alert sent successfully for ${feedback.bookingId} to ${recipient} (msgId: ${result.messageId}) [Provider: ${provider.providerName}]`);
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`[EmailService] ${provider.providerName} request failed for admin feedback alert ${feedback.bookingId}:`, result.error);
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      console.error(`[EmailService Error] Failed to send admin feedback alert for ${feedback.bookingId}:`, err.message || err);
      return { success: false, error: err.message || 'Email delivery failed' };
    }
  }

  /**
   * Safely dispatch customer feedback request with idempotency, atomic claim, and token generation
   */
  public static async dispatchCustomerFeedbackRequest(
    bookingIdOrDoc: string | IBooking
  ): Promise<{ success: boolean; error?: string; token?: string }> {
    try {
      const isDbConnected = mongoose.connection.readyState === 1;
      let booking: IBooking | null = null;

      if (typeof bookingIdOrDoc === 'string') {
        if (isDbConnected) {
          booking = await Booking.findById(bookingIdOrDoc);
        }
      } else {
        booking = bookingIdOrDoc;
      }

      if (!booking) {
        return { success: false, error: 'Booking not found.' };
      }

      // Check if feedback request has already been sent
      if (booking.feedbackRequestSent === true || booking.feedbackRequestStatus === 'SENT') {
        return { success: true, token: booking.feedbackToken };
      }

      // If feedback was already submitted, skip sending request
      if (booking.feedbackSubmitted === true) {
        return { success: true, token: booking.feedbackToken };
      }

      // Generate secure 32-byte (64-char hex) cryptographically random token
      const token = booking.feedbackToken || crypto.randomBytes(32).toString('hex');
      const tokenExpiry = booking.feedbackTokenExpiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      let claimSuccess = false;
      if (isDbConnected) {
        const claimed = await Booking.findOneAndUpdate(
          {
            _id: booking._id,
            feedbackRequestSent: { $ne: true },
            feedbackRequestStatus: { $nin: ['PROCESSING', 'SENT'] },
          },
          {
            $set: {
              feedbackRequestStatus: 'PROCESSING',
              feedbackToken: token,
              feedbackTokenExpiry: tokenExpiry,
            },
          },
          { new: true }
        );

        if (claimed) {
          claimSuccess = true;
          booking = claimed;
        } else {
          // Already claimed or sent by another worker
          return { success: false, error: 'Booking feedback request already in progress or sent.' };
        }
      } else {
        booking.feedbackRequestStatus = 'PROCESSING';
        booking.feedbackToken = token;
        booking.feedbackTokenExpiry = tokenExpiry;
        claimSuccess = true;
      }

      if (claimSuccess) {
        const result = await this.sendCustomerFeedbackRequest(booking, token);

        if (isDbConnected) {
          if (result.success) {
            await Booking.findByIdAndUpdate(booking._id, {
              $set: {
                feedbackRequestSent: true,
                feedbackRequestStatus: 'SENT',
                feedbackRequestSentAt: new Date(),
              },
              $unset: { feedbackRequestError: 1 },
            });
          } else {
            await Booking.findByIdAndUpdate(booking._id, {
              $set: {
                feedbackRequestStatus: 'FAILED',
                feedbackRequestError: result.error?.slice(0, 500),
              },
            });
          }
        }

        booking.feedbackRequestSent = result.success;
        booking.feedbackRequestStatus = result.success ? 'SENT' : 'FAILED';
        if (result.success) {
          booking.feedbackRequestSentAt = new Date();
        } else {
          booking.feedbackRequestError = result.error;
        }

        return { success: result.success, error: result.error, token };
      }

      return { success: false, error: 'Unable to claim booking for feedback request.' };
    } catch (err: any) {
      console.error('[EmailService] Error in dispatchCustomerFeedbackRequest:', err.message || err);
      return { success: false, error: err.message };
    }
  }
}
