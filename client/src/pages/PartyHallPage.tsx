import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, BookOpen, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchPartyPackages } from '../services/api';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '../components/ScrollReveal';
import { SEO } from '../components/SEO';

export const PartyHallPage: React.FC = () => {
  const [packages, setPackages] = useState<any[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPageIndex, setViewerPageIndex] = useState(0);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const isTransitioningRef = useRef(false);
  const [hasTransition, setHasTransition] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sambhrama has 16 brochure pages
  const brochurePages = Array.from({ length: 16 }, (_, i) => `/party_hall_images/page-${String(i + 1).padStart(2, '0')}.png`);

  const galleryImages = [
    '/party_hall_images/sambhrama-banquet-entrance.png',
    '/party_hall_images/sambhrama-grand-hall-view.png',
    '/party_hall_images/sambhrama-hall-setup.png',
  ];

  // Extended slides for seamless infinite loop: [last, ...original, first]
  const extendedSlides = [
    galleryImages[galleryImages.length - 1],
    ...galleryImages,
    galleryImages[0],
  ];

  // Starts at real index 0 (which corresponds to index 1 in extendedSlides)
  const [slideIndex, setSlideIndex] = useState(1);

  // Preload all gallery images immediately on mount so they are cached in GPU memory
  useEffect(() => {
    galleryImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const nextSlide = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setHasTransition(true);
    setSlideIndex((prev) => prev + 1);
  }, []);

  const prevSlide = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setHasTransition(true);
    setSlideIndex((prev) => prev - 1);
  }, []);

  const goToSlide = (idx: number) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setHasTransition(true);
    setSlideIndex(idx + 1);
  };

  const restartTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 3500);
  }, [nextSlide]);

  const handleUserNext = () => {
    nextSlide();
    restartTimer();
  };

  const handleUserPrev = () => {
    prevSlide();
    restartTimer();
  };

  const handleUserGoTo = (idx: number) => {
    goToSlide(idx);
    restartTimer();
  };

  const handleTransitionEnd = () => {
    isTransitioningRef.current = false;
    if (slideIndex >= extendedSlides.length - 1) {
      setHasTransition(false);
      setSlideIndex(1);
    } else if (slideIndex <= 0) {
      setHasTransition(false);
      setSlideIndex(galleryImages.length);
    }
  };

  // Re-enable smooth transition after instant silent reset
  useEffect(() => {
    if (!hasTransition) {
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          setHasTransition(true);
        });
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    }
  }, [hasTransition]);

  // Continuous auto slideshow timer (slides every 3.5 seconds unconditionally)
  useEffect(() => {
    restartTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restartTimer]);

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
      handleUserNext();
    } else if (distance < -minSwipeDistance) {
      handleUserPrev();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Active dot indicator (maps extended index back to 0..galleryImages.length-1)
  const activeDotIndex =
    slideIndex === 0
      ? galleryImages.length - 1
      : slideIndex >= extendedSlides.length - 1
        ? 0
        : slideIndex - 1;

  useEffect(() => {
    fetchPartyPackages().then((res) => {
      if (res.success) setPackages(res.data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F0DF] text-[#00174A] py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20 relative">
      <SEO
        title="Party Hall in Hassan | Sambhrama Banquet Hall | Hotel Raama"
        description="Discover Sambhrama Banquet Hall at Hotel Raama in Hassan, with space for 300+ guests, climate control, audio-visual setups and catering packages."
        canonical="/party-hall"
      />
      {/* Hero Header */}
      <div className="relative rounded-sm overflow-hidden min-h-[440px] sm:min-h-[500px] py-14 sm:py-20 px-6 sm:px-10 flex flex-col items-center justify-center text-center border border-[#10184A]/15 shadow-md">
        <img
          src="/sambhrama-party-hall.png"
          alt="Sambhrama Banquet Hall"
          className="absolute inset-0 w-full h-full object-cover brightness-[0.70]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/45 pointer-events-none" />
        <div className="relative z-10 max-w-3xl flex flex-col items-center justify-center space-y-4 sm:space-y-6 text-[#FAF9F6]">
          <h1 className="editorial-hero-title text-[#FAF9F6] uppercase drop-shadow-md">Sambhrama Banquet Hall</h1>
          <p className="font-sans text-xs sm:text-sm text-[#FAF9F6]/95 max-w-xl mx-auto leading-relaxed drop-shadow-sm px-2">
            Accommodating 300+ guests with central climate control, audio-visual setups, and custom traditional catering.
          </p>

          <div className="flex justify-center pt-4 sm:pt-6">
            <button
              onClick={() => {
                setViewerPageIndex(0);
                setViewerOpen(true);
              }}
              className="px-6 sm:px-8 py-3.5 sm:py-4 bg-[#D6B369] text-[#00174A] font-sans font-bold text-xs uppercase tracking-wider rounded-sm flex items-center gap-2 hover:bg-[#E8C56A] transition-all cursor-pointer shadow-lg active:scale-98"
            >
              <BookOpen size={16} /> Browse Layout & Catering Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Package Cards */}
      <div>
        <ScrollReveal direction="up" duration={0.8}>
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 border-b border-[#10184A]/15 pb-8">
            <h2 className="editorial-section-title text-[#00174A]">Veg and Non Veg Catering Packages</h2>
            <p className="font-sans text-xs sm:text-sm text-[#667085] mt-2">
              Tailor-made menus from Swaad Restaurant for weddings, engagements, birthdays, and corporate galas.
            </p>
          </div>
        </ScrollReveal>

        <ScrollRevealGroup staggerDelay={0.15} className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {packages.map((pkg) => (
            <ScrollRevealItem key={pkg._id}>
              <div
                className="bg-[#F7F0DF] text-[#00174A] p-6 sm:p-8 rounded-sm border border-[#10184A]/25 hover:border-[#D6B369] transition-all duration-300 flex flex-col justify-between space-y-6 shadow-sm h-full"
              >
                <div className="space-y-3">
                  <h3 className="text-2xl font-serif font-bold text-[#00174A]">{pkg.name}</h3>
                  <p className="text-xs font-sans text-[#10184A]/80 leading-relaxed">{pkg.description}</p>
                </div>

                <div className="pt-6 border-t border-[#10184A]/15 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-sans text-[#00174A]/70 uppercase block tracking-wider font-semibold">
                      Rate Per Pax
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#00174A]">₹{pkg.price}</span>
                    <span className="text-[10px] font-sans text-[#00174A]/70 font-semibold"> + GST</span>
                  </div>

                  <a
                    href={`https://wa.me/917899511330?text=Hi%20Hotel%20Raama,%20I%20am%20interested%20in%20the%20Sambhrama%20Banquet%20Hall%20${pkg.name}%20Package.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-[#D6B369] hover:bg-[#E8C56A] text-[#00174A] font-sans font-bold text-xs uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <MessageSquare size={13} /> Enquiry
                  </a>
                </div>
              </div>
            </ScrollRevealItem>
          ))}
        </ScrollRevealGroup>
      </div>

      {/* Pure Image Slideshow Section */}
      <ScrollReveal direction="up" duration={0.85} className="space-y-6">
        <div className="text-center max-w-2xl mx-auto border-b border-[#10184A]/15 pb-6">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#667085] block mb-1">
            Venue Showcase
          </span>
          <h2 className="editorial-section-title text-[#00174A]">Sambhrama Banquet Gallery</h2>
        </div>

        {/* Clean Slideshow Container */}
        <div
          className="relative rounded-sm overflow-hidden border border-[#10184A]/15 shadow-lg bg-stone-950 select-none group"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative h-[250px] sm:h-[380px] md:h-[480px] lg:h-[540px] w-full overflow-hidden bg-stone-950">
            {/* Smooth Sliding Hardware-Accelerated Track */}
            <div
              className="flex w-full h-full will-change-transform"
              style={{
                transform: `translate3d(-${slideIndex * 100}%, 0, 0)`,
                transition: hasTransition
                  ? 'transform 750ms cubic-bezier(0.25, 1, 0.5, 1)'
                  : 'none',
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {extendedSlides.map((imgSrc, idx) => (
                <div
                  key={idx}
                  className="w-full h-full flex-shrink-0 relative overflow-hidden bg-stone-900"
                >
                  <img
                    src={imgSrc}
                    alt={`Sambhrama Banquet Photo ${(idx % galleryImages.length) + 1}`}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              ))}
            </div>

            {/* Left Navigation Arrow */}
            <button
              onClick={handleUserPrev}
              aria-label="Previous Photo"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-[#00174A] text-white transition-all cursor-pointer shadow-md active:scale-95 z-10 hover:scale-105"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Right Navigation Arrow */}
            <button
              onClick={handleUserNext}
              aria-label="Next Photo"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-[#00174A] text-white transition-all cursor-pointer shadow-md active:scale-95 z-10 hover:scale-105"
            >
              <ChevronRight size={22} />
            </button>

            {/* Minimal Dot Indicators */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-2 pointer-events-auto z-10">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleUserGoTo(idx)}
                  aria-label={`Go to photo ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${activeDotIndex === idx
                      ? 'w-8 h-2 bg-[#D6B369]'
                      : 'w-2 h-2 bg-white/60 hover:bg-white'
                    }`}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Sambhrama Brochure Viewer Modal */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 text-[#FAF9F6]">
          {/* Viewer Header */}
          <div className="flex justify-between items-center pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base sm:text-lg font-serif text-[#D6B369]">Sambhrama Banquet Hall Catalog</h3>
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
              className="absolute left-2 z-10 p-2.5 sm:p-3 rounded-full bg-[#00174A] border border-white/20 text-white disabled:opacity-30 hover:bg-[#D6B369] hover:text-[#00174A] transition-all cursor-pointer"
            >
              <ChevronLeft size={22} />
            </button>

            <img
              src={brochurePages[viewerPageIndex]}
              alt={`Brochure Page ${viewerPageIndex + 1}`}
              className="max-w-full max-h-[65vh] sm:max-h-[70vh] object-contain rounded-sm shadow-2xl border border-white/10 bg-[#00174A]"
            />

            <button
              onClick={() => setViewerPageIndex((prev) => Math.min(brochurePages.length - 1, prev + 1))}
              disabled={viewerPageIndex === brochurePages.length - 1}
              className="absolute right-2 z-10 p-2.5 sm:p-3 rounded-full bg-[#00174A] border border-white/20 text-white disabled:opacity-30 hover:bg-[#D6B369] hover:text-[#00174A] transition-all cursor-pointer"
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
                className={`w-7 sm:w-8 h-7 sm:h-8 rounded-sm text-xs font-sans font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 ${viewerPageIndex === idx
                    ? 'bg-[#D6B369] text-[#00174A]'
                    : 'bg-[#00174A] text-white/60 border border-white/10 hover:text-white'
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
