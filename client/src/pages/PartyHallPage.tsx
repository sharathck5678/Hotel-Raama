import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, BookOpen, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchPartyPackages } from '../services/api';

export const PartyHallPage: React.FC = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPageIndex, setViewerPageIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Sambhrama has 16 brochure pages
  const brochurePages = Array.from({ length: 16 }, (_, i) => `/party_hall_images/page-${String(i + 1).padStart(2, '0')}.png`);

  const galleryImages = [
    '/party_hall_images/sambhrama-banquet-entrance.png',
    '/party_hall_images/sambhrama-grand-hall-view.png',
    '/party_hall_images/sambhrama-birthday-celebration.jpg',
    '/party_hall_images/sambhrama-hall-setup.png',
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);

  // Auto-play timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [galleryImages.length]);

  // Touch Swipe handlers for mobile
  const minSwipeDistance = 40;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
  };

  useEffect(() => {
    fetchPartyPackages().then((res) => {
      if (res.success) setPackages(res.data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20 relative">
      {/* Hero Header */}
      <div className="relative rounded-sm overflow-hidden h-[50vh] sm:h-[55vh] flex items-center justify-center text-center p-6 sm:p-8 border border-[#cbc0ad] shadow-md">
        <img
          src="/sambhrama-party-hall.png"
          alt="Sambhrama Party Hall"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.70]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/40 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-5 sm:space-y-6 text-[#f7f7f2]">
          <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-[#f7f7f2]/20 text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-[0.2em] shadow-sm">
            Grand Celebrations & Banquets
          </span>
          <h1 className="editorial-hero-title text-[#f7f7f2] uppercase drop-shadow-md">Sambhrama Party Hall</h1>
          <p className="font-sans text-xs sm:text-sm text-[#f7f7f2]/95 max-w-xl mx-auto leading-relaxed drop-shadow-sm px-2">
            Accommodating up to 300 guests with central climate control, audio-visual setups, and custom traditional catering.
          </p>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                setViewerPageIndex(0);
                setViewerOpen(true);
              }}
              className="px-5 sm:px-6 py-3 sm:py-3.5 bg-[#f7f7f2] text-[#333333] font-sans font-bold text-xs uppercase tracking-wider rounded-sm flex items-center gap-2 hover:bg-[#d9b57d] transition-all cursor-pointer shadow-md"
            >
              <BookOpen size={15} /> Browse Layout & Catering Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Package Cards */}
      <div>
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 border-b border-[#cbc0ad] pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-1">
            Bespoke Catering & Events
          </span>
          <h2 className="editorial-section-title text-[#333333]">Pure Veg Catering Packages</h2>
          <p className="font-sans text-xs sm:text-sm text-[#666666] mt-2">
            Tailor-made menus from Swaad Restaurant for weddings, engagements, birthdays, and corporate galas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {packages.map((pkg) => (
            <div
              key={pkg._id}
              className="bg-[#47614d] text-[#f7f7f2] p-6 sm:p-8 rounded-sm border border-[#f7f7f2]/15 hover:border-[#d9b57d] transition-all duration-300 flex flex-col justify-between space-y-6 shadow-md"
            >
              <div className="space-y-3">
                <h3 className="text-2xl font-serif text-[#f7f7f2]">{pkg.name}</h3>
                <p className="text-xs font-sans text-[#f7f7f2]/80 leading-relaxed">{pkg.description}</p>
              </div>

              <div className="pt-6 border-t border-[#f7f7f2]/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-sans text-[#f7f7f2]/60 uppercase block tracking-wider">Rate Per Pax</span>
                  <span className="text-2xl font-serif font-bold text-[#d9b57d]">₹{pkg.price}</span>
                  <span className="text-[10px] font-sans text-[#f7f7f2]/60"> + GST</span>
                </div>

                <a
                  href={`https://wa.me/918172257001?text=Hi%20Hotel%20Raama,%20I%20am%20interested%20in%20the%20Sambhrama%20Party%20Hall%20${pkg.name}%20Package.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-[#f7f7f2] hover:bg-[#d9b57d] text-[#333333] font-sans font-bold text-xs uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <MessageSquare size={13} /> Enquiry
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pure Image Slideshow Section */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto border-b border-[#cbc0ad] pb-6">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-1">
            Venue Showcase
          </span>
          <h2 className="editorial-section-title text-[#333333]">Sambhrama Banquet Gallery</h2>
        </div>

        {/* Clean Slideshow Container */}
        <div
          className="relative rounded-sm overflow-hidden border border-[#cbc0ad] shadow-lg bg-stone-950 select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative h-[250px] sm:h-[380px] md:h-[480px] lg:h-[540px] w-full overflow-hidden flex items-center justify-center bg-stone-900">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentSlide}
                src={galleryImages[currentSlide]}
                alt={`Sambhrama Banquet Photo ${currentSlide + 1}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Left Navigation Arrow */}
            <button
              onClick={prevSlide}
              aria-label="Previous Photo"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-[#47614d] text-white transition-all cursor-pointer shadow-md active:scale-95"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Right Navigation Arrow */}
            <button
              onClick={nextSlide}
              aria-label="Next Photo"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-[#47614d] text-white transition-all cursor-pointer shadow-md active:scale-95"
            >
              <ChevronRight size={22} />
            </button>

            {/* Minimal Dot Indicators */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-2 pointer-events-auto">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to photo ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    currentSlide === idx
                      ? 'w-7 h-2 bg-[#d9b57d]'
                      : 'w-2 h-2 bg-white/60 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sambhrama Brochure Viewer Modal */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 text-[#f7f7f2]">
          {/* Viewer Header */}
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base sm:text-lg font-serif text-[#d9b57d]">Sambhrama Party Hall Catalog</h3>
              <p className="text-xs font-sans text-white/70">Page {viewerPageIndex + 1} of {brochurePages.length}</p>
            </div>
            <button
              onClick={() => setViewerOpen(false)}
              className="p-2 rounded-full bg-white/10 text-white/70 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image Showcase */}
          <div className="flex-grow flex items-center justify-center relative overflow-hidden py-4">
            <button
              onClick={() => setViewerPageIndex((prev) => Math.max(0, prev - 1))}
              disabled={viewerPageIndex === 0}
              className="absolute left-2 z-10 p-2.5 sm:p-3 rounded-full bg-[#47614d] border border-[#f7f7f2]/20 text-[#f7f7f2] disabled:opacity-30 hover:bg-[#d9b57d] hover:text-[#333333] transition-all cursor-pointer"
            >
              <ChevronLeft size={22} />
            </button>

            <img
              src={brochurePages[viewerPageIndex]}
              alt={`Brochure Page ${viewerPageIndex + 1}`}
              className="max-w-full max-h-[65vh] sm:max-h-[70vh] object-contain rounded-sm shadow-2xl border border-white/10 bg-[#47614d]"
            />

            <button
              onClick={() => setViewerPageIndex((prev) => Math.min(brochurePages.length - 1, prev + 1))}
              disabled={viewerPageIndex === brochurePages.length - 1}
              className="absolute right-2 z-10 p-2.5 sm:p-3 rounded-full bg-[#47614d] border border-[#f7f7f2]/20 text-[#f7f7f2] disabled:opacity-30 hover:bg-[#d9b57d] hover:text-[#333333] transition-all cursor-pointer"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* Quick Page Picker Bar */}
          <div className="flex justify-center gap-1.5 overflow-x-auto py-3 max-w-3xl mx-auto">
            {brochurePages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setViewerPageIndex(idx)}
                className={`w-7 sm:w-8 h-7 sm:h-8 rounded-sm text-xs font-sans font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  viewerPageIndex === idx
                    ? 'bg-[#d9b57d] text-[#333333]'
                    : 'bg-[#47614d] text-white/60 border border-white/10 hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyHallPage;
