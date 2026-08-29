import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, ArrowRight, ArrowUpRight } from 'lucide-react';
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
      
      {/* 1. HERO SECTION - Editorial Luxury Full Bleed */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 pb-20">
        {/* Background Video & Architectural Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover brightness-[0.70] contrast-[1.05]"
            poster="https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1920&q=80"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
            <source src="/hero-video.webm" type="video/webm" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/15" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center text-[#f7f7f2] space-y-8 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f7f7f2]/10 border border-[#f7f7f2]/20 text-[#d9b57d] text-[10px] font-sans font-semibold uppercase tracking-[0.2em]">
              Hotel Raama · Hassan
            </span>
            
            <h1 className="editorial-hero-title text-[#f7f7f2] uppercase tracking-tight">
              A Quiet Place <br />
              <span className="italic font-light text-[#d9b57d]">To Slow Down.</span>
            </h1>
            
            <p className="font-sans text-[#f7f7f2]/80 text-sm sm:text-base max-w-xl mx-auto font-normal leading-relaxed">
              Refined accommodations, culinary artistry at Swaad & Liquid Lounge, and contactless hospitality in the heart of Hassan.
            </p>
          </motion.div>

          {/* FLOATING AVAILABILITY SEARCH BAR - Reduced Blur Transparent Card */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-black/20 backdrop-blur-xs text-[#f7f7f2] p-6 sm:p-8 rounded-xl border border-white/15 shadow-xl max-w-4xl mx-auto text-left"
          >
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6 items-end">
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#d9b57d] mb-2 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#d9b57d]" /> Check-In
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] rounded-lg px-3.5 py-2.5 text-xs font-sans font-semibold focus:ring-2 focus:ring-[#d9b57d] focus:outline-none shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#d9b57d] mb-2 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#d9b57d]" /> Check-Out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] rounded-lg px-3.5 py-2.5 text-xs font-sans font-semibold focus:ring-2 focus:ring-[#d9b57d] focus:outline-none shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[#d9b57d] mb-2 flex items-center gap-1.5">
                  <Users size={13} className="text-[#d9b57d]" /> Guests
                </label>
                <select
                  value={numGuests}
                  onChange={(e) => setNumGuests(parseInt(e.target.value))}
                  className="w-full bg-[#f7f7f2] text-[#333333] border border-[#cbc0ad] rounded-lg px-3.5 py-2.5 text-xs font-sans font-semibold focus:ring-2 focus:ring-[#d9b57d] focus:outline-none shadow-xs"
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
                  className="w-full py-3 rounded-lg bg-[#47614d] text-[#f7f7f2] font-sans font-bold text-xs uppercase tracking-wider hover:bg-[#374c3c] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
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
            <h2 className="editorial-section-title text-[#f7f7f2] mt-2">Swaad, Hotel Raama & Liquid Lounge</h2>
            <p className="font-sans text-[#f7f7f2]/75 mt-4 text-xs sm:text-sm leading-relaxed">
              Authentic South Indian vegetarian dining, signature non-veg delicacies, and executive whiskies & handcrafted cocktails. Served in ambience or directly to your room.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 1. Swaad Card */}
            <div className="relative rounded-sm overflow-hidden border border-[#f7f7f2]/15 group flex flex-col justify-end min-h-[380px]">
              <img
                src="/swaad-restaurant.png"
                alt="Swaad Restaurant"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-6 sm:p-7 flex flex-col justify-end">
                <h3 className="text-2xl font-serif text-[#f7f7f2]">Swaad Pure Veg</h3>
                <p className="text-xs font-sans text-[#f7f7f2]/80 mt-2 leading-relaxed">
                  Crispy Masala Dosas, North Indian Curries, Tandoori Baskets, and traditional South & North Indian Thalis.
                </p>
                <div className="mt-5">
                  <Link to="/dining?tab=SWAAD_VEG" className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#d9b57d] hover:text-[#f7f7f2] transition-colors">
                    Explore Pure Veg Menu <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* 2. Hotel Raama Non-Veg Card */}
            <div className="relative rounded-sm overflow-hidden border border-[#f7f7f2]/15 group flex flex-col justify-end min-h-[380px]">
              <img
                src="/hotel-raama-dining.jpg"
                alt="Hotel Raama Non-Veg Dining"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-6 sm:p-7 flex flex-col justify-end">
                <h3 className="text-2xl font-serif text-[#f7f7f2]">Hotel Raama (Non-Veg)</h3>
                <p className="text-xs font-sans text-[#f7f7f2]/80 mt-2 leading-relaxed">
                  Signature Mutton Chops, Nati Koli Biriyani, Coastal Seafood fry, Chicken Sukka, and aromatic Tandoori kebabs.
                </p>
                <div className="mt-5">
                  <Link to="/dining?tab=HOTEL_RAAMA" className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#d9b57d] hover:text-[#f7f7f2] transition-colors">
                    Explore Non-Veg Menu <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* 3. Liquid Lounge Card */}
            <div className="relative rounded-sm overflow-hidden border border-[#f7f7f2]/15 group flex flex-col justify-end min-h-[380px] md:col-span-2 lg:col-span-1">
              <img
                src="/liquid-lounge-bar.png"
                alt="Liquid Lounge Bar"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-6 sm:p-7 flex flex-col justify-end">
                <h3 className="text-2xl font-serif text-[#f7f7f2]">Liquid Lounge Bar (LLB)</h3>
                <p className="text-xs font-sans text-[#f7f7f2]/80 mt-2 leading-relaxed">
                  Curated whiskies, single malts, draught beers, and handcrafted cocktails in an executive setting.
                </p>
                <div className="mt-5">
                  <Link to="/dining?tab=LIQUID_LOUNGE" className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#d9b57d] hover:text-[#f7f7f2] transition-colors">
                    Explore Bar Menu <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 3.5 TRIPADVISOR REVIEWS SPOTLIGHT */}
      <section className="py-16 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="bg-[#f7f7f2] p-8 sm:p-12 rounded-sm border border-[#cbc0ad] shadow-md flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          
          {/* Left: Ratings Badge matching TripAdvisor widget */}
          <div className="flex items-center gap-6 shrink-0 w-full lg:w-auto justify-center">
            <div className="bg-white px-8 py-6 rounded-2xl border border-[#cbc0ad]/40 shadow-sm flex flex-col items-center justify-center text-center min-w-[210px]">
              <div className="flex items-center gap-2 mb-1.5">
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#00aa6c">
                  <path d="M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 0 0 4.04 10.43 5.976 5.976 0 0 0 4.075-1.6L12 19.705l1.922-2.09a5.972 5.972 0 0 0 4.072 1.598 6 6 0 0 0 6-5.998 5.982 5.982 0 0 0-1.957-4.432L24 6.648h-4.35a13.573 13.573 0 0 0-7.644-2.353zM12 6.255c1.545 0 3.03.35 4.37.99a5.992 5.992 0 0 0-3.666 4.542 5.988 5.988 0 0 0-1.408-.167c-.49 0-.964.06-1.418.17A5.99 5.99 0 0 0 6.21 7.247c1.34-.64 2.827-.992 4.372-.992h1.424zm-6.004 5.34a3.84 3.84 0 1 1 0 7.68 3.84 3.84 0 0 1 0-7.68zm12.008 0a3.84 3.84 0 1 1 0 7.68 3.84 3.84 0 0 1 0-7.68zM5.996 13.78a1.69 1.69 0 1 0 0 3.38 1.69 1.69 0 0 0 0-3.38zm12.008 0a1.69 1.69 0 1 0 0 3.38 1.69 1.69 0 0 0 0-3.38z" />
                </svg>
                <span className="text-sm font-sans font-bold tracking-tight text-[#004f32]">Tripadvisor</span>
              </div>
              <div className="text-4xl sm:text-5xl font-sans font-extrabold text-[#004f32] tracking-tight">
                4.3
              </div>
              <div className="text-base font-sans font-bold text-[#004f32] mt-0.5">
                Very Good
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#00aa6c] inline-block shrink-0" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#00aa6c] inline-block shrink-0" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#00aa6c] inline-block shrink-0" />
                <span className="w-3.5 h-3.5 rounded-full bg-[#00aa6c] inline-block shrink-0" />
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#00aa6c] relative overflow-hidden inline-block shrink-0">
                  <span className="absolute top-0 left-0 bottom-0 w-1/2 bg-[#00aa6c]" />
                </span>
                <span className="text-xs font-sans font-semibold text-[#004f32] ml-1">(171)</span>
              </div>
            </div>
          </div>

          {/* Middle: Content */}
          <div className="space-y-3 max-w-2xl flex-grow text-center lg:text-left">
            <h2 className="editorial-section-title text-[#333333]">
              Reviews
            </h2>
            <p className="font-sans text-xs sm:text-sm text-[#666666] leading-relaxed">
              Consistently rated <strong className="text-[#333333]">Very Good (4.3 / 5)</strong> across 170+ verified guest reviews on TripAdvisor. Discover why travelers choose Hotel Raama for premium hospitality, spotless rooms, and central convenience in Hassan.
            </p>
          </div>

          {/* Right: Redirect CTA Button */}
          <div className="shrink-0 w-full lg:w-auto text-center">
            <a
              href="https://www.tripadvisor.in/Hotel_Review-g503696-d8507683-Reviews-Hotel_Raama-Hassan_Hassan_District_Karnataka.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-sm bg-[#47614d] hover:bg-[#374c3c] text-[#f7f7f2] font-sans font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>View Reviews on TripAdvisor</span>
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* 4. SAMBHRAMA PARTY HALL & ATTRACTIONS */}
      <section className="py-24 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          {/* Left Column: Sambhrama */}
          <div className="lg:col-span-1 relative rounded-sm overflow-hidden p-8 text-[#f7f7f2] space-y-6 border border-[#cbc0ad] shadow-md group">
            <img
              src="/sambhrama-party-hall.png"
              alt="Sambhrama Party Hall"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-[0.65]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30 pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div>
                <span className="text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-widest drop-shadow-sm">Banquets & Events</span>
                <h3 className="text-3xl font-serif text-[#f7f7f2] mt-1 drop-shadow-md">Sambhrama Party Hall</h3>
              </div>
              <p className="text-xs font-sans text-[#f7f7f2]/95 leading-relaxed drop-shadow-sm">
                Host grand weddings, corporate banquets, and celebrations. Custom vegetarian & non-veg catering packages starting at ₹450 / pax + GST.
              </p>
              <Link
                to="/party-hall"
                className="inline-flex items-center gap-2 w-full justify-center py-3.5 rounded-sm bg-[#f7f7f2] text-[#333333] font-sans font-bold text-xs uppercase tracking-wider hover:bg-[#d9b57d] transition-all cursor-pointer shadow-lg"
              >
                View Party Packages
              </Link>
            </div>
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
