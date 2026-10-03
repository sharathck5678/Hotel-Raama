import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  X,
  AlertCircle,
  CalendarRange,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchInventoryStatus,
  createOfflineBooking,
  fetchOfflineBookings,
  updateOfflineBooking,
  cancelOfflineBooking,
} from '../../services/api';
import { ScrollReveal } from '../../components/ScrollReveal';

export interface IInventoryRoom {
  _id: string;
  roomNumber: string;
  floor: number;
  status: 'AVAILABLE' | 'OCCUPIED';
  isAc: boolean;
  roomType: {
    _id: string;
    name: string;
    code: string;
    basePrice: number;
    cpPrice: number;
    isAc: boolean;
  };
  activeBooking?: {
    _id: string;
    bookingId: string;
    source: 'ONLINE' | 'OFFLINE';
    guestName: string;
    guestPhone: string;
    checkIn: string;
    checkOut: string;
    adminNotes?: string;
    bookingStatus: string;
  } | null;
}

export interface IOfflineBookingRecord {
  _id: string;
  bookingId: string;
  source: 'OFFLINE';
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  assignedRoomId?: {
    _id: string;
    roomNumber: string;
    floor: number;
  };
  roomTypeId?: {
    _id: string;
    name: string;
    code: string;
  };
  checkIn: string;
  checkOut: string;
  numNights: number;
  totalAmount: number;
  bookingStatus: 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT';
  adminNotes?: string;
  createdAt: string;
}

export const AdminInventoryView: React.FC = () => {
  // Date range state (default today and tomorrow)
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [checkIn, setCheckIn] = useState<string>(getTodayStr());
  const [checkOut, setCheckOut] = useState<string>(getTomorrowStr());

  // Data states
  const [rooms, setRooms] = useState<IInventoryRoom[]>([]);
  const [offlineBookings, setOfflineBookings] = useState<IOfflineBookingRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'OFFLINE_LIST'>('INVENTORY');

  // Filters
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingBooking, setEditingBooking] = useState<IOfflineBookingRecord | null>(null);

  // Form states for Offline Booking
  const [formRoomId, setFormRoomId] = useState<string>('');
  const [formCheckIn, setFormCheckIn] = useState<string>(getTodayStr());
  const [formCheckOut, setFormCheckOut] = useState<string>(getTomorrowStr());
  const [formGuestName, setFormGuestName] = useState<string>('');
  const [formGuestPhone, setFormGuestPhone] = useState<string>('');
  const [formGuestEmail, setFormGuestEmail] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Load Inventory data
  const loadInventory = async (ci = checkIn, co = checkOut) => {
    setLoading(true);
    try {
      const res = await fetchInventoryStatus({ checkIn: ci, checkOut: co });
      if (res?.success && res.data?.rooms) {
        setRooms(res.data.rooms);
      } else {
        toast.error(res?.message || 'Failed to fetch inventory status.');
      }
    } catch (err: any) {
      toast.error('Network error loading inventory.');
    } finally {
      setLoading(false);
    }
  };

  // Load Offline Bookings list
  const loadOfflineBookings = async () => {
    try {
      const res = await fetchOfflineBookings();
      if (res?.success && Array.isArray(res.data)) {
        setOfflineBookings(res.data);
      }
    } catch (err) {
      console.error('Failed to load offline bookings list');
    }
  };

  useEffect(() => {
    loadInventory(checkIn, checkOut);
    loadOfflineBookings();
  }, []);

  const handleDateChange = (newCheckIn: string, newCheckOut: string) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    loadInventory(newCheckIn, newCheckOut);
  };

  const handleQuickPreset = (preset: 'TODAY' | 'TOMORROW' | 'WEEKEND' | 'NEXT7') => {
    const today = new Date();
    let ci = new Date();
    let co = new Date();

    if (preset === 'TODAY') {
      co.setDate(today.getDate() + 1);
    } else if (preset === 'TOMORROW') {
      ci.setDate(today.getDate() + 1);
      co.setDate(today.getDate() + 2);
    } else if (preset === 'WEEKEND') {
      const day = today.getDay();
      const diffToFriday = (5 - day + 7) % 7;
      ci.setDate(today.getDate() + (diffToFriday === 0 ? 7 : diffToFriday));
      co = new Date(ci);
      co.setDate(ci.getDate() + 2);
    } else if (preset === 'NEXT7') {
      co.setDate(today.getDate() + 7);
    }

    const ciStr = ci.toISOString().split('T')[0];
    const coStr = co.toISOString().split('T')[0];
    handleDateChange(ciStr, coStr);
  };

  const openAddModalForRoom = (room?: IInventoryRoom) => {
    const defaultRoomId = room ? room._id : rooms.find((r) => r.status === 'AVAILABLE')?._id || '';
    setFormRoomId(defaultRoomId);
    setFormCheckIn(checkIn);
    setFormCheckOut(checkOut);
    setFormGuestName('');
    setFormGuestPhone('');
    setFormGuestEmail('');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const handleCreateOfflineBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoomId || !formCheckIn || !formCheckOut) {
      toast.error('Please select room and dates.');
      return;
    }

    if (formCheckOut <= formCheckIn) {
      toast.error('Check-out date must be strictly after check-in date.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createOfflineBooking({
        roomId: formRoomId,
        checkIn: formCheckIn,
        checkOut: formCheckOut,
        guestName: formGuestName.trim() || 'Walk-in Guest',
        guestPhone: formGuestPhone.trim() || 'Offline Guest',
        guestEmail: formGuestEmail.trim() || undefined,
        adminNotes: formNotes.trim() || undefined,
      });

      if (res?.success) {
        toast.success(res.message || 'Physical booking confirmed!');
        setIsAddModalOpen(false);
        loadInventory(checkIn, checkOut);
        loadOfflineBookings();
      } else {
        toast.error(res?.message || 'Could not complete physical booking.');
      }
    } catch (err: any) {
      toast.error('Error creating physical booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId: string, roomNum?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel physical booking for Room #${roomNum || ''}? This will immediately release the room back to available inventory.`
    );
    if (!confirmed) return;

    try {
      const res = await cancelOfflineBooking(bookingId);
      if (res?.success) {
        toast.success('Physical booking cancelled. Room availability restored.');
        loadInventory(checkIn, checkOut);
        loadOfflineBookings();
      } else {
        toast.error(res?.message || 'Failed to cancel physical booking.');
      }
    } catch (err) {
      toast.error('Error cancelling physical booking.');
    }
  };

  const openEditModal = (booking: IOfflineBookingRecord) => {
    setEditingBooking(booking);
    setFormRoomId(booking.assignedRoomId?._id || '');
    setFormCheckIn(new Date(booking.checkIn).toISOString().split('T')[0]);
    setFormCheckOut(new Date(booking.checkOut).toISOString().split('T')[0]);
    setFormGuestName(booking.guestName || '');
    setFormGuestPhone(booking.guestPhone || '');
    setFormGuestEmail(booking.guestEmail || '');
    setFormNotes(booking.adminNotes || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateOfflineBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    setSubmitting(true);
    try {
      const res = await updateOfflineBooking(editingBooking._id, {
        roomId: formRoomId,
        checkIn: formCheckIn,
        checkOut: formCheckOut,
        guestName: formGuestName,
        guestPhone: formGuestPhone,
        guestEmail: formGuestEmail,
        adminNotes: formNotes,
      });

      if (res?.success) {
        toast.success('Physical booking updated successfully.');
        setIsEditModalOpen(false);
        setEditingBooking(null);
        loadInventory(checkIn, checkOut);
        loadOfflineBookings();
      } else {
        toast.error(res?.message || 'Failed to update physical booking.');
      }
    } catch (err: any) {
      toast.error('Error updating physical booking.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Floor filter
      if (floorFilter !== 'ALL' && String(room.floor) !== floorFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && room.status !== statusFilter) {
        return false;
      }
      // Room Type filter
      if (typeFilter !== 'ALL' && room.roomType.code !== typeFilter) {
        return false;
      }
      // Search query (room number or guest name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const numMatch = room.roomNumber.toLowerCase().includes(query);
        const guestMatch = room.activeBooking?.guestName.toLowerCase().includes(query);
        const bookingIdMatch = room.activeBooking?.bookingId.toLowerCase().includes(query);
        if (!numMatch && !guestMatch && !bookingIdMatch) {
          return false;
        }
      }
      return true;
    });
  }, [rooms, floorFilter, statusFilter, typeFilter, searchQuery]);

  // Metrics
  const totalCount = rooms.length;
  const availableCount = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const occupiedCount = rooms.filter((r) => r.status === 'OCCUPIED').length;

  return (
    <div className="space-y-6 text-[#00174A]">
      {/* Top Banner / Header */}
      <ScrollReveal direction="up" duration={0.6}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#10184A]/15 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Building2 className="text-[#8C6B1C]" size={24} />
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#00174A]">Inventory Management</h1>
            </div>
            <p className="text-xs font-sans text-[#667085] mt-1">
              Active 37 Physical Guest Rooms (Floors 1-3) • Single Source of Truth Availability
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openAddModalForRoom()}
              className="px-4 py-2 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] active:bg-[#D6B369]/90 text-xs font-bold uppercase tracking-wider rounded-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} /> Add Physical Booking
            </button>
            <button
              onClick={() => loadInventory(checkIn, checkOut)}
              title="Refresh inventory"
              className="p-2 bg-white border border-[#10184A]/20 hover:border-[#D6B369] text-[#00174A] rounded-sm transition-colors cursor-pointer"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 font-sans">
        <div className="bg-white p-3.5 sm:p-4 rounded-sm border border-[#10184A]/15 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#667085]">Total Rooms</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-[#00174A] mt-0.5">{totalCount}</p>
          </div>
          <Building2 size={24} className="text-[#00174A]/40" />
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-sm border border-emerald-500/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-800">Available</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 mt-0.5">{availableCount}</p>
          </div>
          <CheckCircle2 size={24} className="text-emerald-600" />
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-sm border border-rose-500/20 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-800">Occupied</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-rose-700 mt-0.5">{occupiedCount}</p>
          </div>
          <XCircle size={24} className="text-rose-600" />
        </div>
      </div>

      {/* Date Range Selector Box */}
      <div className="bg-white p-4 rounded-sm border border-[#10184A]/15 shadow-xs space-y-3 font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange size={16} className="text-[#8C6B1C]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#00174A]">Inspect Dates:</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-[11px] font-semibold text-[#667085]">Check-In:</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => handleDateChange(e.target.value, checkOut)}
                className="bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1 text-xs font-semibold text-[#00174A] focus:border-[#D6B369] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-[11px] font-semibold text-[#667085]">Check-Out:</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => handleDateChange(checkIn, e.target.value)}
                className="bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1 text-xs font-semibold text-[#00174A] focus:border-[#D6B369] focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] mr-1">Presets:</span>
            <button
              onClick={() => handleQuickPreset('TODAY')}
              className="px-2.5 py-1 bg-[#F7F0DF] hover:bg-[#E8DFC8] text-[#00174A] text-[11px] font-medium rounded-xs border border-[#10184A]/15 cursor-pointer transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => handleQuickPreset('TOMORROW')}
              className="px-2.5 py-1 bg-[#F7F0DF] hover:bg-[#E8DFC8] text-[#00174A] text-[11px] font-medium rounded-xs border border-[#10184A]/15 cursor-pointer transition-colors"
            >
              Tomorrow
            </button>
            <button
              onClick={() => handleQuickPreset('WEEKEND')}
              className="px-2.5 py-1 bg-[#F7F0DF] hover:bg-[#E8DFC8] text-[#00174A] text-[11px] font-medium rounded-xs border border-[#10184A]/15 cursor-pointer transition-colors"
            >
              Weekend
            </button>
            <button
              onClick={() => handleQuickPreset('NEXT7')}
              className="px-2.5 py-1 bg-[#F7F0DF] hover:bg-[#E8DFC8] text-[#00174A] text-[11px] font-medium rounded-xs border border-[#10184A]/15 cursor-pointer transition-colors"
            >
              Next 7 Days
            </button>
          </div>
        </div>

        <p className="text-[11px] text-[#667085]">
          Showing inventory occupancy for stay nights from{' '}
          <strong className="text-[#00174A]">{new Date(checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>{' '}
          to{' '}
          <strong className="text-[#00174A]">{new Date(checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.
        </p>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#10184A]/15 pb-1">
          <button
            onClick={() => setActiveTab('INVENTORY')}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer ${
              activeTab === 'INVENTORY'
                ? 'bg-[#00174A] text-[#FAF9F6]'
                : 'bg-white text-[#00174A] hover:bg-[#F7F0DF]'
            }`}
          >
            37-Room Physical Grid
          </button>
          <button
            onClick={() => setActiveTab('OFFLINE_LIST')}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer ${
              activeTab === 'OFFLINE_LIST'
                ? 'bg-[#00174A] text-[#FAF9F6]'
                : 'bg-white text-[#00174A] hover:bg-[#F7F0DF]'
            }`}
          >
            Physical Bookings Log ({offlineBookings.length})
          </button>
        </div>

        {/* Search & Filter Controls (When on Grid) */}
        {activeTab === 'INVENTORY' && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[#667085]" />
              <input
                type="text"
                placeholder="Search Room / Guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-[#10184A]/20 rounded-xs text-xs text-[#00174A] focus:border-[#D6B369] focus:outline-none w-44"
              />
            </div>

            {/* Floor filter */}
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="bg-white border border-[#10184A]/20 rounded-xs px-2.5 py-1.5 text-xs font-medium text-[#00174A] focus:border-[#D6B369]"
            >
              <option value="ALL">All Floors (37)</option>
              <option value="1">Floor 1 (14 Rooms)</option>
              <option value="2">Floor 2 (18 Rooms)</option>
              <option value="3">Floor 3 (5 Rooms)</option>
            </select>

            {/* Status filter: ONLY AVAILABLE OR OCCUPIED */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white border border-[#10184A]/20 rounded-xs px-2.5 py-1.5 text-xs font-medium text-[#00174A] focus:border-[#D6B369]"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">🟢 Available Only</option>
              <option value="OCCUPIED">🔴 Occupied Only</option>
            </select>

            {/* Room Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-[#10184A]/20 rounded-xs px-2.5 py-1.5 text-xs font-medium text-[#00174A] focus:border-[#D6B369]"
            >
              <option value="ALL">All Categories</option>
              <option value="EXEC_DBL_AC">Executive Double A/C (22)</option>
              <option value="PREM_DBL_NONAC">Premium Double Non-AC (7)</option>
              <option value="TRIPLE_EXEC">Triple A/C (5)</option>
              <option value="TRIPLE_PREM">Triple Non-AC (1)</option>
              <option value="SUITE_ROOM">Suite (2)</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: 37-ROOM PHYSICAL GRID */}
      {activeTab === 'INVENTORY' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6B369]"></div>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-sm border border-[#10184A]/15 font-sans">
              <Building2 size={36} className="mx-auto text-[#667085] opacity-50 mb-2" />
              <p className="text-sm font-semibold text-[#00174A]">No rooms match the selected filters.</p>
              <button
                onClick={() => {
                  setFloorFilter('ALL');
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                  setSearchQuery('');
                }}
                className="mt-3 text-xs text-[#8C6B1C] underline font-medium cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {[1, 2, 3].map((floorNum) => {
                const floorRooms = filteredRooms.filter((r) => r.floor === floorNum);
                if (floorRooms.length === 0) return null;

                return (
                  <div key={floorNum} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#10184A]/10 pb-1.5">
                      <span className="text-xs font-serif font-bold uppercase tracking-widest text-[#8C6B1C]">
                        Floor {floorNum}
                      </span>
                      <span className="text-[11px] text-[#667085]">
                        ({floorRooms.length} {floorRooms.length === 1 ? 'room' : 'rooms'})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 font-sans">
                      {floorRooms.map((room) => {
                        const isAvailable = room.status === 'AVAILABLE';

                        return (
                          <div
                            key={room._id}
                            className={`p-3.5 rounded-sm border transition-all flex flex-col justify-between h-full bg-white shadow-xs ${
                              isAvailable
                                ? 'border-emerald-600/30 hover:border-emerald-600'
                                : 'border-rose-600/30 hover:border-rose-600 bg-rose-50/20'
                            }`}
                          >
                            {/* Card Top: Room Number & Status Badge */}
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-serif text-base font-bold text-[#00174A]">
                                  Room #{room.roomNumber}
                                </span>

                                {/* STRICTLY TWO STATUSES: AVAILABLE or OCCUPIED */}
                                {isAvailable ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                    AVAILABLE
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                    OCCUPIED
                                  </span>
                                )}
                              </div>

                              {/* Room Type & Details */}
                              <div className="mt-1.5 space-y-0.5">
                                <p className="text-[11px] font-semibold text-[#8C6B1C] truncate">
                                  {room.roomType.name}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-[#667085]">
                                  <span>Floor {room.floor}</span>
                                  <span>•</span>
                                  <span>{room.isAc ? 'A/C' : 'Non A/C'}</span>
                                  <span>•</span>
                                  <span>₹{room.roomType.basePrice}/nt</span>
                                </div>
                              </div>
                            </div>

                            {/* Card Body: Active Booking Details if Occupied */}
                            {!isAvailable && room.activeBooking && (
                              <div className="mt-3 pt-2.5 border-t border-rose-200/60 text-[10px] space-y-1 text-[#00174A]">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-rose-900 truncate">
                                    {room.activeBooking.guestName}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.2 bg-rose-200/70 text-rose-900 rounded-xs font-mono font-bold">
                                    {room.activeBooking.source}
                                  </span>
                                </div>
                                <div className="text-[#667085] flex items-center justify-between">
                                  <span>{room.activeBooking.bookingId}</span>
                                  <span>
                                    {new Date(room.activeBooking.checkIn).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                    })}{' '}
                                    -{' '}
                                    {new Date(room.activeBooking.checkOut).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                    })}
                                  </span>
                                </div>
                                {room.activeBooking.adminNotes && (
                                  <p className="italic text-[#667085] truncate">
                                    "{room.activeBooking.adminNotes}"
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Card Footer: Action */}
                            <div className="mt-3 pt-2">
                              {isAvailable ? (
                                <button
                                  onClick={() => openAddModalForRoom(room)}
                                  className="w-full py-1.5 bg-[#D6B369]/20 hover:bg-[#D6B369] text-[#8C6B1C] hover:text-[#00174A] active:bg-[#D6B369] text-[10px] font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Plus size={12} /> Book Offline
                                </button>
                              ) : room.activeBooking?.source === 'OFFLINE' ? (
                                <button
                                  onClick={() =>
                                    handleCancelBooking(room.activeBooking!._id, room.roomNumber)
                                  }
                                  className="w-full py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 hover:border-rose-400 text-[10px] font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                                >
                                  Cancel Booking
                                </button>
                              ) : (
                                <div className="text-center text-[10px] font-medium text-[#667085] py-0.5">
                                  Online Reservation
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: OFFLINE BOOKINGS MANAGEMENT LIST */}
      {activeTab === 'OFFLINE_LIST' && (
        <div className="bg-white rounded-sm border border-[#10184A]/15 shadow-xs overflow-hidden font-sans">
          <div className="p-4 border-b border-[#10184A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#00174A]">
                Physical / Walk-In Bookings Ledger
              </h2>
              <p className="text-[11px] text-[#667085]">
                Direct hotel bookings recorded in PMS. Cancelling automatically restores physical inventory.
              </p>
            </div>
            <button
              onClick={() => openAddModalForRoom()}
              className="px-3 py-1.5 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> New Physical Booking
            </button>
          </div>

          {offlineBookings.length === 0 ? (
            <div className="p-8 text-center text-[#667085] text-xs">
              No offline physical bookings recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#00174A]">
                <thead className="bg-[#FAF9F6] border-b border-[#10184A]/10 text-[10px] font-bold uppercase tracking-wider text-[#667085]">
                  <tr>
                    <th className="py-2.5 px-4">Booking ID</th>
                    <th className="py-2.5 px-4">Room</th>
                    <th className="py-2.5 px-4">Guest Details</th>
                    <th className="py-2.5 px-4">Stay Dates</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Notes</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10184A]/10">
                  {offlineBookings.map((bk) => {
                    const isCancelled = bk.bookingStatus === 'CANCELLED';

                    return (
                      <tr key={bk._id} className={isCancelled ? 'opacity-50 bg-gray-50' : 'hover:bg-[#FAF9F6]'}>
                        <td className="py-3 px-4 font-mono font-bold text-[11px]">{bk.bookingId}</td>
                        <td className="py-3 px-4">
                          <span className="font-serif font-bold text-sm">
                            Room #{bk.assignedRoomId?.roomNumber || 'N/A'}
                          </span>
                          <span className="text-[10px] block text-[#667085]">
                            {bk.roomTypeId?.name || 'Executive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-xs">{bk.guestName}</p>
                          <p className="text-[10px] text-[#667085]">{bk.guestPhone}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[11px] font-medium">
                            {new Date(bk.checkIn).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            →{' '}
                            {new Date(bk.checkOut).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <span className="text-[10px] text-[#667085]">{bk.numNights} night(s)</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-xs">₹{bk.totalAmount}</td>
                        <td className="py-3 px-4">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              CANCELLED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              CONFIRMED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-[#667085] max-w-xs truncate">
                          {bk.adminNotes || '—'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {!isCancelled && (
                            <>
                              <button
                                onClick={() => openEditModal(bk)}
                                title="Edit booking dates or guest"
                                className="p-1.5 text-[#00174A] hover:bg-[#F7F0DF] rounded-xs cursor-pointer"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() =>
                                  handleCancelBooking(bk._id, bk.assignedRoomId?.roomNumber)
                                }
                                title="Cancel booking & free room"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xs cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD PHYSICAL BOOKING */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-[#10184A]/25 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans text-[#00174A] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#10184A]/10 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="text-[#8C6B1C]" size={20} />
                <h3 className="font-serif text-lg font-bold">Add Physical / Walk-In Booking</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#667085] hover:text-[#00174A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOfflineBooking} className="space-y-4 text-xs">
              {/* Room Selection (strictly 37 active guest rooms) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                  Select Physical Room *
                </label>
                <select
                  value={formRoomId}
                  onChange={(e) => setFormRoomId(e.target.value)}
                  required
                  className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs font-bold text-[#00174A] focus:border-[#D6B369]"
                >
                  <option value="">-- Choose Active Guest Room --</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      Room #{r.roomNumber} (Floor {r.floor} • {r.roomType.name} • ₹{r.roomType.basePrice})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                    Check-In Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs font-semibold text-[#00174A] focus:border-[#D6B369]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                    Check-Out Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={formCheckIn}
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs font-semibold text-[#00174A] focus:border-[#D6B369]"
                  />
                </div>
              </div>

              {/* Guest Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                    Guest Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe / Walk-in"
                    value={formGuestName}
                    onChange={(e) => setFormGuestName(e.target.value)}
                    className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs text-[#00174A] focus:border-[#D6B369]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                    Guest Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formGuestPhone}
                    onChange={(e) => setFormGuestPhone(e.target.value)}
                    className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs text-[#00174A] focus:border-[#D6B369]"
                  />
                </div>
              </div>

              {/* Guest Email */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                  Guest Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. guest@example.com"
                  value={formGuestEmail}
                  onChange={(e) => setFormGuestEmail(e.target.value)}
                  className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs text-[#00174A] focus:border-[#D6B369]"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                  Admin Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cash settled at reception, special request for early arrival"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs text-[#00174A] focus:border-[#D6B369]"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xs border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 text-amber-700 mt-0.5" />
                <span>
                  This booking will immediately block the room in the live website availability engine. No payment gateway or confirmation emails are triggered.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#10184A]/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#10184A]/20 text-[#00174A] text-xs font-semibold rounded-xs hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Confirming...' : 'Confirm Physical Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PHYSICAL BOOKING */}
      {isEditModalOpen && editingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-sm border border-[#10184A]/25 max-w-lg w-full p-6 shadow-2xl space-y-4 font-sans text-[#00174A]">
            <div className="flex items-center justify-between border-b border-[#10184A]/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="text-[#8C6B1C]" size={18} />
                <h3 className="font-serif text-lg font-bold">Edit Booking {editingBooking.bookingId}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#667085] hover:text-[#00174A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateOfflineBooking} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                  Assigned Room
                </label>
                <select
                  value={formRoomId}
                  onChange={(e) => setFormRoomId(e.target.value)}
                  required
                  className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs font-bold text-[#00174A] focus:border-[#D6B369]"
                >
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      Room #{r.roomNumber} (Floor {r.floor} • {r.roomType.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                    Check-In Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs font-semibold text-[#00174A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                    Check-Out Date
                  </label>
                  <input
                    type="date"
                    required
                    min={formCheckIn}
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs font-semibold text-[#00174A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    value={formGuestName}
                    onChange={(e) => setFormGuestName(e.target.value)}
                    className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs text-[#00174A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                    Guest Phone
                  </label>
                  <input
                    type="tel"
                    value={formGuestPhone}
                    onChange={(e) => setFormGuestPhone(e.target.value)}
                    className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs text-[#00174A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs p-2 text-xs text-[#00174A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#10184A]/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-[#10184A]/20 text-[#00174A] text-xs font-semibold rounded-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] text-xs font-bold uppercase tracking-wider rounded-xs"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminInventoryView;
