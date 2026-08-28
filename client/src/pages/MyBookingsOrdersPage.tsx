import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ShoppingBag, Plus, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { trackBookingStatus, trackOrderStatus, getBookingInvoiceUrl, getOrderInvoiceUrl } from '../services/api';

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
        return 'bg-[#f7f7f2]/20 border border-white/20 text-[#f7f7f2]';
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
        return 'bg-[#f7f7f2]/20 border border-white/20 text-[#f7f7f2]';
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-16 max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
      {/* Header section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 border-b border-[#cbc0ad] pb-8">
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-1">
          Private Guest Portal
        </span>
        <h1 className="editorial-section-title text-[#333333]">
          My Bookings & Orders
        </h1>
        <p className="font-sans text-xs sm:text-sm text-[#666666] max-w-xl mx-auto leading-relaxed">
          Access room booking receipts and dining/lounge order histories stored locally in your browser.
        </p>
      </div>

      {/* Manual Tracking Token Import Form */}
      <div className="bg-[#47614d] text-[#f7f7f2] p-6 rounded-sm border border-[#f7f7f2]/15 max-w-2xl mx-auto shadow-md space-y-4">
        <h3 className="text-xs font-sans font-bold text-[#d9b57d] uppercase tracking-wider flex items-center gap-2">
          <Plus size={15} /> Link Booking or Order Manually
        </h3>
        <p className="text-xs font-sans text-[#f7f7f2]/70 leading-relaxed">
          Booked from another device? Paste your unique tracking token below to sync details:
        </p>

        <form onSubmit={handleManualImport} className="flex flex-col sm:flex-row gap-3">
          <select
            value={importType}
            onChange={(e: any) => setImportType(e.target.value)}
            className="bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2]"
          >
            <option value="BOOKING">Room Booking Token</option>
            <option value="ORDER">Food Order Token</option>
          </select>

          <input
            type="text"
            placeholder="Enter tracking token..."
            value={importToken}
            onChange={(e) => setImportToken(e.target.value)}
            className="flex-grow bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2]"
            required
          />

          <button
            type="submit"
            disabled={importing}
            className="px-5 py-2 bg-[#f7f7f2] text-[#333333] font-sans font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#d9b57d] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {importing ? 'Linking...' : 'Link Order'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cbc0ad]"></div>
          <span className="text-xs font-sans text-[#666666]">Fetching guest history...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-4">
          {/* ROOM BOOKINGS SECTION */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#cbc0ad] pb-3">
              <Calendar className="text-[#333333]" size={20} />
              <h2 className="text-2xl font-serif text-[#333333]">Room Bookings</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-sm bg-[#0B1849]/10 text-[#333333] font-sans font-bold ml-auto">
                {bookings.length}
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-[#f7f7f2] p-8 rounded-sm border border-[#cbc0ad] text-center space-y-4">
                <p className="text-xs font-sans text-[#666666]">No room bookings stored in this browser.</p>
                <Link
                  to="/rooms"
                  className="inline-flex px-4 py-2 bg-[#47614d] text-[#f7f7f2] text-xs font-sans font-bold uppercase tracking-wider rounded-sm hover:bg-[#374c3c] transition-all"
                >
                  Book a Room Now
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {bookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="bg-[#47614d] text-[#f7f7f2] p-6 rounded-sm border border-[#f7f7f2]/15 flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-sans text-[#f7f7f2]/60 uppercase block tracking-wider">
                          Booking ID: {booking.bookingId}
                        </span>
                        <h4 className="text-xl font-serif text-[#f7f7f2] mt-0.5">
                          {booking.roomTypeId?.name || 'Executive Room'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#f7f7f2]/50 font-mono">
                            Token: {booking.token}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(booking.token);
                              toast.success('Booking token copied!');
                            }}
                            className="text-[10px] font-sans text-[#d9b57d] hover:underline cursor-pointer bg-transparent border-0 p-0"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <span className={`text-[9px] font-sans font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${getBookingStatusBadgeClass(booking.bookingStatus)}`}>
                        {booking.bookingStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-sans text-[#f7f7f2]/80 bg-[#f7f7f2]/5 p-4 rounded-sm border border-[#f7f7f2]/10">
                      <div>
                        <span className="text-[9px] text-[#f7f7f2]/50 block uppercase">Check-In</span>
                        <span className="font-semibold">{new Date(booking.checkIn).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#f7f7f2]/50 block uppercase">Check-Out</span>
                        <span className="font-semibold">{new Date(booking.checkOut).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-[9px] text-[#f7f7f2]/50 block uppercase">Amount Paid</span>
                        <span className="font-serif font-bold text-[#d9b57d]">₹{booking.totalAmount}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-[9px] text-[#f7f7f2]/50 block uppercase">Assigned Room</span>
                        <span className="font-semibold">{booking.assignedRoomId?.roomNumber || 'Awaiting Check-in'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#f7f7f2]/10">
                      <a
                        href={getBookingInvoiceUrl(booking.token || booking._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-[#f7f7f2] text-[#333333] hover:bg-[#d9b57d] text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Download size={13} /> Tax Invoice PDF
                      </a>

                      <Link
                        to={`/booking/confirmation/${booking.token}`}
                        className="px-3.5 py-2 bg-[#f7f7f2]/10 hover:bg-[#f7f7f2]/20 text-[#f7f7f2] text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center gap-1 transition-all"
                      >
                        Track Stage <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOOD & DINING ORDERS SECTION */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-[#cbc0ad] pb-3">
              <ShoppingBag className="text-[#333333]" size={20} />
              <h2 className="text-2xl font-serif text-[#333333]">Food & Bar Orders</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-sm bg-[#0B1849]/10 text-[#333333] font-sans font-bold ml-auto">
                {orders.length}
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="bg-[#f7f7f2] p-8 rounded-sm border border-[#cbc0ad] text-center space-y-4">
                <p className="text-xs font-sans text-[#666666]">No food or bar orders stored in this browser.</p>
                <Link
                  to="/dining"
                  className="inline-flex px-4 py-2 bg-[#47614d] text-[#f7f7f2] text-xs font-sans font-bold uppercase tracking-wider rounded-sm hover:bg-[#374c3c] transition-all"
                >
                  Order Food Now
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="bg-[#47614d] text-[#f7f7f2] p-6 rounded-sm border border-[#f7f7f2]/15 flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-sans text-[#f7f7f2]/60 uppercase block tracking-wider">
                          Order ID: #{order.orderId}
                        </span>
                        <h4 className="text-xl font-serif text-[#f7f7f2] mt-0.5">
                          {order.roomNumber && order.roomNumber.toLowerCase() !== 'none'
                            ? `Room Service (Room #${order.roomNumber})`
                            : 'Reception Pickup Order'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#f7f7f2]/50 font-mono">
                            Token: {order.token}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(order.token);
                              toast.success('Order token copied!');
                            }}
                            className="text-[10px] font-sans text-[#d9b57d] hover:underline cursor-pointer bg-transparent border-0 p-0"
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
                    <div className="text-xs font-sans text-[#f7f7f2]/80 bg-[#f7f7f2]/5 p-4 rounded-sm border border-[#f7f7f2]/10 space-y-2">
                      <div className="flex justify-between border-b border-[#f7f7f2]/10 pb-1.5 font-bold text-[10px] uppercase text-[#d9b57d]">
                        <span>Items</span>
                        <span>Total: ₹{order.totalAmount}</span>
                      </div>
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[#f7f7f2]/90">
                          <span>{item.quantity}x {item.name}</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[#f7f7f2]/10">
                      <a
                        href={getOrderInvoiceUrl(order.token || order._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-[#f7f7f2] text-[#333333] hover:bg-[#d9b57d] text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Download size={13} /> Receipt PDF
                      </a>

                      <Link
                        to={`/track-order/${order.token}`}
                        className="px-3.5 py-2 bg-[#f7f7f2]/10 hover:bg-[#f7f7f2]/20 text-[#f7f7f2] text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center gap-1 transition-all"
                      >
                        Track Status <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingsOrdersPage;
