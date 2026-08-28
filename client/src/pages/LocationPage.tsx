import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Navigation, MessageSquare } from 'lucide-react';
import { fetchHotelInfo } from '../services/api';

export const LocationPage: React.FC = () => {
  const [info, setInfo] = useState<any | null>(null);

  useEffect(() => {
    fetchHotelInfo().then((res) => {
      if (res.success) setInfo(res.data);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-16 max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
      <div className="text-center max-w-3xl mx-auto border-b border-[#cbc0ad] pb-8">
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#666666] block mb-2">
          Contact & Coordinates
        </span>
        <h1 className="editorial-section-title text-[#333333]">Location & Contact Info</h1>
        <p className="font-sans text-xs sm:text-sm text-[#666666] mt-3 max-w-xl mx-auto leading-relaxed">
          Conveniently located on Bengaluru-Mangaluru Road (B.M. Road) opposite SDM Ayurvedic Hospital, Hassan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Info Grid */}
        <div className="bg-[#47614d] text-[#f7f7f2] p-8 sm:p-10 rounded-sm border border-[#f7f7f2]/15 space-y-8 shadow-md">
          <h2 className="text-3xl font-serif text-[#f7f7f2]">Hotel Raama, Hassan</h2>
          
          <div className="space-y-6 text-xs font-sans">
            <div className="flex items-start gap-4">
              <MapPin size={20} className="text-[#d9b57d] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#f7f7f2] text-xs uppercase tracking-wider font-bold mb-1">Address</strong>
                <span className="text-[#f7f7f2]/80 leading-relaxed block">{info?.address || 'B.M. Road, Thanneeruhalla'}, Hassan, Karnataka - 573201</span>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Phone size={20} className="text-[#d9b57d] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#f7f7f2] text-xs uppercase tracking-wider font-bold mb-1">Front Desk & Reservations</strong>
                <a href={`tel:${info?.phone || '08172257001'}`} className="text-[#d9b57d] hover:underline font-semibold text-sm">
                  {info?.phone || '081722 57001'}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Mail size={20} className="text-[#d9b57d] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#f7f7f2] text-xs uppercase tracking-wider font-bold mb-1">Email Address</strong>
                <a href={`mailto:${info?.email || 'reservations@hotelraama.com'}`} className="text-[#d9b57d] hover:underline text-xs">
                  {info?.email || 'reservations@hotelraama.com'}
                </a>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#f7f7f2]/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="https://wa.me/918172257001"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 bg-[#f7f7f2] text-[#333333] hover:bg-[#d9b57d] font-sans font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <MessageSquare size={15} /> WhatsApp Desk
            </a>
            <a
              href="https://maps.app.goo.gl/ytRudLDAau6mBPKH8"
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 bg-[#d9b57d] text-[#333333] hover:bg-[#f7f7f2] font-sans font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Navigation size={15} /> Open Directions
            </a>
          </div>
        </div>

        {/* Google Map Embed */}
        <div className="bg-[#f7f7f2] rounded-sm overflow-hidden border border-[#cbc0ad] h-[420px] shadow-sm">
          <iframe
            title="Hotel Raama Location Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.99408665792!2d76.0826807!3d12.9950762!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba5485458021c3b%3A0x7d0259bdf1eef4f9!2sHotel%20Raama!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </div>
  );
};
