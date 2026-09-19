import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Clock, MessageSquare, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const location = useLocation();

  // Hide public footer on admin screens
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-[#F7F0DF] text-[#00174A] border-t-2 border-[#D6B369] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
        
        {/* Col 1: Brand & Editorial Statement */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/hotel-raama-logo.png"
              alt="Hotel Raama"
              className="h-12 w-auto object-contain rounded-lg bg-white p-1 shadow-xs border border-[#00174A]/10"
            />
          </div>
          <p className="text-xs text-[#00174A]/80 leading-relaxed max-w-sm">
            A sanctuary of quiet luxury, refined South Indian dining at Swaad, executive spirits at Liquid Lounge, and grand celebrations at Sambhrama Banquet in Hassan, Karnataka.
          </p>
          <a
            href="https://wa.me/917899511330"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.6px] px-4 py-2.5 rounded-full bg-[#00174A] text-white border border-[#00174A] hover:bg-[#10184A] transition-all duration-300"
          >
            <MessageSquare size={13} className="text-white" /> WhatsApp Reception
          </a>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <span className="text-[10px] uppercase tracking-[1.6px] text-[#00174A] font-bold block mb-4">
            Navigation
          </span>
          <ul className="space-y-2.5 text-xs text-[#00174A]/80">
            <li><Link to="/" className="hover:text-[#00174A] hover:font-medium transition-colors">Home Portal</Link></li>
            <li><Link to="/rooms" className="hover:text-[#00174A] hover:font-medium transition-colors">Room Tariffs & Booking</Link></li>
            <li><Link to="/dining" className="hover:text-[#00174A] hover:font-medium transition-colors">Swaad Pure Veg Restaurant</Link></li>
            <li><Link to="/dining" className="hover:text-[#00174A] hover:font-medium transition-colors">Hotel Raama</Link></li>
            <li><Link to="/dining" className="hover:text-[#00174A] hover:font-medium transition-colors">Liquid Lounge Bar</Link></li>
            <li><Link to="/party-hall" className="hover:text-[#00174A] hover:font-medium transition-colors">Sambhrama Banquet Hall</Link></li>
            <li><Link to="/attractions" className="hover:text-[#00174A] hover:font-medium transition-colors">Things to Do</Link></li>
          </ul>
        </div>

        {/* Col 3: Location & Embedded Mini Map */}
        <div className="bg-white p-5 rounded-[20px] border border-[#D6B369]/40 space-y-3 flex flex-col justify-between shadow-xs">
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-[1.6px] text-[#00174A] font-bold flex items-center gap-1.5">
              <MapPin size={14} className="text-[#00174A]" /> Location & Directions
            </span>

            {/* Embedded Mini Map */}
            <div className="relative w-full h-32 rounded-[14px] overflow-hidden border border-[#00174A]/15 shadow-inner group">
              <iframe
                title="Hotel Raama Mini Map"
                src="https://maps.google.com/maps?q=Hotel%20Raama%20BM%20Road%20Hassan%20Karnataka&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'contrast(1.05) saturate(0.95)' }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs text-[#00174A]/85 leading-snug font-medium pt-1">
              B.M. Road, Thanneeruhalla, Opp. S.D.M. Ayurvedic Hospital, Hassan, Karnataka - 573201
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#00174A]/10 text-[11px]">
            <div className="flex justify-between items-center text-[#00174A]/70">
              <span>Opp. SDM Ayurvedic Hospital</span>
            </div>
            <div className="flex justify-between items-center text-[#00174A] font-medium">
              <span>📞 <a href="tel:7899511330" className="text-[#00174A] font-bold hover:underline">+91 78995 11330</a></span>
              <span>✉️ <a href="mailto:hotelraama.hsn@gmail.com" className="text-[#00174A] hover:underline">Email Us</a></span>
            </div>

            <a
              href="https://maps.google.com/?q=Hotel+Raama+Hassan"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-full bg-[#00174A] text-white font-semibold text-[10px] uppercase tracking-[1.6px] flex items-center justify-center gap-1.5 hover:bg-[#10184A] transition-all duration-300 mt-2"
            >
              Get Directions <ArrowUpRight size={13} />
            </a>
          </div>
        </div>

        {/* Col 4: Stay Details & Refund Policy */}
        <div>
          <span className="text-[10px] uppercase tracking-[1.6px] text-[#00174A] font-bold block mb-4">
            Guest & Refund Policy
          </span>
          <ul className="space-y-2.5 text-xs text-[#00174A]/85">
            <li className="flex items-center gap-2">
              <Clock size={14} className="text-[#00174A]" /> Check-In: 12:00 PM
            </li>
            <li className="flex items-center gap-2">
              <Clock size={14} className="text-[#00174A]" /> Check-Out: 12:00 PM
            </li>
          </ul>
          <div className="mt-4 pt-3 border-t border-[#00174A]/15 text-[11px] space-y-1">
            <span className="font-bold text-[#00174A] block uppercase tracking-wider text-[10px]">Cancellation & Refund:</span>
            <ul className="text-[#00174A]/80 space-y-0.5 text-[10.5px]">
              <li>• 7+ days before check-in date: <strong className="text-[#00174A] font-bold">100% Refund</strong></li>
              <li>• 3–6 days before check-in date: <strong className="text-[#00174A] font-bold">50% Refund</strong></li>
              <li>• Under 3 days of check-in date: <strong className="text-[#00174A] font-bold">No Refund</strong></li>
            </ul>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-[#00174A]/15 flex flex-col md:flex-row items-center justify-between text-[11px] text-[#00174A]/70 gap-4">
        <div>
          © {new Date().getFullYear()} Hotel Raama, Hassan. All rights reserved.
        </div>
        <div className="flex gap-6 uppercase tracking-[1.6px] text-[10px] text-[#00174A]/75">
          <Link to="/privacy-policy" className="hover:text-[#00174A] transition-colors">Privacy Policy</Link>
          <Link to="/terms-of-booking" className="hover:text-[#00174A] transition-colors">Terms of Booking</Link>
          <Link to="/admin/login" className="hover:text-[#00174A] transition-colors">Staff Portal</Link>
        </div>
      </div>
    </footer>
  );
};
