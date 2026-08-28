import React, { useState, useEffect } from 'react';
import { QrCode, Search, Building2, Sparkles, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchAllQrCodes } from '../services/api';

export const QrOrderingSectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ROOMS' | 'PARTY_HALL'>('ALL');

  useEffect(() => {
    fetchAllQrCodes()
      .then((res) => {
        if (res.success) {
          setRooms(res.data);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to load QR code directory.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredRooms = rooms.filter((room) => {
    const isPartyHall = room.roomNumber.toLowerCase().includes('party') || room.roomNumber.toLowerCase().includes('hall');
    
    if (activeFilter === 'ROOMS' && isPartyHall) return false;
    if (activeFilter === 'PARTY_HALL' && !isPartyHall) return false;

    if (!searchTerm) return true;
    const matchTerm = searchTerm.toLowerCase();
    return (
      room.roomNumber.toLowerCase().includes(matchTerm) ||
      (room.roomTypeId?.name && room.roomTypeId.name.toLowerCase().includes(matchTerm))
    );
  });

  return (
    <div className="space-y-8 text-[#333333]">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Title & Banner Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto border-b border-[#cbc0ad] pb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#0B1849]/10 border border-[#cbc0ad] text-[#333333] text-[10px] font-sans font-bold uppercase tracking-widest">
            <QrCode size={13} /> Admin Console · Room & Hall QR Cards
          </div>
          <h1 className="editorial-section-title text-[#333333]">
            QR Ordering Directory & Room Cards
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#666666] leading-relaxed">
            Manage static QR codes for Rooms 1 through 40 and Sambhrama Party Hall. Click or scan any card to launch guest ordering for <strong className="text-[#333333]">Swaad Pure Veg</strong>, <strong className="text-[#333333]">Non-Veg Specialities</strong>, and <strong className="text-[#333333]">Liquid Lounge Bar</strong>.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#47614d] text-[#f7f7f2] p-6 rounded-sm border border-[#f7f7f2]/15 flex items-start gap-4">
            <div className="p-3 rounded-sm bg-[#f7f7f2]/10 text-[#d9b57d] shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f7f7f2] mb-1">40 Unique Room QRs</h3>
              <p className="text-xs font-sans text-[#f7f7f2]/70 leading-relaxed">Rooms 1 through 40 each have an assigned static QR token for room service.</p>
            </div>
          </div>

          <div className="bg-[#47614d] text-[#f7f7f2] p-6 rounded-sm border border-[#f7f7f2]/15 flex items-start gap-4">
            <div className="p-3 rounded-sm bg-[#f7f7f2]/10 text-[#d9b57d] shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f7f7f2] mb-1">1 Sambhrama Party Hall QR</h3>
              <p className="text-xs font-sans text-[#f7f7f2]/70 leading-relaxed">Dedicated banquet QR code for grand celebrations and party events.</p>
            </div>
          </div>

          <div className="bg-[#47614d] text-[#f7f7f2] p-6 rounded-sm border border-[#f7f7f2]/15 flex items-start gap-4">
            <div className="p-3 rounded-sm bg-[#f7f7f2]/10 text-[#d9b57d] shrink-0">
              <Utensils size={20} />
            </div>
            <div>
              <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-[#f7f7f2] mb-1">Direct Menu Ingestion</h3>
              <p className="text-xs font-sans text-[#f7f7f2]/70 leading-relaxed">Instant access to Swaad dining & LLB Bar with real-time kitchen status tracking.</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-[#f7f7f2] p-4 rounded-sm border border-[#cbc0ad] flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-[#0B1849]/5 p-1 rounded-sm border border-[#cbc0ad] w-full md:w-auto">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-sm text-xs font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-[#47614d] text-[#f7f7f2]'
                  : 'text-[#666666] hover:text-[#333333]'
              }`}
            >
              All QR Codes ({rooms.length})
            </button>
            <button
              onClick={() => setActiveFilter('ROOMS')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-sm text-xs font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeFilter === 'ROOMS'
                  ? 'bg-[#47614d] text-[#f7f7f2]'
                  : 'text-[#666666] hover:text-[#333333]'
              }`}
            >
              Rooms 1-40 ({rooms.filter(r => !r.roomNumber.toLowerCase().includes('hall')).length})
            </button>
            <button
              onClick={() => setActiveFilter('PARTY_HALL')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-sm text-xs font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeFilter === 'PARTY_HALL'
                  ? 'bg-[#47614d] text-[#f7f7f2]'
                  : 'text-[#666666] hover:text-[#333333]'
              }`}
            >
              Party Hall (1)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" size={15} />
            <input
              type="text"
              placeholder="Search Room Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#f7f7f2] border border-[#cbc0ad] rounded-sm pl-10 pr-4 py-2 text-xs font-sans text-[#333333] placeholder-[#596277] focus:outline-none focus:border-[#cbc0ad]"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-[#cbc0ad] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-sans text-[#666666] mt-4">Loading QR directory...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-16 bg-[#f7f7f2] rounded-sm border border-[#cbc0ad]">
            <p className="text-xs font-sans text-[#666666]">No rooms or QR codes matched your search criteria.</p>
          </div>
        ) : (
          /* QR Code Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredRooms.map((room) => {
              const isPartyHall = room.roomNumber.toLowerCase().includes('hall');
              const targetUrl = `${window.location.origin}/order/${room.qrToken}`;
              const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(targetUrl)}`;

              return (
                <div
                  key={room._id}
                  className={`bg-[#47614d] text-[#f7f7f2] rounded-sm border p-6 flex flex-col justify-between hover:border-[#d9b57d] transition-all duration-300 shadow-md ${
                    isPartyHall ? 'border-[#d9b57d]' : 'border-[#f7f7f2]/15'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[#f7f7f2]/10 text-[#d9b57d]">
                          {isPartyHall ? 'Special Event Venue' : `Floor ${room.floor}`}
                        </span>
                        <h3 className="text-2xl font-serif text-[#f7f7f2] mt-1.5">
                          {isPartyHall ? room.roomNumber : `Room #${room.roomNumber}`}
                        </h3>
                      </div>
                      <span className="text-[9px] font-sans text-[#f7f7f2]/60 uppercase tracking-widest font-semibold">
                        QR Active
                      </span>
                    </div>

                    <p className="text-xs font-sans text-[#f7f7f2]/70 mb-5 line-clamp-1">
                      {room.roomTypeId?.name || (isPartyHall ? 'Grand Sambhrama Party Hall' : 'Standard Room')}
                    </p>

                    {/* QR Code Visual Container (Clickable / Scannable) */}
                    <div
                      onClick={() => navigate(`/order/${room.qrToken}`)}
                      className="bg-white p-5 rounded-sm flex flex-col items-center justify-center border border-[#cbc0ad] shadow-md group cursor-pointer hover:border-[#d9b57d] transition-all duration-300 relative"
                      title="Scan QR Code or Click to Open Dining & Bar Order Menu"
                    >
                      <img
                        src={qrImageUrl}
                        alt={`QR Code for ${room.roomNumber}`}
                        className="w-40 h-40 object-contain"
                        loading="lazy"
                      />
                      
                      <div className="mt-4 px-3.5 py-2 rounded-sm bg-[#47614d] text-[#f7f7f2] text-[10px] font-sans font-bold uppercase tracking-wider text-center flex items-center justify-center gap-1.5 group-hover:bg-[#d9b57d] group-hover:text-[#333333] transition-all">
                        <QrCode size={13} />
                        <span>Scan / Click to Order Food & Bar</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
