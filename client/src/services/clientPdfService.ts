import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export interface OrderItemPdf {
  name: string;
  price: number;
  quantity: number;
  potionSize?: string;
}

export interface OrderPdfData {
  _id?: string;
  orderId?: string;
  trackingToken?: string;
  roomNumber?: string | number;
  guestName?: string;
  guestPhone?: string;
  items?: OrderItemPdf[];
  totalAmount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  status?: string;
  createdAt?: string | Date;
}

export interface BookingPdfData {
  _id?: string;
  bookingId?: string;
  token?: string;
  trackingToken?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn?: string | Date;
  checkOut?: string | Date;
  numNights?: number;
  numGuests?: number;
  roomTypeId?: {
    name?: string;
    basePrice?: number;
  };
  assignedRoomId?: {
    roomNumber?: string | number;
  };
  roomPricePerNightSnapshot?: number;
  mealPlanSelection?: {
    planName?: string;
    pricePerNight?: number;
  };
  taxAmountSnapshot?: number;
  discountAmountSnapshot?: number;
  totalAmount?: number;
  paymentStatus?: string;
  createdAt?: string | Date;
}

/**
 * Generate and trigger download of Order PDF Receipt directly in the browser
 */
export const downloadOrderReceiptPdf = (order: OrderPdfData) => {
  if (order.paymentStatus && order.paymentStatus !== 'PAID') {
    toast.error('PDF Receipt is locked. Available only after payment is settled.');
    return;
  }
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const orderId = order.orderId || order._id?.slice(-6)?.toUpperCase() || 'ORD-LIVE';
    const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');

    // Header Background Accent Bar
    doc.setFillColor(24, 30, 25); // #181E19 Deep Forest Slate
    doc.rect(0, 0, pageWidth, 32, 'F');

    // Brand Name & Subtitle
    doc.setTextColor(247, 247, 242); // #F7F7F2
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('HOTEL RAAMA', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(217, 181, 125); // #D9B57D Gold
    doc.text('ROOM SERVICE & RESTAURANT DINING RECEIPT', 14, 19);

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(7.5);
    doc.text('B.M. Road, Thanneeruhalla, Hassan, Karnataka - 573201 | Phone: 081722 57001', 14, 25);

    // Right Header Tag
    doc.setFillColor(71, 97, 77); // #47614D
    doc.roundedRect(pageWidth - 62, 9, 48, 14, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`RECEIPT #${orderId}`, pageWidth - 38, 18, { align: 'center' });

    // Order Information Cards
    let yPos = 42;

    doc.setFillColor(247, 247, 242);
    doc.setDrawColor(203, 192, 173); // #CBC0AD
    doc.roundedRect(14, yPos, (pageWidth - 32) / 2, 34, 1.5, 1.5, 'FD');
    doc.roundedRect(pageWidth / 2 + 2, yPos, (pageWidth - 32) / 2, 34, 1.5, 1.5, 'FD');

    // Left Box: Order Metadata
    doc.setTextColor(71, 97, 77);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ORDER DETAILS', 18, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`Order Reference: ${orderId}`, 18, yPos + 13);
    doc.text(`Date & Time: ${createdAt}`, 18, yPos + 19);
    doc.text(`Service Location: Room / Table ${order.roomNumber || 'Direct Venue'}`, 18, yPos + 25);
    doc.text(`Status: ${(order.status || 'Active').toUpperCase()}`, 18, yPos + 31);

    // Right Box: Guest & Payment
    const rightBoxX = pageWidth / 2 + 6;
    doc.setTextColor(71, 97, 77);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('GUEST & PAYMENT', rightBoxX, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`Guest Name: ${order.guestName || 'Valued Guest'}`, rightBoxX, yPos + 13);
    doc.text(`Contact: ${order.guestPhone || 'N/A'}`, rightBoxX, yPos + 19);
    doc.text(`Payment Mode: ${order.paymentMethod || 'Online / UPI'}`, rightBoxX, yPos + 25);
    doc.text(`Payment Status: ${(order.paymentStatus || 'PAID').toUpperCase()}`, rightBoxX, yPos + 31);

    // Items Table
    const items = order.items || [];
    const tableBody = items.map((item, idx) => [
      (idx + 1).toString(),
      item.name + (item.potionSize && item.potionSize !== 'Standard' ? ` (${item.potionSize})` : ''),
      item.quantity.toString(),
      `Rs. ${Number(item.price).toFixed(2)}`,
      `Rs. ${(Number(item.price) * Number(item.quantity)).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos + 40,
      head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 97, 77], // Forest Green
        textColor: [247, 247, 242],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 32 },
      },
      styles: {
        fontSize: 8,
        textColor: [40, 40, 40],
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 248],
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 90;

    // Totals Block
    const totalAmount = Number(order.totalAmount || items.reduce((acc, it) => acc + it.price * it.quantity, 0));
    const summaryX = pageWidth - 70;

    doc.setFillColor(247, 247, 242);
    doc.setDrawColor(203, 192, 173);
    doc.roundedRect(summaryX - 10, finalY + 6, 66, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text('Grand Total:', summaryX - 6, finalY + 14);

    doc.setFontSize(11);
    doc.setTextColor(71, 97, 77);
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, pageWidth - 18, finalY + 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Inclusive of all applicable taxes', summaryX - 6, finalY + 21);

    // Footer
    const footerY = Math.max(finalY + 36, 265);
    doc.setDrawColor(203, 192, 173);
    doc.setLineWidth(0.3);
    doc.line(14, footerY, pageWidth - 14, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text('Thank you for dining with Hotel Raama, Hassan!', pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text('This is a computer-generated receipt and does not require a physical signature.', pageWidth / 2, footerY + 9, { align: 'center' });

    // Save PDF
    doc.save(`Receipt-${orderId}.pdf`);
    toast.success(`Receipt for #${orderId} downloaded successfully!`);
  } catch (err) {
    console.error('Failed to generate order PDF receipt:', err);
    toast.error('Could not generate PDF receipt.');
  }
};

/**
 * Generate and trigger download of Booking Tax Invoice directly in the browser
 */
export const downloadBookingInvoicePdf = (booking: BookingPdfData) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const bookingId = booking.bookingId || booking._id?.slice(-6)?.toUpperCase() || 'BK-LIVE';
    const roomTypeName = booking.roomTypeId?.name || 'Executive Room';
    const checkIn = booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-IN') : 'N/A';
    const checkOut = booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-IN') : 'N/A';
    const nights = Number(booking.numNights || 1);
    const guests = Number(booking.numGuests || 1);
    const roomRate = Number(booking.roomPricePerNightSnapshot || booking.roomTypeId?.basePrice || 2500);
    const mealPrice = Number(booking.mealPlanSelection?.pricePerNight || 0);
    const discount = Number(booking.discountAmountSnapshot || 0);
    const tax = Number(booking.taxAmountSnapshot || 0);
    const totalAmount = Number(booking.totalAmount || (roomRate * nights + mealPrice * nights - discount + tax));

    // Header Background Accent Bar
    doc.setFillColor(24, 30, 25); // Deep Forest Slate
    doc.rect(0, 0, pageWidth, 34, 'F');

    // Brand Name & Subtitle
    doc.setTextColor(247, 247, 242);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('HOTEL RAAMA', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(217, 181, 125);
    doc.text('OFFICIAL BOOKING TAX INVOICE', 14, 19);

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(7.5);
    doc.text('B.M. Road, Thanneeruhalla, Hassan, Karnataka - 573201 | Phone: 081722 57001', 14, 26);

    // Right Header Tag
    doc.setFillColor(71, 97, 77);
    doc.roundedRect(pageWidth - 65, 9, 51, 15, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`INVOICE #${bookingId}`, pageWidth - 39.5, 18.5, { align: 'center' });

    let yPos = 44;

    // Booking Details 2-Column Box
    doc.setFillColor(247, 247, 242);
    doc.setDrawColor(203, 192, 173);
    doc.roundedRect(14, yPos, (pageWidth - 32) / 2, 38, 1.5, 1.5, 'FD');
    doc.roundedRect(pageWidth / 2 + 2, yPos, (pageWidth - 32) / 2, 38, 1.5, 1.5, 'FD');

    // Left Box: Booking Info
    doc.setTextColor(71, 97, 77);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('STAY INFORMATION', 18, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`Booking Ref: ${bookingId}`, 18, yPos + 13);
    doc.text(`Room Type: ${roomTypeName}`, 18, yPos + 19);
    doc.text(`Check-In: ${checkIn}`, 18, yPos + 25);
    doc.text(`Check-Out: ${checkOut} (${nights} Night${nights > 1 ? 's' : ''})`, 18, yPos + 31);
    doc.text(`Assigned Room: ${booking.assignedRoomId?.roomNumber || 'At Check-In'}`, 18, yPos + 36);

    // Right Box: Guest Details & Payment
    const rightBoxX = pageWidth / 2 + 6;
    doc.setTextColor(71, 97, 77);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('GUEST & PAYMENT INFO', rightBoxX, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`Guest Name: ${booking.guestName || 'Valued Guest'}`, rightBoxX, yPos + 13);
    doc.text(`Email: ${booking.guestEmail || 'N/A'}`, rightBoxX, yPos + 19);
    doc.text(`Phone: ${booking.guestPhone || 'N/A'}`, rightBoxX, yPos + 25);
    doc.text(`Guests: ${guests} Person${guests > 1 ? 's' : ''}`, rightBoxX, yPos + 31);
    doc.text(`Payment Status: ${(booking.paymentStatus || 'PAID').toUpperCase()}`, rightBoxX, yPos + 36);

    // Tariff Breakdown Table
    const tableBody: any[] = [
      ['1', `${roomTypeName} (${nights} Night${nights > 1 ? 's' : ''})`, `${nights} Night(s)`, `Rs. ${roomRate.toFixed(2)}`, `Rs. ${(roomRate * nights).toFixed(2)}`],
    ];

    if (mealPrice > 0) {
      tableBody.push([
        (tableBody.length + 1).toString(),
        `Meal Plan Addition (${booking.mealPlanSelection?.planName || 'Selected Plan'})`,
        `${nights} Night(s)`,
        `Rs. ${mealPrice.toFixed(2)}`,
        `Rs. ${(mealPrice * nights).toFixed(2)}`,
      ]);
    }

    if (discount > 0) {
      tableBody.push([
        (tableBody.length + 1).toString(),
        'Applied Promotional / Coupon Discount',
        '--',
        `--`,
        `- Rs. ${discount.toFixed(2)}`,
      ]);
    }

    if (tax > 0) {
      tableBody.push([
        (tableBody.length + 1).toString(),
        'Goods & Services Tax (GST 12%)',
        '--',
        `--`,
        `Rs. ${tax.toFixed(2)}`,
      ]);
    }

    autoTable(doc, {
      startY: yPos + 44,
      head: [['#', 'Item / Description', 'Duration / Unit', 'Rate / Night', 'Amount']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 97, 77],
        textColor: [247, 247, 242],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 32 },
      },
      styles: {
        fontSize: 8,
        textColor: [40, 40, 40],
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 248],
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 90;

    // Totals Box
    const summaryX = pageWidth - 70;
    doc.setFillColor(247, 247, 242);
    doc.setDrawColor(203, 192, 173);
    doc.roundedRect(summaryX - 10, finalY + 6, 66, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text('Total Paid:', summaryX - 6, finalY + 14);

    doc.setFontSize(11);
    doc.setTextColor(71, 97, 77);
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, pageWidth - 18, finalY + 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('GST & charges included', summaryX - 6, finalY + 21);

    // Footer
    const footerY = Math.max(finalY + 36, 265);
    doc.setDrawColor(203, 192, 173);
    doc.setLineWidth(0.3);
    doc.line(14, footerY, pageWidth - 14, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text('Thank you for choosing Hotel Raama, Hassan!', pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text('This is a computer-generated tax invoice and requires no physical signature.', pageWidth / 2, footerY + 9, { align: 'center' });

    // Save PDF
    doc.save(`Invoice-${bookingId}.pdf`);
    toast.success(`Tax Invoice for #${bookingId} downloaded successfully!`);
  } catch (err) {
    console.error('Failed to generate booking PDF invoice:', err);
    toast.error('Could not generate PDF invoice.');
  }
};
