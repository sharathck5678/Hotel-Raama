import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, CreditCard, ChevronLeft, ChevronRight, ChevronDown, FileText, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { fetchRoomTypes, checkAvailability, validateCoupon, createBookingHold, verifyBookingPayment, cancelBookingHold, fetchEffectiveMealRates } from '../services/api';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '../components/ScrollReveal';
import { SEO } from '../components/SEO';
import { formatAadharInput, validateAadhar } from '../utils/aadharValidator';
import { validateGSTIN } from '../utils/gstinValidator';
import { loadRazorpay } from '../utils/loadRazorpay';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

// Interactive Room Image Slideshow Component
const RoomSlideshow: React.FC<{
  images?: string[];
  roomName: string;
  badgeText?: string;
}> = ({ images, roomName, badgeText }) => {
  const slideImages = React.useMemo(() => {
    let list = [...(images || [])];
    if (list.length === 0) {
      list.push('https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80');
    }
    // Always include hallway/corridor photo
    if (!list.includes('/hotel-corridor.jpg')) {
      list.push('/hotel-corridor.jpg');
    }

    const isSingle = roomName.toLowerCase().includes('single');
    const isDouble = roomName.toLowerCase().includes('double');
    const isTriple = roomName.toLowerCase().includes('triple');
    const isSuite = roomName.toLowerCase().includes('suite');

    if (isSingle) {
      // For single bedrooms, replace any old 3rd photo with the new single room angle photo
      list = list.map((img) => (img === '/swaad-restaurant.png' || img === '/liquid-lounge-bar.png' || img === '/hotel-raama-dining.jpg' ? '/single-room-angle.jpg' : img));
      if (!list.includes('/single-room-angle.jpg')) {
        list.push('/single-room-angle.jpg');
      }
    } else if (isDouble) {
      // For double bedrooms, replace any old 3rd photo with the new double room angle photo
      list = list.map((img) => (img === '/swaad-restaurant.png' || img === '/liquid-lounge-bar.png' || img === '/hotel-raama-dining.jpg' ? '/double-room-angle.png' : img));
      if (!list.includes('/double-room-angle.png')) {
        list.push('/double-room-angle.png');
      }
    } else if (isTriple) {
      // For triple occupancy rooms, replace any old 3rd photo with the new triple room angle photo
      list = list.map((img) => (img === '/swaad-restaurant.png' || img === '/liquid-lounge-bar.png' || img === '/hotel-raama-dining.jpg' || img === '/sambhrama-party-hall.png' ? '/triple-room-angle.png' : img));
      if (!list.includes('/triple-room-angle.png')) {
        list.push('/triple-room-angle.png');
      }
    } else if (isSuite) {
      // For suite rooms, replace any old 3rd photo with the new suite room angle photo
      list = list.map((img) => (img === '/swaad-restaurant.png' || img === '/liquid-lounge-bar.png' || img === '/hotel-raama-dining.jpg' || img === '/sambhrama-party-hall.png' ? '/suite-room-angle.png' : img));
      if (!list.includes('/suite-room-angle.png')) {
        list.push('/suite-room-angle.png');
      }
    } else {
      if (list.length < 3) {
        if (!list.includes('/hotel-raama-dining.jpg')) list.push('/hotel-raama-dining.jpg');
      }
    }
    return list;
  }, [images, roomName]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const prevSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + slideImages.length) % slideImages.length);
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slideImages.length);
  };

  const goToSlide = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(idx);
  };

  return (
    <div className="relative h-64 overflow-hidden group rounded-t-sm bg-stone-900">
      <motion.img
        key={slideImages[currentIndex]}
        src={getOptimizedImageUrl(slideImages[currentIndex])}
        alt={`${roomName} - Photo ${currentIndex + 1}`}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover select-none"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      {badgeText && (
        <div className="absolute top-4 left-4 bg-[#D6B369] px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-[#00174A] shadow-md z-10">
          {badgeText}
        </div>
      )}

      {/* Slide Index Pill */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-sans text-white font-semibold z-10 tracking-wider">
        {currentIndex + 1} / {slideImages.length}
      </div>

      {/* Navigation Arrows */}
      {slideImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer backdrop-blur-sm shadow-md"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer backdrop-blur-sm shadow-md"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Indicator Dots */}
      {slideImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm">
          {slideImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => goToSlide(idx, e)}
              className={`h-2 rounded-full transition-all cursor-pointer ${idx === currentIndex ? 'w-5 bg-[#D6B369]' : 'w-2 bg-white/60 hover:bg-white'
                }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const RoomsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(true);
  const [filterAc, setFilterAc] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [planType, setPlanType] = useState<'NON_CP' | 'CP'>(
    (searchParams.get('plan') as 'NON_CP' | 'CP') || 'NON_CP'
  );

  // Booking & Stay State
  const [checkIn, setCheckIn] = useState<string>(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState<string>(searchParams.get('checkOut') || '');
  const [numGuests, setNumGuests] = useState<number>(parseInt(searchParams.get('guests') || '2', 10));
  const [guestCountManuallyChanged, setGuestCountManuallyChanged] = useState<boolean>(false);
  const [extraPerson, setExtraPerson] = useState(false);
  const [breakfast, setBreakfast] = useState(false);
  const [lunch, setLunch] = useState(false);
  const [dinner, setDinner] = useState(false);
  const [mealPricing, setMealPricing] = useState<{
    breakfast: number;
    lunch: number;
    dinner: number;
    isBreakfastVariable?: boolean;
    isLunchVariable?: boolean;
    isDinnerVariable?: boolean;
    minBreakfast?: number;
    maxBreakfast?: number;
    minLunch?: number;
    maxLunch?: number;
    minDinner?: number;
    maxDinner?: number;
  }>({
    breakfast: 150,
    lunch: 250,
    dinner: 300,
  });
  const [couponCode, setCouponCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstinError, setGstinError] = useState('');
  const [couponStatus, setCouponStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAadhar, setGuestAadhar] = useState('');
  const [aadharError, setAadharError] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Price Calculation State
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Initialize and synchronize default stay dates and searchParams
  useEffect(() => {
    const qCheckIn = searchParams.get('checkIn');
    const qCheckOut = searchParams.get('checkOut');
    const qGuests = searchParams.get('guests');
    const qPlan = searchParams.get('plan');

    if (qCheckIn) {
      setCheckIn(qCheckIn);
    } else if (!checkIn) {
      try {
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const [y, m, d] = todayStr.split('-').map(Number);
        const tomorrow = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0, 0));
        setCheckIn(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrow));
      } catch {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setCheckIn(tomorrow.toISOString().split('T')[0]);
      }
    }

    if (qCheckOut) {
      setCheckOut(qCheckOut);
    } else if (!checkOut) {
      try {
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const [y, m, d] = todayStr.split('-').map(Number);
        const dayAfter = new Date(Date.UTC(y, m - 1, d + 2, 12, 0, 0, 0));
        setCheckOut(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(dayAfter));
      } catch {
        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        setCheckOut(dayAfter.toISOString().split('T')[0]);
      }
    }

    if (qGuests) {
      setNumGuests(parseInt(qGuests, 10));
    }
    if (qPlan === 'CP' || qPlan === 'NON_CP') {
      setPlanType(qPlan);
    }
  }, [searchParams]);

  // Preload Razorpay on-demand when booking modal is opened
  useEffect(() => {
    if (selectedRoom) {
      loadRazorpay();
    }
  }, [selectedRoom]);

  // Fetch Authoritative Date-Wise Room Types & Rates whenever dates, plan, or guests change
  useEffect(() => {
    if (!checkIn || !checkOut) return;
    const inD = new Date(checkIn);
    const outD = new Date(checkOut);
    if (isNaN(inD.getTime()) || isNaN(outD.getTime()) || outD <= inD) return;

    let isMounted = true;
    setLoadingRooms(true);

    fetchRoomTypes({
      checkIn,
      checkOut,
      planType,
      guests: numGuests,
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data)) {
          setRoomTypes(res.data);
          const preselectId = searchParams.get('select');
          if (preselectId && !selectedRoom) {
            const found = res.data.find((r: any) => r._id === preselectId);
            if (found) {
              setSelectedRoom(found);
              setGuestCountManuallyChanged(false);
              setNumGuests(Math.max(1, found.maxOccupancy || 1));
            }
          } else if (selectedRoom) {
            const found = res.data.find((r: any) => r._id === selectedRoom._id);
            if (found) setSelectedRoom(found);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load room rates:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingRooms(false);
      });

    return () => {
      isMounted = false;
    };
  }, [checkIn, checkOut, planType, numGuests]);

  // Set default adult count to room's configured maximum adult capacity (or preserve manual selection if valid)
  useEffect(() => {
    if (selectedRoom) {
      const maxAllowed = Math.max(1, selectedRoom.maxOccupancy || 1);
      setNumGuests((prev) => {
        if (guestCountManuallyChanged) {
          return prev > maxAllowed ? maxAllowed : prev < 1 ? 1 : prev;
        }
        return maxAllowed;
      });
      setShowTerms(false);
      setTermsAccepted(false);
    } else {
      setGuestCountManuallyChanged(false);
    }
  }, [selectedRoom]);

  // Fetch Authoritative Effective Meal Addon Prices whenever stay dates change
  useEffect(() => {
    let isMounted = true;
    fetchEffectiveMealRates(checkIn || undefined, checkOut || undefined)
      .then((res) => {
        if (!isMounted) return;
        if (res?.success && res.data) {
          const b = res.data.breakfast;
          const l = res.data.lunch;
          const d = res.data.dinner;
          setMealPricing({
            breakfast: b?.effectivePrice ?? res.data.basePrices?.breakfast ?? 150,
            lunch: l?.effectivePrice ?? res.data.basePrices?.lunch ?? 250,
            dinner: d?.effectivePrice ?? res.data.basePrices?.dinner ?? 300,
            isBreakfastVariable: b?.isVariable,
            isLunchVariable: l?.isVariable,
            isDinnerVariable: d?.isVariable,
            minBreakfast: b?.minPrice,
            maxBreakfast: b?.maxPrice,
            minLunch: l?.minPrice,
            maxLunch: l?.maxPrice,
            minDinner: d?.minPrice,
            maxDinner: d?.maxPrice,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load effective meal prices:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [checkIn, checkOut]);

  // Recalculate price whenever booking parameters change

  useEffect(() => {
    if (!selectedRoom || !checkIn || !checkOut) return;

    checkAvailability({
      roomTypeId: selectedRoom._id,
      checkIn,
      checkOut,
      numGuests,
      mealSelection: { breakfast, lunch, dinner },
      couponCode,
      planType,
      extraPerson,
      gstin,
    })
      .then((res) => {
        if (res.success) {
          setCalcResult(res.data);
          if (res.data?.effectiveMealRates) {
            const emr = res.data.effectiveMealRates;
            setMealPricing({
              breakfast: emr.breakfast?.effectivePrice ?? 150,
              lunch: emr.lunch?.effectivePrice ?? 250,
              dinner: emr.dinner?.effectivePrice ?? 300,
              isBreakfastVariable: emr.breakfast?.isVariable,
              isLunchVariable: emr.lunch?.isVariable,
              isDinnerVariable: emr.dinner?.isVariable,
              minBreakfast: emr.breakfast?.minPrice,
              maxBreakfast: emr.breakfast?.maxPrice,
              minLunch: emr.lunch?.minPrice,
              maxLunch: emr.lunch?.maxPrice,
              minDinner: emr.dinner?.minPrice,
              maxDinner: emr.dinner?.maxPrice,
            });
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, [selectedRoom, checkIn, checkOut, numGuests, breakfast, lunch, dinner, couponCode, planType, extraPerson, gstin]);

  const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 12);
    const formatted = formatAadharInput(rawDigits);
    setGuestAadhar(formatted);
    if (rawDigits.length === 0) {
      setAadharError('');
    } else if (rawDigits.length < 12) {
      setAadharError(`Aadhaar must be 12 digits (${rawDigits.length}/12 entered)`);
    } else {
      const check = validateAadhar(formatted);
      setAadharError(check.isValid ? '' : check.message || 'Invalid Aadhaar number');
    }
  };

  const handleApplyCoupon = async () => {
    const rawCode = couponCode.trim();
    if (!rawCode) {
      toast.error('Please enter a coupon code.');
      setCouponStatus({ valid: false, message: 'Please enter a coupon code.' });
      return;
    }

    if (rawCode.includes(',') || rawCode.includes('+') || rawCode.includes('&') || /\s+/.test(rawCode)) {
      toast.error('Only one coupon can be applied per booking.');
      setCouponStatus({ valid: false, message: 'Only one coupon can be applied per booking.' });
      return;
    }

    const cleanCode = rawCode.toUpperCase();
    const ACTIVE_COUPONS = ['WELCOME10', 'PREMIUM15', 'MEGA25', 'PLATINUM30'];
    if (!ACTIVE_COUPONS.includes(cleanCode)) {
      toast.error('Invalid coupon code.');
      setCouponStatus({ valid: false, message: 'Invalid coupon code.' });
      return;
    }

    const cleanGstin = gstin.trim().toUpperCase();
    if (!cleanGstin) {
      toast.error('GSTIN is required to apply this coupon.');
      setGstinError('GSTIN is required to apply this coupon.');
      setCouponStatus({ valid: false, message: 'GSTIN is required to apply this coupon.' });
      return;
    }

    const gstinCheck = validateGSTIN(cleanGstin);
    if (!gstinCheck.isValid) {
      toast.error('Please enter a valid GSTIN.');
      setGstinError('Please enter a valid GSTIN.');
      setCouponStatus({ valid: false, message: 'Please enter a valid GSTIN.' });
      return;
    }

    setGstinError('');
    setApplyingCoupon(true);

    try {
      const res = await validateCoupon({
        couponCode: cleanCode,
        gstin: cleanGstin,
        roomTypeId: selectedRoom?._id,
        checkIn,
        checkOut,
        numGuests,
        mealSelection: { breakfast, lunch, dinner },
        planType,
        extraPerson,
      });

      if (res.success && res.data?.valid) {
        toast.success(res.message || `Coupon ${cleanCode} applied!`);
        setCouponStatus({ valid: true, message: `✓ Coupon ${cleanCode} applied (${res.data.discountPercentage}% discount)` });
        if (res.data?.pricing) {
          setCalcResult((prev: any) => ({ ...prev, pricing: res.data.pricing }));
        }
      } else {
        toast.error(res.message || 'Invalid coupon code.');
        setCouponStatus({ valid: false, message: res.message || 'Invalid coupon code.' });
      }
    } catch (err: any) {
      toast.error('Unable to apply coupon. Please try again.');
      setCouponStatus({ valid: false, message: 'Unable to apply coupon. Please try again.' });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName || !guestEmail || !guestPhone || !guestAadhar) {
      toast.error('Please enter your full name, email, phone, and Aadhaar number.');
      if (!guestAadhar) {
        setAadharError('Aadhaar number is mandatory for hotel registration.');
      }
      return;
    }

    const aadharCheck = validateAadhar(guestAadhar);
    if (!aadharCheck.isValid) {
      setAadharError(aadharCheck.message || 'Please enter a valid 12-digit Aadhaar number.');
      toast.error(aadharCheck.message || 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    if (!termsAccepted) {
      toast.error('Please read and agree to the Terms & Conditions and Cancellation & Refund Policy.');
      return;
    }

    if (!calcResult?.availability?.isAvailable) {
      toast.error('Sorry, this room is not available for the selected dates.');
      return;
    }

    setSubmittingBooking(true);

    try {
      // 1. Create Hold / Order on backend
      const res = await createBookingHold({
        roomTypeId: selectedRoom._id,
        checkIn,
        checkOut,
        numGuests,
        mealSelection: { breakfast, lunch, dinner },
        couponCode,
        guestName,
        guestEmail,
        guestPhone,
        guestAadhar,
        specialRequests,
        planType,
        extraPerson,
        gstin: gstin.trim().toUpperCase(),
      });

      if (!res.success || !res.data) {
        toast.error(res.message || 'Failed to initialize booking.');
        setSubmittingBooking(false);
        return;
      }

      const { bookingId, trackingToken, totalAmount, razorpayOrderId, razorpayKeyId } = res.data;
      let paymentCompleted = false;

      // 2. Trigger Razorpay Payment Modal
      const options = {
        key: razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        name: 'Hotel Raama, Hassan',
        description: `Room Booking ${bookingId}`,
        image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=200&q=80',
        order_id: razorpayOrderId && razorpayOrderId.startsWith('order_mock_') ? undefined : razorpayOrderId,
        handler: async function (response: any) {
          paymentCompleted = true;
          toast.loading('Verifying payment with server...');

          if (!response.razorpay_payment_id || !response.razorpay_signature) {
            toast.dismiss();
            toast.error('Incomplete payment response from gateway.');
            setSubmittingBooking(false);
            return;
          }

          const verifyRes = await verifyBookingPayment({
            bookingId,
            razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });

          if (verifyRes.success) {
            toast.dismiss();
            toast.success('Payment successful! Booking confirmed.');
            try {
              const storedBookings = JSON.parse(localStorage.getItem('my_bookings') || '[]');
              if (!storedBookings.includes(trackingToken)) {
                storedBookings.push(trackingToken);
                localStorage.setItem('my_bookings', JSON.stringify(storedBookings));
              }
            } catch (e) {
              console.error('Error updating localStorage:', e);
            }
            navigate(`/booking/confirmation/${trackingToken}`);
          } else {
            toast.dismiss();
            toast.error(verifyRes.message || 'Payment verification failed. Your booking has not been confirmed.');
            setSubmittingBooking(false);
          }
        },
        prefill: {
          name: guestName,
          email: guestEmail,
          contact: guestPhone,
        },
        theme: {
          color: '#00174A',
        },
        modal: {
          ondismiss: function () {
            if (paymentCompleted) return;
            toast.warning('Payment cancelled. Reservation hold released.');
            setSubmittingBooking(false);
            cancelBookingHold({ bookingId, trackingToken }).catch((err) => {
              console.error('Failed to cancel hold:', err);
            });
          },
        },
      };

      if (!window.Razorpay) {
        await loadRazorpay();
      }

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.error('Payment gateway failed to load. Please check your internet connection or disable adblockers and reload.');
        setSubmittingBooking(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing booking.');
      setSubmittingBooking(false);
    }
  };

  const filteredRooms = roomTypes.filter((room) => {
    if (filterAc === 'ac') return room.isAc;
    if (filterAc === 'nonac') return !room.isAc;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F7F0DF] text-[#00174A] py-16 max-w-7xl mx-auto px-6 lg:px-8">
      <SEO
        title="Rooms & Accommodation in Hassan | Hotel Raama"
        description="Explore comfortable rooms and accommodation at Hotel Raama in Hassan, Karnataka, with options for different stays and travel needs."
        canonical="/rooms"
      />
      {/* Header */}
      <ScrollReveal direction="up" duration={0.8}>
        <div className="text-center max-w-3xl mx-auto mb-16 border-b border-[#cbc0ad] pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-2">
            Direct Booking Rates
          </span>
          <h1 className="editorial-section-title text-[#00174A]">Rooms & Luxury Suites</h1>
          <p className="font-sans text-xs sm:text-sm text-[#666666] mt-3 max-w-xl mx-auto leading-relaxed">
            Guaranteed direct tariffs.
          </p>

          {/* Filter Buttons */}
          <div className="flex justify-center gap-3 mt-8">
            <button
              onClick={() => setFilterAc('all')}
              className={`px-5 py-2 rounded-sm text-xs font-sans uppercase tracking-wider font-semibold transition-all cursor-pointer ${filterAc === 'all'
                ? 'bg-[#00174A] text-white'
                : 'bg-[#F7F0DF] text-[#00174A] border border-[#cbc0ad] hover:border-[#00174A]'
                }`}
            >
              All Categories ({roomTypes.length})
            </button>
            <button
              onClick={() => setFilterAc('ac')}
              className={`px-5 py-2 rounded-sm text-xs font-sans uppercase tracking-wider font-semibold transition-all cursor-pointer ${filterAc === 'ac'
                ? 'bg-[#00174A] text-white'
                : 'bg-[#F7F0DF] text-[#00174A] border border-[#cbc0ad] hover:border-[#00174A]'
                }`}
            >
              Executive Air Conditioned (A/C)
            </button>
            <button
              onClick={() => setFilterAc('nonac')}
              className={`px-5 py-2 rounded-sm text-xs font-sans uppercase tracking-wider font-semibold transition-all cursor-pointer ${filterAc === 'nonac'
                ? 'bg-[#00174A] text-white'
                : 'bg-[#F7F0DF] text-[#00174A] border border-[#cbc0ad] hover:border-[#00174A]'
                }`}
            >
              Non-A/C Premium
            </button>
          </div>

          {/* Stay Dates & Rate Plan Bar */}
          <div className="mt-8 bg-white/80 backdrop-blur-xs p-4 sm:p-5 rounded-sm border border-[#cbc0ad] shadow-sm max-w-4xl mx-auto text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#00174A] mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#D6B369]" /> Check-In
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-white text-[#00174A] border border-[#cbc0ad] rounded-sm px-3 py-2 text-xs font-sans font-semibold focus:border-[#00174A] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#00174A] mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#D6B369]" /> Check-Out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full bg-white text-[#00174A] border border-[#cbc0ad] rounded-sm px-3 py-2 text-xs font-sans font-semibold focus:border-[#00174A] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#00174A] mb-1.5 flex items-center gap-1.5">
                  <Users size={13} className="text-[#D6B369]" /> Guests
                </label>
                <select
                  value={numGuests}
                  onChange={(e) => setNumGuests(parseInt(e.target.value, 10))}
                  className="w-full bg-white text-[#00174A] border border-[#cbc0ad] rounded-sm px-3 py-2 text-xs font-sans font-semibold focus:border-[#00174A] focus:outline-none cursor-pointer"
                >
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests</option>
                  <option value={3}>3 Guests</option>
                  <option value={4}>4 Guests / Family</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#00174A] mb-1.5">
                  Rate Plan
                </label>
                <div className="flex rounded-sm border border-[#cbc0ad] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPlanType('NON_CP')}
                    className={`flex-1 py-2 text-[11px] font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      planType === 'NON_CP'
                        ? 'bg-[#00174A] text-white'
                        : 'bg-white text-[#666666] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    EP (Room Only)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanType('CP')}
                    className={`flex-1 py-2 text-[11px] font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      planType === 'CP'
                        ? 'bg-[#00174A] text-white'
                        : 'bg-white text-[#666666] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    CP (+Breakfast)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Room Grid */}
      {loadingRooms ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00174A]"></div>
          <p className="text-xs font-sans text-[#666666] mt-4">Loading luxury room rates...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16 bg-[#F7F0DF] rounded-sm border border-[#cbc0ad]">
          <p className="text-xs font-sans text-[#666666]">No rooms found matching the selected filter.</p>
        </div>
      ) : (
        <ScrollRevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredRooms.map((room, idx) => (
            <ScrollRevealItem key={room._id} delay={Math.min(idx * 0.06, 0.3)}>
              <div
                className="bg-[#F7F0DF] rounded-sm overflow-hidden border border-[#10184A]/15 shadow-sm flex flex-col justify-between hover:border-[#D6B369]/40 transition-all duration-300 h-full"
              >
                <div>
                  <RoomSlideshow
                    images={room.images}
                    roomName={room.name}
                    badgeText={room.isAc ? 'A/C Executive' : 'Non A/C Premium'}
                  />

                  <div className="p-7 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-2xl font-serif text-[#00174A]">{room.name}</h3>
                      <span className="text-[10px] font-sans text-[#666666] bg-[#0B1849]/5 px-2.5 py-1 rounded-sm uppercase tracking-wider font-semibold border border-[#cbc0ad]">
                        Max {room.maxOccupancy} Guests
                      </span>
                    </div>

                    <p className="text-xs font-sans text-[#666666] leading-relaxed">{room.description}</p>

                    {/* Amenities list */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {room.amenities?.map((amenity: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] font-sans px-2.5 py-1 rounded-sm bg-[#0B1849]/5 text-[#333333] flex items-center gap-1 border border-[#cbc0ad] font-medium"
                        >
                          <Check size={11} className="text-[#333333]" /> {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-7 pt-0 border-t border-[#cbc0ad] mt-4 space-y-4">
                  <div className="flex justify-between items-center bg-[#0B1849]/5 p-3.5 rounded-sm border border-[#cbc0ad] text-xs">
                    <div>
                      <span className="text-[#666666] text-[10px] font-sans uppercase tracking-wider block font-semibold">
                        {planType === 'CP' ? 'CP Plan (With Breakfast)' : 'EP Plan (Room Only)'}
                      </span>
                      <span className="text-[10px] font-sans text-[#666666]">
                        {room.hasVaryingRates
                          ? `${room.numNights || 1} nights • ₹${room.roomTotal} room total`
                          : (room.numNights && room.numNights > 1
                              ? `${room.numNights} nights • ₹${room.roomTotal} room total`
                              : 'Standard Direct Tariff')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-serif font-bold text-[#333333]">
                        {room.hasVaryingRates
                          ? `₹${room.minRate}–₹${room.maxRate}`
                          : `₹${room.dateWiseRate ?? (planType === 'CP' ? (room.cpPrice || room.basePrice) : room.basePrice)}`}
                      </span>
                      <span className="text-[10px] font-sans text-[#666666]"> / night + GST</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-sans uppercase tracking-wider text-[#666666] font-semibold">
                      {room.isAvailable === false ? (
                        <span className="text-rose-600 font-bold">Sold Out</span>
                      ) : (
                        'Instant Reservation'
                      )}
                    </span>
                    <button
                      disabled={room.isAvailable === false}
                      onClick={() => {
                        setSelectedRoom(room);
                        setExtraPerson(false);
                        setGuestCountManuallyChanged(false);
                        const defaultAdults = Math.max(1, room.maxOccupancy || 1);
                        setNumGuests(defaultAdults);
                      }}
                      className="px-5 py-2.5 rounded-sm bg-[#D6B369] text-[#00174A] font-sans font-semibold text-xs uppercase tracking-wider hover:bg-[#E8C56A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {room.isAvailable === false ? 'Unavailable' : 'Select & Book'}
                    </button>
                  </div>
                </div>
              </div>
            </ScrollRevealItem>
          ))}
        </ScrollRevealGroup>
      )}

      {/* BOOKING MODAL - Cream Background Container */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#F7F0DF] text-[#00174A] border border-[#cbc0ad] rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl"
          >
            <button
              onClick={() => {
                setSelectedRoom(null);
                setGuestCountManuallyChanged(false);
              }}
              className="absolute top-6 right-6 p-2 rounded-full bg-[#333333]/10 text-[#333333]/70 hover:text-[#333333] hover:bg-[#333333]/20 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6 border-b border-[#cbc0ad] pb-4 space-y-4">
              <div>
                <span className="text-[#D6B369] text-[10px] font-sans font-bold uppercase tracking-[0.2em]">Direct Booking</span>
                <h2 className="text-3xl font-serif text-[#00174A]">{selectedRoom.name}</h2>
                <p className="text-xs font-sans text-[#666666] mt-1">
                  Rate: ₹{calcResult?.pricing?.roomPricePerNight ?? selectedRoom.dateWiseRate ?? (planType === 'CP' ? (selectedRoom.cpPrice || selectedRoom.basePrice) : selectedRoom.basePrice)} / night · Max Occupancy: {selectedRoom.maxOccupancy || 2} {selectedRoom.maxOccupancy === 1 ? 'Guest' : 'Guests'}
                </p>
              </div>

              <div className="rounded-sm overflow-hidden border border-[#cbc0ad]">
                <RoomSlideshow images={selectedRoom.images} roomName={selectedRoom.name} />
              </div>

              {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-sans uppercase tracking-wider text-[#666666] font-semibold block mb-2">Included Amenities & Facilities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRoom.amenities.map((amenity: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[10px] font-sans px-2.5 py-1 rounded-sm bg-[#0B1849]/5 text-[#333333] flex items-center gap-1 border border-[#cbc0ad] font-medium"
                      >
                        <Check size={11} className="text-[#333333]" /> {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-6">
              {/* Dates & Guests */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-sans uppercase tracking-wider text-[#666666] mb-1.5 font-semibold">Check-In</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] focus:border-[#00174A] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans uppercase tracking-wider text-[#666666] mb-1.5 font-semibold">Check-Out</label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] focus:border-[#00174A] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans uppercase tracking-wider text-[#666666] mb-1.5 font-semibold">
                    Guests (Max {selectedRoom.maxOccupancy || 1})
                  </label>
                  <select
                    value={Math.min(numGuests, selectedRoom.maxOccupancy || 1)}
                    onChange={(e) => {
                      setNumGuests(parseInt(e.target.value, 10));
                      setGuestCountManuallyChanged(true);
                    }}
                    className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] focus:border-[#00174A] focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: Math.max(1, selectedRoom.maxOccupancy || 1) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} className="bg-white text-[#333333]">
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>


              {/* CP vs EP Plan Selection */}
              <div className="p-4 bg-white/70 rounded-sm border border-[#cbc0ad] space-y-3">
                <span className="text-[10px] font-sans font-bold text-[#D6B369] uppercase block tracking-wider">
                  Select Room Booking Plan *
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlanType('NON_CP')}
                    className={`p-3.5 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${planType === 'NON_CP'
                      ? 'bg-[#00174A]/10 border-[#00174A] ring-1 ring-[#00174A] text-[#00174A]'
                      : 'bg-white border-[#cbc0ad] text-[#666666] hover:border-[#00174A]/50'
                      }`}
                  >
                    <span className="text-xs font-sans font-bold text-[#00174A] flex items-center justify-between">
                      🏨 EP Plan (Room Only)
                      <span className="text-sm font-serif font-extrabold">
                        ₹{selectedRoom.epRate || selectedRoom.basePrice}
                      </span>
                    </span>
                    <span className="text-[10px] font-sans text-[#666666]">Standard rate, breakfast not included</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanType('CP')}
                    className={`p-3.5 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${planType === 'CP'
                      ? 'bg-[#D6B369]/15 border-[#D6B369] ring-1 ring-[#D6B369] text-[#00174A]'
                      : 'bg-white border-[#cbc0ad] text-[#666666] hover:border-[#D6B369]/50'
                      }`}
                  >
                    <span className="text-xs font-sans font-bold text-[#00174A] flex items-center justify-between">
                      🍳 CP Plan (With Breakfast)
                      <span className="text-sm font-serif font-extrabold">
                        ₹{selectedRoom.cpRate || selectedRoom.cpPrice || selectedRoom.basePrice + 150}
                      </span>
                    </span>
                    <span className="text-[10px] font-sans text-[#666666]">Morning breakfast included</span>
                  </button>
                </div>
              </div>

              {/* Meal Plan Addons */}
              <div className="p-4 bg-white/70 rounded-sm border border-[#cbc0ad] space-y-3">
                <span className="text-[10px] font-sans font-bold text-[#D6B369] uppercase block tracking-wider">
                  Optional Dining Addons (Per Guest/Night)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans text-[#333333]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={breakfast}
                      onChange={(e) => setBreakfast(e.target.checked)}
                      className="rounded accent-[#00174A]"
                    />
                    <span>
                      Breakfast (+₹{mealPricing.breakfast}
                      {mealPricing.isBreakfastVariable ? ' avg' : ''})
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lunch}
                      onChange={(e) => setLunch(e.target.checked)}
                      className="rounded accent-[#00174A]"
                    />
                    <span>
                      Lunch (+₹{mealPricing.lunch}
                      {mealPricing.isLunchVariable ? ' avg' : ''})
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dinner}
                      onChange={(e) => setDinner(e.target.checked)}
                      className="rounded accent-[#00174A]"
                    />
                    <span>
                      Dinner (+₹{mealPricing.dinner}
                      {mealPricing.isDinnerVariable ? ' avg' : ''})
                    </span>
                  </label>
                </div>
              </div>

              {/* Extra Person Option */}
              <div className="p-4 bg-white/70 rounded-sm border border-[#cbc0ad] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-sans font-bold text-[#333333]">Extra Person</span>
                    <span className="bg-[#D6B369]/15 text-[#00174A] text-[10px] font-bold px-2 py-0.5 rounded-sm border border-[#D6B369]/40">
                      +₹600 / night
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={extraPerson}
                    onChange={(e) => setExtraPerson(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00174A]"></div>
                </label>
              </div>

              {/* Promotional Coupon & GSTIN Section */}
              <div className="space-y-2 pt-2 border-t border-[#cbc0ad]/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans font-bold text-[#D6B369] uppercase tracking-wider">
                    Promotional Coupon
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#00174A] uppercase mb-1">
                      Coupon Code
                    </label>
                    <input
                      type="text"
                      placeholder="ENTER COUPON CODE"
                      value={couponCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/\s/g, '');
                        setCouponCode(val);
                        setCouponStatus(null);
                      }}
                      className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans uppercase text-[#333333] placeholder-[#999999] focus:outline-none focus:border-[#00174A] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#00174A] uppercase mb-1">
                      GSTIN (Required for coupon)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 15-digit GSTIN (e.g. 22AAAAA0000A1Z5)"
                      value={gstin}
                      maxLength={15}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/\s/g, '').slice(0, 15);
                        setGstin(val);
                        setGstinError('');
                        setCouponStatus(null);
                      }}
                      className={`w-full bg-white border rounded-sm px-3.5 py-2 text-xs font-sans uppercase text-[#333333] placeholder-[#999999] focus:outline-none transition-colors ${
                        gstinError ? 'border-rose-400 focus:border-rose-500' : 'border-[#cbc0ad] focus:border-[#00174A]'
                      }`}
                    />
                    {gstinError && (
                      <p className="text-[10px] font-sans text-rose-600 mt-1">
                        {gstinError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[10px] text-[#666666] font-sans italic">
                      GSTIN is required to apply promotional coupons.
                    </p>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={applyingCoupon}
                      className="px-4 py-1.5 bg-[#D6B369] text-xs font-sans uppercase font-bold rounded-sm hover:bg-[#E8C56A] text-[#00174A] cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      {applyingCoupon ? 'Applying...' : 'Apply Coupon'}
                    </button>
                  </div>

                  {couponStatus && (
                    <div className="pt-1">
                      {couponStatus.valid ? (
                        <span className="text-[11px] font-sans font-semibold text-emerald-700 flex items-center gap-1">
                          {couponStatus.message}
                        </span>
                      ) : (
                        <span className="text-[11px] font-sans font-semibold text-rose-600 flex items-center gap-1">
                          ✕ {couponStatus.message}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Guest Details */}
              <div className="space-y-3 pt-4 border-t border-[#cbc0ad]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans font-bold text-[#D6B369] uppercase block tracking-wider">
                    Guest Information & ID Verification
                  </span>
                  <span className="text-[10px] text-[#666666] font-sans">
                    * Govt ID required for check-in
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] placeholder-[#999999] focus:border-[#00174A] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email Address *"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] placeholder-[#999999] focus:border-[#00174A] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] placeholder-[#999999] focus:border-[#00174A] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Aadhaar Number (12 Digits) *"
                        value={guestAadhar}
                        onChange={handleAadharChange}
                        maxLength={14}
                        className={`w-full bg-white border rounded-sm px-3.5 py-2 pr-8 text-xs font-sans text-[#333333] placeholder-[#999999] tracking-wider focus:outline-none transition-colors ${aadharError
                            ? 'border-rose-500 focus:border-rose-500'
                            : guestAadhar.replace(/\s/g, '').length === 12
                              ? 'border-emerald-600 focus:border-emerald-600'
                              : 'border-[#cbc0ad] focus:border-[#00174A]'
                          }`}
                        required
                      />
                      {guestAadhar.replace(/\s/g, '').length === 12 && !aadharError && (
                        <Check size={14} className="absolute right-2.5 top-2.5 text-emerald-600" />
                      )}
                    </div>
                    {aadharError ? (
                      <span className="text-[10px] text-rose-600 mt-1 block font-medium">
                        {aadharError}
                      </span>
                    ) : guestAadhar.replace(/\s/g, '').length === 12 ? (
                      <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">
                        ✓ Valid 12-digit Aadhaar Number
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#666666] mt-0.5 block">
                        Format: XXXX XXXX XXXX (e.g. 2345 6789 0124)
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Special Requests / Arrival Time"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] placeholder-[#999999] focus:border-[#00174A] focus:outline-none"
                />
              </div>



              {/* Price Breakdown Calculation */}
              {calcResult && calcResult.pricing && (
                <div className="p-4 bg-white/80 rounded-sm border border-[#cbc0ad] space-y-2 text-xs font-sans">
                  <div className="flex justify-between text-[#333333]">
                    <span>
                      Room Charges ({calcResult.pricing.numNights} night{calcResult.pricing.numNights > 1 ? 's' : ''}
                      {calcResult.pricing.nightlyRates && calcResult.pricing.nightlyRates.length > 1
                        ? ` • avg ₹${calcResult.pricing.roomPricePerNight}/night`
                        : ` x ₹${calcResult.pricing.roomPricePerNight}`}):
                    </span>
                    <span className="font-semibold">₹{calcResult.pricing.roomTotal}</span>
                  </div>

                  {calcResult.pricing.nightlyRates && calcResult.pricing.nightlyRates.length > 1 && (
                    <div className="pl-3 py-1 space-y-1 border-l-2 border-[#D6B369]/50 text-[11px] text-[#666666]">
                      {calcResult.pricing.nightlyRates.map((nr: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>Night {i + 1} ({nr.date}):</span>
                          <span>₹{nr.rate} {nr.isCustomRate ? '(Date rate)' : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {calcResult.pricing.extraPersonTotal > 0 && (
                    <div className="flex justify-between text-emerald-800 font-semibold">
                      <span>Extra Person ({calcResult.pricing.numNights} night{calcResult.pricing.numNights > 1 ? 's' : ''} x ₹600):</span>
                      <span>+ ₹{calcResult.pricing.extraPersonTotal}</span>
                    </div>
                  )}
                  {calcResult.pricing.mealPlanTotal > 0 && (
                    <div className="flex justify-between text-[#333333]">
                      <span>Meals Add-on:</span>
                      <span>+ ₹{calcResult.pricing.mealPlanTotal}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#333333] pt-1 border-t border-dashed border-[#cbc0ad]/60 font-medium">
                    <span>Subtotal:</span>
                    <span>₹{calcResult.pricing.subtotal}</span>
                  </div>
                  {calcResult.pricing.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Coupon: {calcResult.pricing.couponCode}</span>
                      <span>- ₹{calcResult.pricing.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#666666]">
                    <span>GST ({calcResult.pricing.taxPercentage ?? 5}%):</span>
                    <span>₹{calcResult.pricing.taxAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#00174A] pt-2 border-t border-[#cbc0ad]">
                    <span>Total:</span>
                    <span>₹{calcResult.pricing.totalAmount}</span>
                  </div>
                </div>
              )}

              {/* Collapsible Terms & Conditions */}
              <div className="border border-[#cbc0ad] rounded-sm bg-white/70 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTerms((prev) => !prev)}
                  aria-expanded={showTerms}
                  aria-controls="terms-and-conditions-content"
                  className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-sans font-bold text-[#00174A] hover:bg-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={15} className="text-[#D6B369]" />
                    <span>Terms & Conditions</span>
                  </span>
                  <motion.span
                    animate={{ rotate: showTerms ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[#00174A]/70 flex items-center"
                  >
                    <ChevronDown size={16} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {showTerms && (
                    <motion.div
                      id="terms-and-conditions-content"
                      key="terms-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden border-t border-[#cbc0ad]"
                    >
                      <div className="p-4 bg-white/95 text-xs font-sans text-[#333333] max-h-64 sm:max-h-72 overflow-y-auto space-y-3.5 pr-3">
                        <div className="font-bold text-[11px] uppercase tracking-wider text-[#00174A] border-b border-[#cbc0ad]/60 pb-1.5">
                          TERMS & CONDITIONS
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">1. Additional Hours</span>
                          <p className="text-[#555555] leading-relaxed">
                            Any extension beyond the scheduled check-out time will be subject to additional charges as applicable.
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">2. Damage to Property</span>
                          <p className="text-[#555555] leading-relaxed">
                            Guests will be held responsible for any damage, loss, or breakage caused to the hotel premises, furniture, fixtures, equipment, or other property during their stay. The full cost of the damage shall be payable by the guest.
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">3. Visitor Policy</span>
                          <p className="text-[#555555] leading-relaxed">
                            Guests are not permitted on the property after 9:00 PM.
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">4. Food Delivery</span>
                          <p className="text-[#555555] leading-relaxed">
                            Food delivery personnel, including delivery agents from platforms such as Zomato and Swiggy, are not permitted inside guest rooms. Guests must collect all food deliveries from the reception area.
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">5. Valid ID at Check-in</span>
                          <p className="text-[#555555] leading-relaxed">
                            Guests must present a valid government-issued identification document at the time of check-in.
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">6. Accepted ID Proofs</span>
                          <p className="text-[#555555] leading-relaxed">
                            The hotel accepts Passport, Aadhaar Card, Driving Licence, and other valid Government-issued ID proofs for verification.
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">7. Pets</span>
                          <p className="text-[#555555] leading-relaxed">
                            Pets are not permitted anywhere on the hotel premises.
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">8. Outside Visitors</span>
                          <p className="text-[#555555] leading-relaxed">
                            Guests are requested not to invite or accommodate outside visitors in their rooms during their stay without prior permission from hotel management.
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">9. Cancellation & Refund Policy</span>
                          <ul className="text-[#555555] list-disc list-inside space-y-0.5 pl-1 leading-relaxed">
                            <li>7 or more days before check-in: 100% refund</li>
                            <li>3–6 days before check-in: 50% refund</li>
                            <li>Less than 3 days before check-in: No refund</li>
                            <li>Any approved refund will be processed within 7 business days from the date of management approval.</li>
                          </ul>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">10. Management Rights</span>
                          <p className="text-[#555555] leading-relaxed">
                            Hotel management reserves the right to cancel or terminate a guest's stay in cases of misconduct, inappropriate behaviour, violation of hotel rules, or activities considered suspicious or contrary to hotel policies, subject to applicable laws and regulations.
                          </p>
                        </div>

                        <div>
                          <span className="font-bold text-[#00174A] block mb-0.5">11. Jurisdiction</span>
                          <p className="text-[#555555] leading-relaxed">
                            Any dispute or legal proceedings arising out of or in connection with the services of Hotel Raama shall, subject to applicable law, be brought before the competent courts having jurisdiction in Hassan, Karnataka, India.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Agreement Checkbox */}
              <label htmlFor="terms-agreement-checkbox" className="flex items-start gap-2.5 cursor-pointer pt-1 group select-none">
                <input
                  type="checkbox"
                  id="terms-agreement-checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-sm border border-[#cbc0ad] text-[#00174A] focus:ring-2 focus:ring-[#D6B369] focus:ring-offset-0 cursor-pointer accent-[#00174A]"
                  required
                />
                <span className="text-xs font-sans text-[#333333] leading-snug group-hover:text-[#00174A] transition-colors">
                  I have read and agree to the <span className="font-semibold text-[#00174A]">Terms & Conditions</span> and <span className="font-semibold text-[#00174A]">Cancellation & Refund Policy</span>.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingBooking || !calcResult?.availability?.isAvailable || !termsAccepted}
                className="w-full py-4 rounded-sm bg-[#D6B369] text-[#00174A] font-sans font-bold text-xs uppercase tracking-wider hover:bg-[#E8C56A] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <CreditCard size={16} /> Pay Online via Razorpay (₹{calcResult?.pricing?.totalAmount || selectedRoom.basePrice})
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
