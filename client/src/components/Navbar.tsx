import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, X, Calendar, ShieldCheck } from 'lucide-react';

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
  const isTransparent = isHomePage && !isScrolled;

  const headerClass = isHomePage
    ? `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isTransparent
          ? 'bg-gradient-to-b from-black/80 via-black/40 to-transparent border-b border-white/10'
          : 'bg-[#47614d]/95 backdrop-blur-md border-b border-[#354c3c] shadow-lg'
      }`
    : 'sticky top-0 z-50 bg-[#47614d] border-b border-[#354c3c] shadow-md transition-all duration-300';

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
                        : 'bg-black/25 text-[#d9b57d] font-bold border border-[#d9b57d]/30 shadow-xs'
                      : isTransparent
                      ? 'text-white/90 hover:text-white hover:bg-white/15'
                      : 'text-[#f7f7f2]/90 hover:text-white hover:bg-white/10'
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
              className="px-5 py-2.5 rounded-full bg-[#d9b57d] text-[#1c2e22] font-bold text-xs uppercase tracking-[1.6px] hover:bg-[#c9a56d] transition-all duration-300 flex items-center gap-2 shadow-sm focus-design"
            >
              <Calendar size={13} /> Book Room
            </Link>

            <Link
              to="/admin/login"
              className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors focus-design"
              title="Admin Staff Portal"
            >
              <ShieldCheck size={18} />
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

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className={`lg:hidden border-b px-6 pt-3 pb-8 space-y-2 ${
          isTransparent ? 'bg-black/90 backdrop-blur-md border-white/20' : 'bg-[#3f5744] border-black/20'
        }`}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-full text-xs uppercase tracking-[1.6px] font-medium transition-colors ${
                  isActive 
                    ? 'bg-[#d9b57d] text-[#1c2e22] font-bold' 
                    : 'text-white/90 hover:bg-white/10'
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
              className="w-full text-center py-3 rounded-full bg-[#d9b57d] text-[#1c2e22] font-bold text-xs uppercase tracking-[1.6px]"
            >
              Book Room Now
            </Link>
            <Link
              to="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-xs text-white/80 hover:text-white uppercase tracking-[1.6px]"
            >
              Admin Staff Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
