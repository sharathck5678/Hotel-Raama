import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Clock, CheckCircle2, ChefHat, Bike, Download } from 'lucide-react';
import { trackOrderStatus } from '../services/api';
import { downloadOrderReceiptPdf } from '../services/clientPdfService';
import { ScrollReveal } from '../components/ScrollReveal';

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000';
  }
  return '';
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

    return () => {
      socket.disconnect();
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] text-[#333333] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cbc0ad]"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] text-[#333333] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-serif">Order Not Found</h2>
        <p className="text-xs font-sans text-[#666666] mt-2">The order tracking link is invalid.</p>
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
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-16 px-6 max-w-lg mx-auto space-y-6">
      {/* Card Header */}
      <ScrollReveal direction="up" duration={0.85}>
        <div className="bg-[#47614d] text-[#f7f7f2] p-8 rounded-sm border border-[#f7f7f2]/20 space-y-8 shadow-2xl text-center">
        <div>
          <span className="text-[10px] font-sans text-[#d9b57d] font-bold uppercase tracking-[0.2em] block">
            {order.roomNumber && order.roomNumber.toLowerCase() !== 'none'
              ? `Room #${order.roomNumber} Service Live Tracker`
              : 'Reception Pickup Live Tracker'}
          </span>
          <h1 className="text-2xl font-serif text-[#f7f7f2] mt-1">Order #{order.orderId}</h1>
          <span className="inline-block mt-2 px-3 py-1 bg-[#f7f7f2]/10 border border-[#f7f7f2]/20 text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-wider rounded-sm">
            {order.status}
          </span>
        </div>

        {/* Progress Tracker Steps */}
        <div className="space-y-4 text-left pt-6 border-t border-[#f7f7f2]/10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    isCompleted
                      ? 'bg-[#d9b57d] text-[#333333] border-[#d9b57d]'
                      : 'bg-[#f7f7f2]/5 text-[#f7f7f2]/40 border-[#f7f7f2]/15'
                  } ${isCurrent ? 'animate-pulse ring-2 ring-[#FFDE74]' : ''}`}
                >
                  <Icon size={15} />
                </div>
                <span className={`text-xs font-sans font-semibold ${isCompleted ? 'text-[#f7f7f2]' : 'text-[#f7f7f2]/40'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Items Summary */}
        <div className="p-5 bg-[#f7f7f2]/5 rounded-sm border border-[#f7f7f2]/15 text-left space-y-3 text-xs font-sans">
          <span className="text-[10px] font-bold text-[#d9b57d] uppercase tracking-wider block">Ordered Items</span>
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-[#f7f7f2]/80">
              <span>
                {item.quantity}x {item.name} {item.potionSize !== 'Standard' && `(${item.potionSize})`}
              </span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
          <div className="pt-3 border-t border-[#f7f7f2]/10 flex justify-between font-bold text-sm text-[#d9b57d]">
            <span>Total Bill Amount:</span>
            <span className="font-serif">₹{order.totalAmount}</span>
          </div>
        </div>

        {/* PDF Receipt Action */}
        <div>
          <button
            type="button"
            onClick={() => downloadOrderReceiptPdf(order)}
            className="w-full py-4 bg-[#f7f7f2] text-[#333333] hover:bg-[#d9b57d] text-xs font-sans font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.99]"
          >
            <Download size={15} /> Download Digital Receipt (PDF)
          </button>
        </div>
      </div>
    </ScrollReveal>
    </div>
  );
};
