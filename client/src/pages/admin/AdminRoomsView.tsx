import React, { useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminRooms, updateRoomStatus } from '../../services/api';

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
      <div className="flex items-center justify-center py-20 text-[#333333]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cbc0ad]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 text-[#333333]">
      <div className="border-b border-[#cbc0ad] pb-4">
        <h1 className="text-xl sm:text-2xl font-serif text-[#333333]">Rooms & QR Ordering Directory</h1>
        <p className="text-xs font-sans text-[#666666]">40 Rooms (1 to 40) + Sambhrama Party Hall & Board Room live status</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {rooms.map((room) => (
          <div
            key={room._id}
            className="bg-[#47614d] text-[#f7f7f2] p-3 sm:p-4 rounded-sm border border-[#f7f7f2]/15 space-y-2.5 sm:space-y-3 shadow-md flex flex-col justify-between font-sans text-xs"
          >
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm sm:text-base font-serif font-bold text-[#f7f7f2] truncate">
                  {isNaN(Number(room.roomNumber)) ? room.roomNumber : `Room #${room.roomNumber}`}
                </span>
                <span className="text-[10px] text-[#f7f7f2]/50 shrink-0">Fl {room.floor}</span>
              </div>
              <p className="text-[10px] text-[#d9b57d] mt-0.5 truncate">{room.roomTypeId?.name || 'Executive'}</p>
            </div>


            <div className="space-y-2 pt-1">
              <select
                value={room.status}
                onChange={(e) => handleStatusChange(room._id, e.target.value)}
                className="w-full bg-[#f7f7f2]/10 text-xs font-bold text-[#f7f7f2] border border-[#f7f7f2]/20 rounded-sm p-1.5 focus:border-[#d9b57d] cursor-pointer"
              >
                <option value="AVAILABLE" className="bg-[#181e19] text-[#f7f7f2]">AVAILABLE</option>
                <option value="OCCUPIED" className="bg-[#181e19] text-[#f7f7f2]">OCCUPIED</option>
                <option value="RESERVED" className="bg-[#181e19] text-[#f7f7f2]">RESERVED</option>
                <option value="CLEANING" className="bg-[#181e19] text-[#f7f7f2]">CLEANING</option>
                <option value="MAINTENANCE" className="bg-[#181e19] text-[#f7f7f2]">MAINTENANCE</option>
              </select>

              <a
                href={`/order/${room.qrToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-1.5 bg-[#f7f7f2] text-[#333333] hover:bg-[#d9b57d] active:bg-[#c4a065] text-[10px] font-bold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1 transition-all"
              >
                <QrCode size={12} /> Test QR Link
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

