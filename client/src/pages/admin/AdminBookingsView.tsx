import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminBookings, updateBookingStatus, getBookingInvoiceUrl } from '../../services/api';

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
      <div className="flex items-center justify-center py-20 text-[#333333]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cbc0ad]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#333333]">
      <div className="border-b border-[#cbc0ad] pb-4">
        <h1 className="text-2xl font-serif text-[#333333]">Room Reservations Desk</h1>
        <p className="text-xs font-sans text-[#666666]">Manage guest check-ins, check-outs, and tax invoices</p>
      </div>

      <div className="bg-[#47614d] text-[#f7f7f2] rounded-sm border border-[#f7f7f2]/15 overflow-hidden shadow-xl font-sans text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f7f7f2]/10 text-[#d9b57d] uppercase font-bold border-b border-[#f7f7f2]/15 text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Booking Ref</th>
                <th className="p-4">Guest Name</th>
                <th className="p-4">Phone / Email</th>
                <th className="p-4">Room Category</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f7f2]/10 text-[#f7f7f2]/80">
              {bookings.map((b) => (
                <tr key={b._id} className="hover:bg-[#f7f7f2]/5 transition-colors">
                  <td className="p-4 font-serif font-bold text-[#d9b57d]">{b.bookingId}</td>
                  <td className="p-4 font-semibold text-white">{b.guestName}</td>
                  <td className="p-4">
                    <div>{b.guestPhone}</div>
                    <div className="text-[10px] text-[#f7f7f2]/50">{b.guestEmail}</div>
                  </td>
                  <td className="p-4 font-medium text-[#f7f7f2]">{b.roomTypeId?.name || 'Executive'}</td>
                  <td className="p-4 text-[11px]">
                    {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                  </td>
                  <td className="p-4 font-serif font-bold text-[#d9b57d]">₹{b.totalAmount}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
                        b.paymentStatus === 'PAID'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-white uppercase text-[10px] tracking-wider">{b.bookingStatus}</span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {b.bookingStatus === 'CONFIRMED' && (
                      <button
                        onClick={() => handleStatusUpdate(b._id, 'CHECKED_IN')}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Check In
                      </button>
                    )}
                    {b.bookingStatus === 'CHECKED_IN' && (
                      <button
                        onClick={() => handleStatusUpdate(b._id, 'CHECKED_OUT')}
                        className="px-2.5 py-1 bg-[#f7f7f2] text-[#333333] hover:bg-[#d9b57d] rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Check Out
                      </button>
                    )}
                    <a
                      href={getBookingInvoiceUrl(b.token || b._id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f7f7f2]/10 hover:bg-[#f7f7f2]/20 text-[#f7f7f2] rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all"
                    >
                      <Download size={11} /> Invoice
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
