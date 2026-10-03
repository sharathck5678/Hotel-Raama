import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Mail, MessageSquareHeart, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminBookings, updateBookingStatus, sendBookingFeedbackRequest } from '../../services/api';
import { downloadBookingInvoicePdf } from '../../services/clientPdfService';
import { ScrollReveal } from '../../components/ScrollReveal';

export const AdminBookingsView: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const loadBookings = () => {
    fetchAdminBookings()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          // Strictly display only confirmed/paid bookings in the admin desk
          const paidBookings = res.data.filter((b: any) => b.paymentStatus === 'PAID');
          setBookings(paidBookings);
        }
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

  const handleSendFeedbackRequest = async (bookingDbId: string, bookingId: string) => {
    try {
      setSendingEmailId(bookingDbId);
      const res = await sendBookingFeedbackRequest(bookingDbId);
      if (res && res.success) {
        toast.success(res.message || `Feedback request email sent to guest for booking ${bookingId}`);
        loadBookings();
      } else {
        toast.error(res?.message || 'Failed to send feedback email.');
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred while requesting feedback.');
    } finally {
      setSendingEmailId(null);
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
          <p className="text-xs font-sans text-[#667085]">Manage guest check-ins, check-outs, GST invoices, and coupon records</p>
        </div>
      </ScrollReveal>

      <ScrollReveal direction="up" duration={0.85}>
        <div className="bg-[#F7F0DF] text-[#00174A] rounded-sm border border-[#10184A]/25 shadow-sm font-sans text-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-[#00174A]/10 text-[#00174A] uppercase font-bold border-b border-[#10184A]/15 text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Booking Ref</th>
                <th className="py-3 px-3.5">Guest Info & GSTIN</th>
                <th className="py-3 px-3.5">Room Category</th>
                <th className="py-3 px-3.5">Dates</th>
                <th className="py-3 px-3.5">Financial & GST</th>
                <th className="py-3 px-3.5">Payment</th>
                <th className="py-3 px-3.5">Stay Status</th>
                <th className="py-3 px-3.5">Feedback</th>
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
                    <td className="py-3 px-3.5 font-serif font-bold text-[#00174A] whitespace-nowrap">
                      {b.bookingId}
                      {b.source === 'OFFLINE' && (
                        <span className="block text-[9px] font-sans text-slate-500 font-normal">Offline / Walk-in</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="whitespace-nowrap font-semibold text-[#00174A]">{b.guestName}</div>
                      <div className="whitespace-nowrap text-[11px] text-[#00174A]/80">{b.guestPhone}</div>
                      <div className="text-[10px] text-[#00174A]/60 truncate max-w-[150px]">{b.guestEmail}</div>
                      {b.gstin && (
                        <div className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 mt-0.5 inline-block">
                          GSTIN: {b.gstin}
                        </div>
                      )}
                      {b.guestAadhar && !b.gstin && (
                        <div className="text-[10px] text-[#00174A]/80 font-mono">Aadhaar: {b.guestAadhar}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-[#00174A] whitespace-nowrap">
                      <div>{b.roomTypeId?.name || 'Executive'}</div>
                      {b.assignedRoomId?.roomNumber && (
                        <span className="text-[10px] text-[#00174A]/70">Room #{b.assignedRoomId.roomNumber}</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-[11px] text-[#00174A]/80 whitespace-nowrap">
                      <div>{new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}</div>
                      <span className="text-[10px] text-slate-500">{b.numNights} night{b.numNights > 1 ? 's' : ''}</span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="font-serif font-bold text-[#00174A] text-sm">₹{b.totalAmount}</div>
                      {b.couponCodeSnapshot ? (
                        <div className="text-[9px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {b.couponCodeSnapshot} (-{b.discountPercentageSnapshot || (b.couponCodeSnapshot === 'WELCOME15' ? 15 : 10)}% | ₹{b.discountAmountSnapshot})
                        </div>
                      ) : (
                        <div className="text-[9px] text-slate-400">No coupon</div>
                      )}
                      <div className="text-[9px] text-[#666666]">
                        GST ({b.taxRateSnapshot || 5}%): ₹{b.taxAmountSnapshot}
                      </div>
                    </td>
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
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div>
                          {b.feedbackRequestSent || b.feedbackRequestStatus === 'SENT' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Req: Sent ✓
                            </span>
                          ) : b.feedbackRequestStatus === 'FAILED' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              Req: Failed ⚠
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-slate-500 bg-slate-100 border border-slate-200">
                              Req: Not Sent
                            </span>
                          )}
                        </div>
                        <div>
                          {b.feedbackSubmitted || b.feedbackStatus === 'RECEIVED' ? (
                            <Link
                              to="/admin/feedback"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#D6B369]/20 text-[#8A6D2B] border border-[#D6B369]/40 hover:bg-[#D6B369]/30 transition-colors"
                            >
                              <MessageSquareHeart size={10} /> Received ✓
                            </Link>
                          ) : (
                            <span className="text-[9px] text-slate-400">
                              Feedback: None
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(b)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-[#00174A] border border-[#10184A]/20 rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                        title="View Full Financial & Booking Details"
                      >
                        <Info size={11} /> Details
                      </button>
                      {b.bookingStatus === 'CONFIRMED' && (
                        <button
                          onClick={() => handleStatusUpdate(b._id, 'CHECKED_IN')}
                          className="px-2 py-1 bg-[#D6B369] hover:bg-[#E8C56A] text-[#00174A] rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer inline-block"
                        >
                          Check In
                        </button>
                      )}
                      {b.bookingStatus === 'CHECKED_IN' && (
                        <button
                          onClick={() => handleStatusUpdate(b._id, 'CHECKED_OUT')}
                          className="px-2 py-1 bg-[#00174A] text-white hover:bg-[#10184A] rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer inline-block"
                        >
                          Check Out
                        </button>
                      )}
                      {(b.bookingStatus === 'CHECKED_OUT' || new Date(b.checkOut) <= new Date()) && !b.feedbackSubmitted && (
                        <button
                          type="button"
                          onClick={() => handleSendFeedbackRequest(b._id, b.bookingId)}
                          disabled={sendingEmailId === b._id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                          title={b.feedbackRequestSent ? 'Resend Feedback Email to Guest' : 'Send Feedback Email to Guest'}
                        >
                          <Mail size={11} className={sendingEmailId === b._id ? 'animate-spin' : ''} />
                          {b.feedbackRequestSent ? 'Resend' : 'Feedback'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadBookingInvoicePdf(b)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#00174A]/10 hover:bg-[#00174A]/20 active:bg-[#00174A]/30 text-[#00174A] rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
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

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#FAF9F6] border border-[#D6B369]/50 rounded-sm shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 text-[#00174A]">
            <div className="flex items-center justify-between pb-3 border-b border-[#10184A]/15 mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#00174A]">
                  Booking Financial Breakdown
                </h3>
                <p className="text-xs text-slate-500 font-mono">Reference: {selectedBooking.bookingId}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-1 hover:bg-[#10184A]/10 rounded transition-colors text-[#00174A]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="bg-white p-3 rounded border border-[#10184A]/10 space-y-1.5">
                <div className="text-[10px] font-bold text-[#D6B369] uppercase tracking-wider">Guest & Verification</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Guest Name:</span>
                  <span className="font-semibold">{selectedBooking.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span>{selectedBooking.guestPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span>{selectedBooking.guestEmail}</span>
                </div>
                {selectedBooking.guestAadhar && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Aadhaar:</span>
                    <span className="font-mono">{selectedBooking.guestAadhar}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">GSTIN:</span>
                  {selectedBooking.gstin ? (
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {selectedBooking.gstin}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">None provided (Normal booking)</span>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded border border-[#10184A]/10 space-y-1.5">
                <div className="text-[10px] font-bold text-[#D6B369] uppercase tracking-wider">Stay Particulars</div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Room Category:</span>
                  <span className="font-semibold">{selectedBooking.roomTypeId?.name || 'Executive Room'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Room:</span>
                  <span>{selectedBooking.assignedRoomId?.roomNumber ? `Room #${selectedBooking.assignedRoomId.roomNumber}` : 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stay Duration:</span>
                  <span>{new Date(selectedBooking.checkIn).toLocaleDateString()} to {new Date(selectedBooking.checkOut).toLocaleDateString()} ({selectedBooking.numNights} night{selectedBooking.numNights > 1 ? 's' : ''})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Guests / Extra Person:</span>
                  <span>{selectedBooking.numGuests} Guests {selectedBooking.extraPerson ? '(+1 Extra Bed)' : ''}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded border border-[#10184A]/10 space-y-2">
                <div className="text-[10px] font-bold text-[#D6B369] uppercase tracking-wider">Financial Breakdown</div>
                <div className="flex justify-between text-slate-600">
                  <span>Room Charges ({selectedBooking.numNights} nights @ ₹{selectedBooking.roomPricePerNightSnapshot}):</span>
                  <span>₹{(selectedBooking.roomPricePerNightSnapshot || 0) * (selectedBooking.numNights || 1)}</span>
                </div>
                {selectedBooking.extraPersonChargeSnapshot > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Extra Person Charges:</span>
                    <span>+ ₹{selectedBooking.extraPersonChargeSnapshot}</span>
                  </div>
                )}
                {selectedBooking.mealPlanSelection?.pricePerNight > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Meal Additions:</span>
                    <span>+ ₹{(selectedBooking.mealPlanSelection.pricePerNight || 0) * (selectedBooking.numNights || 1)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700 font-medium pt-1 border-t border-dashed border-slate-200">
                  <span>Subtotal:</span>
                  <span>₹{
                    ((selectedBooking.roomPricePerNightSnapshot || 0) * (selectedBooking.numNights || 1)) +
                    (selectedBooking.extraPersonChargeSnapshot || 0) +
                    (((selectedBooking.mealPlanSelection?.pricePerNight || 0) * (selectedBooking.numNights || 1)))
                  }</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Promotional Coupon:</span>
                  {selectedBooking.couponCodeSnapshot ? (
                    <span className="font-bold text-purple-700">
                      {selectedBooking.couponCodeSnapshot} ({selectedBooking.discountPercentageSnapshot || (selectedBooking.couponCodeSnapshot === 'WELCOME15' ? 15 : 10)}% off)
                    </span>
                  ) : (
                    <span className="text-slate-400">No coupon applied</span>
                  )}
                </div>
                {selectedBooking.discountAmountSnapshot > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount Amount:</span>
                    <span>- ₹{selectedBooking.discountAmountSnapshot}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>GST ({selectedBooking.taxRateSnapshot || 5}%):</span>
                  <span>₹{selectedBooking.taxAmountSnapshot}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#00174A] pt-2 border-t border-[#10184A]/15">
                  <span>Grand Total Paid:</span>
                  <span className="text-[#00174A]">₹{selectedBooking.totalAmount}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#10184A]/15 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => downloadBookingInvoicePdf(selectedBooking)}
                className="px-3 py-1.5 bg-[#00174A] text-white rounded-sm text-xs font-bold hover:bg-[#10184A] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={13} /> Download Invoice
              </button>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-3 py-1.5 bg-slate-200 text-slate-800 rounded-sm text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
