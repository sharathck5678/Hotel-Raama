import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { fetchRoomTypes, checkAvailability, createBookingHold, verifyBookingPayment } from '../services/api';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '../components/ScrollReveal';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const RoomsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(true);
  const [filterAc, setFilterAc] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [planType, setPlanType] = useState<'NON_CP' | 'CP'>('NON_CP');

  // Booking Modal Form State
  const [checkIn, setCheckIn] = useState<string>(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState<string>(searchParams.get('checkOut') || '');
  const [numGuests, setNumGuests] = useState<number>(parseInt(searchParams.get('guests') || '2', 10));
  const [extraPerson, setExtraPerson] = useState(false);
  const [breakfast, setBreakfast] = useState(false);
  const [lunch, setLunch] = useState(false);
  const [dinner, setDinner] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Price Calculation State
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  useEffect(() => {
    // Default dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    if (!checkIn) setCheckIn(tomorrow.toISOString().split('T')[0]);
    if (!checkOut) setCheckOut(dayAfter.toISOString().split('T')[0]);

    setLoadingRooms(true);
    fetchRoomTypes()
      .then((res) => {
        if (res.success) {
          setRoomTypes(res.data);
          const preselectId = searchParams.get('select');
          if (preselectId) {
            const found = res.data.find((r: any) => r._id === preselectId);
            if (found) setSelectedRoom(found);
          }
        }
      })
      .finally(() => setLoadingRooms(false));

    // Load Razorpay Script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Ensure numGuests stays within maxOccupancy of the selected room
  useEffect(() => {
    if (selectedRoom) {
      const maxAllowed = selectedRoom.maxOccupancy || 2;
      setNumGuests((prev) => (prev > maxAllowed ? maxAllowed : prev < 1 ? 1 : prev));
    }
  }, [selectedRoom]);

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
    })
      .then((res) => {
        if (res.success) {
          setCalcResult(res.data);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, [selectedRoom, checkIn, checkOut, numGuests, breakfast, lunch, dinner, couponCode, planType, extraPerson]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName || !guestEmail || !guestPhone) {
      toast.error('Please enter your full name, email, and phone number.');
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
        specialRequests,
        planType,
        extraPerson,
      });

      if (!res.success) {
        toast.error(res.message || 'Failed to initialize booking.');
        setSubmittingBooking(false);
        return;
      }

      const { bookingId, trackingToken, totalAmount, razorpayOrderId, razorpayKeyId } = res.data;

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
          toast.loading('Verifying payment signature...');

          const verifyRes = await verifyBookingPayment({
            bookingId,
            razorpayOrderId,
            razorpayPaymentId: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
            razorpaySignature: response.razorpay_signature || 'mock_sig',
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
            toast.error(verifyRes.message || 'Payment verification failed.');
          }
        },
        prefill: {
          name: guestName,
          email: guestEmail,
          contact: guestPhone,
        },
        theme: {
          color: '#47614d',
        },
        modal: {
          ondismiss: function () {
            toast.warning('Payment cancelled. Reservation hold expired.');
            setSubmittingBooking(false);
          },
        },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Fallback for environment without script
        const verifyRes = await verifyBookingPayment({
          bookingId,
          razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'mock_sig',
        });
        if (verifyRes.success) {
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
        }
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
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-16 max-w-7xl mx-auto px-6 lg:px-8">
      {/* Header */}
      <ScrollReveal direction="up" duration={0.8}>
        <div className="text-center max-w-3xl mx-auto mb-16 border-b border-[#cbc0ad] pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-2">
            Direct Booking Rates
          </span>
          <h1 className="editorial-section-title text-[#333333]">Rooms & Luxury Suites</h1>
          <p className="font-sans text-xs sm:text-sm text-[#666666] mt-3 max-w-xl mx-auto leading-relaxed">
            Guaranteed direct tariffs. Transparent 12% GST breakdown, CP (Breakfast included) or Non-CP options.
          </p>

          {/* Filter Buttons */}
          <div className="flex justify-center gap-3 mt-8">
            <button
              onClick={() => setFilterAc('all')}
              className={`px-5 py-2 rounded-sm text-xs font-sans uppercase tracking-wider font-semibold transition-all cursor-pointer ${filterAc === 'all'
                ? 'bg-[#47614d] text-[#f7f7f2]'
                : 'bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] hover:border-[#cbc0ad]'
                }`}
            >
              All Categories ({roomTypes.length})
            </button>
            <button
              onClick={() => setFilterAc('ac')}
              className={`px-5 py-2 rounded-sm text-xs font-sans uppercase tracking-wider font-semibold transition-all cursor-pointer ${filterAc === 'ac'
                ? 'bg-[#47614d] text-[#f7f7f2]'
                : 'bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] hover:border-[#cbc0ad]'
                }`}
            >
              Air Conditioned (A/C)
            </button>
            <button
              onClick={() => setFilterAc('nonac')}
              className={`px-5 py-2 rounded-sm text-xs font-sans uppercase tracking-wider font-semibold transition-all cursor-pointer ${filterAc === 'nonac'
                ? 'bg-[#47614d] text-[#f7f7f2]'
                : 'bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] hover:border-[#cbc0ad]'
                }`}
            >
              Non-A/C Premium
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Room Grid */}
      {loadingRooms ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#47614d]"></div>
          <p className="text-xs font-sans text-[#666666] mt-4">Loading luxury room rates...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-16 bg-[#f7f7f2] rounded-sm border border-[#cbc0ad]">
          <p className="text-xs font-sans text-[#666666]">No rooms found matching the selected filter.</p>
        </div>
      ) : (
        <ScrollRevealGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredRooms.map((room, idx) => (
            <ScrollRevealItem key={room._id} delay={Math.min(idx * 0.06, 0.3)}>
              <div
                className="bg-[#f7f7f2] rounded-sm overflow-hidden border border-[#cbc0ad] shadow-sm flex flex-col justify-between hover:border-[#cbc0ad] transition-all duration-300 h-full"
              >
              <div>
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={room.images?.[0] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-[#47614d] px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-[#d9b57d]">
                    {room.isAc ? 'A/C Executive' : 'Non A/C Premium'}
                  </div>
                </div>

                <div className="p-7 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-serif text-[#333333]">{room.name}</h3>
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
                    <span className="text-[#666666] text-[10px] font-sans uppercase tracking-wider block font-semibold">Non-CP Plan (Room Only)</span>
                    <span className="text-xl font-serif font-bold text-[#333333]">₹{room.basePrice}</span>
                    <span className="text-[10px] font-sans text-[#666666]"> / night + GST</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-700 text-[10px] font-sans uppercase tracking-wider block font-semibold">CP Plan (With Breakfast)</span>
                    <span className="text-xl font-serif font-bold text-emerald-800">₹{room.cpPrice || room.basePrice + 150}</span>
                    <span className="text-[10px] font-sans text-[#666666]"> / night + GST</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans uppercase tracking-wider text-[#666666] font-semibold">Instant Reservation</span>
                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      setPlanType('NON_CP');
                      setExtraPerson(false);
                      const maxAllowed = room.maxOccupancy || 2;
                      setNumGuests((prev) => (prev > maxAllowed ? maxAllowed : prev < 1 ? 1 : prev));
                    }}
                    className="px-5 py-2.5 rounded-sm bg-[#47614d] text-[#f7f7f2] font-sans font-semibold text-xs uppercase tracking-wider hover:bg-[#374c3c] transition-all cursor-pointer"
                  >
                    Select & Book
                  </button>
                </div>
              </div>
            </div>
          </ScrollRevealItem>
        ))}
      </ScrollRevealGroup>
      )}

      {/* BOOKING MODAL - Midnight Navy Container */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#47614d] text-[#f7f7f2] border border-[#f7f7f2]/20 rounded-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative shadow-2xl"
          >
            <button
              onClick={() => setSelectedRoom(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-[#f7f7f2]/10 text-[#f7f7f2]/70 hover:text-[#f7f7f2]"
            >
              <X size={20} />
            </button>

            <div className="mb-6 border-b border-[#f7f7f2]/10 pb-4">
              <span className="text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-[0.2em]">Direct Booking</span>
              <h2 className="text-3xl font-serif text-[#f7f7f2]">{selectedRoom.name}</h2>
              <p className="text-xs font-sans text-[#f7f7f2]/70 mt-1">
                Base Rate: ₹{selectedRoom.basePrice} / night · Max Occupancy: {selectedRoom.maxOccupancy || 2} {selectedRoom.maxOccupancy === 1 ? 'Guest' : 'Guests'}
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-6">
              {/* Dates & Guests */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-sans uppercase tracking-wider text-[#f7f7f2]/80 mb-1.5 font-semibold">Check-In</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2] focus:border-[#d9b57d] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans uppercase tracking-wider text-[#f7f7f2]/80 mb-1.5 font-semibold">Check-Out</label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2] focus:border-[#d9b57d] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans uppercase tracking-wider text-[#f7f7f2]/80 mb-1.5 font-semibold">
                    Guests (Max {selectedRoom.maxOccupancy || 2})
                  </label>
                  <select
                    value={Math.min(numGuests, selectedRoom.maxOccupancy || 2)}
                    onChange={(e) => setNumGuests(parseInt(e.target.value, 10))}
                    className="w-full bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2] focus:border-[#d9b57d] focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: selectedRoom.maxOccupancy || 2 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} className="bg-[#47614d] text-[#f7f7f2]">
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>


              {/* CP vs Non-CP Plan Selection */}
              <div className="p-4 bg-[#f7f7f2]/5 rounded-sm border border-[#f7f7f2]/15 space-y-3">
                <span className="text-[10px] font-sans font-bold text-[#d9b57d] uppercase block tracking-wider">
                  Select Room Booking Plan *
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlanType('NON_CP')}
                    className={`p-3.5 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${planType === 'NON_CP'
                      ? 'bg-[#f7f7f2]/15 border-[#d9b57d] text-[#f7f7f2]'
                      : 'bg-transparent border-[#f7f7f2]/15 text-[#f7f7f2]/60 hover:border-[#f7f7f2]/30'
                      }`}
                  >
                    <span className="text-xs font-sans font-bold text-[#d9b57d] flex items-center justify-between">
                      🏨 Non-CP Plan (Room Only)
                      <span className="text-sm font-serif font-extrabold">₹{selectedRoom.basePrice}</span>
                    </span>
                    <span className="text-[10px] font-sans text-[#f7f7f2]/70">Standard rate, breakfast not included</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanType('CP')}
                    className={`p-3.5 rounded-sm border text-left flex flex-col gap-1 transition-all cursor-pointer ${planType === 'CP'
                      ? 'bg-emerald-500/20 border-emerald-400 text-[#f7f7f2]'
                      : 'bg-transparent border-[#f7f7f2]/15 text-[#f7f7f2]/60 hover:border-[#f7f7f2]/30'
                      }`}
                  >
                    <span className="text-xs font-sans font-bold text-emerald-400 flex items-center justify-between">
                      🍳 CP Plan (With Breakfast)
                      <span className="text-sm font-serif font-extrabold">₹{selectedRoom.cpPrice || selectedRoom.basePrice + 150}</span>
                    </span>
                    <span className="text-[10px] font-sans text-[#f7f7f2]/70">Complimentary morning breakfast included</span>
                  </button>
                </div>
              </div>

              {/* Meal Plan Addons */}
              <div className="p-4 bg-[#f7f7f2]/5 rounded-sm border border-[#f7f7f2]/15 space-y-3">
                <span className="text-[10px] font-sans font-bold text-[#d9b57d] uppercase block tracking-wider">
                  Optional Dining Addons (Per Guest/Night)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans text-[#f7f7f2]/90">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={breakfast}
                      onChange={(e) => setBreakfast(e.target.checked)}
                      className="rounded accent-[#FFDE74]"
                    />
                    <span>Breakfast (+₹150)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lunch}
                      onChange={(e) => setLunch(e.target.checked)}
                      className="rounded accent-[#FFDE74]"
                    />
                    <span>Lunch (+₹250)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dinner}
                      onChange={(e) => setDinner(e.target.checked)}
                      className="rounded accent-[#FFDE74]"
                    />
                    <span>Dinner (+₹300)</span>
                  </label>
                </div>
              </div>

              {/* Extra Person Option */}
              <div className="p-4 bg-[#f7f7f2]/5 rounded-sm border border-[#f7f7f2]/15 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-sans font-bold text-[#d9b57d]">Extra Person Bedding & Stay</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-sm border border-emerald-500/30">
                      +₹600 / night
                    </span>
                  </div>
                  <p className="text-[10px] font-sans text-[#f7f7f2]/70 leading-relaxed">
                    Includes dedicated rollaway bed/mattress, fresh linen set, and toiletries for 1 additional guest.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={extraPerson}
                    onChange={(e) => setExtraPerson(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#f7f7f2]/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d9b57d]"></div>
                </label>
              </div>

              {/* Coupon Code Input */}
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase().trim())}
                    className={`flex-1 bg-[#47614d] border rounded-sm px-3.5 py-2 text-xs font-sans uppercase text-[#f7f7f2] placeholder-[#f7f7f2]/40 focus:outline-none transition-colors ${couponCode
                      ? couponCode === 'RAAMA5'
                        ? 'border-emerald-400 focus:border-emerald-300'
                        : 'border-rose-400/80 focus:border-rose-400'
                      : 'border-[#f7f7f2]/20 focus:border-[#d9b57d]'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleanCode = couponCode.trim().toUpperCase();
                      if (!cleanCode) {
                        toast.error('Please enter a coupon code.');
                      } else if (cleanCode === 'RAAMA5') {
                        toast.success('Coupon RAAMA5 applied! 5% discount added.');
                      } else {
                        toast.error('Invalid coupon code.');
                      }
                    }}
                    className="px-4 py-2 bg-[#f7f7f2]/10 text-xs font-sans uppercase font-bold rounded-sm hover:bg-[#f7f7f2]/20 text-[#d9b57d] cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {couponCode && (
                  <div>
                    {couponCode === 'RAAMA5' ? (
                      <span className="text-[11px] font-sans text-emerald-300 flex items-center gap-1">
                        ✓ Coupon RAAMA5 applied (5% discount)
                      </span>
                    ) : (
                      <span className="text-[11px] font-sans text-rose-300 flex items-center gap-1">
                        ✕ Invalid coupon code
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Guest Details */}
              <div className="space-y-3 pt-4 border-t border-[#f7f7f2]/10">
                <span className="text-[10px] font-sans font-bold text-[#d9b57d] uppercase block tracking-wider">Guest Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2]"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address *"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2]"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2]"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Special Requests / Arrival Time"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full bg-[#47614d] border border-[#f7f7f2]/20 rounded-sm px-3.5 py-2 text-xs font-sans text-[#f7f7f2]"
                />
              </div>

              {/* Price Breakdown Calculation */}
              {calcResult && (
                <div className="p-4 bg-[#f7f7f2]/5 rounded-sm border border-[#f7f7f2]/15 space-y-2 text-xs font-sans">
                  <div className="flex justify-between text-[#f7f7f2]/80">
                    <span>Room ({calcResult.pricing.numNights} night{calcResult.pricing.numNights > 1 ? 's' : ''} x ₹{calcResult.pricing.roomPricePerNight}):</span>
                    <span>₹{calcResult.pricing.roomTotal}</span>
                  </div>
                  {calcResult.pricing.extraPersonTotal > 0 && (
                    <div className="flex justify-between text-emerald-300 font-semibold">
                      <span>Extra Person ({calcResult.pricing.numNights} night{calcResult.pricing.numNights > 1 ? 's' : ''} x ₹600):</span>
                      <span>+ ₹{calcResult.pricing.extraPersonTotal}</span>
                    </div>
                  )}
                  {calcResult.pricing.mealPlanTotal > 0 && (
                    <div className="flex justify-between text-[#f7f7f2]/80">
                      <span>Meals Addon:</span>
                      <span>₹{calcResult.pricing.mealPlanTotal}</span>
                    </div>
                  )}
                  {calcResult.pricing.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Coupon Discount ({calcResult.pricing.couponCode}):</span>
                      <span>- ₹{calcResult.pricing.discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#f7f7f2]/60">
                    <span>GST (12%):</span>
                    <span>₹{calcResult.pricing.taxAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#d9b57d] pt-2 border-t border-[#f7f7f2]/10">
                    <span>Total Amount Payable:</span>
                    <span>₹{calcResult.pricing.totalAmount}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingBooking || !calcResult?.availability?.isAvailable}
                className="w-full py-4 rounded-sm bg-[#f7f7f2] text-[#333333] font-sans font-bold text-xs uppercase tracking-wider hover:bg-[#d9b57d] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
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
