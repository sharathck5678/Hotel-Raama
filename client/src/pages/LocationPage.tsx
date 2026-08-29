import React, { useEffect, useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Compass, 
  ArrowUpRight, 
  ArrowRight,
  ShieldCheck, 
  Copy, 
  Check 
} from 'lucide-react';
import { fetchHotelInfo } from '../services/api';
import { toast } from 'sonner';

export const LocationPage: React.FC = () => {
  const [info, setInfo] = useState<any | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  useEffect(() => {
    fetchHotelInfo().then((res) => {
      if (res.success) setInfo(res.data);
    });
  }, []);

  const handleCopyCoords = () => {
    navigator.clipboard.writeText('12.9950762, 76.0826807');
    setCopiedCoords(true);
    toast.success('GPS Coordinates copied to clipboard');
    setTimeout(() => setCopiedCoords(false), 2500);
  };

  const keyDistances = [
    { destination: 'SDM Ayurvedic Hospital & College', category: 'Landmark', distance: '50 m', duration: '1 min walk', highlight: true },
    { destination: 'Hassan Central KSRTC Bus Stand', category: 'Transit', distance: '1.8 km', duration: '5 mins' },
    { destination: 'Hassan Junction Railway Station (HAS)', category: 'Transit', distance: '2.5 km', duration: '7 mins' },
    { destination: 'Hassan City Center & Market', category: 'City Center', distance: '2.0 km', duration: '6 mins' },
    { destination: 'Halebidu Hoysaleswara Temple', category: 'Heritage Sight', distance: '31 km', duration: '40 mins' },
    { destination: 'Belur Chennakeshava Temple', category: 'Heritage Sight', distance: '38 km', duration: '45 mins' },
    { destination: 'Manjarabad Fort & Sakleshpur', category: 'Hill Station', distance: '38 km', duration: '45 mins' },
    { destination: 'Shravanabelagola (Bahubali Statue)', category: 'Pilgrimage', distance: '51 km', duration: '55 mins' },
    { destination: 'Bisle Ghat & Western Ghats Viewpoint', category: 'Nature View', distance: '82 km', duration: '2 hrs' },
    { destination: 'Kempegowda Intl Airport Bengaluru (BLR)', category: 'Airport', distance: '195 km', duration: '3.5 hrs' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      
      {/* 1. Header & Hero */}
      <div className="text-center max-w-3xl mx-auto border-b border-[#cbc0ad] pb-8 space-y-3">
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#47614d] block">
          Prime Highway Location · Hassan, Karnataka
        </span>
        <h1 className="editorial-section-title text-[#333333]">Location & Directions</h1>
        <p className="font-sans text-xs sm:text-sm text-[#666666] max-w-2xl mx-auto leading-relaxed">
          Situated conveniently on Bengaluru–Mangaluru Road (B.M. Road) in Thanneeruhalla, directly opposite SDM Ayurvedic Hospital. Ideally situated for heritage sightseeing, corporate transit, and family vacations.
        </p>

        {/* Redesigned Quick Action Cards */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {/* Card 1: Open in Google Maps */}
          <a
            href="https://maps.app.goo.gl/ytRudLDAau6mBPKH8"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-[#2e4235] text-white shadow-sm hover:bg-[#25362b] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <MapPin size={17} className="fill-white text-[#2e4235]" />
            </div>
            <span className="flex-1 text-center font-sans font-bold text-[10.5px] sm:text-[11.5px] uppercase tracking-wider text-white whitespace-nowrap px-1">
              Open in Google Maps
            </span>
            <div className="w-5 flex justify-end shrink-0">
              <ArrowUpRight size={17} className="text-white/80 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </a>

          {/* Card 2: Call 081722 57001 */}
          <a
            href="tel:08172257001"
            className="flex items-center justify-between gap-2 px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-white border border-[#e2dec9] text-[#2d3748] shadow-sm hover:bg-[#faf8f5] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f1f4ee] flex items-center justify-center text-[#2e4235] shrink-0 group-hover:scale-105 transition-transform">
              <Phone size={16} className="text-[#2e4235]" />
            </div>
            <span className="flex-1 text-center font-sans font-bold text-[10.5px] sm:text-[11.5px] uppercase tracking-wider text-[#2e4235] whitespace-nowrap px-1">
              Call 081722 57001
            </span>
            <div className="w-5 flex justify-end shrink-0">
              <ArrowRight size={17} className="text-[#2e4235]/70 group-hover:text-[#2e4235] group-hover:translate-x-0.5 transition-all" />
            </div>
          </a>

          {/* Card 3: WhatsApp Concierge */}
          <a
            href="https://wa.me/918172257001?text=Hi%20Hotel%20Raama,%20I%20need%20directions%20to%20reach%20the%20hotel."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-[#eef7f2] border border-[#d2edd9] text-[#1c7a52] shadow-sm hover:bg-[#e4f3eb] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#ddf1e5] flex items-center justify-center text-[#1c7a52] shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <span className="flex-1 text-center font-sans font-bold text-[10.5px] sm:text-[11.5px] uppercase tracking-wider text-[#1c7a52] whitespace-nowrap px-1">
              WhatsApp Concierge
            </span>
            <div className="w-5 flex justify-end shrink-0">
              <ArrowUpRight size={17} className="text-[#1c7a52]/80 group-hover:text-[#1c7a52] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </a>
        </div>
      </div>

      {/* 2. Main Location Showcase: Info Card + Interactive Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Column: Comprehensive Hotel Coordinates Card (5 cols) */}
        <div className="lg:col-span-5 bg-[#47614d] text-[#f7f7f2] p-7 sm:p-9 rounded-2xl border border-[#f7f7f2]/15 flex flex-col justify-between shadow-lg space-y-8">
          <div className="space-y-6">
            <div>
              <span className="text-[#d9b57d] text-[10px] font-sans font-bold uppercase tracking-widest block mb-1">
                Hotel Raama Coordinates
              </span>
              <h2 className="text-3xl font-serif text-[#f7f7f2]">Hotel Raama, Hassan</h2>
              <p className="text-xs text-[#f7f7f2]/80 mt-1">Hospitality That Feels Like Home</p>
            </div>

            <div className="space-y-5 text-xs font-sans border-t border-[#f7f7f2]/15 pt-5">
              {/* Address */}
              <div className="flex items-start gap-3.5">
                <MapPin size={18} className="text-[#d9b57d] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#f7f7f2] text-[11px] uppercase tracking-wider font-bold mb-0.5">Physical Address</strong>
                  <span className="text-[#f7f7f2]/90 leading-relaxed block text-xs">
                    {info?.address || 'B.M. Road, Thanneeruhalla, Opposite S.D.M. Ayurvedic Hospital & College'}, Hassan, Karnataka - 573201
                  </span>
                  <span className="text-[#d9b57d] text-[11px] block mt-1 font-medium">
                    Landmark: Directly opposite SDM Ayurvedic Hospital
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3.5">
                <Phone size={18} className="text-[#d9b57d] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#f7f7f2] text-[11px] uppercase tracking-wider font-bold mb-0.5">Front Desk & Reservations</strong>
                  <a href={`tel:${info?.phone || '08172257001'}`} className="text-[#d9b57d] hover:underline font-bold text-sm tracking-wide">
                    {info?.phone || '081722 57001'}
                  </a>
                  <span className="text-[#f7f7f2]/70 text-[10px] block mt-0.5">Available 24 Hours · 7 Days a Week</span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3.5">
                <Mail size={18} className="text-[#d9b57d] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#f7f7f2] text-[11px] uppercase tracking-wider font-bold mb-0.5">Inquiries & Corporate Bookings</strong>
                  <a href={`mailto:${info?.email || 'reservations@hotelraama.com'}`} className="text-[#d9b57d] hover:underline text-xs">
                    {info?.email || 'reservations@hotelraama.com'}
                  </a>
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="flex items-start gap-3.5">
                <Compass size={18} className="text-[#d9b57d] shrink-0 mt-0.5" />
                <div className="flex-grow">
                  <strong className="block text-[#f7f7f2] text-[11px] uppercase tracking-wider font-bold mb-0.5">GPS Latitude & Longitude</strong>
                  <div className="flex items-center justify-between gap-2 bg-black/25 px-3 py-1.5 rounded-md border border-[#f7f7f2]/10 mt-1">
                    <span className="text-[#f7f7f2]/90 font-mono text-[11px]">12.9951° N, 76.0827° E</span>
                    <button
                      onClick={handleCopyCoords}
                      className="text-[#d9b57d] hover:text-white p-1 text-[11px] flex items-center gap-1 transition-colors"
                      title="Copy Coordinates"
                    >
                      {copiedCoords ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                      <span>{copiedCoords ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Details footer */}
          <div className="pt-4 border-t border-[#f7f7f2]/15 flex items-center justify-between text-[11px] text-[#f7f7f2]/80">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-[#d9b57d]" /> Check-in: 12 PM / Check-out: 11 AM
            </div>
            <div className="flex items-center gap-1.5 text-[#d9b57d]">
              <ShieldCheck size={14} /> 24/7 Security
            </div>
          </div>
        </div>

        {/* Right Column: Google Maps Interactive View (7 cols) */}
        <div className="lg:col-span-7 bg-[#f7f7f2] rounded-2xl overflow-hidden border border-[#cbc0ad] shadow-lg flex flex-col min-h-[460px]">
          <div className="bg-[#e9e4d9] px-6 py-3.5 border-b border-[#cbc0ad] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#333333]">
              <MapPin size={15} className="text-[#47614d]" /> Live Satellite & Road Navigation
            </div>
            <a
              href="https://maps.app.goo.gl/ytRudLDAau6mBPKH8"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#47614d] hover:text-[#333333] flex items-center gap-1"
            >
              Full Screen Map <ArrowUpRight size={13} />
            </a>
          </div>

          <div className="flex-grow w-full h-[400px] lg:h-full relative">
            <iframe
              title="Hotel Raama Live Location Map"
              src="https://maps.google.com/maps?q=Hotel%20Raama%20BM%20Road%20Hassan%20Karnataka&t=&z=15&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '380px' }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

      </div>


      {/* 3. Proximity & Nearby Landmarks Distance Table */}
      <div className="bg-white p-8 sm:p-10 rounded-2xl border border-[#cbc0ad] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#cbc0ad]/60 pb-5">
          <div>
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#47614d] block mb-1">
              Hassan & Regional Connectivity
            </span>
            <h2 className="editorial-section-title text-[#333333]">Key Distances & Proximities</h2>
          </div>
          <span className="text-xs font-sans text-[#666666]">
            All distances calculated from Hotel Raama Main Entrance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keyDistances.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                item.highlight
                  ? 'bg-[#47614d]/10 border-[#47614d]/40 shadow-xs'
                  : 'bg-[#f7f7f2] border-[#cbc0ad]/60 hover:border-[#cbc0ad]'
              }`}
            >
              <div className="space-y-1">
                <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#666666]">
                  {item.category}
                </span>
                <h4 className="text-sm font-serif font-bold text-[#333333]">{item.destination}</h4>
              </div>
              <div className="text-right shrink-0 pl-3">
                <span className="text-sm font-sans font-bold text-[#47614d] block">{item.distance}</span>
                <span className="text-[10px] font-sans text-[#666666]">{item.duration}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
