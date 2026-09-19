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
  guestAadhar?: string;
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

import html2canvas from 'html2canvas';

const escapeHtml = (str: string) => {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Generate and trigger download of Order PDF Receipt directly in the browser
 * with full Unicode & Kannada font support
 */
export const downloadOrderReceiptPdf = async (order: OrderPdfData) => {
  if (order.paymentStatus && order.paymentStatus !== 'PAID') {
    toast.error('PDF Receipt is locked. Available only after payment is settled.');
    return;
  }

  const toastId = toast.loading('Generating receipt with regional font support...');

  try {
    const orderId = order.orderId || order._id?.slice(-6)?.toUpperCase() || 'ORD-LIVE';
    const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
    const items = order.items || [];
    const totalAmount = Number(order.totalAmount || items.reduce((acc, it) => acc + it.price * it.quantity, 0));

    // Build items table rows HTML
    const rowsHtml = items.map((item, idx) => {
      const isAlt = idx % 2 === 1;
      const bg = isAlt ? '#FAF9F6' : '#FFFFFF';
      const itemDesc = item.name + (item.potionSize && item.potionSize !== 'Standard' ? ` (${item.potionSize})` : '');
      const itemPrice = Number(item.price);
      const itemQty = Number(item.quantity);
      const lineTotal = itemPrice * itemQty;
      return `
        <tr style="background: ${bg}; border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 10px 12px; font-size: 10.5px; text-align: center; color: #6B7280; border-right: 1px solid #E5E7EB;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-size: 11px; text-align: left; color: #111827; font-weight: 500; font-family: 'Outfit', 'Noto Sans Kannada', 'Nirmala UI', 'Tunga', 'Segoe UI', sans-serif; border-right: 1px solid #E5E7EB;">${escapeHtml(itemDesc)}</td>
          <td style="padding: 10px 12px; font-size: 10.5px; text-align: center; color: #111827; border-right: 1px solid #E5E7EB;">${itemQty}</td>
          <td style="padding: 10px 12px; font-size: 10.5px; text-align: right; color: #111827; border-right: 1px solid #E5E7EB;">Rs. ${itemPrice.toFixed(2)}</td>
          <td style="padding: 10px 12px; font-size: 10.5px; text-align: right; color: #111827; font-weight: 600;">Rs. ${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Create temporary off-screen container for rendering
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '794px'; // 210mm at standard 96dpi
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    container.style.background = '#ffffff';

    container.innerHTML = `
      <div style="width: 794px; min-height: 1123px; background: #ffffff; font-family: 'Outfit', 'Noto Sans Kannada', 'Nirmala UI', 'Tunga', 'Segoe UI', Roboto, sans-serif; color: #1f2937; box-sizing: border-box; margin: 0; padding: 0; display: flex; flex-direction: column; justify-content: space-between;">
        
        <div>
          <!-- Header Accent Bar -->
          <div style="background: #071A3D; padding: 22px 32px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FAF9F6; letter-spacing: 0.8px; font-family: 'Outfit', sans-serif;">HOTEL RAAMA</h1>
              <div style="margin-top: 3px; font-size: 10px; font-weight: 700; color: #D6B369; letter-spacing: 1.5px; text-transform: uppercase;">ROOM SERVICE &amp; RESTAURANT DINING RECEIPT</div>
              <div style="margin-top: 5px; font-size: 9px; color: #D1D5DB;">B.M. Road, Thanneeruhalla, Hassan, Karnataka - 573201 | Phone: +91 78995 11330</div>
            </div>
            <div style="background: #00174A; border: 1px solid rgba(214, 179, 105, 0.4); border-radius: 6px; padding: 8px 16px; color: #FAF9F6; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; white-space: nowrap;">
              RECEIPT #${escapeHtml(orderId)}
            </div>
          </div>

          <!-- Content Body -->
          <div style="padding: 24px 32px;">
            
            <!-- Details 2-Column Grid -->
            <div style="display: flex; gap: 16px; margin-bottom: 24px;">
              <!-- Left Box: Order Metadata -->
              <div style="flex: 1; background: #FAF9F6; border: 1px solid #CBC0AD; border-radius: 8px; padding: 14px 18px;">
                <div style="font-size: 11px; font-weight: 800; color: #00174A; letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase;">ORDER DETAILS</div>
                <div style="font-size: 10px; color: #374151; line-height: 1.8;">
                  <div><strong style="color: #111827;">Order Reference:</strong> ${escapeHtml(orderId)}</div>
                  <div><strong style="color: #111827;">Date &amp; Time:</strong> ${escapeHtml(createdAt)}</div>
                  <div><strong style="color: #111827;">Service Location:</strong> Room / Table ${escapeHtml(String(order.roomNumber || 'Direct Venue'))}</div>
                  <div><strong style="color: #111827;">Status:</strong> <span style="font-weight: 700; color: #00174A;">${escapeHtml((order.status || 'Active').toUpperCase())}</span></div>
                </div>
              </div>

              <!-- Right Box: Guest & Payment -->
              <div style="flex: 1; background: #FAF9F6; border: 1px solid #CBC0AD; border-radius: 8px; padding: 14px 18px;">
                <div style="font-size: 11px; font-weight: 800; color: #00174A; letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase;">GUEST &amp; PAYMENT</div>
                <div style="font-size: 10px; color: #374151; line-height: 1.8;">
                  <div><strong style="color: #111827;">Guest Name:</strong> ${escapeHtml(order.guestName || 'Valued Guest')}</div>
                  <div><strong style="color: #111827;">Contact:</strong> ${escapeHtml(order.guestPhone || 'N/A')}</div>
                  <div><strong style="color: #111827;">Payment Mode:</strong> ${escapeHtml(order.paymentMethod || 'Online / UPI')}</div>
                  <div><strong style="color: #111827;">Payment Status:</strong> <span style="font-weight: 700; color: #059669;">${escapeHtml((order.paymentStatus || 'PAID').toUpperCase())}</span></div>
                </div>
              </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; border-radius: 6px; overflow: hidden; border: 1px solid #E5E7EB;">
              <thead>
                <tr style="background: #00174A; color: #FAF9F6;">
                  <th style="padding: 10px 12px; font-size: 10.5px; font-weight: 700; text-align: center; width: 40px; border: 1px solid #00174A;">#</th>
                  <th style="padding: 10px 12px; font-size: 10.5px; font-weight: 700; text-align: left; border: 1px solid #00174A;">Item Description</th>
                  <th style="padding: 10px 12px; font-size: 10.5px; font-weight: 700; text-align: center; width: 60px; border: 1px solid #00174A;">Qty</th>
                  <th style="padding: 10px 12px; font-size: 10.5px; font-weight: 700; text-align: right; width: 110px; border: 1px solid #00174A;">Unit Price</th>
                  <th style="padding: 10px 12px; font-size: 10.5px; font-weight: 700; text-align: right; width: 110px; border: 1px solid #00174A;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <!-- Grand Total Block -->
            <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
              <div style="width: 270px; background: #FAF9F6; border: 1px solid #CBC0AD; border-radius: 8px; padding: 14px 18px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span style="font-size: 11px; font-weight: 700; color: #374151;">Grand Total:</span>
                  <span style="font-size: 16px; font-weight: 800; color: #00174A;">Rs. ${totalAmount.toFixed(2)}</span>
                </div>
                <div style="font-size: 9.5px; color: #6B7280; margin-top: 5px; text-align: right;">Inclusive of all applicable taxes</div>
              </div>
            </div>

          </div>
        </div>

        <!-- Footer Area -->
        <div style="padding: 20px 32px 28px; border-top: 1px solid #CBC0AD; text-align: center; background: #ffffff;">
          <div style="font-size: 10.5px; font-weight: 600; color: #4B5563;">Thank you for dining with Hotel Raama, Hassan!</div>
          <div style="font-size: 9px; color: #9CA3AF; margin-top: 4px;">This is a computer-generated receipt and does not require a physical signature.</div>
        </div>

      </div>
    `;

    document.body.appendChild(container);

    // Ensure fonts are loaded
    if (document.fonts) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(container, {
      scale: 2, // 2x high-resolution rendering
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Build PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
    }

    pdf.save(`Receipt-${orderId}.pdf`);
    toast.success(`Receipt for #${orderId} downloaded successfully!`, { id: toastId });
  } catch (err) {
    console.error('Failed to generate order PDF receipt with html2canvas:', err);
    toast.error('Could not generate PDF receipt.', { id: toastId });
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
    doc.setFillColor(7, 26, 61); // #071A3D Dark Navy
    doc.rect(0, 0, pageWidth, 34, 'F');

    // Brand Name & Subtitle
    doc.setTextColor(250, 249, 246); // #FAF9F6 Warm Cream
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('HOTEL RAAMA', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(214, 179, 105); // #D6B369 Gold
    doc.text('OFFICIAL BOOKING TAX INVOICE', 14, 19);

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(7.5);
    doc.text('B.M. Road, Thanneeruhalla, Hassan, Karnataka - 573201 | Phone: +91 78995 11330', 14, 26);

    // Right Header Tag
    doc.setFillColor(0, 23, 74); // #00174A Primary Navy
    doc.roundedRect(pageWidth - 65, 9, 51, 15, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`INVOICE #${bookingId}`, pageWidth - 39.5, 18.5, { align: 'center' });

    let yPos = 44;

    // Booking Details 2-Column Box
    doc.setFillColor(250, 249, 246); // #FAF9F6 Warm Cream
    doc.setDrawColor(203, 192, 173);
    doc.roundedRect(14, yPos, (pageWidth - 32) / 2, 38, 1.5, 1.5, 'FD');
    doc.roundedRect(pageWidth / 2 + 2, yPos, (pageWidth - 32) / 2, 38, 1.5, 1.5, 'FD');

    // Left Box: Booking Info
    doc.setTextColor(0, 23, 74); // #00174A Primary Navy
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
    doc.setTextColor(0, 23, 74); // #00174A Primary Navy
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('GUEST & PAYMENT INFO', rightBoxX, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(`Guest Name: ${booking.guestName || 'Valued Guest'}`, rightBoxX, yPos + 13);
    doc.text(`Email: ${booking.guestEmail || 'N/A'}`, rightBoxX, yPos + 19);
    doc.text(`Phone: ${booking.guestPhone || 'N/A'}`, rightBoxX, yPos + 25);
    if (booking.guestAadhar) {
      doc.text(`Aadhaar: ${booking.guestAadhar}`, rightBoxX, yPos + 30);
      doc.text(`Guests: ${guests} Person${guests > 1 ? 's' : ''}`, rightBoxX, yPos + 35);
      doc.text(`Payment Status: ${(booking.paymentStatus || 'PAID').toUpperCase()}`, rightBoxX, yPos + 40);
    } else {
      doc.text(`Guests: ${guests} Person${guests > 1 ? 's' : ''}`, rightBoxX, yPos + 31);
      doc.text(`Payment Status: ${(booking.paymentStatus || 'PAID').toUpperCase()}`, rightBoxX, yPos + 36);
    }

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
        fillColor: [0, 23, 74], // Primary Navy
        textColor: [250, 249, 246], // Warm Cream
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
        fillColor: [250, 250, 246],
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 90;

    // Totals Box
    const summaryX = pageWidth - 70;
    doc.setFillColor(250, 249, 246);
    doc.setDrawColor(203, 192, 173);
    doc.roundedRect(summaryX - 10, finalY + 6, 66, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text('Total Paid:', summaryX - 6, finalY + 14);

    doc.setFontSize(11);
    doc.setTextColor(0, 23, 74); // #00174A Primary Navy
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
