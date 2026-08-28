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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#333333]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cbc0ad]"></div>
      </div>
    );
  }

  const columns = [
    { key: 'COOK_FOOD', title: '🍳 Cook Food (Kitchen Preparation)', color: 'border-[#d9b57d]' },
    { key: 'SERVE_FOOD', title: '🍽️ Serve Food (Ready & Delivered)', color: 'border-emerald-500' },
  ];

  return (
    <div className="space-y-6 text-[#333333]">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#cbc0ad] pb-4">
        <div>
          <h1 className="text-2xl font-serif text-[#333333]">Kitchen & Dining Orders</h1>
          <p className="text-xs font-sans text-[#666666]">2-stage live kitchen workflow: Cook Food & Serve Food</p>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`px-3.5 py-2 rounded-sm text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
            soundEnabled
              ? 'bg-[#47614d] text-[#f7f7f2] border-[#cbc0ad]'
              : 'bg-[#f7f7f2] text-[#666666] border-[#cbc0ad]'
          }`}
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          Sound Alerts {soundEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* 2-Column Simplified Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => {
            if (col.key === 'COOK_FOOD') {
              return o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING';
            } else {
              return o.status === 'READY' || o.status === 'DELIVERED';
            }
          });

          return (
            <div key={col.key} className={`bg-[#47614d] text-[#f7f7f2] p-6 rounded-sm border-t-4 ${col.color} border border-[#f7f7f2]/15 space-y-4 shadow-xl`}>
              <div className="flex justify-between items-center pb-3 border-b border-[#f7f7f2]/10">
                <h3 className="font-serif font-bold text-lg text-[#f7f7f2]">{col.title}</h3>
                <span className="px-3 py-1 rounded-sm bg-[#f7f7f2]/10 text-xs font-sans font-bold text-[#d9b57d] border border-[#f7f7f2]/15">
                  {colOrders.length} {colOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>

              <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {colOrders.length === 0 ? (
                  <div className="text-center py-12 text-[#f7f7f2]/50 text-xs font-sans">
                    No active orders in this column.
                  </div>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord._id}
                      className="p-5 rounded-sm bg-[#f7f7f2]/5 border border-[#f7f7f2]/15 space-y-3 shadow-md hover:border-[#d9b57d]/40 transition-all font-sans"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-[#d9b57d] uppercase tracking-wider block">
                            {formatRoomNumber(ord.roomNumber)}
                          </span>
                          <h4 className="text-base font-serif font-bold text-[#f7f7f2]">#{ord.orderId}</h4>
                          <div className="flex gap-1.5 mt-1">
                            {ord.deliveryOption && (
                              <span className="text-[9px] px-2 py-0.5 rounded-sm bg-[#f7f7f2]/10 text-[#f7f7f2] font-bold uppercase tracking-wider">
                                {ord.deliveryOption === 'RECEPTION_PICKUP' ? 'PICKUP' : 'ROOM SERVICE'}
                              </span>
                            )}
                            <span className={`text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                              ord.paymentMethod === 'CASH'
                                ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                                : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/60'
                            }`}>
                              {ord.paymentMethod === 'CASH' ? 'PAY AT RECEPTION' : 'RAZORPAY ONLINE'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#f7f7f2]/50">
                          {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Guest info */}
                      <div className="text-xs text-[#f7f7f2]/80">
                        <span>Guest: <strong className="text-white">{ord.guestName}</strong></span> ({ord.guestPhone})
                      </div>

                      {/* Items */}
                      <div className="space-y-1 py-2 border-y border-[#f7f7f2]/10 text-xs">
                        {ord.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[#f7f7f2]/90">
                            <span>
                              {item.quantity}x <strong>{item.name}</strong> {item.potionSize !== 'Standard' && `(${item.potionSize})`}
                            </span>
                            <span className="text-[#f7f7f2]/60">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Instructions */}
                      {ord.specialInstructions && (
                        <div className="text-[11px] text-[#d9b57d] bg-[#d9b57d]/10 p-2 rounded-sm border border-[#d9b57d]/30">
                          Note: {ord.specialInstructions}
                        </div>
                      )}

                      {/* Status & Payment bar */}
                      <div className="pt-2 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold font-serif text-[#d9b57d] text-sm">Total: ₹{ord.totalAmount}</span>
                          <span
                            className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider ${
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
                              className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                            >
                              🍳 Start Cooking Food
                            </button>
                          )}
                          {ord.status === 'PREPARING' && (
                            <button
                              onClick={() => handleStatusChange(ord._id, 'READY')}
                              className="w-full py-2 bg-[#f7f7f2] text-[#333333] hover:bg-[#d9b57d] rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                            >
                              ✅ Food Cooked (Move to Serve)
                            </button>
                          )}
                          {ord.status === 'READY' && (
                            <button
                              onClick={() => handleStatusChange(ord._id, 'DELIVERED')}
                              className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-sm text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
                            >
                              🍽️ Serve Food to Guest
                            </button>
                          )}
                          {ord.status === 'DELIVERED' && (
                            <div className="text-center py-1.5 bg-emerald-950/60 text-emerald-300 rounded-sm text-xs font-bold uppercase tracking-wider border border-emerald-800">
                              ✓ Served & Delivered
                            </div>
                          )}

                          {ord.paymentStatus === 'UNPAID' && (
                            <button
                              onClick={() => handleSettlePayment(ord._id, 'CASH')}
                              className="w-full py-2 bg-emerald-900/80 text-emerald-200 hover:bg-emerald-800 rounded-sm text-xs font-bold uppercase tracking-wider border border-emerald-700 transition-all cursor-pointer"
                            >
                              💵 Settle Cash / UPI Payment
                            </button>
                          )}

                          <a
                            href={getOrderInvoiceUrl(ord.trackingToken || ord._id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-[#f7f7f2]/10 hover:bg-[#f7f7f2]/20 text-[#f7f7f2] font-bold uppercase tracking-wider rounded-sm text-xs flex items-center justify-center gap-1.5 transition-all"
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
