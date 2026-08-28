import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, MessageSquare, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#181e19] text-[#f7f7f2] border-t border-[#cbc0ad]/20 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
        
        {/* Col 1: Brand & Editorial Statement */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#47614d] text-[#f7f7f2] flex items-center justify-center font-bold text-sm">
              HR
            </div>
            <span className="text-xl font-bold tracking-tight text-[#f7f7f2]">HOTEL RAAMA</span>
          </div>
          <p className="text-xs text-[#f7f7f2]/70 leading-relaxed max-w-sm">
            A sanctuary of quiet luxury, refined South Indian dining at Swaad, executive spirits at Liquid Lounge, and grand celebrations at Sambhrama Banquet in Hassan, Karnataka.
          </p>
          <a
            href="https://wa.me/918172257001"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.6px] px-4 py-2.5 rounded-full bg-[#47614d]/40 text-[#d9b57d] border border-[#47614d] hover:bg-[#47614d] hover:text-[#f7f7f2] transition-all duration-300"
          >
            <MessageSquare size={13} /> WhatsApp Reception
          </a>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <span className="text-[10px] uppercase tracking-[1.6px] text-[#d9b57d] font-bold block mb-4">
            Navigation
          </span>
          <ul className="space-y-2.5 text-xs text-[#f7f7f2]/80">
            <li><Link to="/" className="hover:text-[#d9b57d] transition-colors">Home Portal</Link></li>
            <li><Link to="/rooms" className="hover:text-[#d9b57d] transition-colors">Room Tariffs & Booking</Link></li>
            <li><Link to="/dining" className="hover:text-[#d9b57d] transition-colors">Swaad Pure Veg Restaurant</Link></li>
            <li><Link to="/dining" className="hover:text-[#d9b57d] transition-colors">Hotel Raama (Non-Veg)</Link></li>
            <li><Link to="/dining" className="hover:text-[#d9b57d] transition-colors">Liquid Lounge Bar (LLB)</Link></li>
            <li><Link to="/party-hall" className="hover:text-[#d9b57d] transition-colors">Sambhrama Party Hall</Link></li>
            <li><Link to="/attractions" className="hover:text-[#d9b57d] transition-colors">Hassan Sights & Belur</Link></li>
          </ul>
        </div>

        {/* Col 3: Location & Embedded Mini Map */}
        <div className="bg-[#f7f7f2]/5 p-5 rounded-[20px] border border-[#cbc0ad]/20 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-[1.6px] text-[#d9b57d] font-bold flex items-center gap-1.5">
              <MapPin size={14} /> Location & Directions
            </span>

            {/* Embedded Mini Map */}
            <div className="relative w-full h-32 rounded-[14px] overflow-hidden border border-[#cbc0ad]/20 shadow-inner group">
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

            <p className="text-xs text-[#f7f7f2]/90 leading-snug font-medium pt-1">
              B.M. Road, Thanneeruhalla, Opp. S.D.M. Ayurvedic Hospital, Hassan, Karnataka - 573201
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#cbc0ad]/15 text-[11px]">
            <div className="flex justify-between items-center text-[#f7f7f2]/70">
              <span>Opp. SDM Ayurvedic Hospital</span>
            </div>
            <div className="flex justify-between items-center text-[#f7f7f2]/80 font-medium">
              <span>📞 <a href="tel:08172257001" className="text-[#d9b57d] font-bold hover:underline">081722 57001</a></span>
              <span>✉️ <a href="mailto:reservations@hotelraama.com" className="text-[#d9b57d] hover:underline">Email Us</a></span>
            </div>

            <a
              href="https://maps.google.com/?q=Hotel+Raama+Hassan"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-full bg-[#47614d] text-[#f7f7f2] font-semibold text-[10px] uppercase tracking-[1.6px] flex items-center justify-center gap-1.5 hover:bg-[#d9b57d] hover:text-[#333333] transition-all duration-300 mt-2"
            >
              Get Directions <ArrowUpRight size={13} />
            </a>
          </div>
        </div>

        {/* Col 4: Stay Details & Timings */}
        <div>
          <span className="text-[10px] uppercase tracking-[1.6px] text-[#d9b57d] font-bold block mb-4">
            Guest Information
          </span>
          <ul className="space-y-3 text-xs text-[#f7f7f2]/80">
            <li className="flex items-center gap-2">
              <Clock size={14} className="text-[#d9b57d]" /> Check-In: 12:00 PM
            </li>
            <li className="flex items-center gap-2">
              <Clock size={14} className="text-[#d9b57d]" /> Check-Out: 11:00 AM
            </li>
            <li className="text-[11px] text-[#f7f7f2]/50 pt-3 border-t border-[#cbc0ad]/15 leading-relaxed">
              Contactless room reservations and instant digital receipt verification.
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-[#cbc0ad]/15 flex flex-col md:flex-row items-center justify-between text-[11px] text-[#f7f7f2]/60 gap-4">
        <div>
          © {new Date().getFullYear()} Hotel Raama, Hassan. All rights reserved.
        </div>
        <div className="flex gap-6 uppercase tracking-[1.6px] text-[10px]">
          <Link to="/location" className="hover:text-[#f7f7f2]">Privacy Policy</Link>
          <Link to="/location" className="hover:text-[#f7f7f2]">Terms of Booking</Link>
          <Link to="/admin/login" className="hover:text-[#d9b57d]">Staff Portal</Link>
        </div>
      </div>
    </footer>
  );
};
