import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, ArrowRight, Utensils, GlassWater, PartyPopper, Star, ArrowUpRight } from 'lucide-react';
import { fetchRoomTypes, fetchAttractions } from '../services/api';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [attractions, setAttractions] = useState<any[]>([]);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [numGuests, setNumGuests] = useState(2);

  useEffect(() => {
    // Default checkIn tomorrow, checkOut day after
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    setCheckIn(tomorrow.toISOString().split('T')[0]);
    setCheckOut(dayAfter.toISOString().split('T')[0]);

    fetchRoomTypes().then(res => {
      if (res.success) setRoomTypes(res.data);
    }).catch(err => console.error(err));

    fetchAttractions().then(res => {
      if (res.success) setAttractions(res.data);
    }).catch(err => console.error(err));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/rooms?checkIn=${checkIn}&checkOut=${checkOut}&guests=${numGuests}`);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333]">
      
      {/* 1. HERO SECTION - Editorial Luxury */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-12 pb-20">
        {/* Background Image & Architectural Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1920&q=80"
            alt="Hotel Raama Luxury Suite"
            className="w-full h-full object-cover brightness-[0.35]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1849] via-[#0B1849]/50 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center text-[#f7f7f2] space-y-8 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f7f7f2]/10 border border-[#f7f7f2]/20 text-[#d9b57d] text-[10px] font-sans font-semibold uppercase tracking-[0.2em]">
              <Star size={12} className="fill-[#FFDE74] text-[#d9b57d]" /> Hotel Raama · Hassan
            </span>
            
            <h1 className="editorial-hero-title text-[#f7f7f2] uppercase tracking-tight">
              A Quiet Place <br />
              <span className="italic font-light text-[#d9b57d]">To Slow Down.</span>
            </h1>
            
            <p className="font-sans text-[#f7f7f2]/80 text-sm sm:text-base max-w-xl mx-auto font-normal leading-relaxed">
              Refined accommodations, culinary artistry at Swaad & Liquid Lounge, and contactless hospitality in the heart of Hassan.
            </p>
          </motion.div>

          {/* FLOATING AVAILABILITY SEARCH BAR */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#f7f7f2] text-[#333333] p-6 sm:p-8 rounded-sm border border-[#cbc0ad] shadow-2xl max-w-4xl mx-auto text-left"
          >
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#0B1849]/80 mb-2 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#333333]" /> Check-In
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] rounded-sm px-3.5 py-2.5 text-xs font-sans font-medium focus:border-[#cbc0ad] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#0B1849]/80 mb-2 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#333333]" /> Check-Out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] rounded-sm px-3.5 py-2.5 text-xs font-sans font-medium focus:border-[#cbc0ad] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#0B1849]/80 mb-2 flex items-center gap-1.5">
                  <Users size={13} className="text-[#333333]" /> Guests
                </label>
                <select
                  value={numGuests}
                  onChange={(e) => setNumGuests(parseInt(e.target.value))}
                  className="w-full bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] rounded-sm px-3.5 py-2.5 text-xs font-sans font-medium focus:border-[#cbc0ad] focus:outline-none"
                >
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests</option>
                  <option value={3}>3 Guests</option>
                  <option value={4}>4 Guests / Family</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-sm bg-[#47614d] text-[#f7f7f2] font-sans font-semibold text-xs uppercase tracking-wider hover:bg-[#374c3c] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Check Availability <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </motion.div>

        </div>
      </section>

      {/* 2. ROOM SHOWCASE - Architectural Editorial */}
      <section className="py-24 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-[#cbc0ad] pb-8">
          <div>
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-2">Accommodations</span>
            <h2 className="editorial-section-title text-[#333333]">Rooms & Executive Suites</h2>
          </div>
          <Link
            to="/rooms"
            className="mt-4 md:mt-0 text-xs font-sans font-bold uppercase tracking-wider text-[#333333] hover:text-[#666666] flex items-center gap-1.5 transition-colors"
          >
            View All Rates <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {roomTypes.slice(0, 3).map((room) => (
            <div
              key={room._id}
              className="bg-[#f7f7f2] rounded-sm overflow-hidden border border-[#cbc0ad] shadow-sm group hover:border-[#cbc0ad] transition-all duration-300 flex flex-col"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={room.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'}
                  alt={room.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute top-4 right-4 bg-[#47614d] px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-[#d9b57d]">
                  {room.isAc ? 'A/C Executive' : 'Non-A/C Premium'}
                </div>
              </div>

              <div className="p-7 flex-1 flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-2xl font-serif text-[#333333] group-hover:text-[#666666] transition-colors">
                    {room.name}
                  </h3>
                  <p className="text-xs font-sans text-[#666666] mt-2 line-clamp-2 leading-relaxed">{room.description}</p>
                </div>

                <div className="pt-5 border-t border-[#cbc0ad] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-sans text-[#666666] uppercase block tracking-wider">Starting Rate</span>
                    <span className="text-2xl font-serif font-bold text-[#333333]">₹{room.basePrice}</span>
                    <span className="text-[10px] font-sans text-[#666666]"> / night</span>
                  </div>

                  <Link
                    to={`/rooms?select=${room._id}`}
                    className="px-4 py-2.5 rounded-sm bg-[#47614d] text-[#f7f7f2] text-xs font-sans font-semibold uppercase tracking-wider hover:bg-[#374c3c] transition-all"
                  >
                    Reserve Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. DINING & LOUNGE SPOTLIGHT - Midnight Navy Dark Section */}
      <section className="py-24 bg-[#47614d] text-[#f7f7f2] border-y border-[#f7f7f2]/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-[0.2em]">Culinary Artistry</span>
            <h2 className="editorial-section-title text-[#f7f7f2] mt-2">Swaad & Liquid Lounge</h2>
            <p className="font-sans text-[#f7f7f2]/75 mt-4 text-xs sm:text-sm leading-relaxed">
              Authentic South Indian vegetarian dining or executive whiskies & handcrafted cocktails. Served in ambience or directly to your room.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Swaad Card */}
            <div className="relative rounded-sm overflow-hidden border border-[#f7f7f2]/15 group">
              <img
                src="https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=1000&q=80"
                alt="Swaad Restaurant"
                className="w-full h-88 object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1849] via-[#0B1849]/60 to-transparent p-8 flex flex-col justify-end">
                <div className="flex items-center gap-2 text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-wider mb-2">
                  <Utensils size={14} /> Pure Vegetarian Delicacies
                </div>
                <h3 className="text-3xl font-serif text-[#f7f7f2]">Swaad Pure Veg Restaurant</h3>
                <p className="text-xs font-sans text-[#f7f7f2]/80 mt-2 leading-relaxed max-w-md">
                  Crispy Masala Dosas, North Indian Curries, Tandoori Baskets, and traditional South & North Indian Thalis.
                </p>
                <div className="mt-5">
                  <Link to="/dining" className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#d9b57d] hover:text-[#f7f7f2] transition-colors">
                    Explore Pure Veg Menu <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Liquid Lounge Card */}
            <div className="relative rounded-sm overflow-hidden border border-[#f7f7f2]/15 group">
              <img
                src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=80"
                alt="Liquid Lounge Bar"
                className="w-full h-88 object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1849] via-[#0B1849]/60 to-transparent p-8 flex flex-col justify-end">
                <div className="flex items-center gap-2 text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-wider mb-2">
                  <GlassWater size={14} /> Executive Lounge Bar
                </div>
                <h3 className="text-3xl font-serif text-[#f7f7f2]">Liquid Lounge Bar (LLB)</h3>
                <p className="text-xs font-sans text-[#f7f7f2]/80 mt-2 leading-relaxed max-w-md">
                  Curated whiskies, single malts, draught beers, and handcrafted cocktails in an executive setting.
                </p>
                <div className="mt-5">
                  <Link to="/dining" className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#d9b57d] hover:text-[#f7f7f2] transition-colors">
                    Explore Bar Menu <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3.5 QR ORDERING SPOTLIGHT BANNER */}
      <section className="py-20 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="bg-[#f7f7f2] p-10 sm:p-14 rounded-sm border border-[#cbc0ad] shadow-md flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4 max-w-2xl">
            <span className="px-3.5 py-1 rounded-full bg-[#0B1849]/10 border border-[#cbc0ad] text-[#333333] text-[10px] font-sans font-bold uppercase tracking-widest">
              📲 Contactless Room & Table Service
            </span>
            <h2 className="editorial-section-title text-[#333333]">
              Instant Ordering via QR Code
            </h2>
            <p className="font-sans text-xs sm:text-sm text-[#666666] leading-relaxed">
              We feature <strong className="text-[#333333]">40 unique static QR codes for Rooms 1 through 40</strong> plus <strong className="text-[#333333]">1 dedicated QR code for Sambhrama Party Hall</strong>. Scan or open your room's QR code to order Swaad Pure Veg meals, Non-Veg delicacies, and Liquid Lounge drinks straight to your room!
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link
              to="/dining"
              className="px-8 py-4 rounded-sm bg-[#47614d] text-[#f7f7f2] font-sans font-semibold text-xs uppercase tracking-wider hover:bg-[#374c3c] transition-all text-center flex items-center justify-center gap-2 shadow-sm"
            >
              Explore Dining & Bar Menu <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. SAMBHRAMA PARTY HALL & ATTRACTIONS */}
      <section className="py-24 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          {/* Left Column: Sambhrama */}
          <div className="lg:col-span-1 bg-[#47614d] p-8 rounded-sm text-[#f7f7f2] space-y-6">
            <div className="w-10 h-10 rounded-full bg-[#d9b57d] flex items-center justify-center text-[#333333]">
              <PartyPopper size={20} />
            </div>
            <div>
              <span className="text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-widest">Banquets & Events</span>
              <h3 className="text-3xl font-serif text-[#f7f7f2] mt-1">Sambhrama Party Hall</h3>
            </div>
            <p className="text-xs font-sans text-[#f7f7f2]/80 leading-relaxed">
              Host grand weddings, corporate banquets, and celebrations. Custom vegetarian & non-veg catering packages starting at ₹450 / pax + GST.
            </p>
            <Link
              to="/party-hall"
              className="inline-flex items-center gap-2 w-full justify-center py-3.5 rounded-sm bg-[#f7f7f2] text-[#333333] font-sans font-bold text-xs uppercase tracking-wider hover:bg-[#d9b57d] transition-all"
            >
              View Party Packages
            </Link>
          </div>

          {/* Right Column: Hassan Sightseeing */}
          <div className="lg:col-span-2 space-y-8">
            <div className="border-b border-[#cbc0ad] pb-4">
              <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-1">Explore Hassan</span>
              <h2 className="editorial-section-title text-[#333333]">Nearby Heritage Sightseeing</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {attractions.slice(0, 4).map((attraction) => (
                <div key={attraction._id} className="p-5 rounded-sm bg-[#f7f7f2] border border-[#cbc0ad] flex gap-4 items-center">
                  <img
                    src={attraction.image}
                    alt={attraction.name}
                    className="w-20 h-20 rounded-sm object-cover shrink-0"
                  />
                  <div>
                    <span className="text-[9px] font-sans text-[#666666] font-bold uppercase tracking-wider">{attraction.distance} away</span>
                    <h4 className="text-sm font-serif font-bold text-[#333333] line-clamp-1">{attraction.name}</h4>
                    <p className="text-xs font-sans text-[#666666] mt-1 line-clamp-2 leading-relaxed">{attraction.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-right">
              <Link to="/attractions" className="text-xs font-sans font-bold uppercase tracking-wider text-[#333333] hover:text-[#666666] inline-flex items-center gap-1.5">
                Explore All Sightseeing Spots <ArrowRight size={14} />
              </Link>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
