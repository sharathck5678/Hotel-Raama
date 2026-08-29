import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, X, Calendar, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

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

  return (
    <header className="sticky top-0 z-50 bg-[#f7f7f2]/95 backdrop-blur-md border-b border-[#cbc0ad]/60 transition-all duration-300">
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
                      ? 'bg-[#47614d] text-[#f7f7f2] shadow-sm font-semibold'
                      : 'text-[#333333] hover:text-[#47614d] hover:bg-[#cbc0ad]/20'
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
              className="px-5 py-2.5 rounded-full bg-[#47614d] text-[#f7f7f2] font-medium text-xs uppercase tracking-[1.6px] hover:bg-[#374c3c] transition-all duration-300 flex items-center gap-2 shadow-sm focus-design"
            >
              <Calendar size={13} /> Book Room
            </Link>

            <Link
              to="/admin/login"
              className="p-2.5 text-[#666666] hover:text-[#47614d] hover:bg-[#cbc0ad]/20 rounded-full transition-colors focus-design"
              title="Admin Staff Portal"
            >
              <ShieldCheck size={18} />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 text-[#333333] hover:text-[#47614d] rounded-full hover:bg-[#cbc0ad]/20"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#f7f7f2] border-b border-[#cbc0ad] px-6 pt-3 pb-8 space-y-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-full text-xs uppercase tracking-[1.6px] font-medium transition-colors ${
                  isActive ? 'bg-[#47614d] text-[#f7f7f2]' : 'text-[#333333] hover:bg-[#cbc0ad]/20'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="pt-4 flex flex-col gap-3 border-t border-[#cbc0ad]/60">
            <Link
              to="/rooms"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-full bg-[#47614d] text-[#f7f7f2] font-medium text-xs uppercase tracking-[1.6px]"
            >
              Book Room Now
            </Link>
            <Link
              to="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-xs text-[#666666] hover:text-[#47614d] uppercase tracking-[1.6px]"
            >
              Admin Staff Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
