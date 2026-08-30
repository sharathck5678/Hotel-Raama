import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Download, MessageSquare } from 'lucide-react';
import { trackBookingStatus } from '../services/api';
import { downloadBookingInvoicePdf } from '../services/clientPdfService';
import { ScrollReveal } from '../components/ScrollReveal';

export const BookingConfirmationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      trackBookingStatus(token)
        .then((res) => {
          if (res.success) setBooking(res.data);
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#f7f7f2] text-[#333333]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cbc0ad]"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-[70vh] bg-[#f7f7f2] flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-3xl font-serif text-[#333333]">Booking Not Found</h2>
        <p className="text-xs font-sans text-[#666666] mt-2">The requested booking confirmation link is invalid.</p>
        <Link to="/" className="mt-6 px-6 py-3 bg-[#47614d] text-[#f7f7f2] font-sans font-bold text-xs uppercase tracking-wider rounded-sm">
          Return Home
        </Link>
      </div>
    );
  }

  const whatsappMessage = encodeURIComponent(
    `Hi Hotel Raama Reception, I have confirmed booking ID: ${booking.bookingId} under name ${booking.guestName}. Check-in: ${new Date(booking.checkIn).toLocaleDateString()}.`
  );

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-20 max-w-3xl mx-auto px-6">
      <ScrollReveal direction="up" duration={0.85}>
        <div className="bg-[#47614d] text-[#f7f7f2] border border-[#f7f7f2]/20 rounded-sm p-8 sm:p-12 space-y-10 shadow-2xl">
          
          {/* Success Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <span className="text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-[0.2em] block">
              Payment Verified & Confirmed
            </span>
            <h1 className="text-3xl font-serif text-[#f7f7f2]">Booking Confirmed!</h1>
            <p className="text-xs font-sans text-[#f7f7f2]/80">
              Thank you, <span className="font-semibold text-white">{booking.guestName}</span>. Your reservation at Hotel Raama is reserved.
            </p>
          </div>

          {/* Reference Grid */}
          <div className="p-6 bg-[#f7f7f2]/5 rounded-sm border border-[#f7f7f2]/15 space-y-4 font-sans text-xs">
            <div className="flex justify-between items-center pb-4 border-b border-[#f7f7f2]/10">
              <div>
                <span className="text-[10px] text-[#f7f7f2]/60 block uppercase tracking-wider">Booking Reference ID</span>
                <span className="text-xl font-serif font-bold text-[#d9b57d]">{booking.bookingId}</span>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider rounded-sm">
                {booking.paymentStatus.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-[#f7f7f2]/60 block uppercase tracking-wider">Check-In</span>
                <span className="font-semibold text-white">{new Date(booking.checkIn).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#f7f7f2]/60 block uppercase tracking-wider">Check-Out</span>
                <span className="font-semibold text-white">{new Date(booking.checkOut).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#f7f7f2]/60 block uppercase tracking-wider">Room Category</span>
                <span className="font-semibold text-white">{booking.roomTypeId?.name || 'Executive Room'}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#f7f7f2]/60 block uppercase tracking-wider">Total Amount Paid</span>
                <span className="font-serif font-bold text-[#d9b57d]">₹{booking.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => downloadBookingInvoicePdf(booking)}
              className="w-full py-4 rounded-sm bg-[#f7f7f2] text-[#333333] hover:bg-[#d9b57d] font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.99]"
            >
              <Download size={16} /> Download Tax Invoice (PDF)
            </button>

            <a
              href={`https://wa.me/918172257001?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-sm bg-emerald-700 hover:bg-emerald-600 text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <MessageSquare size={16} /> WhatsApp Front Desk
            </a>
          </div>

          <div className="text-center pt-4 border-t border-[#f7f7f2]/10 text-[10px] font-sans text-[#f7f7f2]/50">
            Hotel Raama • B.M. Road, Thanneeruhalla, Hassan • Phone: 081722 57001
          </div>

        </div>
      </ScrollReveal>
    </div>
  );
};
