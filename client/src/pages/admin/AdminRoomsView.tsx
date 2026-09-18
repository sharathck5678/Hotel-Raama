import React, { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminRooms, updateRoomStatus } from '../../services/api';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '../../components/ScrollReveal';

export const AdminRoomsView: React.FC = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRooms = () => {
    fetchAdminRooms()
      .then((res) => {
        if (res.success) setRooms(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleStatusChange = async (roomId: string, newStatus: string) => {
    try {
      const res = await updateRoomStatus(roomId, newStatus);
      if (res.success) {
        toast.success(`Room status updated to ${newStatus}`);
        loadRooms();
      }
    } catch (err) {
      toast.error('Failed to update room status.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#00174A]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6B369]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 text-[#00174A]">
      <ScrollReveal direction="up" duration={0.8}>
        <div className="border-b border-[#10184A]/15 pb-4">
          <h1 className="text-xl sm:text-2xl font-serif text-[#00174A]">Rooms & QR Ordering Directory</h1>
          <p className="text-xs font-sans text-[#667085]">40 Rooms (1 to 40) + Sambhrama Banquet Hall & Board Room live status</p>
        </div>
      </ScrollReveal>

      <ScrollRevealGroup staggerDelay={0.03} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {rooms.map((room) => (
          <ScrollRevealItem key={room._id}>
            <div
              className="bg-[#F7F0DF] text-[#00174A] p-3 sm:p-4 rounded-sm border border-[#10184A]/25 space-y-2.5 sm:space-y-3 shadow-sm hover:border-[#D6B369] transition-all flex flex-col justify-between font-sans text-xs h-full"
            >
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base font-serif font-bold text-[#00174A] truncate">
                    {isNaN(Number(room.roomNumber)) ? room.roomNumber : `Room #${room.roomNumber}`}
                  </span>
                  <span className="text-[10px] text-[#00174A]/60 shrink-0 font-medium">Fl {room.floor}</span>
                </div>
                <p className="text-[10px] text-[#8C6B1C] font-semibold mt-0.5 truncate">{room.roomTypeId?.name || 'Executive'}</p>
              </div>


              <div className="space-y-2 pt-1">
                <select
                  value={room.status}
                  onChange={(e) => handleStatusChange(room._id, e.target.value)}
                  className="w-full bg-white text-xs font-bold text-[#00174A] border border-[#10184A]/25 rounded-sm p-1.5 focus:border-[#D6B369] cursor-pointer shadow-xs"
                >
                  <option value="AVAILABLE" className="bg-[#FAF9F6] text-[#00174A]">AVAILABLE</option>
                  <option value="OCCUPIED" className="bg-[#FAF9F6] text-[#00174A]">OCCUPIED</option>
                  <option value="RESERVED" className="bg-[#FAF9F6] text-[#00174A]">RESERVED</option>
                  <option value="CLEANING" className="bg-[#FAF9F6] text-[#00174A]">CLEANING</option>
                  <option value="MAINTENANCE" className="bg-[#FAF9F6] text-[#00174A]">MAINTENANCE</option>
                </select>

                <a
                  href={`/order/${room.qrToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] active:bg-[#D6B369]/90 text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1 transition-all shadow-xs"
                >
                  <QrCode size={12} /> Test QR Link
                </a>
              </div>
            </div>
          </ScrollRevealItem>
        ))}
      </ScrollRevealGroup>
    </div>
  );
};

