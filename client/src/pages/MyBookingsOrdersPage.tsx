import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ShoppingBag, Plus, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { trackBookingStatus, trackOrderStatus } from '../services/api';
import { downloadBookingInvoicePdf, downloadOrderReceiptPdf } from '../services/clientPdfService';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '../components/ScrollReveal';

export const MyBookingsOrdersPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual import states
  const [importToken, setImportToken] = useState('');
  const [importType, setImportType] = useState<'BOOKING' | 'ORDER'>('BOOKING');
  const [importing, setImporting] = useState(false);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const storedBookings = JSON.parse(localStorage.getItem('my_bookings') || '[]');
      const storedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');

      // Fetch bookings
      const bookingPromises = storedBookings.map(async (token: string) => {
        try {
          const res = await trackBookingStatus(token);
          if (res.success) return { ...res.data, token };
          return null;
        } catch (e) {
          return null;
        }
      });

      // Fetch orders
      const orderPromises = storedOrders.map(async (token: string) => {
        try {
          const res = await trackOrderStatus(token);
          if (res.success) return { ...res.data, token };
          return null;
        } catch (e) {
          return null;
        }
      });

      const bookingResults = await Promise.all(bookingPromises);
      const orderResults = await Promise.all(orderPromises);

      setBookings(bookingResults.filter((b) => b !== null));
      setOrders(orderResults.filter((o) => o !== null));
    } catch (err) {
      console.error('Error fetching guest data:', err);
      toast.error('Failed to load some bookings or orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleManualImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importToken.trim()) return;

    setImporting(true);
    const token = importToken.trim();

    try {
      if (importType === 'BOOKING') {
        const res = await trackBookingStatus(token);
        if (res.success) {
          const storedBookings = JSON.parse(localStorage.getItem('my_bookings') || '[]');
          if (!storedBookings.includes(token)) {
            storedBookings.push(token);
            localStorage.setItem('my_bookings', JSON.stringify(storedBookings));
            toast.success('Booking added successfully!');
            setImportToken('');
            fetchUserData();
          } else {
            toast.info('This booking is already in your list.');
          }
        } else {
          toast.error('Booking not found. Please check your tracking token.');
        }
      } else {
        const res = await trackOrderStatus(token);
        if (res.success) {
          const storedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
          if (!storedOrders.includes(token)) {
            storedOrders.push(token);
            localStorage.setItem('my_orders', JSON.stringify(storedOrders));
            toast.success('Food order added successfully!');
            setImportToken('');
            fetchUserData();
          } else {
            toast.info('This order is already in your list.');
          }
        } else {
          toast.error('Order not found. Please check your tracking token.');
        }
      }
    } catch (err) {
      toast.error('Failed to verify token. Make sure it is correct.');
    } finally {
      setImporting(false);
    }
  };

  const getBookingStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-950 border border-emerald-600 text-emerald-400';
      case 'CHECKED_IN':
        return 'bg-blue-950 border border-blue-600 text-blue-400';
      case 'CHECKED_OUT':
        return 'bg-[#F7F0DF]/20 border border-white/20 text-[#FAF9F6]';
      case 'CANCELLED':
        return 'bg-red-950 border border-red-600 text-red-400';
      default:
        return 'bg-amber-950 border border-amber-600 text-amber-400';
    }
  };

  const getOrderStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-950 border border-emerald-600 text-emerald-400';
      case 'READY':
        return 'bg-amber-950 border border-amber-600 text-amber-400';
      case 'PREPARING':
        return 'bg-indigo-950 border border-indigo-600 text-indigo-400';
      case 'CONFIRMED':
        return 'bg-blue-950 border border-blue-600 text-blue-400';
      default:
        return 'bg-[#F7F0DF]/20 border border-white/20 text-[#FAF9F6]';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F0DF] text-[#00174A] py-16 max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
      {/* Header section */}
      <ScrollReveal direction="up" duration={0.8}>
        <div className="text-center max-w-3xl mx-auto space-y-4 border-b border-[#10184A]/15 pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#667085] block mb-1">
            Private Guest Portal
          </span>
          <h1 className="editorial-section-title text-[#00174A]">
            My Bookings & Orders
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#667085] max-w-xl mx-auto leading-relaxed">
            Access room booking receipts and dining/lounge order histories stored locally in your browser.
          </p>
        </div>
      </ScrollReveal>

      {/* Manual Tracking Token Import Form */}
      <ScrollReveal direction="up" duration={0.8}>
        <div className="bg-[#00174A] text-[#FAF9F6] p-6 rounded-sm border border-white/15 max-w-2xl mx-auto shadow-md space-y-4">
          <h3 className="text-xs font-sans font-bold text-[#D6B369] uppercase tracking-wider flex items-center gap-2">
            <Plus size={15} /> Link Booking or Order Manually
          </h3>
          <p className="text-xs font-sans text-white/70 leading-relaxed">
            Booked from another device? Paste your unique tracking token below to sync details:
          </p>

          <form onSubmit={handleManualImport} className="flex flex-col sm:flex-row gap-3">
            <select
              value={importType}
              onChange={(e: any) => setImportType(e.target.value)}
              className="bg-[#10184A] border border-white/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#FAF9F6]"
            >
              <option value="BOOKING">Room Booking Token</option>
              <option value="ORDER">Food Order Token</option>
            </select>

            <input
              type="text"
              placeholder="Enter tracking token..."
              value={importToken}
              onChange={(e) => setImportToken(e.target.value)}
              className="flex-grow bg-[#10184A] border border-white/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#FAF9F6]"
              required
            />

            <button
              type="submit"
              disabled={importing}
              className="px-5 py-2 bg-[#D6B369] text-[#00174A] font-sans font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#E8C56A] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {importing ? 'Linking...' : 'Link Order'}
            </button>
          </form>
        </div>
      </ScrollReveal>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6B369]"></div>
          <span className="text-xs font-sans text-[#667085]">Fetching guest history...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
          {/* ROOM BOOKINGS SECTION */}
          <ScrollReveal direction="up" duration={0.8} className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#10184A]/15 pb-3">
              <Calendar className="text-[#00174A]" size={20} />
              <h2 className="text-2xl font-serif text-[#00174A]">Room Bookings</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-sm bg-[#00174A]/10 text-[#00174A] font-sans font-bold ml-auto">
                {bookings.length}
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-white p-8 rounded-sm border border-[#10184A]/15 text-center space-y-4">
                <p className="text-xs font-sans text-[#667085]">No room bookings stored in this browser.</p>
                <Link
                  to="/rooms"
                  className="inline-flex px-4 py-2 bg-[#00174A] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm hover:bg-[#10184A] transition-all"
                >
                  Book a Room Now
                </Link>
              </div>
            ) : (
              <ScrollRevealGroup staggerDelay={0.1} className="space-y-6">
                {bookings.map((booking) => (
                  <ScrollRevealItem key={booking._id}>
                    <div
                      className="bg-[#00174A] text-[#FAF9F6] p-6 rounded-sm border border-white/15 flex flex-col justify-between space-y-4 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-sans text-white/60 uppercase block tracking-wider">
                            Booking ID: {booking.bookingId}
                          </span>
                          <h4 className="text-xl font-serif text-[#FAF9F6] mt-0.5">
                            {booking.roomTypeId?.name || 'Executive Room'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-white/50 font-mono">
                              Token: {booking.token}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(booking.token);
                                toast.success('Booking token copied!');
                              }}
                              className="text-[10px] font-sans text-[#D6B369] hover:underline cursor-pointer bg-transparent border-0 p-0"
                            >
                              Copy
                            </button>
                          </div>
                        </div>

                        <span className={`text-[9px] font-sans font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${getBookingStatusBadgeClass(booking.bookingStatus)}`}>
                          {booking.bookingStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-sans text-white/80 bg-white/5 p-4 rounded-sm border border-white/10">
                        <div>
                          <span className="text-[9px] text-white/50 block uppercase">Check-In</span>
                          <span className="font-semibold">{new Date(booking.checkIn).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-white/50 block uppercase">Check-Out</span>
                          <span className="font-semibold">{new Date(booking.checkOut).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-[9px] text-white/50 block uppercase">Amount Paid</span>
                          <span className="font-serif font-bold text-[#D6B369]">₹{booking.totalAmount}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-[9px] text-white/50 block uppercase">Assigned Room</span>
                          <span className="font-semibold">{booking.assignedRoomId?.roomNumber || 'Awaiting Check-in'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => downloadBookingInvoicePdf(booking)}
                          className="px-3.5 py-2 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                        >
                          <Download size={13} /> Tax Invoice PDF
                        </button>

                        <Link
                          to={`/booking/confirmation/${booking.token}`}
                          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center gap-1 transition-all"
                        >
                          Track Stage <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </ScrollRevealItem>
                ))}
              </ScrollRevealGroup>
            )}
          </ScrollReveal>

          {/* FOOD & DINING ORDERS SECTION */}
          <ScrollReveal direction="up" duration={0.8} className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#10184A]/15 pb-3">
              <ShoppingBag className="text-[#00174A]" size={20} />
              <h2 className="text-2xl font-serif text-[#00174A]">Food & Bar Orders</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-sm bg-[#00174A]/10 text-[#00174A] font-sans font-bold ml-auto">
                {orders.length}
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white p-8 rounded-sm border border-[#10184A]/15 text-center space-y-4">
                <p className="text-xs font-sans text-[#666666]">No food or bar orders stored in this browser.</p>
                <Link
                  to="/dining"
                  className="inline-flex px-4 py-2 bg-[#00174A] text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm hover:bg-[#10184A] transition-all"
                >
                  Order Food Now
                </Link>
              </div>
            ) : (
              <ScrollRevealGroup staggerDelay={0.1} className="space-y-6">
                {orders.map((order) => (
                  <ScrollRevealItem key={order._id}>
                    <div
                      className="bg-[#00174A] text-[#FAF9F6] p-6 rounded-sm border border-white/15 flex flex-col justify-between space-y-4 shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-sans text-white/60 uppercase block tracking-wider">
                            Order ID: #{order.orderId}
                          </span>
                          <h4 className="text-xl font-serif text-[#FAF9F6] mt-0.5">
                            {order.roomNumber && order.roomNumber.toLowerCase() !== 'none'
                              ? `Room Service (Room #${order.roomNumber})`
                              : 'Reception Pickup Order'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-white/50 font-mono">
                              Token: {order.token}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(order.token);
                                toast.success('Order token copied!');
                              }}
                              className="text-[10px] font-sans text-[#D6B369] hover:underline cursor-pointer bg-transparent border-0 p-0"
                            >
                              Copy
                            </button>
                          </div>
                        </div>

                        <span className={`text-[9px] font-sans font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${getOrderStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Order summary list */}
                      <div className="text-xs font-sans text-white/80 bg-white/5 p-4 rounded-sm border border-white/10 space-y-2">
                        <div className="flex justify-between border-b border-white/10 pb-1.5 font-bold text-[10px] uppercase text-[#D6B369]">
                          <span>Items</span>
                          <span>Total: ₹{order.totalAmount}</span>
                        </div>
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-white/90">
                            <span>{item.quantity}x {item.name}</span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        {order.paymentStatus === 'PAID' ? (
                          <button
                            type="button"
                            onClick={() => downloadOrderReceiptPdf(order)}
                            className="px-3.5 py-2 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                          >
                            <Download size={13} /> Receipt PDF
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#D6B369] font-sans font-semibold uppercase tracking-wider bg-white/10 px-2.5 py-1.5 rounded-sm border border-[#D6B369]/30">
                            🔒 Receipt Unlocked Upon Payment
                          </span>
                        )}

                        <Link
                          to={`/track-order/${order.token}`}
                          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center gap-1 transition-all"
                        >
                          Track Status <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </ScrollRevealItem>
                ))}
              </ScrollRevealGroup>
            )}
          </ScrollReveal>
        </div>
      )}
    </div>
  );
};

export default MyBookingsOrdersPage;
