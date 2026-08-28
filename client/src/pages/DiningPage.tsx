import React, { useState, useEffect } from 'react';
import { Utensils, GlassWater, Search, ShoppingBag, Plus, Minus, X, Send, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchMenuCatalog, createFoodOrder, verifyOrderPayment } from '../services/api';

export const DiningPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRoom = searchParams.get('room') || searchParams.get('roomNumber');
  const urlToken = searchParams.get('token');
  const storedRoom = localStorage.getItem('scanned_room_number');
  const storedToken = localStorage.getItem('scanned_qr_token');

  const isQrScanned = Boolean(urlRoom || urlToken || storedRoom || storedToken);
  const activeRoomNumber = urlRoom || storedRoom || '';

  const [activeTab, setActiveTab] = useState<'SWAAD_VEG' | 'HOTEL_RAAMA' | 'LIQUID_LOUNGE'>('SWAAD_VEG');
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Cart State: { [menuItemId_potionSize]: { menuItemId, name, price, quantity, potionSize } }
  const [cart, setCart] = useState<Record<string, any>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'RAZORPAY' | 'CASH'>('RAZORPAY');

  // Scanned Menu Viewer Modal State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPageIndex, setViewerPageIndex] = useState(0);

  // Swaad has 12 pages, Hotel Raama / LLB Food has 20 pages, LLB Beverage has 2 pages
  const swaadPages = Array.from({ length: 12 }, (_, i) => `/swaad_images/page-${String(i + 1).padStart(2, '0')}.png`);
  const llbFoodPages = Array.from({ length: 20 }, (_, i) => `/llb_food_images/page-${String(i + 1).padStart(2, '0')}.png`);
  const llbBeveragePages = Array.from({ length: 2 }, (_, i) => `/llb_beverage_images/page-${i + 1}.png`);
  const currentScannedPages =
    activeTab === 'SWAAD_VEG'
      ? swaadPages
      : activeTab === 'HOTEL_RAAMA'
      ? llbFoodPages
      : llbBeveragePages;

  useEffect(() => {
    if (urlRoom) localStorage.setItem('scanned_room_number', urlRoom);
    if (urlToken) localStorage.setItem('scanned_qr_token', urlToken);

    fetchMenuCatalog()
      .then((res) => {
        if (res.success) {
          setCategories(res.data.categories);
          setItems(res.data.items);
        }
      })
      .finally(() => setLoading(false));

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, [urlRoom, urlToken]);

  const currentItems = items.filter((i) => {
    if (activeTab === 'SWAAD_VEG') {
      if (i.section !== 'SWAAD') return false;
    } else if (activeTab === 'HOTEL_RAAMA') {
      if (i.section !== 'HOTEL_RAAMA') return false;
    } else if (activeTab === 'LIQUID_LOUNGE') {
      if (i.section !== 'LIQUID_LOUNGE') return false;
    }
    if (searchTerm) {
      return i.name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const activeCategoryIds = new Set(
    currentItems.map((i) => (typeof i.categoryId === 'object' ? i.categoryId?._id : i.categoryId))
  );
  const currentCategories = categories.filter((c) => activeCategoryIds.has(c._id));

  const addToCart = (item: any, potionSize: string = 'Standard') => {
    if (!isQrScanned) {
      toast.error('QR Scan Required: Please scan the QR code in your room or table to enable food ordering.');
      return;
    }

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

    if (!isQrScanned) {
      toast.error('QR Scan Required: You must scan a QR code to place an order.');
      return;
    }

    if (cartList.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    if (!guestName || !guestPhone) {
      toast.error('Please enter your full name and phone number.');
      return;
    }

    setPlacingOrder(true);

    try {
      // 1. Create order on backend
      const res = await createFoodOrder({
        guestName,
        guestPhone,
        roomNumber: activeRoomNumber || '',
        deliveryOption: 'ROOM_SERVICE',
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
        toast.success('Order sent to kitchen! Pay cash at reception/counter.');
        try {
          const storedOrders = JSON.parse(localStorage.getItem('my_orders') || '[]');
          if (!storedOrders.includes(trackingToken)) {
            storedOrders.push(trackingToken);
            localStorage.setItem('my_orders', JSON.stringify(storedOrders));
          }
        } catch (e) {
          console.error('Error updating localStorage:', e);
        }
        setCart({});
        setCartOpen(false);
        navigate(`/track-order/${trackingToken}`);
        return;
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: razorpayKeyId,
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
            setCart({});
            setCartOpen(false);
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
          color: '#47614d',
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
          setCart({});
          setCartOpen(false);
          navigate(`/track-order/${trackingToken}`);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Error placing order.');
      setPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-16 max-w-7xl mx-auto px-6 lg:px-8 relative">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 border-b border-[#cbc0ad] pb-8">
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-1">
          Culinary Experiences
        </span>
        <h1 className="editorial-section-title text-[#333333]">Dining & Beverage Menu</h1>
        <p className="font-sans text-xs sm:text-sm text-[#666666] max-w-xl mx-auto leading-relaxed">
          Delights from Swaad Pure Veg Restaurant, Non-Veg Specialities, or executive spirits from Liquid Lounge Bar (LLB). Order straight to your room or collect at reception.
        </p>

        {!isQrScanned ? (
          <div className="bg-[#47614d] text-[#f7f7f2] p-3.5 rounded-sm border border-[#d9b57d]/40 shadow-md text-xs font-sans flex items-center justify-center gap-2.5 max-w-xl mx-auto my-4">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>
              <strong className="text-[#d9b57d] uppercase tracking-wider">QR Code Scan Required:</strong> Please scan the QR code in your room or dining table to authorize food & beverage ordering.
            </span>
          </div>
        ) : (
          <div className="bg-[#47614d] text-[#f7f7f2] p-3 rounded-sm border border-emerald-500/40 shadow-md text-xs font-sans flex items-center justify-center gap-2.5 max-w-xl mx-auto my-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>
              <strong className="text-emerald-300 uppercase tracking-wider">Verified QR Session:</strong> Authorized for Room #{activeRoomNumber || 'Verified Scan'}
            </span>
          </div>
        )}

        {/* Action Buttons: View Scanned Menu & Cart */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <button
            onClick={() => {
              setViewerPageIndex(0);
              setViewerOpen(true);
            }}
            className="px-5 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-[#cbc0ad] bg-[#f7f7f2] text-[#333333] hover:bg-[#0B1849]/5 transition-all cursor-pointer"
          >
            <BookOpen size={15} /> View Scanned Menu Cards
          </button>

          {totalCartCount > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="px-5 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 bg-[#47614d] text-[#f7f7f2] shadow-sm hover:bg-[#374c3c] transition-all cursor-pointer"
            >
              <ShoppingBag size={15} /> View Cart ({totalCartCount}) — ₹{totalCartPrice}
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <button
            onClick={() => {
              setActiveTab('SWAAD_VEG');
              setSearchTerm('');
            }}
            className={`px-5 py-3 rounded-sm font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'SWAAD_VEG'
                ? 'bg-[#47614d] text-[#f7f7f2] shadow-md'
                : 'bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] hover:border-[#cbc0ad]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <Utensils size={15} /> Swaad Pure Veg
          </button>

          <button
            onClick={() => {
              setActiveTab('HOTEL_RAAMA');
              setSearchTerm('');
            }}
            className={`px-5 py-3 rounded-sm font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'HOTEL_RAAMA'
                ? 'bg-[#47614d] text-[#f7f7f2] shadow-md'
                : 'bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] hover:border-[#cbc0ad]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#d9b57d] inline-block"></span>
            <Utensils size={15} /> Hotel Raama
          </button>

          <button
            onClick={() => {
              setActiveTab('LIQUID_LOUNGE');
              setSearchTerm('');
            }}
            className={`px-5 py-3 rounded-sm font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'LIQUID_LOUNGE'
                ? 'bg-[#47614d] text-[#f7f7f2] shadow-md'
                : 'bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] hover:border-[#cbc0ad]'
            }`}
          >
            <GlassWater size={15} /> Liquid Lounge Bar
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mt-6">
          <Search size={16} className="absolute left-3.5 top-3 text-[#666666]" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'LIQUID_LOUNGE' ? 'drinks...' : 'dishes...'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#f7f7f2] border border-[#cbc0ad] rounded-sm pl-10 pr-4 py-2 text-xs font-sans text-[#333333] focus:border-[#cbc0ad] focus:outline-none"
          />
        </div>
      </div>

      {/* Menu Catalog */}
      {loading ? (
        <div className="text-center font-sans text-xs text-[#666666] py-16">Loading menu items...</div>
      ) : (
        <div className="space-y-16">
          {currentCategories.map((cat) => {
            const catItems = currentItems.filter((i) => i.categoryId === cat._id);
            if (catItems.length === 0) return null;

            return (
              <div key={cat._id} className="space-y-6">
                <div className="flex items-center gap-3 border-b border-[#cbc0ad] pb-3">
                  <h2 className="text-2xl font-serif text-[#333333]">{cat.name}</h2>
                  <span className="text-[10px] font-sans text-[#666666] font-semibold uppercase bg-[#0B1849]/5 px-2.5 py-0.5 rounded-sm border border-[#cbc0ad]">
                    {catItems.length} Items
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {catItems.map((item) => (
                    <div
                      key={item._id}
                      className="bg-[#f7f7f2] rounded-sm p-6 border border-[#cbc0ad] flex flex-col justify-between hover:border-[#cbc0ad] transition-all duration-300 shadow-sm"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-lg font-serif font-bold text-[#333333]">{item.name}</h3>
                          <span
                            className={`shrink-0 text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                              item.isVeg
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-red-50 text-red-800 border-red-300'
                            }`}
                          >
                            {item.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs font-sans text-[#666666] leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 border-t border-[#cbc0ad] mt-4 flex items-center justify-between">
                        <div>
                          {item.price60ml ? (
                            <div className="text-[11px] font-sans text-[#666666]">
                              <span>30ML: <strong className="text-[#333333]">₹{item.price}</strong></span>
                              <span className="ml-2">60ML: <strong className="text-[#333333]">₹{item.price60ml}</strong></span>
                            </div>
                          ) : (
                            <span className="text-lg font-serif font-bold text-[#333333]">₹{item.price}</span>
                          )}
                        </div>

                        {item.price60ml ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => addToCart(item, '30ML')}
                              className="px-2.5 py-1 rounded-sm bg-[#47614d] text-[#f7f7f2] text-[10px] font-sans font-semibold uppercase hover:bg-[#374c3c] cursor-pointer"
                            >
                              + 30ML
                            </button>
                            <button
                              onClick={() => addToCart(item, '60ML')}
                              className="px-2.5 py-1 rounded-sm bg-[#47614d] text-[#f7f7f2] text-[10px] font-sans font-semibold uppercase hover:bg-[#374c3c] cursor-pointer"
                            >
                              + 60ML
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item, 'Standard')}
                            className="px-4 py-2 rounded-sm bg-[#47614d] text-[#f7f7f2] text-xs font-sans font-semibold uppercase hover:bg-[#374c3c] cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={13} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FLOATING CART SUMMARY BAR */}
      {totalCartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="px-6 py-3.5 rounded-sm bg-[#47614d] text-[#f7f7f2] shadow-2xl font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-3 hover:bg-[#374c3c] transition-all cursor-pointer border border-[#f7f7f2]/20"
          >
            <ShoppingBag size={16} /> Cart ({totalCartCount} Items) · ₹{totalCartPrice}
          </button>
        </div>
      )}

      {/* CART & CHECKOUT MODAL */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#47614d] text-[#f7f7f2] border border-[#f7f7f2]/20 rounded-sm max-w-xl w-full max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl space-y-6">
            <button
              onClick={() => setCartOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-[#f7f7f2]/10 text-[#f7f7f2]/70 hover:text-[#f7f7f2]"
            >
              <X size={18} />
            </button>

            <div className="border-b border-[#f7f7f2]/10 pb-4">
              <span className="text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-[0.2em]">Dining Cart</span>
              <h2 className="text-2xl font-serif text-[#f7f7f2]">Order Checkout</h2>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {cartList.map((item: any) => {
                const key = `${item.menuItemId}_${item.potionSize}`;
                return (
                  <div key={key} className="flex items-center justify-between bg-[#f7f7f2]/5 p-3 rounded-sm border border-[#f7f7f2]/10 text-xs font-sans">
                    <div>
                      <span className="font-bold text-[#f7f7f2] block">{item.name}</span>
                      <span className="text-[10px] text-[#f7f7f2]/60">Size: {item.potionSize} · ₹{item.price} each</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-2 py-1">
                        <button onClick={() => updateQuantity(key, -1)} className="text-[#f7f7f2]/70 hover:text-[#f7f7f2]">
                          <Minus size={12} />
                        </button>
                        <span className="font-bold text-xs">{item.quantity}</span>
                        <button onClick={() => updateQuantity(key, 1)} className="text-[#f7f7f2]/70 hover:text-[#f7f7f2]">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="font-bold text-sm text-[#d9b57d] min-w-14 text-right">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Amount Summary */}
            <div className="flex justify-between items-center pt-3 border-t border-[#f7f7f2]/10 text-sm font-sans font-bold">
              <span>Total Payable Amount:</span>
              <span className="text-xl font-serif text-[#d9b57d]">₹{totalCartPrice}</span>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleOrderSubmit} className="space-y-4 pt-2">
              {activeRoomNumber && (
                <div className="p-3 bg-[#f7f7f2]/10 rounded-sm border border-[#d9b57d]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-sans uppercase font-bold text-[#d9b57d] tracking-wider block">
                      Auto-Fetched Verified Location
                    </span>
                    <span className="text-sm font-serif font-bold text-[#f7f7f2]">
                      Room #{activeRoomNumber}
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded-sm bg-emerald-500/20 text-emerald-300 text-[9px] font-sans font-bold uppercase tracking-wider border border-emerald-500/30">
                    ✓ Scanned from QR
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-sans uppercase text-[#f7f7f2]/80 font-bold mb-1">Guest Name *</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans uppercase text-[#f7f7f2]/80 font-bold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2]"
                    required
                  />
                </div>
              </div>



              {/* Special Instructions */}
              <div>
                <label className="block text-[10px] font-sans uppercase text-[#f7f7f2]/80 font-bold mb-1">Special Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, extra cutlery"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2]"
                />
              </div>

              {/* Payment Mode Selection */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-sans uppercase tracking-wider text-[#d9b57d] font-bold block">Payment Method *</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('RAZORPAY')}
                    className={`p-3 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      paymentMode === 'RAZORPAY' ? 'bg-[#f7f7f2] text-[#333333] font-bold border-[#f7f7f2]' : 'bg-transparent text-[#f7f7f2]/70 border-[#f7f7f2]/20'
                    }`}
                  >
                    <span className="text-xs font-sans uppercase font-bold flex items-center gap-1.5">💳 Online (Razorpay)</span>
                    <span className="text-[10px] opacity-80">UPI, Cards, NetBanking</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`p-3 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      paymentMode === 'CASH' ? 'bg-[#f7f7f2] text-[#333333] font-bold border-[#f7f7f2]' : 'bg-transparent text-[#f7f7f2]/70 border-[#f7f7f2]/20'
                    }`}
                  >
                    <span className="text-xs font-sans uppercase font-bold flex items-center gap-1.5">💵 Pay at Reception</span>
                    <span className="text-[10px] opacity-80">Cash or UPI at counter</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={placingOrder}
                className="w-full py-4 rounded-sm bg-[#f7f7f2] text-[#333333] font-sans font-bold text-xs uppercase tracking-wider hover:bg-[#d9b57d] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-4"
              >
                <Send size={15} /> {paymentMode === 'RAZORPAY' ? 'Pay & Send Order' : 'Send Order (Pay at Reception)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SCANNED MENU VIEWER MODAL */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-[#f7f7f2]">
            <span className="text-xs font-sans uppercase tracking-widest text-[#d9b57d] font-bold">
              {activeTab !== 'LIQUID_LOUNGE' ? 'Swaad Menu Card' : 'Liquid Lounge Bar Menu'} (Page {viewerPageIndex + 1} of {currentScannedPages.length})
            </span>
            <button
              onClick={() => setViewerOpen(false)}
              className="p-2 rounded-full bg-[#f7f7f2]/10 text-[#f7f7f2] hover:bg-[#f7f7f2]/20"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative max-w-4xl max-h-[80vh] overflow-hidden flex items-center justify-center">
            <img
              src={currentScannedPages[viewerPageIndex]}
              alt={`Page ${viewerPageIndex + 1}`}
              className="max-h-[75vh] w-auto object-contain rounded-sm border border-[#f7f7f2]/20 shadow-2xl"
            />

            {viewerPageIndex > 0 && (
              <button
                onClick={() => setViewerPageIndex((prev) => prev - 1)}
                className="absolute left-4 p-3 rounded-full bg-[#0B1849]/80 text-[#f7f7f2] border border-[#f7f7f2]/20 hover:bg-[#47614d]"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {viewerPageIndex < currentScannedPages.length - 1 && (
              <button
                onClick={() => setViewerPageIndex((prev) => prev + 1)}
                className="absolute right-4 p-3 rounded-full bg-[#0B1849]/80 text-[#f7f7f2] border border-[#f7f7f2]/20 hover:bg-[#47614d]"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
