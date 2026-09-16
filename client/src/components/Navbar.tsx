import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, X, Calendar } from 'lucide-react';

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

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Rooms & Rates', path: '/rooms' },
    { name: 'Dining & Bar', path: '/dining' },
    { name: 'Sambhrama Party Hall', path: '/party-hall' },
    { name: 'Local Sightseeing', path: '/attractions' },
    { name: 'Location & Directions', path: '/location' },
    { name: 'My Bookings & Orders', path: '/my-bookings-orders' },
  ];

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Hotel Brand */}
          <Link to="/" className="flex items-center group py-1">
            <img
              src="/hotel-raama-logo.png"
              alt="Hotel Raama - Hassan"
              className="h-12 sm:h-14 w-auto object-contain rounded-lg shadow-xs group-hover:opacity-90 transition-all duration-300"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-[10px] xl:text-[11px] font-medium uppercase tracking-[1.2px] xl:tracking-[1.6px] px-2.5 xl:px-3 py-2 rounded-full transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? isTransparent
                        ? 'bg-white/25 text-white font-bold shadow-sm backdrop-blur-xs'
                        : 'bg-black/25 text-[#D6B369] font-bold border border-[#D6B369]/30 shadow-xs'
                      : isTransparent
                      ? 'text-white/90 hover:text-white hover:bg-white/15'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/rooms"
              className="px-5 py-2.5 rounded-full bg-[#D6B369] text-[#00174A] font-bold text-xs uppercase tracking-[1.6px] hover:bg-[#E8C56A] transition-all duration-300 flex items-center gap-2 shadow-sm focus-design"
            >
              <Calendar size={13} /> Book Room
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
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
              Book Room Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
