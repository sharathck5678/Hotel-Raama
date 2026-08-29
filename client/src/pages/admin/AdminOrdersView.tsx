import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Volume2, VolumeX, Download } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminOrders, updateOrderStatus, updateOrderPayment, getOrderInvoiceUrl } from '../../services/api';

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://${hostname}:5000`;
  }
  return null;
};

const formatRoomNumber = (room?: string) => {
  if (!room || room.toLowerCase() === 'none' || room.toLowerCase().includes('reception') || room.toLowerCase() === 'qr order') {
    return 'Reception Pickup';
  }
  const clean = room.replace(/^(Room\s*#?|#)/i, '').trim();
  return `Room #${clean}`;
};

export const AdminOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  const loadOrders = () => {
    fetchAdminOrders()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setOrders(res.data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();

    const socketUrl = getSocketUrl();
    let socket: any = null;

    if (socketUrl) {
      try {
        socket = io(socketUrl, {
          withCredentials: true,
          transports: ['websocket', 'polling'],
          timeout: 4000,
          reconnectionAttempts: 2,
        });

        socket.on('connect', () => {
          socket.emit('join_admin_room');
        });

        socket.on('new_order', (newOrder: any) => {
          const labelText = formatRoomNumber(newOrder.roomNumber);
          toast.success(`NEW ORDER! ${labelText} - Order #${newOrder.orderId}`);
          if (soundEnabled) playNotificationSound();
          setOrders((prev) => [newOrder, ...prev.filter((o) => o._id !== newOrder._id)]);
        });

        socket.on('order_updated', (updatedOrder: any) => {
          setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
        });
      } catch (err) {
        console.warn('Socket initialization skipped:', err);
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'raama_local_orders') {
        loadOrders();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Background Polling Fallback (syncs every 5s for cross-network / mobile orders)
    const pollInterval = setInterval(() => {
      loadOrders();
    }, 5000);

    return () => {
      if (socket) socket.disconnect();
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [soundEnabled]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res && res.success) {
        const updatedObj = res.data?.data || res.data || {};
        const orderNum = updatedObj.orderId || '88291';
        toast.success(`Order #${orderNum} status updated to ${newStatus}`);
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, ...updatedObj, status: newStatus } : o))
        );
      } else {
        toast.error(res?.message || 'Failed to update status.');
      }
    } catch (err: any) {
      toast.error('Failed to update status.');
    }
  };

  const handleSettlePayment = async (orderId: string, paymentMethod: string) => {
    try {
      const res = await updateOrderPayment(orderId, { paymentStatus: 'PAID', paymentMethod });
      if (res && res.success) {
        const updatedObj = res.data?.data || res.data || {};
        const orderNum = updatedObj.orderId || '88291';
        toast.success(`Payment settled for Order #${orderNum} via ${paymentMethod}!`);
        setOrders((prev) =>
          prev.map((o) =>
            o._id === orderId ? { ...o, ...updatedObj, paymentStatus: 'PAID', paymentMethod } : o
          )
        );
      } else {
        toast.error(res?.message || 'Failed to settle payment.');
      }
    } catch (err: any) {
      toast.error('Failed to settle payment.');
    }
  };

  const [mobileTab, setMobileTab] = useState<'ALL' | 'COOK_FOOD' | 'SERVE_FOOD'>('ALL');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#333333]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cbc0ad]"></div>
      </div>
    );
  }

  const cookOrders = orders.filter(
    (o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING'
  );
  const serveOrders = orders.filter(
    (o) => o.status === 'READY' || o.status === 'DELIVERED'
  );

  const columns = [
    {
      key: 'COOK_FOOD',
      title: '🍳 Cook Food (Kitchen Preparation)',
      shortTitle: '🍳 Cook Food',
      color: 'border-[#d9b57d]',
      orders: cookOrders,
    },
    {
      key: 'SERVE_FOOD',
      title: '🍽️ Serve Food (Ready & Delivered)',
      shortTitle: '🍽️ Serve Food',
      color: 'border-emerald-500',
      orders: serveOrders,
    },
  ];

  const displayedColumns = columns.filter((col) => {
    if (mobileTab === 'ALL') return true;
    return col.key === mobileTab;
  });

  return (
    <div className="space-y-4 sm:space-y-6 text-[#333333]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#cbc0ad] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-[#333333]">Kitchen & Dining Orders</h1>
          <p className="text-xs font-sans text-[#666666]">2-stage live kitchen workflow: Cook Food & Serve Food</p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3.5 py-2 rounded-sm text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all cursor-pointer w-full sm:w-auto ${
              soundEnabled
                ? 'bg-[#47614d] text-[#f7f7f2] border-[#cbc0ad]'
                : 'bg-[#f7f7f2] text-[#666666] border-[#cbc0ad]'
            }`}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            Sound Alerts {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Mobile Stage Selector Tabs (Shown only on small screens) */}
      <div className="md:hidden flex bg-[#0B1849]/5 p-1 rounded-sm border border-[#cbc0ad] gap-1">
        <button
          onClick={() => setMobileTab('ALL')}
          className={`flex-1 py-2 px-2 text-[11px] font-sans font-bold uppercase tracking-wider rounded-xs text-center transition-all ${
            mobileTab === 'ALL'
              ? 'bg-[#47614d] text-[#f7f7f2] shadow-sm'
              : 'text-[#666666] hover:text-[#333333]'
          }`}
        >
          All ({orders.length})
        </button>
        <button
          onClick={() => setMobileTab('COOK_FOOD')}
          className={`flex-1 py-2 px-2 text-[11px] font-sans font-bold uppercase tracking-wider rounded-xs text-center transition-all ${
            mobileTab === 'COOK_FOOD'
              ? 'bg-[#47614d] text-[#f7f7f2] shadow-sm'
              : 'text-[#666666] hover:text-[#333333]'
          }`}
        >
          🍳 Cook ({cookOrders.length})
        </button>
        <button
          onClick={() => setMobileTab('SERVE_FOOD')}
          className={`flex-1 py-2 px-2 text-[11px] font-sans font-bold uppercase tracking-wider rounded-xs text-center transition-all ${
            mobileTab === 'SERVE_FOOD'
              ? 'bg-[#47614d] text-[#f7f7f2] shadow-sm'
              : 'text-[#666666] hover:text-[#333333]'
          }`}
        >
          🍽️ Serve ({serveOrders.length})
        </button>
      </div>

      {/* 2-Column Simplified Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        {displayedColumns.map((col) => {
          const colOrders = col.orders;

          return (
            <div
              key={col.key}
              className={`bg-[#47614d] text-[#f7f7f2] p-4 sm:p-6 rounded-sm border-t-4 ${col.color} border border-[#f7f7f2]/15 space-y-4 shadow-xl`}
            >
              <div className="flex justify-between items-center pb-3 border-b border-[#f7f7f2]/10">
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#f7f7f2] truncate mr-2">
                  <span className="hidden sm:inline">{col.title}</span>
                  <span className="sm:hidden">{col.shortTitle}</span>
                </h3>
                <span className="px-2.5 py-1 rounded-sm bg-[#f7f7f2]/10 text-xs font-sans font-bold text-[#d9b57d] border border-[#f7f7f2]/15 shrink-0">
                  {colOrders.length} {colOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>

              <div className="space-y-4 md:max-h-[75vh] md:overflow-y-auto pr-0 md:pr-1">
                {colOrders.length === 0 ? (
                  <div className="text-center py-10 text-[#f7f7f2]/50 text-xs font-sans">
                    No active orders in this column.
                  </div>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord._id}
                      className="p-4 sm:p-5 rounded-sm bg-[#f7f7f2]/5 border border-[#f7f7f2]/15 space-y-3 shadow-md hover:border-[#d9b57d]/40 transition-all font-sans"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-[#d9b57d] uppercase tracking-wider block truncate">
                            {formatRoomNumber(ord.roomNumber)}
                          </span>
                          <h4 className="text-base font-serif font-bold text-[#f7f7f2]">#{ord.orderId}</h4>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {ord.deliveryOption && (
                              <span className="text-[9px] px-2 py-0.5 rounded-sm bg-[#f7f7f2]/10 text-[#f7f7f2] font-bold uppercase tracking-wider">
                                {ord.deliveryOption === 'RECEPTION_PICKUP' ? 'PICKUP' : 'ROOM SERVICE'}
                              </span>
                            )}
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                                ord.paymentMethod === 'CASH'
                                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                                  : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/60'
                              }`}
                            >
                              {ord.paymentMethod === 'CASH' ? 'PAY AT RECEPTION' : 'RAZORPAY ONLINE'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#f7f7f2]/60 shrink-0 whitespace-nowrap">
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Guest info */}
                      <div className="text-xs text-[#f7f7f2]/80 flex flex-wrap items-center gap-1">
                        <span>Guest: <strong className="text-white">{ord.guestName}</strong></span>
                        <span className="text-[#f7f7f2]/60">({ord.guestPhone})</span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 py-2.5 border-y border-[#f7f7f2]/10 text-xs">
                        {ord.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-start gap-2 text-[#f7f7f2]/90">
                            <span className="break-words min-w-0">
                              <span className="font-bold text-amber-300 mr-1">{item.quantity}x</span>
                              <strong>{item.name}</strong>{' '}
                              {item.potionSize && item.potionSize !== 'Standard' && (
                                <span className="text-[#f7f7f2]/70 text-[11px]">({item.potionSize})</span>
                              )}
                            </span>
                            <span className="text-[#f7f7f2]/70 shrink-0 font-medium">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Instructions */}
                      {ord.specialInstructions && (
                        <div className="text-[11px] text-[#d9b57d] bg-[#d9b57d]/10 p-2 rounded-sm border border-[#d9b57d]/30 break-words">
                          Note: {ord.specialInstructions}
                        </div>
                      )}

                      {/* Status & Payment bar */}
                      <div className="pt-2 flex flex-col gap-2.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold font-serif text-[#d9b57d] text-sm sm:text-base">
                            Total: ₹{ord.totalAmount}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
                              ord.paymentStatus === 'PAID'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-red-950 text-red-300 border border-red-800'
                            }`}
                          >
                            {ord.paymentStatus}
                          </span>
                        </div>

                        {/* Action Buttons: Cook Food & Serve Food */}
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {(ord.status === 'PENDING' || ord.status === 'CONFIRMED') && (
                            <button
                              onClick={() => handleStatusChange(ord._id, 'PREPARING')}
                              className="w-full py-2.5 bg-amber-700 hover:bg-amber-600 active:bg-amber-800 text-white rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                            >
                              🍳 Start Cooking Food
                            </button>
                          )}
                          {ord.status === 'PREPARING' && (
                            <button
                              onClick={() => handleStatusChange(ord._id, 'READY')}
                              className="w-full py-2.5 bg-[#f7f7f2] text-[#333333] hover:bg-[#d9b57d] active:bg-[#c4a065] rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                            >
                              ✅ Food Cooked (Move to Serve)
                            </button>
                          )}
                          {ord.status === 'READY' && (
                            <button
                              onClick={() => handleStatusChange(ord._id, 'DELIVERED')}
                              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                            >
                              🍽️ Serve Food to Guest
                            </button>
                          )}
                          {ord.status === 'DELIVERED' && (
                            <div className="text-center py-2 bg-emerald-950/60 text-emerald-300 rounded-sm text-xs font-bold uppercase tracking-wider border border-emerald-800">
                              ✓ Served & Delivered
                            </div>
                          )}

                          {ord.paymentStatus === 'UNPAID' && (
                            <button
                              onClick={() => handleSettlePayment(ord._id, 'CASH')}
                              className="w-full py-2 bg-emerald-900/80 text-emerald-200 hover:bg-emerald-800 active:bg-emerald-950 rounded-sm text-xs font-bold uppercase tracking-wider border border-emerald-700 transition-all cursor-pointer"
                            >
                              💵 Settle Cash / UPI Payment
                            </button>
                          )}

                          <a
                            href={getOrderInvoiceUrl(ord.trackingToken || ord._id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-[#f7f7f2]/10 hover:bg-[#f7f7f2]/20 active:bg-[#f7f7f2]/30 text-[#f7f7f2] font-bold uppercase tracking-wider rounded-sm text-xs flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Download size={13} /> PDF Receipt
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

