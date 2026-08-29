import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  CalendarCheck,
  Users,
  FileText,
  LogOut,
  ShieldCheck,
  Building2,
  QrCode,
  Menu,
  X,
} from 'lucide-react';
import { adminLogout } from '../../services/api';
import { toast } from 'sonner';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-close mobile drawer when switching routes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await adminLogout();
    toast.success('Logged out successfully.');
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Kitchen Orders', path: '/admin/orders', icon: UtensilsCrossed },
    { name: 'Room Bookings', path: '/admin/bookings', icon: CalendarCheck },
    { name: 'QR Code Directory', path: '/admin/qr-codes', icon: QrCode },
    { name: 'Customer History', path: '/admin/customers', icon: Users },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] flex flex-col lg:flex-row relative">
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Deep Forest Slate */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 bg-[#181e19] text-[#f7f7f2] border-r border-[#cbc0ad]/20 flex flex-col justify-between shrink-0 shadow-2xl lg:shadow-lg transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-16 sm:h-20 flex items-center justify-between px-6 border-b border-[#cbc0ad]/15">
            <div className="flex items-center gap-3">
              <img
                src="/hotel-raama-logo.png"
                alt="Hotel Raama"
                className="h-10 w-auto object-contain rounded-lg bg-white/95 p-1 shadow-xs"
              />
              <div>
                <span className="font-bold text-white block text-sm tracking-tight">HOTEL RAAMA</span>
                <span className="text-[9px] text-[#d9b57d] uppercase font-bold tracking-[1.6px] block">
                  Admin Console
                </span>
              </div>
            </div>

            {/* Close Button on Mobile Drawer */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-[#f7f7f2]/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[1.6px] transition-all ${
                    isActive
                      ? 'bg-[#47614d] text-[#f7f7f2] shadow-sm font-bold'
                      : 'text-[#f7f7f2]/70 hover:bg-[#ffffff]/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-[#d9b57d]' : ''} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-[#cbc0ad]/15">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#ffffff]/10 hover:bg-[#b60000]/30 text-[#f7f7f2]/80 hover:text-red-200 text-xs font-semibold uppercase tracking-[1.6px] border border-[#cbc0ad]/20 transition-colors cursor-pointer focus-design"
          >
            <LogOut size={15} /> Sign Out Admin
          </button>
        </div>
      </aside>

      {/* Main View Area - Warm Alabaster */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        {/* Top Header */}
        <header className="h-16 sm:h-20 bg-[#f7f7f2]/95 backdrop-blur-md border-b border-[#cbc0ad]/60 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button on mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1.5 text-[#333333] hover:text-[#47614d] hover:bg-black/5 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-[#333333] truncate">Management Dashboard</h2>
              <span className="text-[11px] sm:text-xs text-[#666666] truncate block">Hotel Raama · Live Operations</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link
              to="/"
              target="_blank"
              className="text-[11px] sm:text-xs font-semibold text-[#47614d] hover:underline flex items-center gap-1.5 uppercase tracking-wider py-1.5 px-2.5 rounded-md hover:bg-black/5 transition-colors"
            >
              <Building2 size={15} /> <span className="hidden sm:inline">Open Guest Site</span>
            </Link>

            <div className="flex items-center gap-1.5 bg-[#47614d] text-[#f7f7f2] px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-wide shadow-sm">
              <ShieldCheck size={14} className="text-[#d9b57d]" /> <span className="hidden sm:inline">Active </span>Admin
            </div>
          </div>
        </header>

        <div className="p-3.5 sm:p-6 lg:p-8 flex-1 w-full max-w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

