import React, { useEffect, useState } from 'react';
import { X, ArrowRightLeft, Calendar, AlertCircle, CheckCircle2, User, Info } from 'lucide-react';
import { toast } from 'sonner';
import { fetchCandidateRoomsForBooking, reassignBookingRoom } from '../../services/api';

export interface CandidateRoom {
  _id: string;
  roomNumber: string;
  floor: number;
  roomType: {
    _id: string;
    name: string;
    code: string;
    basePrice: number;
    cpPrice: number;
    isAc: boolean;
    maxOccupancy: number;
  };
}

export interface ReassignRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedBooking?: any) => void;
  booking: any | null;
}

export const ReassignRoomModal: React.FC<ReassignRoomModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  booking,
}) => {
  const [candidateRooms, setCandidateRooms] = useState<CandidateRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current booking display values
  const bookingId = booking?.bookingId || booking?._id || '—';
  const guestName = booking?.guestName || 'Valued Guest';
  const roomCategoryName =
    booking?.roomTypeId?.name ||
    (typeof booking?.roomTypeId === 'string' ? booking.roomTypeId : 'Executive Room');
  const currentRoomNumber =
    booking?.assignedRoomId?.roomNumber ||
    (typeof booking?.assignedRoomId === 'string' ? booking.assignedRoomId : 'Not Assigned');

  const checkInDate = booking?.checkIn
    ? new Date(booking.checkIn).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const checkOutDate = booking?.checkOut
    ? new Date(booking.checkOut).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const numNights =
    booking?.numNights ||
    (booking?.checkIn && booking?.checkOut
      ? Math.max(
          1,
          Math.round(
            (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 1);

  useEffect(() => {
    if (!isOpen || !booking) {
      setCandidateRooms([]);
      setSelectedRoomId('');
      setErrorMessage(null);
      return;
    }

    const bRef = booking._id || booking.bookingId;
    setLoading(true);
    setErrorMessage(null);

    fetchCandidateRoomsForBooking(bRef)
      .then((res) => {
        if (res?.success && Array.isArray(res.data?.candidateRooms)) {
          const rooms: CandidateRoom[] = res.data.candidateRooms;
          setCandidateRooms(rooms);
          if (rooms.length > 0) {
            setSelectedRoomId(rooms[0]._id);
          } else {
            setSelectedRoomId('');
          }
        } else {
          setErrorMessage(res?.message || 'No compatible rooms available.');
          setCandidateRooms([]);
        }
      })
      .catch((err) => {
        setErrorMessage(err?.message || 'Failed to load candidate rooms.');
        setCandidateRooms([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, booking]);

  const handleConfirmReassignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !selectedRoomId) {
      toast.error('Please choose a valid alternative physical room.');
      return;
    }

    const selectedRoom = candidateRooms.find((r) => r._id === selectedRoomId);
    setSubmitting(true);

    try {
      const bRef = booking._id || booking.bookingId;
      const res = await reassignBookingRoom(bRef, selectedRoomId);

      if (res?.success) {
        toast.success(
          res.message ||
            `Room successfully reassigned to Room #${selectedRoom?.roomNumber || selectedRoomId}!`
        );
        onSuccess(res.data);
        onClose();
      } else {
        toast.error(res?.message || 'Failed to reassign room. Current assignment remains unchanged.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error occurred while reassigning room.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !booking) return null;

  const selectedCandidate = candidateRooms.find((r) => r._id === selectedRoomId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF9F6] border border-[#D6B369]/50 rounded-sm shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 text-[#00174A] font-sans animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#10184A]/15 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#00174A]/10 text-[#00174A] rounded-sm">
              <ArrowRightLeft size={18} className="text-[#8C6B1C]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#00174A]">
                Reassign Physical Room
              </h3>
              <p className="text-[11px] text-[#667085] font-sans">
                Change assigned room while strictly preserving live inventory consistency
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#667085] hover:text-[#00174A] hover:bg-[#10184A]/10 rounded-sm transition-colors cursor-pointer"
            title="Cancel and Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Booking Summary Card */}
        <div className="bg-white p-3.5 rounded-sm border border-[#10184A]/15 space-y-2 text-xs mb-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#10184A]/10 pb-2">
            <div className="flex items-center gap-1.5">
              <User size={13} className="text-[#8C6B1C]" />
              <span className="font-bold text-[#00174A] text-sm">{guestName}</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#00174A]/10 text-[#00174A] px-2 py-0.5 rounded-sm">
              Ref: {bookingId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div>
              <span className="text-[#667085] block text-[10px] uppercase tracking-wider font-semibold">
                Room Category
              </span>
              <span className="font-semibold text-[#00174A]">{roomCategoryName}</span>
            </div>

            <div>
              <span className="text-[#667085] block text-[10px] uppercase tracking-wider font-semibold">
                Current Assigned Room
              </span>
              <span className="font-serif font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                Room #{currentRoomNumber}
              </span>
            </div>

            <div className="col-span-2 flex items-center justify-between pt-1 border-t border-[#10184A]/10">
              <div className="flex items-center gap-1 text-[#667085]">
                <Calendar size={12} />
                <span>Stay Window:</span>
              </div>
              <span className="font-semibold text-[#00174A]">
                {checkInDate} → {checkOutDate}{' '}
                <span className="text-slate-500 font-normal">
                  ({numNights} night{numNights > 1 ? 's' : ''})
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-10 text-center space-y-2">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#D6B369] mx-auto"></div>
            <p className="text-xs text-[#667085]">Finding compatible available physical rooms...</p>
          </div>
        ) : candidateRooms.length === 0 ? (
          /* No Compatible Rooms Warning */
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-sm p-4 text-amber-900 text-xs flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-900 mb-1">
                  No Compatible Rooms Available
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  No alternative physical rooms are available in this category that are completely free
                  for the selected stay dates ({checkInDate} to {checkOutDate}).
                </p>
                <p className="text-[10px] text-amber-700 mt-2 italic">
                  The original assignment (Room #{currentRoomNumber}) remains safely unchanged.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#10184A]/15">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#00174A] text-white hover:bg-[#10184A] text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Reassignment Form */
          <form onSubmit={handleConfirmReassignment} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#667085] mb-1.5">
                Select Alternative Physical Room *
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                required
                className="w-full bg-white border border-[#10184A]/25 rounded-sm p-2.5 text-xs font-semibold text-[#00174A] focus:border-[#D6B369] focus:outline-none"
              >
                {candidateRooms.map((r) => (
                  <option key={r._id} value={r._id}>
                    Room #{r.roomNumber} (Floor {r.floor} • {r.roomType.name}
                    {r.roomType.isAc ? ' • A/C' : ' • Non A/C'})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[#667085] mt-1">
                Showing {candidateRooms.length} compatible candidate room
                {candidateRooms.length > 1 ? 's' : ''} available for all {numNights} night
                {numNights > 1 ? 's' : ''}.
              </p>
            </div>

            {/* Selected Target Room Preview */}
            {selectedCandidate && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-sm p-3 text-emerald-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <CheckCircle2 size={14} className="text-emerald-700" />
                  <span>Target Allocation: Room #{selectedCandidate.roomNumber}</span>
                </div>
                <div className="text-[11px] text-emerald-800 flex items-center gap-3">
                  <span>Floor {selectedCandidate.floor}</span>
                  <span>•</span>
                  <span>{selectedCandidate.roomType.name}</span>
                  <span>•</span>
                  <span>{selectedCandidate.roomType.isAc ? 'A/C' : 'Non A/C'}</span>
                </div>
              </div>
            )}

            {/* Explanatory Notice */}
            <div className="bg-[#00174A]/5 p-2.5 rounded-sm border border-[#10184A]/10 text-[11px] text-[#00174A]/80 flex items-start gap-2">
              <Info size={14} className="shrink-0 text-[#8C6B1C] mt-0.5" />
              <span>
                Confirming reassignment will immediately release Room #{currentRoomNumber} and reserve
                Room #{selectedCandidate?.roomNumber} for the dates {checkInDate} – {checkOutDate}.
                All financial snapshots, dates, and guest details will be strictly preserved.
              </span>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-300 text-rose-800 p-2.5 rounded-sm text-xs flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#10184A]/15">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 border border-[#10184A]/20 text-[#00174A] text-xs font-semibold rounded-sm hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedRoomId}
                className="px-5 py-2 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] text-xs font-bold uppercase tracking-wider rounded-sm shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#00174A]"></div>
                    <span>Reassigning...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={13} />
                    <span>Confirm Reassignment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReassignRoomModal;
