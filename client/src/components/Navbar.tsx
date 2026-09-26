import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, X, Calendar } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  shortName: string;
  midName?: string;
}

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide public navbar on admin screens
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const navLinks: NavItem[] = [
    { name: 'Home', shortName: 'Home', path: '/' },
    { name: 'Rooms & Rates', shortName: 'Rooms', path: '/rooms' },
    { name: 'Restaurant & Menu', shortName: 'Dining', midName: 'Dining & Menu', path: '/dining' },
    { name: 'Sambhrama Banquet Hall', shortName: 'Banquet', midName: 'Banquet Hall', path: '/party-hall' },
    { name: 'Things to Do', shortName: 'Attractions', midName: 'Things to Do', path: '/attractions' },
    { name: 'Location & Directions', shortName: 'Location', midName: 'Location', path: '/location' },
    { name: 'My Bookings & Orders', shortName: 'Bookings', midName: 'My Bookings', path: '/my-bookings-orders' },
  ];

  const renderDesktopLabel = (link: NavItem) => {
    if (link.midName) {
      return (
        <>
          <span className="hidden 2xl:inline">{link.name}</span>
          <span className="hidden xl:inline 2xl:hidden">{link.midName}</span>
          <span className="inline xl:hidden">{link.shortName}</span>
        </>
      );
    }
    if (link.shortName !== link.name) {
      return (
        <>
          <span className="hidden xl:inline">{link.name}</span>
          <span className="inline xl:hidden">{link.shortName}</span>
        </>
      );
    }
    return <span>{link.name}</span>;
  };

  // Header dynamic classes based on route & scroll position
  const isTransparent = isHomePage && !isScrolled && !mobileMenuOpen;

  const headerClass = isHomePage
    ? `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isTransparent
          ? 'bg-gradient-to-b from-black/80 via-black/40 to-transparent border-b border-white/10'
          : 'bg-[#00174A] backdrop-blur-md border-b border-[#10184A] shadow-lg'
      }`
    : 'sticky top-0 z-50 bg-[#00174A] border-b border-[#10184A] shadow-md transition-all duration-300';

  return (
    <header className={headerClass}>
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-20 gap-2 xl:gap-4 min-w-0">
          
          {/* Logo & Hotel Brand */}
          <Link
            to="/"
            className="flex items-center shrink-0 py-1 mr-1 sm:mr-2 xl:mr-4 group focus:outline-hidden"
            aria-label="Hotel Raama - Return to Homepage"
          >
            <img
              src="/hotel-raama-logo.png"
              alt="Hotel Raama - Hassan"
              className="h-10 sm:h-12 lg:h-11 xl:h-13 w-auto object-contain rounded-lg shadow-xs group-hover:opacity-90 transition-all duration-300 shrink-0"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center justify-center gap-0.5 xl:gap-1.5 2xl:gap-2 shrink min-w-0">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-[10px] xl:text-[11px] font-semibold uppercase tracking-[0.5px] xl:tracking-[1px] 2xl:tracking-[1.4px] px-2 lg:px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-full transition-all duration-300 whitespace-nowrap shrink-0 ${
                    isActive
                      ? isTransparent
                        ? 'bg-white/25 text-white font-bold shadow-sm backdrop-blur-xs'
                        : 'bg-black/25 text-[#D6B369] font-bold border border-[#D6B369]/30 shadow-xs'
                      : isTransparent
                      ? 'text-white/90 hover:text-white hover:bg-white/15'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {renderDesktopLabel(link)}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center ml-1 sm:ml-2 xl:ml-3 shrink-0">
            <Link
              to="/rooms"
              className="px-3 xl:px-4 py-2 xl:py-2.5 rounded-full bg-[#D6B369] text-[#00174A] font-bold text-[11px] xl:text-xs uppercase tracking-[0.8px] xl:tracking-[1.4px] hover:bg-[#E8C56A] transition-all duration-300 inline-flex items-center justify-center gap-1.5 xl:gap-2 whitespace-nowrap shrink-0 shadow-sm focus-design"
            >
              <Calendar size={13} className="shrink-0" />
              <span>Book Now</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-white hover:bg-white/15 rounded-full transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation Drawer - Unified Brand Navy Theme */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#00174A] border-b border-[#10184A] px-6 pt-3 pb-8 space-y-2 shadow-2xl">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-full text-xs uppercase tracking-[1.6px] font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#D6B369] text-[#00174A] font-bold shadow-xs' 
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="pt-4 flex flex-col gap-3 border-t border-white/20">
            <Link
              to="/rooms"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-full bg-[#D6B369] text-[#00174A] font-bold text-xs uppercase tracking-[1.6px] hover:bg-[#E8C56A] shadow-sm transition-colors"
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
