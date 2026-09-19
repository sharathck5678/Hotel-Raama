import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminBookings, updateBookingStatus } from '../../services/api';
import { downloadBookingInvoicePdf } from '../../services/clientPdfService';
import { ScrollReveal } from '../../components/ScrollReveal';

export const AdminBookingsView: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = () => {
    fetchAdminBookings()
      .then((res) => {
        if (res.success) setBookings(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleStatusUpdate = async (id: string, bookingStatus: string) => {
    try {
      const res = await updateBookingStatus(id, { bookingStatus });
      if (res && res.success) {
        const updatedObj = res.data?.data || res.data || {};
        const refId = updatedObj.bookingId || id;
        toast.success(`Booking ${refId} updated to ${bookingStatus}`);
        loadBookings();
      } else {
        toast.error(res?.message || 'Failed to update booking status.');
      }
    } catch (err: any) {
      toast.error('Failed to update booking status.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#00174A]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6B369]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 text-[#00174A]">
      <ScrollReveal direction="up" duration={0.8}>
        <div className="border-b border-[#10184A]/15 pb-4">
          <h1 className="text-xl sm:text-2xl font-serif text-[#00174A]">Room Reservations Desk</h1>
          <p className="text-xs font-sans text-[#667085]">Manage guest check-ins, check-outs, and tax invoices</p>
        </div>
      </ScrollReveal>

      <ScrollReveal direction="up" duration={0.85}>
        <div className="bg-[#F7F0DF] text-[#00174A] rounded-sm border border-[#10184A]/25 shadow-sm font-sans text-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[780px]">
            <thead className="bg-[#00174A]/10 text-[#00174A] uppercase font-bold border-b border-[#10184A]/15 text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Booking Ref</th>
                <th className="py-3 px-3.5">Guest Name</th>
                <th className="py-3 px-3.5">Phone / Email</th>
                <th className="py-3 px-3.5">Room Category</th>
                <th className="py-3 px-3.5">Dates</th>
                <th className="py-3 px-3.5">Amount</th>
                <th className="py-3 px-3.5">Payment</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#10184A]/10 text-[#00174A]">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#00174A]/50 text-xs">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b._id} className="hover:bg-[#00174A]/5 transition-colors">
                    <td className="py-3 px-3.5 font-serif font-bold text-[#00174A] whitespace-nowrap">{b.bookingId}</td>
                    <td className="py-3 px-3.5 font-semibold text-[#00174A] whitespace-nowrap">{b.guestName}</td>
                    <td className="py-3 px-3.5">
                      <div className="whitespace-nowrap font-medium text-[#00174A]">{b.guestPhone}</div>
                      <div className="text-[10px] text-[#00174A]/60 truncate max-w-[150px]">{b.guestEmail}</div>
                      {b.guestAadhar && (
                        <div className="text-[10px] text-[#00174A]/80 font-mono">Aadhaar: {b.guestAadhar}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-[#00174A] whitespace-nowrap">{b.roomTypeId?.name || 'Executive'}</td>
                    <td className="py-3 px-3.5 text-[11px] text-[#00174A]/80 whitespace-nowrap">
                      {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3.5 font-serif font-bold text-[#00174A] whitespace-nowrap">₹{b.totalAmount}</td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
                          b.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="font-bold text-[#00174A] uppercase text-[10px] tracking-wider">{b.bookingStatus}</span>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap space-x-1.5">
                      {b.bookingStatus === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusUpdate(b._id, 'CHECKED_IN')}
                          className="px-2.5 py-1 bg-[#D6B369] hover:bg-[#E8C56A] text-[#00174A] rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer inline-block"
                        >
                          Check In
                        </button>
                      )}
                      {b.bookingStatus === 'CHECKED_IN' && (
                        <button
                          onClick={() => handleStatusUpdate(b._id, 'CHECKED_OUT')}
                          className="px-2.5 py-1 bg-[#00174A] text-white hover:bg-[#10184A] rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer inline-block"
                        >
                          Check Out
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadBookingInvoicePdf(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00174A]/10 hover:bg-[#00174A]/20 active:bg-[#00174A]/30 text-[#00174A] rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Download size={11} /> Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </ScrollReveal>
    </div>
  );
};

