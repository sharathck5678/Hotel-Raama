import React from 'react';
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
} from 'lucide-react';
import { adminLogout } from '../../services/api';
import { toast } from 'sonner';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] flex">
      {/* Left Sidebar - Deep Forest Slate */}
      <aside className="w-64 bg-[#181e19] text-[#f7f7f2] border-r border-[#cbc0ad]/20 flex flex-col justify-between shrink-0 shadow-lg">
        <div>
          {/* Logo Header */}
          <div className="h-20 flex items-center gap-3 px-6 border-b border-[#cbc0ad]/15">
            <div className="w-9 h-9 rounded-full bg-[#47614d] text-[#f7f7f2] font-bold flex items-center justify-center text-sm shadow-sm">
              HR
            </div>
            <div>
              <span className="font-bold text-white block text-sm tracking-tight">HOTEL RAAMA</span>
              <span className="text-[9px] text-[#d9b57d] uppercase font-bold tracking-[1.6px] block">
                Admin Console
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
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
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-20 bg-[#f7f7f2]/95 backdrop-blur-md border-b border-[#cbc0ad]/60 px-8 flex items-center justify-between sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-bold text-[#333333]">Management Dashboard</h2>
            <span className="text-xs text-[#666666]">Hotel Raama, Hassan • Live Operations</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/"
              target="_blank"
              className="text-xs font-semibold text-[#47614d] hover:underline flex items-center gap-1.5 uppercase tracking-[1.6px]"
            >
              <Building2 size={15} /> Open Guest Site
            </Link>

            <div className="flex items-center gap-2 bg-[#47614d] text-[#f7f7f2] px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-sm">
              <ShieldCheck size={14} className="text-[#d9b57d]" /> Active Admin Session
            </div>
          </div>
        </header>

        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
