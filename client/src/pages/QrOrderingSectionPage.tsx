import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Building2, Sparkles, Utensils, Download, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchAllQrCodes } from '../services/api';

export const QrOrderingSectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ROOMS' | 'PARTY_HALL'>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  /**
   * Generates clean, production-grade filenames matching specification:
   * e.g., hotel-raama-room-1-qr.png, hotel-raama-party-hall-qr.png
   */
  const getQrFileName = (room: any): string => {
    const rawNumber = String(room.roomNumber || '').toLowerCase().trim();
    if (rawNumber.includes('party') || rawNumber.includes('hall')) {
      return 'hotel-raama-party-hall-qr.png';
    }
    // Remove "room", "#", spaces, and non-alphanumeric chars
    const cleanNum = rawNumber.replace(/room\s*#?/gi, '').replace(/[^a-z0-9_-]/gi, '').trim();
    return `hotel-raama-room-${cleanNum || 'unspecified'}-qr.png`;
  };

  /**
   * Downloads a high-quality clean PNG of the room QR code
   */
  const downloadSingleQr = async (room: any, showToast = true) => {
    try {
      const targetUrl = `${window.location.origin}/order/${room.qrToken}`;
      const highResQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&margin=10&data=${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(highResQrUrl);
      if (!response.ok) throw new Error('Network response failed');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = getQrFileName(room);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      if (showToast) {
        toast.success(`Downloaded QR: ${getQrFileName(room)}`);
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
      // Direct link fallback
      const targetUrl = `${window.location.origin}/order/${room.qrToken}`;
      const highResQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&margin=10&data=${encodeURIComponent(targetUrl)}`;
      const link = document.createElement('a');
      link.href = highResQrUrl;
      link.target = '_blank';
      link.download = getQrFileName(room);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (showToast) {
        toast.success(`Initiated QR download: ${getQrFileName(room)}`);
      }
    }
  };

  /**
   * Downloads multiple QR codes sequentially with stagger to prevent browser throttling
   */
  const downloadBulkQr = async (roomList: any[], label: string) => {
    if (!roomList || roomList.length === 0) {
      toast.error('No QR codes available to download.');
      return;
    }

    setDownloading(true);
    toast.info(`Preparing ${roomList.length} high-resolution QR PNG files for ${label}...`);

    try {
      for (let i = 0; i < roomList.length; i++) {
        await downloadSingleQr(roomList[i], false);
        // Small 200ms stagger between files so browser doesn't block bulk downloads
        if (i < roomList.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 220));
        }
      }
      toast.success(`Successfully downloaded all ${roomList.length} QR codes.`);
    } catch (err) {
      console.error('Bulk download encountered an issue:', err);
      toast.error('Bulk download interrupted. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

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
        <div className="bg-[#f7f7f2] p-4 rounded-sm border border-[#cbc0ad] flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-[#0B1849]/5 p-1 rounded-sm border border-[#cbc0ad] w-full lg:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`flex-1 lg:flex-initial px-4 py-2 rounded-sm text-xs font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'ALL'
                  ? 'bg-[#47614d] text-[#f7f7f2]'
                  : 'text-[#666666] hover:text-[#333333]'
              }`}
            >
              All QR Codes ({rooms.length})
            </button>
            <button
              onClick={() => setActiveFilter('ROOMS')}
              className={`flex-1 lg:flex-initial px-4 py-2 rounded-sm text-xs font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'ROOMS'
                  ? 'bg-[#47614d] text-[#f7f7f2]'
                  : 'text-[#666666] hover:text-[#333333]'
              }`}
            >
              Rooms 1-40 ({rooms.filter(r => !r.roomNumber.toLowerCase().includes('hall')).length})
            </button>
            <button
              onClick={() => setActiveFilter('PARTY_HALL')}
              className={`flex-1 lg:flex-initial px-4 py-2 rounded-sm text-xs font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'PARTY_HALL'
                  ? 'bg-[#47614d] text-[#f7f7f2]'
                  : 'text-[#666666] hover:text-[#333333]'
              }`}
            >
              Party Hall (1)
            </button>
          </div>

          {/* Search Box & Download Button Group */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" size={15} />
              <input
                type="text"
                placeholder="Search Room Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#f7f7f2] border border-[#cbc0ad] rounded-sm pl-10 pr-4 py-2 text-xs font-sans text-[#333333] placeholder-[#596277] focus:outline-none focus:border-[#47614d] transition-colors"
              />
            </div>

            {/* DOWNLOAD PNG Dropdown Action */}
            <div className="relative w-full sm:w-auto" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                disabled={downloading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#47614d] text-[#f7f7f2] hover:bg-[#3d5442] active:bg-[#344838] border border-[#3d5442] rounded-sm text-xs font-sans font-semibold uppercase tracking-wider shadow-sm transition-all duration-200 cursor-pointer hover:border-[#d9b57d] disabled:opacity-60 disabled:cursor-not-allowed"
                title="Download QR Codes as high-quality PNG"
              >
                <Download size={14} className="text-[#d9b57d]" />
                <span>{downloading ? 'Downloading...' : 'DOWNLOAD PNG'}</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#f7f7f2] rounded-sm border border-[#cbc0ad] shadow-xl py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-[#cbc0ad]/60 mb-1">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#47614d]">
                      QR PNG Export Options
                    </span>
                  </div>

                  {/* 1. Download All QR Codes */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      downloadBulkQr(rooms, 'All QR Codes');
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-sans text-[#333333] hover:bg-[#47614d] hover:text-[#f7f7f2] flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Download size={13} className="text-[#47614d] group-hover:text-[#d9b57d] shrink-0" />
                      <span className="font-semibold">Download All QR Codes</span>
                    </div>
                    <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-sm bg-[#0B1849]/5 group-hover:bg-[#f7f7f2]/20 font-bold">
                      {rooms.length} PNGs
                    </span>
                  </button>

                  {/* 2. Download Filtered QR Codes */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      downloadBulkQr(filteredRooms, 'Filtered QR Codes');
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-sans text-[#333333] hover:bg-[#47614d] hover:text-[#f7f7f2] flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2">
                      <Download size={13} className="text-[#47614d] group-hover:text-[#d9b57d] shrink-0" />
                      <span className="font-semibold">Download Filtered QR Codes</span>
                    </div>
                    <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-sm bg-[#0B1849]/5 group-hover:bg-[#f7f7f2]/20 font-bold">
                      {filteredRooms.length} PNGs
                    </span>
                  </button>

                  {/* 3. Download Individual QR Code Helper */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      toast.info('Click the "DOWNLOAD PNG" button on any room card below.');
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-sans text-[#333333] hover:bg-[#47614d] hover:text-[#f7f7f2] flex items-center justify-between transition-colors cursor-pointer group border-t border-[#cbc0ad]/40 mt-1 pt-2"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode size={13} className="text-[#47614d] group-hover:text-[#d9b57d] shrink-0" />
                      <span className="font-semibold">Download Individual QR Code</span>
                    </div>
                    <span className="text-[10px] text-[#666666] group-hover:text-[#f7f7f2]/80">
                      Per Card
                    </span>
                  </button>
                </div>
              )}
            </div>
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

                      <span className="text-[9px] font-sans text-[#d9b57d] bg-[#f7f7f2]/10 px-2 py-1 rounded-sm uppercase tracking-widest font-semibold border border-[#f7f7f2]/15">
                        QR Active
                      </span>
                    </div>

                    <p className="text-xs font-sans text-[#f7f7f2]/70 mb-5 line-clamp-1">
                      {room.roomTypeId?.name || (isPartyHall ? 'Grand Sambhrama Party Hall' : 'Standard Room')}
                    </p>

                    {/* QR Code Visual Container */}
                    <div className="bg-white p-5 rounded-sm flex flex-col items-center justify-center border border-[#cbc0ad] shadow-md transition-all duration-300">
                      <div
                        onClick={() => navigate(`/order/${room.qrToken}`)}
                        className="cursor-pointer group flex flex-col items-center"
                        title="Click to preview order menu in browser"
                      >
                        <img
                          src={qrImageUrl}
                          alt={`QR Code for ${room.roomNumber}`}
                          className="w-40 h-40 object-contain group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      </div>
                      
                      {/* Big, Prominent DOWNLOAD PNG Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSingleQr(room);
                        }}
                        className="mt-4 w-full py-3 px-4 rounded-sm bg-[#47614d] text-[#f7f7f2] hover:bg-[#d9b57d] hover:text-[#0B1849] active:bg-[#c49f67] text-xs font-sans font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-sm transition-all duration-200 cursor-pointer border border-[#3d5442] hover:border-[#d9b57d]"
                        title={`Download high-quality PNG for ${isPartyHall ? room.roomNumber : `Room #${room.roomNumber}`}`}
                      >
                        <Download size={16} />
                        <span>Download PNG</span>
                      </button>
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
