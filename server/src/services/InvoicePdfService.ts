import PDFDocument from 'pdfkit';
import { IBooking } from '../models/Booking';
import { IOrder } from '../models/Order';

export class InvoicePdfService {
  /**
   * Generate PDF buffer for Booking Tax Invoice
   */
  static async generateBookingInvoicePdf(booking: IBooking, roomTypeName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fillColor('#07111F').fontSize(22).font('Helvetica-Bold').text('HOTEL RAAMA', { align: 'left' });
        doc.fillColor('#666666').fontSize(9).font('Helvetica').text('B.M. Road, Thanneeruhalla, Hassan, Karnataka - 573201');
        doc.text('Phone: +91 78995 11330 | Email: hotelraama.hsn@gmail.com');
        doc.moveDown();

        // Title
        doc.fillColor('#C9A227').fontSize(16).font('Helvetica-Bold').text('OFFICIAL BOOKING INVOICE', { align: 'right' });
        doc.moveDown(0.5);

        doc.strokeColor('#E2C46B').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
        doc.moveDown(1);

        // Booking info grid
        const startY = doc.y;
        doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold').text(`Invoice No: INV-${booking.bookingId}`, 40, startY);
        doc.font('Helvetica').text(`Date: ${new Date(booking.createdAt).toLocaleDateString()}`);
        doc.text(`Booking Reference: ${booking.bookingId}`);
        doc.text(`Payment Status: ${booking.paymentStatus.toUpperCase()}`);

        doc.font('Helvetica-Bold').text(`Guest Details:`, 320, startY);
        doc.font('Helvetica').text(`Name: ${booking.guestName}`, 320);
        doc.text(`Email: ${booking.guestEmail}`);
        doc.text(`Phone: ${booking.guestPhone}`);
        if (booking.guestAadhar) {
          doc.text(`Aadhaar: ${booking.guestAadhar}`);
        }

        doc.moveDown(2);

        // Table Header
        const tableTop = doc.y + 10;
        doc.fillColor('#0B1D33').rect(40, tableTop, 530, 24).fill();
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
        doc.text('Description', 50, tableTop + 7);
        doc.text('Dates / Details', 250, tableTop + 7);
        doc.text('Nights', 420, tableTop + 7);
        doc.text('Amount (INR)', 480, tableTop + 7);

        // Table Row
        let rowTop = tableTop + 30;
        doc.fillColor('#333333').font('Helvetica');
        doc.text(roomTypeName, 50, rowTop);
        doc.text(`${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}`, 250, rowTop);
        doc.text(`${booking.numNights}`, 430, rowTop);
        doc.text(`Rs. ${(booking.roomPricePerNightSnapshot * booking.numNights).toFixed(2)}`, 480, rowTop);

        if (booking.mealPlanSelection && booking.mealPlanSelection.pricePerNight > 0) {
          rowTop += 20;
          doc.text(`Meal Plan Additions`, 50, rowTop);
          doc.text(`Pax: ${booking.numGuests}`, 250, rowTop);
          doc.text(`${booking.numNights}`, 430, rowTop);
          doc.text(`Rs. ${(booking.mealPlanSelection.pricePerNight * booking.numNights).toFixed(2)}`, 480, rowTop);
        }

        rowTop += 30;
        doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(40, rowTop).lineTo(570, rowTop).stroke();
        rowTop += 10;

        // Totals summary
        doc.font('Helvetica').text(`Discount Applied:`, 350, rowTop);
        doc.text(`- Rs. ${booking.discountAmountSnapshot.toFixed(2)}`, 480, rowTop);
        rowTop += 15;

        doc.text(`GST (12%):`, 350, rowTop);
        doc.text(`Rs. ${booking.taxAmountSnapshot.toFixed(2)}`, 480, rowTop);
        rowTop += 20;

        doc.fillColor('#07111F').font('Helvetica-Bold').fontSize(12);
        doc.text(`Total Amount Paid:`, 350, rowTop);
        doc.fillColor('#C9A227').text(`Rs. ${booking.totalAmount.toFixed(2)}`, 480, rowTop);

        // Footer
        doc.fillColor('#777777').fontSize(9).font('Helvetica').text('Thank you for choosing Hotel Raama, Hassan!', 40, 720, { align: 'center' });
        doc.text('This is a computer-generated invoice and requires no signature.', 40, 735, { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generate PDF buffer for QR Food Order Invoice
   */
  static async generateOrderInvoicePdf(order: IOrder): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fillColor('#07111F').fontSize(20).font('Helvetica-Bold').text('HOTEL RAAMA - ROOM SERVICE', { align: 'left' });
        doc.fillColor('#666666').fontSize(9).font('Helvetica').text('Room Service & Dining Invoice');
        doc.moveDown();

        doc.fillColor('#C9A227').fontSize(14).font('Helvetica-Bold').text(`ORDER #${order.orderId}`, { align: 'right' });
        doc.moveDown(0.5);

        doc.strokeColor('#E2C46B').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
        doc.moveDown(1);

        const startY = doc.y;
        doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold').text(`Room Number: ${order.roomNumber}`, 40, startY);
        doc.font('Helvetica').text(`Guest: ${order.guestName} (${order.guestPhone})`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
        doc.text(`Payment Status: ${order.paymentStatus.toUpperCase()}`);

        doc.moveDown(2);

        // Table Header
        const tableTop = doc.y + 10;
        doc.fillColor('#0B1D33').rect(40, tableTop, 530, 24).fill();
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
        doc.text('Item Name', 50, tableTop + 7);
        doc.text('Price (INR)', 320, tableTop + 7);
        doc.text('Qty', 420, tableTop + 7);
        doc.text('Subtotal (INR)', 480, tableTop + 7);

        let rowTop = tableTop + 30;
        doc.fillColor('#333333').font('Helvetica');

        for (const item of order.items) {
          // PDFKit Helvetica standard font only supports Latin-1; sanitize any characters outside Latin-1
          const safeName = item.name.replace(/[^\x20-\x7E\xA0-\xFF]/g, '').replace(/\(\s*-\s*/, '(').trim() || item.name;
          doc.text(safeName, 50, rowTop);
          doc.text(`Rs. ${item.price.toFixed(2)}`, 320, rowTop);
          doc.text(`${item.quantity}`, 425, rowTop);
          doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, 480, rowTop);
          rowTop += 20;
        }

        doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(40, rowTop).lineTo(570, rowTop).stroke();
        rowTop += 15;

        doc.fillColor('#07111F').font('Helvetica-Bold').fontSize(12);
        doc.text(`Total Bill:`, 350, rowTop);
        doc.fillColor('#C9A227').text(`Rs. ${order.totalAmount.toFixed(2)}`, 480, rowTop);

        doc.fillColor('#777777').fontSize(9).font('Helvetica').text('Hotel Raama Room Service - Bon Appétit!', 40, 720, { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
