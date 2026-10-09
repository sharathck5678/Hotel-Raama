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
  roomPricePerNightSnapshot?: number;
  extraPerson?: boolean;
  extraPersonChargeSnapshot?: number;
  mealPlanSelection?: {
    planName?: string;
    pricePerNight?: number;
    totalPrice?: number;
  };
  taxAmountSnapshot?: number;
  discountAmountSnapshot?: number;
  couponCodeSnapshot?: string;
  discountPercentageSnapshot?: number;
  gstin?: string;
  taxRateSnapshot?: number;
  totalAmount?: number;
  paymentStatus?: string;
  createdAt?: string | Date;
}

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
 * with full Unicode & Kannada font support and pure white printer-friendly layout
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

    // Build items table rows HTML (pure white background, clean thin borders)
    const rowsHtml = items.map((item, idx) => {
      const itemDesc = item.name + (item.potionSize && item.potionSize !== 'Standard' ? ` (${item.potionSize})` : '');
      const itemPrice = Number(item.price);
      const itemQty = Number(item.quantity);
      const lineTotal = itemPrice * itemQty;
      return `
        <tr style="background: #ffffff; border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 9px 10px; font-size: 10px; text-align: center; color: #555555; border: 1px solid #E5E7EB;">${idx + 1}</td>
          <td style="padding: 9px 12px; font-size: 10.5px; text-align: left; color: #111111; font-weight: 500; font-family: 'Outfit', 'Noto Sans Kannada', 'Nirmala UI', 'Tunga', 'Segoe UI', sans-serif; border: 1px solid #E5E7EB; word-break: break-word;">${escapeHtml(itemDesc)}</td>
          <td style="padding: 9px 10px; font-size: 10px; text-align: center; color: #111111; border: 1px solid #E5E7EB;">${itemQty}</td>
          <td style="padding: 9px 12px; font-size: 10px; text-align: right; color: #111111; border: 1px solid #E5E7EB; white-space: nowrap;">Rs. ${itemPrice.toFixed(2)}</td>
          <td style="padding: 9px 12px; font-size: 10px; text-align: right; color: #111111; font-weight: 700; border: 1px solid #E5E7EB; white-space: nowrap;">Rs. ${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Create temporary off-screen container for rendering
    // Note: natural content height ensures no extra/blank pages for 1-page orders
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '794px'; // 210mm at standard 96dpi
    container.style.zIndex = '-9999';
    container.style.pointerEvents = 'none';
    container.style.background = '#ffffff';

    container.innerHTML = `
      <div style="width: 794px; background: #ffffff; font-family: 'Outfit', 'Noto Sans Kannada', 'Nirmala UI', 'Tunga', 'Segoe UI', Roboto, sans-serif; color: #111111; box-sizing: border-box; padding: 36px 40px; margin: 0;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 1px solid #D1D5DB;">
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #111111; letter-spacing: 0.5px; font-family: 'Outfit', sans-serif;">HOTEL RAAMA</h1>
            <div style="margin-top: 3px; font-size: 10px; font-weight: 700; color: #555555; letter-spacing: 1px; text-transform: uppercase;">ROOM SERVICE &amp; RESTAURANT DINING RECEIPT</div>
            <div style="margin-top: 5px; font-size: 9px; color: #666666; line-height: 1.4;">
              B.M. Road, Thanneeruhalla, Hassan, Karnataka - 573201<br/>Phone: +91 78995 11330 | Email: hotelraama.hsn@gmail.com
            </div>
          </div>
          <div style="background: #ffffff; border: 1px solid #BDBDBD; border-radius: 4px; padding: 10px 18px; text-align: center; min-width: 140px;">
            <div style="font-size: 8.5px; font-weight: 700; color: #555555; letter-spacing: 1px; text-transform: uppercase;">RECEIPT</div>
            <div style="font-size: 13px; font-weight: 800; color: #111111; margin-top: 2px;">#${escapeHtml(orderId)}</div>
            <div style="font-size: 8px; color: #777777; margin-top: 3px;">${escapeHtml(createdAt)}</div>
          </div>
        </div>

        <!-- Content Body -->
        <div style="margin-top: 18px;">
          
          <!-- Details 2-Column Grid -->
          <div style="display: flex; gap: 16px; margin-bottom: 20px;">
            <!-- Left Box: Order Details -->
            <div style="flex: 1; background: #ffffff; border: 1px solid #BDBDBD; border-radius: 4px; padding: 12px 16px;">
              <div style="font-size: 9.5px; font-weight: 800; color: #111111; letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #E5E7EB; padding-bottom: 5px;">ORDER DETAILS</div>
              <div style="font-size: 9.5px; color: #374151; line-height: 1.85;">
                <div><strong style="color: #111111;">Order Reference:</strong> ${escapeHtml(orderId)}</div>
                <div><strong style="color: #111111;">Date &amp; Time:</strong> ${escapeHtml(createdAt)}</div>
                <div><strong style="color: #111111;">Service Location:</strong> Room / Table ${escapeHtml(String(order.roomNumber || 'Direct Venue'))}</div>
                <div><strong style="color: #111111;">Status:</strong> <span style="font-weight: 700; color: #111111;">${escapeHtml((order.status || 'Active').toUpperCase())}</span></div>
              </div>
            </div>

            <!-- Right Box: Guest & Payment -->
            <div style="flex: 1; background: #ffffff; border: 1px solid #BDBDBD; border-radius: 4px; padding: 12px 16px;">
              <div style="font-size: 9.5px; font-weight: 800; color: #111111; letter-spacing: 0.5px; margin-bottom: 8px; text-transform: uppercase; border-bottom: 1px solid #E5E7EB; padding-bottom: 5px;">GUEST &amp; PAYMENT</div>
              <div style="font-size: 9.5px; color: #374151; line-height: 1.85;">
                <div><strong style="color: #111111;">Guest Name:</strong> ${escapeHtml(order.guestName || 'Valued Guest')}</div>
                <div><strong style="color: #111111;">Contact:</strong> ${escapeHtml(order.guestPhone || 'N/A')}</div>
                <div><strong style="color: #111111;">Payment Mode:</strong> ${escapeHtml(order.paymentMethod || 'Online / UPI')}</div>
                <div><strong style="color: #111111;">Payment Status:</strong> <span style="font-weight: 700; color: #111111;">${escapeHtml((order.paymentStatus || 'PAID').toUpperCase())}</span></div>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #BDBDBD;">
            <thead>
              <tr style="background: #ffffff; color: #111111;">
                <th style="padding: 9px 10px; font-size: 9.5px; font-weight: 700; text-align: center; width: 36px; border: 1px solid #BDBDBD;">#</th>
                <th style="padding: 9px 12px; font-size: 9.5px; font-weight: 700; text-align: left; border: 1px solid #BDBDBD;">Item Description</th>
                <th style="padding: 9px 10px; font-size: 9.5px; font-weight: 700; text-align: center; width: 55px; border: 1px solid #BDBDBD;">Qty</th>
                <th style="padding: 9px 12px; font-size: 9.5px; font-weight: 700; text-align: right; width: 105px; border: 1px solid #BDBDBD;">Unit Price</th>
                <th style="padding: 9px 12px; font-size: 9.5px; font-weight: 700; text-align: right; width: 105px; border: 1px solid #BDBDBD;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Grand Total Block -->
          <div style="display: flex; justify-content: flex-end; margin-top: 18px;">
            <div style="width: 250px; background: #ffffff; border: 1px solid #BDBDBD; border-radius: 4px; padding: 12px 16px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-size: 10px; font-weight: 700; color: #444444; text-transform: uppercase;">Grand Total:</span>
                <span style="font-size: 15px; font-weight: 800; color: #111111;">Rs. ${totalAmount.toFixed(2)}</span>
              </div>
              <div style="font-size: 8.5px; color: #666666; margin-top: 4px; text-align: right;">Inclusive of all applicable taxes</div>
            </div>
          </div>

        </div>

        <!-- Footer Area -->
        <div style="margin-top: 32px; padding-top: 14px; border-top: 1px solid #D1D5DB; text-align: center; background: #ffffff;">
          <div style="font-size: 9.5px; font-weight: 600; color: #333333;">Thank you for dining with Hotel Raama, Hassan!</div>
          <div style="font-size: 8.5px; color: #666666; margin-top: 3px;">This is a computer-generated receipt and does not require a physical signature.</div>
          <div style="font-size: 8px; color: #888888; margin-top: 3px;">Hotel Raama • B.M. Road, Thanneeruhalla, Hassan - 573201 • Phone: +91 78995 11330</div>
        </div>

      </div>
    `;

    document.body.appendChild(container);

    // Ensure fonts are loaded before capturing
    if (document.fonts) {
      await document.fonts.ready;
    }

    const [html2canvasModule, jsPdfModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const html2canvas = (html2canvasModule as any).default || html2canvasModule;
    const jsPDF = (jsPdfModule as any).default || (jsPdfModule as any).jsPDF;

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

    // Absorption tolerance (2mm) to prevent subpixel floating-point overflow creating ghost pages
    if (imgHeight <= pageHeight + 2) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight), undefined, 'FAST');
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Only add additional page when remaining content genuinely exceeds 5mm
      while (heightLeft > 5) {
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
 * with a pure white background, crisp typography, and printer-friendly layout
 */
export const downloadBookingInvoicePdf = async (booking: BookingPdfData) => {
  const toastId = toast.loading('Generating invoice...');
  try {
    const [jsPdfModule, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const jsPDF = (jsPdfModule as any).default || (jsPdfModule as any).jsPDF;
    const autoTable = (autoTableModule as any).default?.default || (autoTableModule as any).default || autoTableModule;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const bookingId = booking.bookingId || booking._id?.slice(-6)?.toUpperCase() || 'BK-LIVE';
    const roomTypeName = booking.roomTypeId?.name || 'Executive Room';
    const checkIn = booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-IN') : 'N/A';
    const checkOut = booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-IN') : 'N/A';
    const nights = Number(booking.numNights || 1);
    const guests = Number(booking.numGuests || 1);
    const roomRate = Number(booking.roomPricePerNightSnapshot || booking.roomTypeId?.basePrice || 2500);
    const mealPrice = Number(booking.mealPlanSelection?.pricePerNight || 0);
    const mealTotal = booking.mealPlanSelection?.totalPrice !== undefined
      ? Number(booking.mealPlanSelection.totalPrice)
      : mealPrice * nights;
    const extraPersonCharge = Number(booking.extraPersonChargeSnapshot || 0);
    const discount = Number(booking.discountAmountSnapshot || 0);
    const tax = Number(booking.taxAmountSnapshot || 0);
    const totalAmount = Number(booking.totalAmount || (roomRate * nights + mealTotal + extraPersonCharge - discount + tax));

    // ==========================================
    // 1. HEADER (Pure White Background, No Fill)
    // ==========================================
    // Left: Hotel Brand, Title & Details
    doc.setTextColor(17, 17, 17); // #111111 Near-black
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('HOTEL RAAMA', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(85, 85, 85); // #555555
    doc.text('Official Booking Tax Invoice', 14, 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('B.M. Road, Thanneeruhalla, Hassan, Karnataka - 573201', 14, 29);
    doc.text('Phone: +91 78995 11330 | Email: hotelraama.hsn@gmail.com', 14, 33);

    // Right: Invoice Tag Box (Thin rectangular border, white background)
    const invBoxWidth = 56;
    const invBoxHeight = 21;
    const invBoxX = pageWidth - 14 - invBoxWidth;
    const invBoxY = 13;

    doc.setDrawColor(189, 189, 189); // #BDBDBD
    doc.setLineWidth(0.3);
    doc.roundedRect(invBoxX, invBoxY, invBoxWidth, invBoxHeight, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(85, 85, 85);
    doc.text('INVOICE', invBoxX + invBoxWidth / 2, invBoxY + 6, { align: 'center' });

    doc.setFontSize(10.5);
    doc.setTextColor(17, 17, 17);
    doc.text(`#${bookingId}`, invBoxX + invBoxWidth / 2, invBoxY + 12.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    const invoiceDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN') : checkIn;
    doc.text(`Date: ${invoiceDate}`, invBoxX + invBoxWidth / 2, invBoxY + 17.5, { align: 'center' });

    // Horizontal Divider
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.line(14, 38, pageWidth - 14, 38);

    // ==========================================
    // 2. INFORMATION SECTIONS (Bordered White Boxes)
    // ==========================================
    const boxY = 43;
    const boxWidth = (pageWidth - 28 - 6) / 2; // 88mm
    const boxHeight = 44;
    const leftBoxX = 14;
    const rightBoxX = 14 + boxWidth + 6; // 108mm

    // Helper for rendering label-value rows
    const renderInfoRow = (label: string, value: string, x: number, y: number, labelWidth = 23) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 70, 70);
      doc.text(label, x, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(17, 17, 17);
      doc.text(value, x + labelWidth, y);
    };

    // Left Box: STAY INFORMATION (No physical room assignment displayed)
    doc.setDrawColor(189, 189, 189);
    doc.setLineWidth(0.3);
    doc.roundedRect(leftBoxX, boxY, boxWidth, boxHeight, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 17, 17);
    doc.text('STAY INFORMATION', leftBoxX + 4, boxY + 6.5);

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(leftBoxX, boxY + 9, leftBoxX + boxWidth, boxY + 9);

    renderInfoRow('Booking Ref:', String(bookingId), leftBoxX + 4, boxY + 15, 22);
    renderInfoRow('Room Type:', String(roomTypeName), leftBoxX + 4, boxY + 21, 22);
    renderInfoRow('Check-In:', String(checkIn), leftBoxX + 4, boxY + 27, 22);
    renderInfoRow('Check-Out:', `${checkOut}  (${nights} Night${nights > 1 ? 's' : ''})`, leftBoxX + 4, boxY + 33, 22);
    renderInfoRow('Duration:', `${nights} Night${nights > 1 ? 's' : ''}`, leftBoxX + 4, boxY + 39, 22);

    // Right Box: GUEST & PAYMENT INFORMATION
    doc.setDrawColor(189, 189, 189);
    doc.setLineWidth(0.3);
    doc.roundedRect(rightBoxX, boxY, boxWidth, boxHeight, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 17, 17);
    doc.text('GUEST & PAYMENT INFORMATION', rightBoxX + 4, boxY + 6.5);

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(rightBoxX, boxY + 9, rightBoxX + boxWidth, boxY + 9);

    renderInfoRow('Guest Name:', String(booking.guestName || 'Valued Guest'), rightBoxX + 4, boxY + 15, 23);
    renderInfoRow('Email:', String(booking.guestEmail || 'N/A'), rightBoxX + 4, boxY + 21, 23);
    renderInfoRow('Phone:', String(booking.guestPhone || 'N/A'), rightBoxX + 4, boxY + 27, 23);

    let nextY = boxY + 33;
    if ((booking as any).gstin) {
      renderInfoRow('GSTIN:', String((booking as any).gstin), rightBoxX + 4, nextY, 23);
      nextY += 6;
    } else if (booking.guestAadhar) {
      renderInfoRow('Aadhaar:', String(booking.guestAadhar), rightBoxX + 4, nextY, 23);
      nextY += 6;
    }

    renderInfoRow('Guests:', `${guests} Person${guests > 1 ? 's' : ''}`, rightBoxX + 4, nextY, 23);
    renderInfoRow('Payment:', (booking.paymentStatus || 'PAID').toUpperCase(), rightBoxX + 48, nextY, 16);

    // ==========================================
    // 3. ITEMIZED CHARGES TABLE (White Headers)
    // ==========================================
    const tableBody: any[] = [
      ['1', `${roomTypeName} (${nights} Night${nights > 1 ? 's' : ''})`, `${nights} Night(s)`, `Rs. ${roomRate.toFixed(2)}`, `Rs. ${(roomRate * nights).toFixed(2)}`],
    ];

    if (extraPersonCharge > 0) {
      tableBody.push([
        (tableBody.length + 1).toString(),
        'Extra Person Charge (+1 Extra Bed/Guest)',
        `${nights} Night(s)`,
        `Rs. ${(extraPersonCharge / nights).toFixed(2)}`,
        `Rs. ${extraPersonCharge.toFixed(2)}`,
      ]);
    }

    if (mealTotal > 0) {
      tableBody.push([
        (tableBody.length + 1).toString(),
        `Meal Plan Addition (${booking.mealPlanSelection?.planName || 'Selected Plan'})`,
        `${nights} Night(s)`,
        `Rs. ${(mealTotal / nights).toFixed(2)}`,
        `Rs. ${mealTotal.toFixed(2)}`,
      ]);
    }

    if (discount > 0) {
      const couponLabel = booking.couponCodeSnapshot ? `Coupon Discount (${booking.couponCodeSnapshot})` : 'Applied Promotional / Coupon Discount';
      tableBody.push([
        (tableBody.length + 1).toString(),
        couponLabel,
        '--',
        `--`,
        `- Rs. ${discount.toFixed(2)}`,
      ]);
    }

    if (tax > 0) {
      const taxRate = (booking as any).taxRateSnapshot || 5;
      tableBody.push([
        (tableBody.length + 1).toString(),
        `Goods & Services Tax (GST ${taxRate}%)`,
        '--',
        `--`,
        `Rs. ${tax.toFixed(2)}`,
      ]);
    }

    autoTable(doc, {
      startY: boxY + boxHeight + 6,
      head: [['#', 'Item / Description', 'Duration / Unit', 'Rate / Night', 'Amount']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255], // Pure White header
        textColor: [17, 17, 17], // Near-black bold
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left',
        lineColor: [189, 189, 189],
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 28 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 32 },
      },
      styles: {
        fontSize: 8,
        textColor: [34, 34, 34],
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
        cellPadding: 3,
        fillColor: [255, 255, 255], // Pure White body
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255], // No background fill striping
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || (boxY + boxHeight + 60);

    // ==========================================
    // 4. TOTAL SECTION (White Background, Thin Border)
    // ==========================================
    const totalBoxWidth = 72;
    const totalBoxHeight = 22;
    const totalBoxX = pageWidth - 14 - totalBoxWidth;
    const totalBoxY = finalY + 6;

    doc.setDrawColor(189, 189, 189);
    doc.setLineWidth(0.3);
    doc.roundedRect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight, 1, 1, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('Total Paid:', totalBoxX + 6, totalBoxY + 8);

    doc.setFontSize(14);
    doc.setTextColor(17, 17, 17); // Strong hierarchy through font size and weight, NOT colour
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, totalBoxX + totalBoxWidth - 6, totalBoxY + 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    doc.text('GST & charges included', totalBoxX + totalBoxWidth - 6, totalBoxY + 19, { align: 'right' });

    // ==========================================
    // 5. FOOTER (Centered with Horizontal Divider)
    // ==========================================
    const footerY = Math.max(totalBoxY + totalBoxHeight + 14, 268);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.line(14, footerY, pageWidth - 14, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text('Thank you for choosing Hotel Raama, Hassan!', pageWidth / 2, footerY + 5.5, { align: 'center' });

    doc.setFontSize(7);
    doc.setTextColor(110, 110, 110);
    doc.text('This is a computer-generated tax invoice and requires no physical signature.', pageWidth / 2, footerY + 10, { align: 'center' });
    doc.text('Hotel Raama • B.M. Road, Thanneeruhalla, Hassan - 573201 • Phone: +91 78995 11330', pageWidth / 2, footerY + 14, { align: 'center' });

    // Save PDF
    doc.save(`Invoice-${bookingId}.pdf`);
    toast.success(`Tax Invoice for #${bookingId} downloaded successfully!`, { id: toastId });
  } catch (err) {
    console.error('Failed to generate booking PDF invoice:', err);
    toast.error('Could not generate PDF invoice.', { id: toastId });
  }
};
