import PDFDocument from 'pdfkit';
import { IBooking } from '../models/Booking';
import { IOrder } from '../models/Order';

export class InvoicePdfService {
  /**
   * Generate PDF buffer for Booking Tax Invoice (Pure White, Printer-Friendly)
   */
  static async generateBookingInvoicePdf(booking: IBooking, roomTypeName?: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fillColor('#111111').fontSize(22).font('Helvetica-Bold').text('HOTEL RAAMA', { align: 'left' });
        doc.fillColor('#555555').fontSize(9).font('Helvetica').text('B.M. Road, Thanneeruhalla, Hassan, Karnataka - 573201');
        doc.text('Phone: +91 78995 11330 | Email: hotelraama.hsn@gmail.com');
        doc.moveDown();

        // Title
        doc.fillColor('#111111').fontSize(15).font('Helvetica-Bold').text('OFFICIAL BOOKING INVOICE', { align: 'right' });
        doc.moveDown(0.5);

        doc.strokeColor('#BDBDBD').lineWidth(0.5).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
        doc.moveDown(1);

        // Booking info grid
        const startY = doc.y;
        doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold').text(`Invoice No: INV-${booking.bookingId}`, 40, startY);
        doc.font('Helvetica').text(`Date: ${new Date(booking.createdAt || Date.now()).toLocaleDateString()}`);
        doc.text(`Booking Reference: ${booking.bookingId}`);
        doc.text(`Payment Status: ${(booking.paymentStatus || 'PAID').toUpperCase()}`);

        doc.font('Helvetica-Bold').text(`Guest Details:`, 320, startY);
        doc.font('Helvetica').text(`Name: ${booking.guestName || 'Valued Guest'}`, 320);
        if (booking.guestEmail) doc.text(`Email: ${booking.guestEmail}`);
        if (booking.guestPhone) doc.text(`Phone: ${booking.guestPhone}`);
        if (booking.guestAadhar) {
          doc.text(`Aadhaar: ${booking.guestAadhar}`);
        }
        if (booking.gstin) {
          doc.text(`GSTIN: ${booking.gstin}`);
        }

        doc.moveDown(2);

        // Table Header (Pure white with thin gray border)
        const tableTop = doc.y + 10;
        doc.strokeColor('#BDBDBD').lineWidth(0.5).rect(40, tableTop, 530, 24).stroke();
        doc.fillColor('#111111').fontSize(10).font('Helvetica-Bold');
        doc.text('Description', 50, tableTop + 7);
        doc.text('Dates / Details', 250, tableTop + 7);
        doc.text('Nights', 420, tableTop + 7);
        doc.text('Amount (INR)', 480, tableTop + 7);

        // Table Row
        let rowTop = tableTop + 30;
        doc.fillColor('#333333').font('Helvetica');
        doc.text(roomTypeName || (booking as any).roomTypeId?.name || 'Room Accommodation', 50, rowTop);
        doc.text(`${new Date(booking.checkIn).toLocaleDateString()} - ${new Date(booking.checkOut).toLocaleDateString()}`, 250, rowTop);
        doc.text(`${booking.numNights}`, 430, rowTop);
        const roomSubtotal = ((booking.roomPricePerNightSnapshot || 0) * (booking.numNights || 1)).toFixed(2);
        doc.text(`Rs. ${roomSubtotal}`, 480, rowTop);

        if (booking.extraPerson && (booking.extraPersonChargeSnapshot || 0) > 0) {
          rowTop += 20;
          doc.text(`Extra Person Charge`, 50, rowTop);
          doc.text(`+1 Extra Guest`, 250, rowTop);
          doc.text(`${booking.numNights || 1}`, 430, rowTop);
          doc.text(`Rs. ${(booking.extraPersonChargeSnapshot || 0).toFixed(2)}`, 480, rowTop);
        }

        const mealTotal = booking.mealPlanSelection
          ? (booking.mealPlanSelection.totalPrice !== undefined
              ? booking.mealPlanSelection.totalPrice
              : (booking.mealPlanSelection.pricePerNight || 0) * (booking.numNights || 1))
          : 0;

        if (mealTotal > 0) {
          rowTop += 20;
          doc.text(`Meal Plan Additions`, 50, rowTop);
          doc.text(`Pax: ${booking.numGuests || 1}`, 250, rowTop);
          doc.text(`${booking.numNights || 1}`, 430, rowTop);
          doc.text(`Rs. ${mealTotal.toFixed(2)}`, 480, rowTop);
        }

        rowTop += 30;
        doc.strokeColor('#DDDDDD').lineWidth(0.5).moveTo(40, rowTop).lineTo(570, rowTop).stroke();
        rowTop += 10;

        // Totals summary
        const subtotal =
          (booking.roomPricePerNightSnapshot || 0) * (booking.numNights || 1) +
          (booking.extraPersonChargeSnapshot || 0) +
          mealTotal;

        doc.font('Helvetica').text(`Subtotal:`, 350, rowTop);
        doc.text(`Rs. ${subtotal.toFixed(2)}`, 480, rowTop);
        rowTop += 15;

        if (booking.discountAmountSnapshot && booking.discountAmountSnapshot > 0) {
          const couponLabel = booking.couponCodeSnapshot
            ? `Discount (${booking.couponCodeSnapshot}):`
            : `Discount Applied:`;
          doc.font('Helvetica').text(couponLabel, 350, rowTop);
          doc.text(`- Rs. ${(booking.discountAmountSnapshot || 0).toFixed(2)}`, 480, rowTop);
          rowTop += 15;

          const taxableVal = Math.max(0, subtotal - (booking.discountAmountSnapshot || 0));
          doc.font('Helvetica').text(`Taxable Amount:`, 350, rowTop);
          doc.text(`Rs. ${taxableVal.toFixed(2)}`, 480, rowTop);
          rowTop += 15;
        }

        const taxRate = booking.taxRateSnapshot ?? 5;
        const taxVal = (booking.taxAmountSnapshot || 0).toFixed(2);
        doc.font('Helvetica').text(`GST (${taxRate}%):`, 350, rowTop);
        doc.text(`Rs. ${taxVal}`, 480, rowTop);
        rowTop += 20;

        const totalVal = (booking.totalAmount || 0).toFixed(2);
        doc.fillColor('#111111').font('Helvetica-Bold').fontSize(12);
        doc.text(`Total Amount Paid:`, 350, rowTop);
        doc.text(`Rs. ${totalVal}`, 480, rowTop);

        // Footer
        doc.fillColor('#666666').fontSize(9).font('Helvetica').text('Thank you for choosing Hotel Raama, Hassan!', 40, 720, { align: 'center' });
        doc.text('This is a computer-generated invoice and requires no signature.', 40, 735, { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Generate PDF buffer for QR Food Order Invoice (Pure White, Printer-Friendly)
   */
  static async generateOrderInvoicePdf(order: IOrder): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Header
        doc.fillColor('#111111').fontSize(20).font('Helvetica-Bold').text('HOTEL RAAMA - ROOM SERVICE', { align: 'left' });
        doc.fillColor('#555555').fontSize(9).font('Helvetica').text('Room Service & Dining Invoice');
        doc.moveDown();

        doc.fillColor('#111111').fontSize(14).font('Helvetica-Bold').text(`ORDER #${order.orderId}`, { align: 'right' });
        doc.moveDown(0.5);

        doc.strokeColor('#BDBDBD').lineWidth(0.5).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
        doc.moveDown(1);

        const startY = doc.y;
        doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold').text(`Room Number: ${order.roomNumber}`, 40, startY);
        doc.font('Helvetica').text(`Guest: ${order.guestName} (${order.guestPhone})`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
        doc.text(`Payment Status: ${order.paymentStatus.toUpperCase()}`);

        doc.moveDown(2);

        // Table Header (Pure white with thin gray border, no navy fill)
        const tableTop = doc.y + 10;
        doc.strokeColor('#BDBDBD').lineWidth(0.5).rect(40, tableTop, 530, 24).stroke();
        doc.fillColor('#111111').fontSize(10).font('Helvetica-Bold');
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

        doc.fillColor('#111111').font('Helvetica-Bold').fontSize(12);
        doc.text(`Total Bill:`, 350, rowTop);
        doc.text(`Rs. ${order.totalAmount.toFixed(2)}`, 480, rowTop);

        doc.fillColor('#666666').fontSize(9).font('Helvetica').text('Hotel Raama Room Service - Bon Appétit!', 40, 720, { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
