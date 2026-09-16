import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Clock, CheckCircle2, ChefHat, Bike, Download } from 'lucide-react';
import { trackOrderStatus } from '../services/api';
import { downloadOrderReceiptPdf } from '../services/clientPdfService';
import { ScrollReveal } from '../components/ScrollReveal';
import { cloudRelay } from '../services/cloudRelayService';

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : 'localhost';

  if (envUrl && envUrl.trim() !== '') {
    let cleanUrl = envUrl.trim().replace(/\/api\/?$/, '');
    if (isBrowser && cleanUrl.includes('localhost') && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      cleanUrl = cleanUrl.replace('localhost', hostname);
    }
    return cleanUrl;
  }

  if (isBrowser) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:5000`;
    }
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return `${protocol}//${hostname}:5000`;
    }
  }

  return 'https://hotel-raama.onrender.com';
};

const SOCKET_URL = getSocketUrl();

export const OrderTrackingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    trackOrderStatus(token)
      .then((res) => {
        if (res.success) setOrder(res.data);
      })
      .finally(() => setLoading(false));

    // Connect Socket.IO for real-time order status updates
    const socket = io(SOCKET_URL, { withCredentials: true });

    socket.on('connect', () => {
      socket.emit('join_guest_order', token);
    });

    socket.on('order_status_changed', (updatedOrder: any) => {
      setOrder(updatedOrder);
    });

    // Sub-second Cloud Relay subscription for real-time mobile tracking
    const unsubUpdate = cloudRelay.onOrderUpdate((updatedOrder) => {
      const matchToken = token || '';
      if (
        updatedOrder.trackingToken === matchToken ||
        updatedOrder.orderId === matchToken ||
        updatedOrder._id === matchToken ||
        matchToken.includes(updatedOrder.orderId || 'NON_MATCH')
      ) {
        setOrder(updatedOrder);
      }
    });

    return () => {
      socket.disconnect();
      unsubUpdate();
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#00174A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DFB000]"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#00174A] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-serif">Order Not Found</h2>
        <p className="text-xs font-sans text-[#667085] mt-2">The order tracking link is invalid.</p>
      </div>
    );
  }

  const isPickup = order.deliveryOption === 'RECEPTION_PICKUP';

  const steps = [
    { key: 'PENDING', label: 'Order Received', icon: Clock },
    { key: 'CONFIRMED', label: 'Accepted by Kitchen', icon: CheckCircle2 },
    { key: 'PREPARING', label: 'Chef Preparing', icon: ChefHat },
    { key: 'READY', label: isPickup ? 'Ready for Pickup' : 'Out for Delivery', icon: Bike },
    { key: 'DELIVERED', label: isPickup ? 'Collected at Reception' : 'Delivered to Room', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#00174A] py-16 px-6 max-w-lg mx-auto space-y-6">
      {/* Card Header */}
      <ScrollReveal direction="up" duration={0.85}>
        <div className="bg-[#00174A] text-[#FAF9F6] p-8 rounded-sm border border-white/20 space-y-8 shadow-2xl text-center">
        <div>
          <span className="text-[10px] font-sans text-[#DFB000] font-bold uppercase tracking-[0.2em] block">
            {order.roomNumber && order.roomNumber.toLowerCase() !== 'none'
              ? `Room #${order.roomNumber} Service Live Tracker`
              : 'Reception Pickup Live Tracker'}
          </span>
          <h1 className="text-2xl font-serif text-[#FAF9F6] mt-1">Order #{order.orderId}</h1>
          <span className="inline-block mt-2 px-3 py-1 bg-white/10 border border-white/20 text-[#DFB000] text-[10px] font-sans font-bold uppercase tracking-wider rounded-sm">
            {order.status}
          </span>
        </div>

        {/* Progress Tracker Steps */}
        <div className="space-y-4 text-left pt-6 border-t border-white/10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    isCompleted
                      ? 'bg-[#DFB000] text-[#00174A] border-[#DFB000]'
                      : 'bg-white/5 text-white/40 border-white/15'
                  } ${isCurrent ? 'animate-pulse ring-2 ring-[#DFB000]' : ''}`}
                >
                  <Icon size={15} />
                </div>
                <span className={`text-xs font-sans font-semibold ${isCompleted ? 'text-[#FAF9F6]' : 'text-white/40'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Items Summary */}
        <div className="p-5 bg-white/5 rounded-sm border border-white/15 text-left space-y-3 text-xs font-sans">
          <span className="text-[10px] font-bold text-[#DFB000] uppercase tracking-wider block">Ordered Items</span>
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-white/80">
              <span>
                {item.quantity}x {item.name} {item.potionSize !== 'Standard' && `(${item.potionSize})`}
              </span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="pt-3 border-t border-white/10 flex justify-between font-bold text-sm text-[#DFB000]">
            <span>Total Bill Amount:</span>
            <span className="font-serif">₹{order.totalAmount}</span>
          </div>
        </div>

        {/* PDF Receipt Action */}
        <div>
          {order.paymentStatus === 'PAID' ? (
            <button
              type="button"
              onClick={() => downloadOrderReceiptPdf(order)}
              className="w-full py-4 bg-[#DFB000] text-[#00174A] hover:bg-[#E8C56A] text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.99]"
            >
              <Download size={15} /> Download Digital Receipt (PDF)
            </button>
          ) : (
            <div className="w-full p-4 bg-white/10 border border-[#DFB000]/30 rounded-sm text-center space-y-1">
              <span className="text-[#DFB000] text-[10px] font-sans font-bold uppercase tracking-wider block">
                🔒 Payment Pending
              </span>
              <p className="text-white/70 text-[11px] font-sans">
                Digital receipt will be available for download once payment is completed.
              </p>
            </div>
          )}
        </div>
      </div>
    </ScrollReveal>
    </div>
  );
};
