import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Filter,
  ShieldCheck,
  FileText,
  ArrowRight,
  Leaf,
  Martini,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchMenuCatalog, createFoodOrder, verifyOrderPayment } from '../services/api';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '../components/ScrollReveal';

type CourseType = 'ALL' | 'BREAKFAST' | 'STARTERS' | 'MAIN_COURSE' | 'BEVERAGES' | 'ICE_CREAM';

const COURSE_OPTIONS: { id: CourseType; label: string; icon?: string }[] = [
  { id: 'ALL', label: 'All Courses' },
  { id: 'BREAKFAST', label: 'Breakfast & Snacks' },
  { id: 'STARTERS', label: 'Starters & Soups' },
  { id: 'MAIN_COURSE', label: 'Main Course & Breads' },
  { id: 'BEVERAGES', label: 'Beverages & Drinks' },
  { id: 'ICE_CREAM', label: 'Ice Cream & Desserts' },
];

const getCourseForCategory = (catName: string): CourseType => {
  const lower = catName.toLowerCase();
  if (
    lower.includes('breakfast') ||
    lower.includes('south indian') ||
    lower.includes('dosa') ||
    lower.includes('sandwich') ||
    lower.includes('tandoor bread') ||
    lower.includes('little bite')
  ) {
    return 'BREAKFAST';
  }
  if (
    lower.includes('starter') ||
    lower.includes('soup') ||
    lower.includes('salad') ||
    lower.includes('tandoori') ||
    lower.includes('bites') ||
    lower.includes('sizzler')
  ) {
    return 'STARTERS';
  }
  if (
    lower.includes('juice') ||
    lower.includes('milkshake') ||
    lower.includes('lassi') ||
    lower.includes('beverage') ||
    lower.includes('whisky') ||
    lower.includes('brandy') ||
    lower.includes('rum') ||
    lower.includes('vodka') ||
    lower.includes('scotch') ||
    lower.includes('wine') ||
    lower.includes('tequila') ||
    lower.includes('beer') ||
    lower.includes('breezer') ||
    lower.includes('mocktail') ||
    lower.includes('cocktail') ||
    lower.includes('drink') ||
    lower.includes('water')
  ) {
    return 'BEVERAGES';
  }
  if (
    lower.includes('ice cream') ||
    lower.includes('sweet') ||
    lower.includes('fruit salad') ||
    lower.includes('dessert')
  ) {
    return 'ICE_CREAM';
  }
  return 'MAIN_COURSE';
};

export const DiningPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRoom = searchParams.get('room') || searchParams.get('roomNumber');
  const urlToken = searchParams.get('token');
  const urlTab = searchParams.get('tab');
  const storedRoom = localStorage.getItem('scanned_room_number');
  const storedToken = localStorage.getItem('scanned_qr_token');

  const isQrScanned = Boolean(urlRoom || urlToken || storedRoom || storedToken);
  const activeRoomNumber = urlRoom || storedRoom || '';

  const [activeTab, setActiveTab] = useState<'SWAAD_VEG' | 'HOTEL_RAAMA' | 'LIQUID_LOUNGE'>(
    urlTab === 'HOTEL_RAAMA' || urlTab === 'LIQUID_LOUNGE' || urlTab === 'SWAAD_VEG'
      ? urlTab
      : 'SWAAD_VEG'
  );

  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseType>('ALL');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cart State: { [menuItemId_potionSize]: { menuItemId, name, price, quantity, potionSize } }
  const [cart, setCart] = useState<Record<string, any>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestRoom, setGuestRoom] = useState('');
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (urlTab === 'HOTEL_RAAMA' || urlTab === 'LIQUID_LOUNGE' || urlTab === 'SWAAD_VEG') {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'SWAAD_VEG' | 'HOTEL_RAAMA' | 'LIQUID_LOUNGE') => {
    setActiveTab(tab);
    setSearchTerm('');
    setSelectedCategoryIds([]);
    setSelectedCourse('ALL');
  };

  const categoryMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach((cat) => map.set(cat._id, cat));
    return map;
  }, [categories]);

  // Section categories available for the active tab
  const availableSectionCategories = useMemo(() => {
    return categories.filter((c) => {
      if (activeTab === 'SWAAD_VEG') return c.section === 'SWAAD';
      if (activeTab === 'HOTEL_RAAMA') return c.section === 'HOTEL_RAAMA';
      if (activeTab === 'LIQUID_LOUNGE') return c.section === 'LIQUID_LOUNGE';
      return true;
    });
  }, [categories, activeTab]);

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategoryIds(availableSectionCategories.map((c) => c._id));
  };

  const clearAllCategories = () => {
    setSelectedCategoryIds([]);
  };

  const resetAllFilters = () => {
    setSelectedCategoryIds([]);
    setSelectedCourse('ALL');
    setSearchTerm('');
  };

  const currentItems = items.filter((i) => {
    // Hide out of stock items from guest site
    if (i.isAvailable === false) return false;

    if (activeTab === 'SWAAD_VEG') {
      if (i.section !== 'SWAAD') return false;
    } else if (activeTab === 'HOTEL_RAAMA') {
      if (i.section !== 'HOTEL_RAAMA') return false;
    } else if (activeTab === 'LIQUID_LOUNGE') {
      if (i.section !== 'LIQUID_LOUNGE') return false;
    }

    const catId = typeof i.categoryId === 'object' ? i.categoryId?._id : i.categoryId;
    const cat = categoryMap.get(catId);
    const catName = cat?.name || '';

    // Course filter
    if (selectedCourse !== 'ALL') {
      const course = getCourseForCategory(catName);
      if (course !== selectedCourse) return false;
    }

    // Category checkboxes filter
    if (selectedCategoryIds.length > 0) {
      if (!selectedCategoryIds.includes(catId)) return false;
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchName = i.name.toLowerCase().includes(searchLower);
      const matchDesc = i.description && i.description.toLowerCase().includes(searchLower);
      const matchCat = catName.toLowerCase().includes(searchLower);
      return matchName || matchDesc || matchCat;
    }
    return true;
  });

  const activeCategoryIds = new Set(
    currentItems.map((i) => (typeof i.categoryId === 'object' ? i.categoryId?._id : i.categoryId))
  );
  const currentCategories = categories.filter((c) => activeCategoryIds.has(c._id));

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

    const orderRoom = activeRoomNumber || guestRoom.trim();
    if (!orderRoom) {
      toast.error('Please specify your room or table number.');
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
        roomNumber: orderRoom,
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
    <div className="min-h-screen bg-[#F7F0DF] text-[#00174A] py-16 max-w-7xl mx-auto px-6 lg:px-8 relative">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 border-b border-[#10184A]/15 pb-8">
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#667085] block mb-1">
          Culinary Experiences
        </span>
        <h1 className="editorial-section-title text-[#00174A]">Dining & Beverage Menu</h1>
        <p className="font-sans text-xs sm:text-sm text-[#667085] max-w-xl mx-auto leading-relaxed">
          Delights from Swaad Pure Veg Restaurant, Non-Veg Specialities, or executive spirits from Liquid Lounge Bar (LLB). Order straight to your room or collect at reception.
        </p>

        {/* Verified QR Session Banner */}
        {isQrScanned ? (
          <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-lg bg-[#00174A] text-white shadow-md mx-auto my-3 text-xs sm:text-sm font-sans">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck size={15} />
            </div>
            <span>
              <strong className="text-emerald-400 font-bold uppercase tracking-wider">VERIFIED QR SESSION:</strong>{' '}
              <span className="text-white/95">Authorized for Room #{activeRoomNumber || '1'}</span>
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-lg bg-[#00174A] text-white shadow-md mx-auto my-3 text-xs sm:text-sm font-sans">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span>
              <strong className="text-amber-300 font-bold uppercase tracking-wider">QR CODE SCAN REQUIRED:</strong>{' '}
              <span className="text-white/95">Please scan your room QR code to enable ordering</span>
            </span>
          </div>
        )}

        {/* Action Buttons: View Scanned Menu & Cart */}
        <div className="flex flex-wrap justify-center items-center gap-4 pt-3">
          <button
            onClick={() => {
              setViewerPageIndex(0);
              setViewerOpen(true);
            }}
            className="px-6 py-3 rounded-xl font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-3 border border-[#10184A]/20 bg-white text-[#00174A] hover:bg-white hover:border-[#D6B369] transition-all cursor-pointer shadow-sm"
          >
            <FileText size={18} className="text-[#00174A]" />
            <span>VIEW SCANNED MENU CARDS</span>
            <ArrowRight size={15} className="text-[#00174A]" />
          </button>

          {totalCartCount > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="px-6 py-3 rounded-xl font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 bg-[#D6B369] text-[#00174A] shadow-md hover:bg-[#E8C56A] transition-all cursor-pointer"
            >
              <ShoppingBag size={16} /> View Cart ({totalCartCount}) — ₹{totalCartPrice}
            </button>
          )}
        </div>

        {/* Tab Cards Row (Swaad Pure Veg, Hotel Raama, Liquid Lounge Bar) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto mt-6">
          {/* SWAAD PURE VEG */}
          <button
            onClick={() => handleTabChange('SWAAD_VEG')}
            className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer text-left bg-white text-[#00174A] ${
              activeTab === 'SWAAD_VEG'
                ? 'border-2 border-[#D6B369] shadow-[0_0_16px_rgba(214,179,105,0.45)] ring-2 ring-[#D6B369]/20'
                : 'border border-[#10184A]/15 hover:border-[#D6B369]/60 shadow-xs'
            }`}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border bg-emerald-50 border-emerald-200 text-emerald-700">
              <Leaf size={20} />
            </div>
            <div className="h-7 w-[1px] bg-[#10184A]/15 shrink-0" />
            <span className="font-sans font-bold text-xs uppercase tracking-wider text-[#00174A]">
              SWAAD PURE VEG
            </span>
          </button>

          {/* HOTEL RAAMA (Non-Veg restaurant branding) */}
          <button
            onClick={() => handleTabChange('HOTEL_RAAMA')}
            className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer text-left bg-white text-[#00174A] ${
              activeTab === 'HOTEL_RAAMA'
                ? 'border-2 border-[#D6B369] shadow-[0_0_16px_rgba(214,179,105,0.45)] ring-2 ring-[#D6B369]/20'
                : 'border border-[#10184A]/15 hover:border-[#D6B369]/60 shadow-xs'
            }`}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border bg-[#C8102E] border-[#A00D24] text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M4 18h16" />
                <path d="M12 5v1" />
                <path d="M19 18a7 7 0 0 0-14 0" />
                <circle cx="12" cy="5" r="1.2" fill="currentColor" />
              </svg>
            </div>
            <div className="h-7 w-[1px] bg-[#10184A]/15 shrink-0" />
            <span className="font-sans font-bold text-xs uppercase tracking-wider text-[#00174A]">
              HOTEL RAAMA
            </span>
          </button>

          {/* LIQUID LOUNGE BAR */}
          <button
            onClick={() => handleTabChange('LIQUID_LOUNGE')}
            className={`flex items-center gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer text-left bg-white text-[#00174A] ${
              activeTab === 'LIQUID_LOUNGE'
                ? 'border-2 border-[#D6B369] shadow-[0_0_16px_rgba(214,179,105,0.45)] ring-2 ring-[#D6B369]/20'
                : 'border border-[#10184A]/15 hover:border-[#D6B369]/60 shadow-xs'
            }`}
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border bg-[#071A3D] border-[#10184A] text-white">
              <Martini size={19} />
            </div>
            <div className="h-7 w-[1px] bg-[#10184A]/15 shrink-0" />
            <span className="font-sans font-bold text-xs uppercase tracking-wider text-[#00174A]">
              LIQUID LOUNGE BAR
            </span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-xl mx-auto mt-6">
          <div className="relative w-full sm:flex-grow">
            <Search size={16} className="absolute left-3.5 top-3 text-[#667085]" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'LIQUID_LOUNGE' ? 'drinks...' : 'dishes...'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#10184A]/20 rounded-sm pl-10 pr-9 py-2.5 text-xs font-sans text-[#00174A] focus:border-[#00174A] focus:outline-none shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-[#667085] hover:text-[#00174A] cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-sm font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-sm shrink-0 ${
              filterOpen || selectedCategoryIds.length > 0 || selectedCourse !== 'ALL'
                ? 'bg-[#00174A] text-[#FAF9F6] border-[#00174A]'
                : 'bg-white text-[#00174A] border-[#10184A]/20 hover:bg-[#00174A]/10'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Filter</span>
            {(selectedCategoryIds.length > 0 || selectedCourse !== 'ALL') && (
              <span className="w-5 h-5 rounded-full bg-[#D6B369] text-[#00174A] text-[10px] font-bold flex items-center justify-center">
                {selectedCategoryIds.length + (selectedCourse !== 'ALL' ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Quick Filter Tag Chips (when filters are active) */}
        {(selectedCourse !== 'ALL' || selectedCategoryIds.length > 0 || searchTerm) && (
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto mt-3">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#667085]">
              Active Filters:
            </span>

            {selectedCourse !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#00174A]/10 border border-[#00174A]/30 text-[#00174A] text-xs font-sans font-semibold">
                Course: {COURSE_OPTIONS.find((c) => c.id === selectedCourse)?.label}
                <button onClick={() => setSelectedCourse('ALL')} className="hover:text-[#C8102E] cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            {selectedCategoryIds.map((catId) => {
              const cat = categoryMap.get(catId);
              if (!cat) return null;
              return (
                <span
                  key={catId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#D6B369]/20 border border-[#D6B369]/60 text-[#00174A] text-xs font-sans font-semibold"
                >
                  {cat.name.split('(')[0].trim()}
                  <button onClick={() => toggleCategory(catId)} className="hover:text-[#C8102E] cursor-pointer">
                    <X size={12} />
                  </button>
                </span>
              );
            })}

            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-stone-200 border border-stone-300 text-[#00174A] text-xs font-sans font-semibold">
                "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-[#C8102E] cursor-pointer">
                  <X size={12} />
                </button>
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="text-[11px] font-sans font-bold text-[#C8102E] hover:text-[#A00D24] underline ml-2 cursor-pointer flex items-center gap-1"
            >
              <RotateCcw size={11} /> Clear all
            </button>
          </div>
        )}

        {/* Collapsible Filter Panel */}
        {filterOpen && (
          <div className="max-w-4xl mx-auto mt-6 bg-white border border-[#10184A]/20 rounded-sm p-6 shadow-xl text-left space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center border-b border-[#10184A]/15 pb-3">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#00174A]" />
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#00174A]">
                  Filter Menu Items
                </h3>
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="p-1 rounded-sm hover:bg-stone-100 text-[#667085] hover:text-[#00174A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 1. Course / Meal Type Filters */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#667085]">
                  1. Filter by Course / Meal Type
                </span>
                {selectedCourse !== 'ALL' && (
                  <button
                    onClick={() => setSelectedCourse('ALL')}
                    className="text-[11px] font-sans text-[#667085] hover:text-[#00174A] underline cursor-pointer"
                  >
                    Reset Course
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {COURSE_OPTIONS.map((opt) => {
                  const isSelected = selectedCourse === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedCourse(opt.id)}
                      className={`px-3.5 py-2 rounded-sm text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#00174A] text-white shadow-sm ring-1 ring-[#00174A]'
                          : 'bg-[#F7F0DF] text-[#00174A] border border-[#10184A]/20 hover:border-[#00174A]'
                      }`}
                    >
                      {isSelected && <Check size={13} />}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Multi-Select Category Checkboxes */}
            <div className="space-y-3 pt-2 border-t border-[#10184A]/15">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-[#667085]">
                  2. Select Categories ({selectedCategoryIds.length > 0 ? `${selectedCategoryIds.length} Selected` : 'All Categories'})
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllCategories}
                    className="text-xs font-sans font-bold text-[#00174A] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-stone-300">|</span>
                  <button
                    onClick={clearAllCategories}
                    className="text-xs font-sans font-bold text-[#667085] hover:text-[#00174A] hover:underline cursor-pointer"
                  >
                    Clear Categories
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1 border border-[#10184A]/15 rounded-sm bg-[#F7F0DF]/50">
                {availableSectionCategories.map((cat) => {
                  const isChecked = selectedCategoryIds.includes(cat._id);
                  const itemCount = items.filter(
                    (i) => (typeof i.categoryId === 'object' ? i.categoryId?._id : i.categoryId) === cat._id
                  ).length;

                  return (
                    <label
                      key={cat._id}
                      onClick={() => toggleCategory(cat._id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-sm border transition-all cursor-pointer select-none text-xs font-sans ${
                        isChecked
                          ? 'bg-[#00174A]/10 border-[#00174A] text-[#00174A]'
                          : 'bg-white border-[#10184A]/15 text-[#667085] hover:border-[#10184A]/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by label onClick
                        className="mt-0.5 rounded text-[#00174A] focus:ring-[#00174A] cursor-pointer"
                      />
                      <div className="flex-grow min-w-0">
                        <p className={`font-semibold leading-tight line-clamp-1 ${isChecked ? 'text-[#00174A]' : 'text-[#00174A]/80'}`}>
                          {cat.name.split('(')[0].trim()}
                        </p>
                        {cat.name.includes('(') && (
                          <p className="text-[10px] text-[#667085] truncate">
                            {cat.name.substring(cat.name.indexOf('('))}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-[#667085] bg-stone-100 px-1.5 py-0.5 rounded">
                        {itemCount}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Filter Drawer Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#10184A]/15">
              <span className="text-xs font-sans text-[#667085]">
                Showing <strong className="text-[#00174A]">{currentItems.length}</strong> matching items across{' '}
                <strong className="text-[#00174A]">{currentCategories.length}</strong> categories
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={resetAllFilters}
                  className="px-4 py-2 rounded-sm text-xs font-sans font-bold uppercase tracking-wider text-[#667085] hover:text-[#00174A] border border-[#10184A]/20 bg-[#F7F0DF] hover:bg-stone-200 transition-all cursor-pointer"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setFilterOpen(false)}
                  className="px-5 py-2 rounded-sm text-xs font-sans font-bold uppercase tracking-wider bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] transition-all cursor-pointer shadow-sm"
                >
                  Apply & View ({currentItems.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu Catalog */}
      {loading ? (
        <div className="text-center font-sans text-xs text-[#667085] py-16">Loading menu items...</div>
      ) : (
        <div className="space-y-16">
          {currentCategories.map((cat) => {
            const catItems = currentItems.filter((i) => i.categoryId === cat._id);
            if (catItems.length === 0) return null;

            return (
              <ScrollReveal key={cat._id} direction="up" duration={0.8} className="space-y-6">
                <div className="flex items-center gap-3 border-b border-[#10184A]/15 pb-3">
                  <h2 className="text-2xl font-serif text-[#00174A]">{cat.name}</h2>
                  <span className="text-[10px] font-sans text-[#667085] font-semibold uppercase bg-[#00174A]/5 px-2.5 py-0.5 rounded-sm border border-[#10184A]/15">
                    {catItems.length} Items
                  </span>
                </div>

                <ScrollRevealGroup staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {catItems.map((item) => (
                    <ScrollRevealItem key={item._id}>
                      <div
                        className="bg-white rounded-sm p-6 border border-[#10184A]/15 flex flex-col justify-between hover:border-[#D6B369]/60 transition-all duration-300 shadow-sm h-full"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="text-lg font-serif font-bold text-[#00174A]">{item.name}</h3>
                            {item.section !== 'LIQUID_LOUNGE' && activeTab !== 'LIQUID_LOUNGE' && (
                              <span
                                className={`shrink-0 text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                                  item.isVeg
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-red-50 text-red-800 border-red-300'
                                }`}
                              >
                                {item.isVeg ? 'Veg' : 'Non-Veg'}
                              </span>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-xs font-sans text-[#667085] leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-4 border-t border-[#10184A]/15 mt-4 flex items-center justify-between">
                          <div>
                            {item.price60ml ? (
                              <div className="text-[11px] font-sans text-[#667085]">
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
      )}

      {/* FLOATING CART SUMMARY BAR */}
      {totalCartCount > 0 && !cartOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setCartOpen(true)}
            className="px-6 py-3.5 rounded-sm bg-[#D6B369] text-[#00174A] shadow-2xl font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-3 hover:bg-[#E8C56A] transition-all cursor-pointer border border-[#00174A]/20"
          >
            <ShoppingBag size={16} /> Cart ({totalCartCount} Items) · ₹{totalCartPrice}
          </button>
        </div>
      )}

      {/* CART & CHECKOUT MODAL */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#00174A] text-[#FAF9F6] border border-white/20 rounded-sm max-w-xl w-full max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl space-y-6">
            <button
              onClick={() => setCartOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white/70 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="border-b border-white/10 pb-4">
              <span className="text-[#D6B369] text-[10px] font-sans font-bold uppercase tracking-[0.2em]">Dining Cart</span>
              <h2 className="text-2xl font-serif text-[#FAF9F6]">Order Checkout</h2>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {cartList.map((item: any) => {
                const key = `${item.menuItemId}_${item.potionSize}`;
                return (
                  <div key={key} className="flex items-center justify-between bg-white/5 p-3 rounded-sm border border-white/10 text-xs font-sans">
                    <div>
                      <span className="font-bold text-[#FAF9F6] block">{item.name}</span>
                      <span className="text-[10px] text-white/60">Size: {item.potionSize} · ₹{item.price} each</span>
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

            {/* Total Amount Summary */}
            <div className="flex justify-between items-center pt-3 border-t border-white/10 text-sm font-sans font-bold">
              <span>Total Payable Amount:</span>
              <span className="text-xl font-serif text-[#D6B369]">₹{totalCartPrice}</span>
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleOrderSubmit} className="space-y-4 pt-2">
              {activeRoomNumber ? (
                <div className="p-3 bg-white/10 rounded-sm border border-[#D6B369]/30 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-sans uppercase font-bold text-[#D6B369] tracking-wider block">
                      Auto-Fetched Verified Location
                    </span>
                    <span className="text-sm font-serif font-bold text-[#FAF9F6]">
                      Room #{activeRoomNumber}
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded-sm bg-emerald-500/20 text-emerald-300 text-[9px] font-sans font-bold uppercase tracking-wider border border-emerald-500/30">
                    ✓ Scanned from QR
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-sans uppercase text-[#FAF9F6]/80 font-bold mb-1">
                    Room / Table Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 204 or Table 5"
                    value={guestRoom}
                    onChange={(e) => setGuestRoom(e.target.value)}
                    className="w-full bg-[#10184A] border border-white/20 rounded-sm px-3.5 py-2 text-xs font-sans text-white placeholder-white/40"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-sans uppercase text-[#FAF9F6]/80 font-bold mb-1">Guest Name *</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-[#10184A] border border-white/20 rounded-sm px-3.5 py-2 text-xs font-sans text-white placeholder-white/40"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans uppercase text-[#FAF9F6]/80 font-bold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full bg-[#10184A] border border-white/20 rounded-sm px-3.5 py-2 text-xs font-sans text-white placeholder-white/40"
                    required
                  />
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-[10px] font-sans uppercase text-[#FAF9F6]/80 font-bold mb-1">Special Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, extra cutlery"
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
                    <span className="text-[10px] opacity-80">UPI, Cards, NetBanking</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`p-3 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      paymentMode === 'CASH' ? 'bg-[#F7F0DF] text-[#00174A] font-bold border-[#F7F0DF]' : 'bg-transparent text-white/70 border-white/20 hover:border-white/40'
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
                className="w-full py-4 rounded-sm bg-[#D6B369] text-[#00174A] font-sans font-bold text-xs uppercase tracking-wider hover:bg-[#E8C56A] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-4"
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
          <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-[#FAF9F6]">
            <span className="text-xs font-sans uppercase tracking-widest text-[#D6B369] font-bold">
              {activeTab !== 'LIQUID_LOUNGE' ? 'Swaad Menu Card' : 'Liquid Lounge Bar Menu'} (Page {viewerPageIndex + 1} of {currentScannedPages.length})
            </span>
            <button
              onClick={() => setViewerOpen(false)}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative max-w-4xl max-h-[80vh] overflow-hidden flex items-center justify-center">
            <img
              src={currentScannedPages[viewerPageIndex]}
              alt={`Page ${viewerPageIndex + 1}`}
              className="max-h-[75vh] w-auto object-contain rounded-sm border border-white/20 shadow-2xl"
            />

            {viewerPageIndex > 0 && (
              <button
                onClick={() => setViewerPageIndex((prev) => prev - 1)}
                className="absolute left-4 p-3 rounded-full bg-[#00174A]/80 text-[#FAF9F6] border border-white/20 hover:bg-[#D6B369] hover:text-[#00174A]"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {viewerPageIndex < currentScannedPages.length - 1 && (
              <button
                onClick={() => setViewerPageIndex((prev) => prev + 1)}
                className="absolute right-4 p-3 rounded-full bg-[#00174A]/80 text-[#FAF9F6] border border-white/20 hover:bg-[#D6B369] hover:text-[#00174A]"
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
