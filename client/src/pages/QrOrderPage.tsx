import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Utensils, GlassWater, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { validateQrToken, fetchMenuCatalog, createFoodOrder, verifyOrderPayment } from '../services/api';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '../components/ScrollReveal';

export const QrOrderPage: React.FC = () => {
  const { token: pathToken } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const token =
    pathToken ||
    searchParams.get('token') ||
    searchParams.get('qrToken') ||
    searchParams.get('room') ||
    searchParams.get('qr') ||
    localStorage.getItem('scanned_qr_token') ||
    '101';

  const [roomInfo, setRoomInfo] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'SWAAD_VEG' | 'HOTEL_RAAMA' | 'LIQUID_LOUNGE'>('SWAAD_VEG');

  // Cart State: { [menuItemId_potionSize]: { menuItemId, name, price, quantity, potionSize } }
  const [cart, setCart] = useState<Record<string, any>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'RAZORPAY' | 'CASH'>('RAZORPAY');

  useEffect(() => {
    if (!token) return;

    // 1. Validate QR Token
    validateQrToken(token)
      .then((res) => {
        if (res.success) {
          setRoomInfo(res.data);
          try {
            localStorage.setItem('scanned_qr_token', token);
            if (res.data?.roomNumber) {
              localStorage.setItem('scanned_room_number', String(res.data.roomNumber));
            }
          } catch (e) {
            console.error('Error writing QR session to localStorage:', e);
          }
          // 2. Fetch Menu
          return fetchMenuCatalog();
        } else {
          toast.error(res.message || 'Invalid QR Token');
        }
      })
      .then((res) => {
        if (res?.success) {
          setCategories(res.data.categories);
          setItems(res.data.items);
        }
      })
      .catch(() => {
        toast.error('Failed to initialize QR ordering.');
      })
      .finally(() => setLoading(false));

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, [token]);

  const addToCart = (item: any, potionSize: string = 'Standard') => {
    const key = `${item._id}_${potionSize}`;
    const unitPrice = potionSize === '60ML' && item.price60ml ? item.price60ml : item.price;

    setCart((prev) => {
      const existing = prev[key];
      const newQty = existing ? existing.quantity + 1 : 1;
      return {
        ...prev,
        [key]: {
          menuItemId: item._id,
          name: item.name,
          price: unitPrice,
          quantity: newQty,
          potionSize,
        },
      };
    });

    toast.success(`Added ${item.name} to cart`);
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return {
        ...prev,
        [key]: { ...existing, quantity: newQty },
      };
    });
  };

  const cartList = Object.values(cart);
  const totalCartCount = cartList.reduce((sum, i) => sum + i.quantity, 0);
  const totalCartPrice = cartList.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cartList.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    if (!guestName || !guestPhone) {
      toast.error('Please provide your name and phone number.');
      return;
    }

    setPlacingOrder(true);

    try {
      const res = await createFoodOrder({
        qrToken: token,
        guestName,
        guestPhone,
        items: cartList,
        specialInstructions,
        paymentMethod: paymentMode,
      });

      if (!res.success) {
        toast.error(res.message || 'Failed to place order.');
        setPlacingOrder(false);
        return;
      }

      const { orderId, trackingToken, totalAmount, razorpayOrderId, razorpayKeyId } = res.data;

      // Handle CASH payment choice (Pay at Reception / Counter)
      if (paymentMode === 'CASH') {
        toast.success('Food order sent to kitchen! Pay cash at reception/counter.');
        try {
          const storedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
          if (!storedOrders.includes(trackingToken)) {
            storedOrders.push(trackingToken);
            localStorage.setItem('my_orders', JSON.stringify(storedOrders));
          }
        } catch (e) {
          console.error('Error updating localStorage:', e);
        }
        navigate(`/track-order/${trackingToken}`);
        return;
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        name: 'Hotel Raama, Hassan',
        description: `Food Order ${orderId}`,
        image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=200&q=80',
        order_id: razorpayOrderId && razorpayOrderId.startsWith('order_mock_') ? undefined : razorpayOrderId,
        handler: async function (response: any) {
          toast.loading('Verifying payment signature...');

          const verifyRes = await verifyOrderPayment({
            orderId,
            razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
            razorpaySignature: response.razorpay_signature || 'mock_sig',
          });

          if (verifyRes.success) {
            toast.dismiss();
            toast.success('Payment verified! Food order placed successfully!');
            try {
              const storedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
              if (!storedOrders.includes(trackingToken)) {
                storedOrders.push(trackingToken);
                localStorage.setItem('my_orders', JSON.stringify(storedOrders));
              }
            } catch (e) {
              console.error('Error updating localStorage:', e);
            }
            navigate(`/track-order/${trackingToken}`);
          } else {
            toast.dismiss();
            toast.error(verifyRes.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: guestName,
          contact: guestPhone,
        },
        theme: {
          color: '#00174A',
        },
        modal: {
          ondismiss: function () {
            toast.warning('Payment cancelled. Order was not submitted.');
            setPlacingOrder(false);
          },
        },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback for environment without script
        const verifyRes = await verifyOrderPayment({
          orderId,
          razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'mock_sig',
        });
        if (verifyRes.success) {
          try {
            const storedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
            if (!storedOrders.includes(trackingToken)) {
              storedOrders.push(trackingToken);
              localStorage.setItem('my_orders', JSON.stringify(storedOrders));
            }
          } catch (e) {
            console.error('Error updating localStorage:', e);
          }
          navigate(`/track-order/${trackingToken}`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error placing order.');
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F0DF] text-[#00174A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6B369]"></div>
      </div>
    );
  }

  if (!roomInfo) {
    return (
      <div className="min-h-screen bg-[#F7F0DF] text-[#00174A] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-serif">Invalid QR Code</h2>
        <p className="text-xs font-sans text-[#667085] mt-2">Please scan the valid QR code present in your room or party hall.</p>
      </div>
    );
  }

  const isVenue = isNaN(Number(roomInfo.roomNumber));
  const locationTitle = isVenue ? roomInfo.roomNumber : `Room #${roomInfo.roomNumber}`;

  const sectionItems = items.filter((i) => {
    // Hide out of stock items from guest QR ordering menu
    if (i.isAvailable === false) return false;

    if (activeSection === 'SWAAD_VEG') {
      return i.section === 'SWAAD';
    } else if (activeSection === 'HOTEL_RAAMA') {
      return i.section === 'HOTEL_RAAMA';
    } else if (activeSection === 'LIQUID_LOUNGE') {
      return i.section === 'LIQUID_LOUNGE';
    }
    return true;
  });

  const activeCategoryIds = new Set(
    sectionItems.map((i) => (typeof i.categoryId === 'object' ? i.categoryId?._id : i.categoryId))
  );
  const sectionCategories = categories.filter((c) => activeCategoryIds.has(c._id));

  return (
    <div className="min-h-screen bg-[#F7F0DF] text-[#00174A] py-12 px-6 lg:px-8 relative">
      {/* Location Banner Header */}
      <ScrollReveal direction="up" duration={0.8}>
        <div className="max-w-4xl mx-auto text-center space-y-3 mb-12 border-b border-[#10184A]/15 pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#667085]">
            Verified Location
          </span>
          <h1 className="editorial-section-title text-[#00174A]">
            {locationTitle}
          </h1>
          <p className="text-xs font-sans text-[#667085]">
            Floor {roomInfo.floor} · Contactless Ordering Portal
          </p>


          {/* Section Tabs */}
          <div className="flex flex-wrap justify-center gap-3 pt-6">
            <button
              onClick={() => setActiveSection('SWAAD_VEG')}
              className={`px-4 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer bg-white text-[#00174A] ${
                activeSection === 'SWAAD_VEG'
                  ? 'border-2 border-[#D6B369] shadow-[0_0_14px_rgba(214,179,105,0.45)] ring-2 ring-[#D6B369]/20'
                  : 'border border-[#10184A]/15 hover:border-[#D6B369]/60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <Utensils size={14} /> Swaad Pure Veg
            </button>
            <button
              onClick={() => setActiveSection('HOTEL_RAAMA')}
              className={`px-4 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer bg-white text-[#00174A] ${
                activeSection === 'HOTEL_RAAMA'
                  ? 'border-2 border-[#D6B369] shadow-[0_0_14px_rgba(214,179,105,0.45)] ring-2 ring-[#D6B369]/20'
                  : 'border border-[#10184A]/15 hover:border-[#D6B369]/60'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#C8102E] inline-block"></span>
              <Utensils size={14} /> Hotel Raama
            </button>
            <button
              onClick={() => setActiveSection('LIQUID_LOUNGE')}
              className={`px-4 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer bg-white text-[#00174A] ${
                activeSection === 'LIQUID_LOUNGE'
                  ? 'border-2 border-[#D6B369] shadow-[0_0_14px_rgba(214,179,105,0.45)] ring-2 ring-[#D6B369]/20'
                  : 'border border-[#10184A]/15 hover:border-[#D6B369]/60'
              }`}
            >
              <GlassWater size={14} /> Liquid Lounge Bar
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Menu Catalog */}
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {sectionCategories.map((cat) => {
          const catItems = sectionItems.filter((i) => i.categoryId === cat._id);
          if (catItems.length === 0) return null;

          return (
            <ScrollReveal key={cat._id} direction="up" duration={0.8} className="space-y-4">
              <h2 className="text-2xl font-serif text-[#00174A] border-b border-[#10184A]/15 pb-2">
                {cat.name}
              </h2>

              <ScrollRevealGroup staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {catItems.map((item) => (
                  <ScrollRevealItem key={item._id}>
                    <div
                      className="bg-white rounded-sm p-6 border border-[#10184A]/15 flex flex-col justify-between hover:border-[#D6B369]/60 transition-all shadow-sm h-full"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-serif font-bold text-[#00174A]">{item.name}</h3>
                          {item.section !== 'LIQUID_LOUNGE' && activeSection !== 'LIQUID_LOUNGE' && (
                            <span
                              className={`text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                                item.isVeg ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-800 border-red-300'
                              }`}
                            >
                              {item.isVeg ? 'Veg' : 'Non-Veg'}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs font-sans text-[#667085] mt-2 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-[#10184A]/15 mt-4 flex items-center justify-between">
                        <div>
                          {item.price60ml ? (
                            <div className="text-[10px] font-sans text-[#667085]">
                              <span>30ML: <strong className="text-[#00174A]">₹{item.price}</strong></span>
                              <span className="ml-2">60ML: <strong className="text-[#00174A]">₹{item.price60ml}</strong></span>
                            </div>
                          ) : (
                            <span className="text-lg font-serif font-bold text-[#00174A]">₹{item.price}</span>
                          )}
                        </div>

                        {item.price60ml ? (() => {
                          const key30 = `${item._id}_30ML`;
                          const key60 = `${item._id}_60ML`;
                          const qty30 = cart[key30]?.quantity || 0;
                          const qty60 = cart[key60]?.quantity || 0;

                          return (
                            <div className="flex gap-1.5 items-center">
                              {qty30 > 0 ? (
                                <div className="flex items-center rounded-sm bg-[#00174A] text-[#FAF9F6] shadow-sm overflow-hidden border border-[#00174A]">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(key30, -1)}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-[#152554] active:bg-[#1e326b] transition-colors cursor-pointer"
                                    aria-label="Decrease 30ML quantity"
                                  >
                                    <Minus size={11} className="stroke-[2.5]" />
                                  </button>
                                  <span className="px-1 text-[10px] font-sans font-bold select-none min-w-[32px] text-center">
                                    30M·{qty30}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(key30, 1)}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-[#152554] active:bg-[#1e326b] transition-colors cursor-pointer"
                                    aria-label="Increase 30ML quantity"
                                  >
                                    <Plus size={11} className="stroke-[2.5]" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addToCart(item, '30ML')}
                                  className="px-2.5 py-1 rounded-sm bg-[#00174A] text-[#FAF9F6] text-[10px] font-sans font-semibold uppercase hover:bg-[#10184A] cursor-pointer"
                                >
                                  + 30ML
                                </button>
                              )}

                              {qty60 > 0 ? (
                                <div className="flex items-center rounded-sm bg-[#00174A] text-[#FAF9F6] shadow-sm overflow-hidden border border-[#00174A]">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(key60, -1)}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-[#152554] active:bg-[#1e326b] transition-colors cursor-pointer"
                                    aria-label="Decrease 60ML quantity"
                                  >
                                    <Minus size={11} className="stroke-[2.5]" />
                                  </button>
                                  <span className="px-1 text-[10px] font-sans font-bold select-none min-w-[32px] text-center">
                                    60M·{qty60}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(key60, 1)}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-[#152554] active:bg-[#1e326b] transition-colors cursor-pointer"
                                    aria-label="Increase 60ML quantity"
                                  >
                                    <Plus size={11} className="stroke-[2.5]" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addToCart(item, '60ML')}
                                  className="px-2.5 py-1 rounded-sm bg-[#00174A] text-[#FAF9F6] text-[10px] font-sans font-semibold uppercase hover:bg-[#10184A] cursor-pointer"
                                >
                                  + 60ML
                                </button>
                              )}
                            </div>
                          );
                        })() : (() => {
                          const standardKey = `${item._id}_Standard`;
                          const standardQty = cart[standardKey]?.quantity || 0;

                          if (standardQty > 0) {
                            return (
                              <div className="flex items-center rounded-sm bg-[#D6B369] text-[#00174A] shadow-sm overflow-hidden border border-[#D6B369]">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(standardKey, -1)}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-[#C4A259] active:bg-[#B39148] transition-colors cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={13} className="stroke-[2.5]" />
                                </button>
                                <span className="w-8 text-center text-xs font-sans font-bold select-none text-[#00174A]">
                                  {standardQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(standardKey, 1)}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-[#C4A259] active:bg-[#B39148] transition-colors cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={13} className="stroke-[2.5]" />
                                </button>
                              </div>
                            );
                          }

                          return (
                            <button
                              type="button"
                              onClick={() => addToCart(item, 'Standard')}
                              className="px-4 py-2 rounded-sm bg-[#D6B369] text-[#00174A] text-xs font-sans font-bold uppercase hover:bg-[#E8C56A] cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                            >
                              <Plus size={13} /> Add
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </ScrollRevealItem>
                ))}
              </ScrollRevealGroup>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="px-6 py-3.5 rounded-sm bg-[#D6B369] text-[#00174A] shadow-2xl font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-3 hover:bg-[#E8C56A] transition-all cursor-pointer border border-[#00174A]/20"
          >
            <ShoppingBag size={16} /> Cart ({totalCartCount}) · ₹{totalCartPrice}
          </button>
        </div>
      )}

      {/* Cart & Checkout Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#00174A] text-[#FAF9F6] border border-white/20 rounded-sm max-w-lg w-full max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl space-y-6">
            <button
              onClick={() => setCartOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white/70 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="border-b border-white/10 pb-4">
              <span className="text-[#D6B369] text-[10px] font-sans font-bold uppercase tracking-[0.2em]">
                {locationTitle} Order Service
              </span>
              <h2 className="text-2xl font-serif text-[#FAF9F6]">Confirm Order</h2>
            </div>

            {/* Items */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
              {cartList.map((item: any) => {
                const key = `${item.menuItemId}_${item.potionSize}`;
                return (
                  <div key={key} className="flex items-center justify-between bg-white/5 p-3 rounded-sm border border-white/10 text-xs font-sans">
                    <div>
                      <span className="font-bold text-[#FAF9F6] block">{item.name}</span>
                      <span className="text-[10px] text-white/60">Size: {item.potionSize} · ₹{item.price}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#10184A] border border-white/20 rounded-sm px-2 py-1">
                        <button onClick={() => updateQuantity(key, -1)} className="text-white/70 hover:text-white">
                          <Minus size={12} />
                        </button>
                        <span className="font-bold text-xs">{item.quantity}</span>
                        <button onClick={() => updateQuantity(key, 1)} className="text-white/70 hover:text-white">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="font-bold text-sm text-[#D6B369] min-w-14 text-right">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/10 text-sm font-sans font-bold">
              <span>Total Amount:</span>
              <span className="text-xl font-serif text-[#D6B369]">₹{totalCartPrice}</span>
            </div>

            <form onSubmit={handleOrderSubmit} className="space-y-4 pt-2">
              {/* Auto-Fetched Verified Room Location */}
              <div className="p-3 bg-white/10 rounded-sm border border-[#D6B369]/30 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-sans uppercase font-bold text-[#D6B369] tracking-wider block">
                    Verified Order Location
                  </span>
                  <span className="text-sm font-serif font-bold text-[#FAF9F6]">
                    {locationTitle} {roomInfo?.floor ? `(Floor ${roomInfo.floor})` : ''}
                  </span>
                </div>
                <span className="px-2 py-1 rounded-sm bg-emerald-500/20 text-emerald-300 text-[9px] font-sans font-bold uppercase tracking-wider border border-emerald-500/30">
                  ✓ Scanned from QR
                </span>
              </div>


              <div>
                <label className="block text-[10px] font-sans uppercase text-white/80 font-bold mb-1">Your Name *</label>
                <input
                  type="text"
                  placeholder="Guest Name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-[#10184A] border border-white/20 rounded-sm px-3.5 py-2 text-xs font-sans text-white placeholder-white/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans uppercase text-white/80 font-bold mb-1">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="Contact Mobile Number"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full bg-[#10184A] border border-white/20 rounded-sm px-3.5 py-2 text-xs font-sans text-white placeholder-white/40"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans uppercase text-white/80 font-bold mb-1">Special Notes / Spice Level</label>
                <input
                  type="text"
                  placeholder="e.g. Mild spice, no onions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full bg-[#10184A] border border-white/20 rounded-sm px-3.5 py-2 text-xs font-sans text-white placeholder-white/40"
                />
              </div>

              {/* Payment Mode Selection */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-sans uppercase tracking-wider text-[#D6B369] font-bold block">Payment Method *</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('RAZORPAY')}
                    className={`p-3 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      paymentMode === 'RAZORPAY' ? 'bg-[#F7F0DF] text-[#00174A] font-bold border-[#F7F0DF]' : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'
                    }`}
                  >
                    <span className="text-xs font-sans uppercase font-bold flex items-center gap-1.5">💳 Online (Razorpay)</span>
                    <span className="text-[10px] opacity-80">Instant UPI & Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`p-3 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      paymentMode === 'CASH' ? 'bg-[#F7F0DF] text-[#00174A] font-bold border-[#F7F0DF]' : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'
                    }`}
                  >
                    <span className="text-xs font-sans uppercase font-bold flex items-center gap-1.5">💵 Pay at Reception</span>
                    <span className="text-[10px] opacity-80">Pay upon delivery</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={placingOrder}
                className="w-full py-4 rounded-sm bg-[#D6B369] text-[#00174A] font-sans font-bold text-xs uppercase tracking-wider hover:bg-[#E8C56A] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-4"
              >
                <Send size={15} /> {paymentMode === 'RAZORPAY' ? 'Pay Online & Send Order' : 'Send Order to Kitchen'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
