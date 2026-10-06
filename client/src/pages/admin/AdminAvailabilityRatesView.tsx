import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Minus,
  AlertTriangle,
  ShieldAlert,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchDateWiseInventory,
  fetchRatePlans,
  bulkUpdateRates,
  bulkUpdateInventory,
  bulkUpdateRestrictions,
  quickUpdateInventoryCell,
  fetchRoomTypes,
} from '../../services/api';

export interface IDateWiseCell {
  date: string; // "YYYY-MM-DD"
  dayOfWeek: string;
  dayOfMonth: number;
  physicalRooms: number;
  maintenanceRooms: number;
  bookedRooms: number;
  heldRooms: number;
  sellableCapacity: number;
  availableRooms: number;
  inventoryOverride: number | null;
  stopSell: boolean;
  minStay: number;
  notes?: string;
  rates: {
    singleAdult: number;
    doubleAdult: number;
    tripleAdult: number;
    childRate: number;
    extraAdultRate: number;
    isCustomRate: boolean;
  };
  ratePlanCode: string;
}

export interface ICategoryRow {
  roomType: {
    _id: string;
    name: string;
    code: string;
    description: string;
    basePrice: number;
    cpPrice: number;
    maxOccupancy: number;
    isAc: boolean;
  };
  totalPhysical: number;
  dates: IDateWiseCell[];
}

interface AdminAvailabilityRatesViewProps {
  initialStartDate?: Date;
}

export const AdminAvailabilityRatesView: React.FC<AdminAvailabilityRatesViewProps> = ({ initialStartDate }) => {
  // Navigation & Date State
  const [currentStartDate, setCurrentStartDate] = useState<Date>(() => {
    if (initialStartDate && !isNaN(initialStartDate.getTime())) {
      return new Date(Date.UTC(initialStartDate.getFullYear(), initialStartDate.getMonth(), initialStartDate.getDate(), 0, 0, 0, 0));
    }
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
  });
  const [durationDays, setDurationDays] = useState<number>(14);

  useEffect(() => {
    if (initialStartDate && !isNaN(initialStartDate.getTime())) {
      setCurrentStartDate(new Date(Date.UTC(initialStartDate.getFullYear(), initialStartDate.getMonth(), initialStartDate.getDate(), 0, 0, 0, 0)));
    }
  }, [initialStartDate]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRatePlanCode, setSelectedRatePlanCode] = useState<string>('ROOM_ONLY');

  // Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [gridRows, setGridRows] = useState<ICategoryRow[]>([]);
  const [ratePlans, setRatePlans] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);

  // Modals State
  const [selectedCell, setSelectedCell] = useState<{
    row: ICategoryRow;
    cell: IDateWiseCell;
  } | null>(null);

  const [isCellEditMode, setIsCellEditMode] = useState<boolean>(false);
  const [cellEditForm, setCellEditForm] = useState({
    singleAdult: 0,
    doubleAdult: 0,
    tripleAdult: 0,
    childRate: 0,
    extraAdultRate: 600,
    inventoryOverride: '' as string | number,
    stopSell: false,
    minStay: 1,
    notes: '',
  });

  // Quick Online Inventory Popover/Modal State
  const [quickInvCell, setQuickInvCell] = useState<{ row: ICategoryRow; cell: IDateWiseCell } | null>(null);
  const [quickInvValue, setQuickInvValue] = useState<number | ''>(0);
  const [quickInvSaving, setQuickInvSaving] = useState<boolean>(false);
  const [quickInvError, setQuickInvError] = useState<string>('');

  // Bulk Update Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [bulkType, setBulkType] = useState<'RATES' | 'INVENTORY' | 'RESTRICTIONS'>('RATES');
  const [bulkForm, setBulkForm] = useState({
    roomTypeId: '',
    ratePlanCode: 'ROOM_ONLY',
    startDate: '',
    endDate: '',
    singleAdult: '' as string | number,
    doubleAdult: '' as string | number,
    tripleAdult: '' as string | number,
    childRate: 0 as string | number,
    extraAdultRate: 600 as string | number,
    inventoryOverride: '' as string | number,
    stopSell: false,
    minStay: 1 as string | number,
    notes: '',
  });

  // Confirmation Modal State for Bulk Update
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [bulkSubmitting, setBulkSubmitting] = useState<boolean>(false);

  // Rate Plans & Restrictions Info Modals
  const [isRatePlansModalOpen, setIsRatePlansModalOpen] = useState<boolean>(false);
  const [isRestrictionsModalOpen, setIsRestrictionsModalOpen] = useState<boolean>(false);

  // Helper date formatting
  const formatDateForInput = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const calculateEndDate = (start: Date, days: number) => {
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + days);
    return end;
  };

  // Load Grid Data
  const loadGridData = async () => {
    setLoading(true);
    try {
      const startStr = formatDateForInput(currentStartDate);
      const endDate = calculateEndDate(currentStartDate, durationDays);
      const endStr = formatDateForInput(endDate);

      const res = await fetchDateWiseInventory({
        startDate: startStr,
        endDate: endStr,
        roomTypeId: selectedCategory,
        ratePlanCode: selectedRatePlanCode,
      });

      if (res?.success && res.data) {
        setGridRows(res.data.rows || []);
        if (res.data.ratePlans) {
          setRatePlans(res.data.ratePlans);
        }
      } else {
        toast.error(res?.message || 'Failed to load date-wise inventory.');
      }
    } catch {
      toast.error('Network error loading availability & rates.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRatePlans().then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        setRatePlans(res.data);
      }
    });

    fetchRoomTypes().then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        setAllCategories(res.data);
      }
    });
  }, []);

  useEffect(() => {
    loadGridData();
  }, [currentStartDate, durationDays, selectedCategory, selectedRatePlanCode]);

  // Date Navigation Handlers
  const handlePrevRange = () => {
    const nextStart = new Date(currentStartDate);
    nextStart.setUTCDate(nextStart.getUTCDate() - durationDays);
    setCurrentStartDate(nextStart);
  };

  const handleNextRange = () => {
    const nextStart = new Date(currentStartDate);
    nextStart.setUTCDate(nextStart.getUTCDate() + durationDays);
    setCurrentStartDate(nextStart);
  };

  const handleQuickPreset = (preset: 'TODAY' | 'TOMORROW' | 'WEEKEND' | 'NEXT7' | 'NEXT14' | 'NEXT30') => {
    const today = new Date();
    const startUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));

    if (preset === 'TODAY') {
      setCurrentStartDate(startUtc);
      setDurationDays(7);
    } else if (preset === 'TOMORROW') {
      const tmrw = new Date(startUtc);
      tmrw.setUTCDate(tmrw.getUTCDate() + 1);
      setCurrentStartDate(tmrw);
      setDurationDays(7);
    } else if (preset === 'WEEKEND') {
      const day = today.getDay();
      const diffToFriday = (5 - day + 7) % 7;
      const fri = new Date(startUtc);
      fri.setUTCDate(fri.getUTCDate() + (diffToFriday === 0 ? 7 : diffToFriday));
      setCurrentStartDate(fri);
      setDurationDays(7);
    } else if (preset === 'NEXT7') {
      setCurrentStartDate(startUtc);
      setDurationDays(7);
    } else if (preset === 'NEXT14') {
      setCurrentStartDate(startUtc);
      setDurationDays(14);
    } else if (preset === 'NEXT30') {
      setCurrentStartDate(startUtc);
      setDurationDays(30);
    }
  };

  // Open Cell Date Details Modal
  const handleCellClick = (row: ICategoryRow, cell: IDateWiseCell) => {
    setSelectedCell({ row, cell });
    setIsCellEditMode(false);
    setCellEditForm({
      singleAdult: cell.rates.singleAdult,
      doubleAdult: cell.rates.doubleAdult,
      tripleAdult: cell.rates.tripleAdult,
      childRate: cell.rates.childRate,
      extraAdultRate: cell.rates.extraAdultRate,
      inventoryOverride: cell.inventoryOverride !== null ? cell.inventoryOverride : '',
      stopSell: cell.stopSell,
      minStay: cell.minStay,
      notes: cell.notes || '',
    });
  };

  // Open Quick Online Inventory Modal
  const handleOpenQuickInventory = (row: ICategoryRow, cell: IDateWiseCell) => {
    setQuickInvCell({ row, cell });
    setQuickInvError('');
    if (cell.inventoryOverride !== null && cell.inventoryOverride !== undefined) {
      setQuickInvValue(cell.inventoryOverride);
    } else {
      setQuickInvValue(cell.physicalRooms);
    }
  };

  // Stepper +/- for Quick Online Inventory
  const handleStepQuickInv = (delta: number) => {
    if (!quickInvCell) return;
    const max = quickInvCell.cell.physicalRooms;
    const current = quickInvValue === '' ? 0 : Number(quickInvValue);
    const next = Math.max(0, Math.min(max, current + delta));
    setQuickInvValue(next);
    setQuickInvError('');
  };

  // Numeric Input change for Quick Online Inventory
  const handleQuickInvInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setQuickInvError('');
    if (raw === '') {
      setQuickInvValue('');
      return;
    }
    const val = Number(raw);
    setQuickInvValue(isNaN(val) ? '' : val);
  };

  // Save Quick Online Inventory Cap
  const handleSaveQuickInventory = async () => {
    if (!quickInvCell) return;
    const max = quickInvCell.cell.physicalRooms;
    const booked = quickInvCell.cell.bookedRooms;

    if (
      quickInvValue === '' ||
      isNaN(Number(quickInvValue)) ||
      !Number.isInteger(Number(quickInvValue))
    ) {
      setQuickInvError(`Enter a number between 0 and ${max}.`);
      return;
    }

    const num = Number(quickInvValue);
    if (num < 0 || num > max) {
      setQuickInvError(`Enter a number between 0 and ${max}.`);
      return;
    }

    if (num < booked) {
      setQuickInvError(
        `Online inventory cannot be lower than the ${booked} rooms already booked for this date.`
      );
      return;
    }

    try {
      setQuickInvSaving(true);
      setQuickInvError('');
      const res = await quickUpdateInventoryCell({
        roomTypeId: quickInvCell.row.roomType._id,
        date: quickInvCell.cell.date,
        inventoryOverride: num,
      });

      if (res?.success) {
        toast.success(res.message || 'Online inventory updated successfully.');
        setQuickInvCell(null);
        await loadGridData();
      } else {
        setQuickInvError(res?.message || 'Failed to update online inventory.');
      }
    } catch (err: any) {
      setQuickInvError(
        err?.response?.data?.message || err?.message || 'Network error updating online inventory.'
      );
    } finally {
      setQuickInvSaving(false);
    }
  };

  // Clear Quick Online Inventory Override (Use Physical Availability)
  const handleClearQuickInventoryOverride = async () => {
    if (!quickInvCell) return;

    try {
      setQuickInvSaving(true);
      setQuickInvError('');
      const res = await quickUpdateInventoryCell({
        roomTypeId: quickInvCell.row.roomType._id,
        date: quickInvCell.cell.date,
        inventoryOverride: null,
      });

      if (res?.success) {
        toast.success('Cleared online cap. System returned to physical availability.');
        setQuickInvCell(null);
        await loadGridData();
      } else {
        setQuickInvError(res?.message || 'Failed to clear online inventory override.');
      }
    } catch (err: any) {
      setQuickInvError(
        err?.response?.data?.message ||
          err?.message ||
          'Network error clearing online inventory override.'
      );
    } finally {
      setQuickInvSaving(false);
    }
  };

  // Quick Save from Date Details Modal
  const handleQuickSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;

    try {
      const overrideVal =
        cellEditForm.inventoryOverride === '' ? null : Number(cellEditForm.inventoryOverride);

      const res = await quickUpdateInventoryCell({
        roomTypeId: selectedCell.row.roomType._id,
        date: selectedCell.cell.date,
        ratePlanCode: selectedRatePlanCode,
        rates: {
          singleAdult: Number(cellEditForm.singleAdult),
          doubleAdult: Number(cellEditForm.doubleAdult),
          tripleAdult:
            selectedCell.row.roomType.maxOccupancy >= 3
              ? Number(cellEditForm.doubleAdult)
              : Number(cellEditForm.doubleAdult) + Number(cellEditForm.extraAdultRate || 600),
          childRate: Number(cellEditForm.childRate),
          extraAdultRate: Number(cellEditForm.extraAdultRate),
        },
        inventoryOverride: overrideVal,
        stopSell: cellEditForm.stopSell,
        minStay: Number(cellEditForm.minStay),
        notes: cellEditForm.notes.trim() || undefined,
      });

      if (res?.success) {
        toast.success(res.message || 'Updated cell successfully!');
        setSelectedCell(null);
        setIsCellEditMode(false);
        loadGridData();
      } else {
        toast.error(res?.message || 'Failed to update cell.');
      }
    } catch {
      toast.error('Network error updating cell.');
    }
  };

  // Open Bulk Update Modal
  const openBulkUpdateModal = (type: 'RATES' | 'INVENTORY' | 'RESTRICTIONS' = 'RATES') => {
    setBulkType(type);
    const startStr = formatDateForInput(currentStartDate);
    const endStr = formatDateForInput(calculateEndDate(currentStartDate, durationDays - 1));

    const defaultRt = allCategories[0]?._id || gridRows[0]?.roomType._id || '';

    setBulkForm({
      roomTypeId: defaultRt,
      ratePlanCode: selectedRatePlanCode,
      startDate: startStr,
      endDate: endStr,
      singleAdult: '',
      doubleAdult: '',
      tripleAdult: '',
      childRate: 0,
      extraAdultRate: 600,
      inventoryOverride: '',
      stopSell: false,
      minStay: 1,
      notes: '',
    });

    setIsBulkModalOpen(true);
  };

  // Handle Bulk Update Form Submit -> Trigger Confirmation Dialog
  const handleBulkSubmitAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkForm.roomTypeId || !bulkForm.startDate || !bulkForm.endDate) {
      toast.error('Please specify category, start date, and end date.');
      return;
    }
    if (bulkForm.endDate < bulkForm.startDate) {
      toast.error('End date must be on or after start date.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // Execute Confirmed Bulk Update
  const handleExecuteBulkUpdate = async () => {
    setBulkSubmitting(true);
    try {
      let res: any;
      if (bulkType === 'RATES') {
        res = await bulkUpdateRates({
          roomTypeId: bulkForm.roomTypeId,
          ratePlanCode: bulkForm.ratePlanCode,
          startDate: bulkForm.startDate,
          endDate: bulkForm.endDate,
          singleAdult: Number(bulkForm.singleAdult || bulkForm.doubleAdult),
          doubleAdult: Number(bulkForm.doubleAdult),
          tripleAdult: Number(bulkForm.tripleAdult || (Number(bulkForm.doubleAdult) + 600)),
          childRate: Number(bulkForm.childRate || 0),
          extraAdultRate: Number(bulkForm.extraAdultRate || 600),
        });
      } else if (bulkType === 'INVENTORY') {
        const overrideVal =
          bulkForm.inventoryOverride === '' ? null : Number(bulkForm.inventoryOverride);
        res = await bulkUpdateInventory({
          roomTypeId: bulkForm.roomTypeId,
          startDate: bulkForm.startDate,
          endDate: bulkForm.endDate,
          inventoryOverride: overrideVal,
          notes: bulkForm.notes.trim() || undefined,
        });
      } else {
        res = await bulkUpdateRestrictions({
          roomTypeId: bulkForm.roomTypeId,
          startDate: bulkForm.startDate,
          endDate: bulkForm.endDate,
          stopSell: bulkForm.stopSell,
          minStay: Number(bulkForm.minStay || 1),
          notes: bulkForm.notes.trim() || undefined,
        });
      }

      if (res?.success) {
        toast.success(res.message || 'Bulk update completed successfully!');
        setIsConfirmModalOpen(false);
        setIsBulkModalOpen(false);
        loadGridData();
      } else {
        toast.error(res?.message || 'Bulk update failed.');
      }
    } catch (err: any) {
      toast.error('Error executing bulk update.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const getTargetCategoryName = useMemo(() => {
    const found =
      allCategories.find((c) => c._id === bulkForm.roomTypeId) ||
      gridRows.find((r) => r.roomType._id === bulkForm.roomTypeId)?.roomType;
    return found?.name || 'Selected Room Category';
  }, [allCategories, gridRows, bulkForm.roomTypeId]);

  const activePlanName = useMemo(() => {
    return ratePlans.find((p) => p.code === selectedRatePlanCode)?.name || 'Room Only';
  }, [ratePlans, selectedRatePlanCode]);

  return (
    <div className="space-y-6 text-[#00174A]">
      {/* Subheader Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#10184A]/15 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <CalendarRange className="text-[#8C6B1C]" size={22} />
            <h2 className="text-xl font-serif font-bold text-[#00174A]">Availability & Rate Management</h2>
          </div>
          <p className="text-xs font-sans text-[#667085] mt-1">
            Manage date-wise room availability, rates and stay restrictions across room categories. Single source of truth.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openBulkUpdateModal('RATES')}
            className="px-3.5 py-1.5 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] active:bg-[#D6B369]/90 text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} /> + Bulk Update
          </button>

          <button
            onClick={() => setIsRatePlansModalOpen(true)}
            className="px-3 py-1.5 bg-white border border-[#10184A]/20 hover:border-[#D6B369] text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            Rate Plans
          </button>

          <button
            onClick={() => setIsRestrictionsModalOpen(true)}
            className="px-3 py-1.5 bg-white border border-[#10184A]/20 hover:border-[#D6B369] text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <ShieldAlert size={14} className="text-rose-600" /> Restrictions
          </button>

          <button
            onClick={() => loadGridData()}
            title="Refresh availability and rates grid"
            className="p-1.5 bg-white border border-[#10184A]/20 hover:border-[#D6B369] text-[#00174A] rounded-xs transition-colors cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter & Date Controls Card */}
      <div className="bg-white p-4 rounded-sm border border-[#10184A]/15 shadow-xs space-y-4 font-sans text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category & Plan Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#667085] uppercase tracking-wider text-[11px]">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#F7F0DF] border border-[#10184A]/20 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] focus:border-[#D6B369] cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {allCategories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name} ({cat.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-[#667085] uppercase tracking-wider text-[11px]">Rate Plan:</span>
              <select
                value={selectedRatePlanCode}
                onChange={(e) => setSelectedRatePlanCode(e.target.value)}
                className="bg-[#F7F0DF] border border-[#10184A]/20 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] focus:border-[#D6B369] cursor-pointer"
              >
                {ratePlans.map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name} ({plan.code === 'ROOM_ONLY' ? 'EP' : 'CP'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-[#667085] uppercase tracking-wider text-[11px]">Span:</span>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="bg-[#F7F0DF] border border-[#10184A]/20 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] focus:border-[#D6B369] cursor-pointer"
              >
                <option value={7}>7 Days View</option>
                <option value={14}>14 Days View</option>
                <option value={21}>21 Days View</option>
                <option value={30}>30 Days View</option>
              </select>
            </div>
          </div>

          {/* Date Navigation & Range Presets */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Range Shifter */}
            <div className="flex items-center bg-[#F7F0DF] border border-[#10184A]/20 rounded-xs overflow-hidden">
              <button
                onClick={handlePrevRange}
                title="Previous days"
                className="px-2 py-1.5 hover:bg-[#E8DFC8] text-[#00174A] cursor-pointer border-r border-[#10184A]/15 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-3 py-1 font-serif font-bold text-[#00174A] text-xs">
                {currentStartDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </div>
              <button
                onClick={handleNextRange}
                title="Next days"
                className="px-2 py-1.5 hover:bg-[#E8DFC8] text-[#00174A] cursor-pointer border-l border-[#10184A]/15 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => handleQuickPreset('TODAY')}
                className="px-2.5 py-1 bg-[#F7F0DF] hover:bg-[#E8DFC8] text-[#00174A] rounded-xs border border-[#10184A]/15 cursor-pointer font-medium"
              >
                Today
              </button>
              <button
                onClick={() => handleQuickPreset('TOMORROW')}
                className="px-2.5 py-1 bg-[#F7F0DF] hover:bg-[#E8DFC8] text-[#00174A] rounded-xs border border-[#10184A]/15 cursor-pointer font-medium"
              >
                Tomorrow
              </button>
              <button
                onClick={() => handleQuickPreset('WEEKEND')}
                className="px-2.5 py-1 bg-[#F7F0DF] hover:bg-[#E8DFC8] text-[#00174A] rounded-xs border border-[#10184A]/15 cursor-pointer font-medium"
              >
                Weekend
              </button>
              <button
                onClick={() => handleQuickPreset('NEXT7')}
                className="px-2.5 py-1 bg-[#F7F0DF] hover:bg-[#E8DFC8] text-[#00174A] rounded-xs border border-[#10184A]/15 cursor-pointer font-medium"
              >
                Next 7 Days
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#10184A]/10 text-[11px] text-[#667085]">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#00174A]">Status Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              <span>Low Inventory (≤ 2 left)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
              <span>Sold Out (0 available)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00174A] inline-block"></span>
              <span>Stop Sell Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D6B369] inline-block"></span>
              <span>Custom Rate Override</span>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-[#8C6B1C]">
            Showing Plan: <strong>{activePlanName}</strong> • Click any cell for date details & instant edit
          </div>
        </div>
      </div>

      {/* Main Grid Card */}
      <div className="bg-white rounded-sm border border-[#10184A]/20 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <RefreshCw className="animate-spin text-[#8C6B1C]" size={28} />
            <p className="text-xs font-sans text-[#667085]">Calculating date-wise availability and rates...</p>
          </div>
        ) : gridRows.length === 0 ? (
          <div className="p-12 text-center text-[#667085] space-y-2">
            <CalendarRange size={32} className="mx-auto text-[#00174A]/30" />
            <p className="font-serif font-bold text-base text-[#00174A]">No inventory data available for this range</p>
            <p className="text-xs">Adjust your date range or filters above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full border-collapse font-sans text-xs min-w-[850px]">
              <thead>
                <tr className="bg-[#00174A] text-[#FAF9F6] border-b border-[#10184A]">
                  {/* Sticky Category Column Header */}
                  <th className="sticky left-0 bg-[#00174A] z-20 py-3 px-4 text-left font-serif font-bold tracking-wide w-56 min-w-[220px] shadow-sm">
                    Room Category
                  </th>

                  {/* Date Column Headers */}
                  {gridRows[0]?.dates.map((d) => (
                    <th
                      key={d.date}
                      className="py-2.5 px-3 text-center border-l border-white/10 font-sans tracking-wider min-w-[85px]"
                    >
                      <div className="text-[10px] uppercase font-bold text-[#D6B369]">{d.dayOfWeek}</div>
                      <div className="text-sm font-serif font-bold text-white mt-0.5">{d.dayOfMonth}</div>
                      <div className="text-[9px] text-white/60">
                        {new Date(d.date).toLocaleDateString('en-IN', { month: 'short' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[#10184A]/10">
                {gridRows.map((row) => (
                  <tr key={row.roomType._id} className="hover:bg-[#F7F0DF]/30 transition-colors">
                    {/* Sticky Category Column */}
                    <td className="sticky left-0 bg-white hover:bg-[#FAF9F6] z-10 py-3.5 px-4 border-r border-[#10184A]/15 shadow-xs">
                      <div className="font-serif font-bold text-[#00174A] text-sm leading-snug">
                        {row.roomType.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#667085]">
                        <span>{row.totalPhysical} Physical Rooms</span>
                        <span>•</span>
                        <span className="font-semibold text-[#8C6B1C]">
                          ₹{selectedRatePlanCode === 'BREAKFAST_INCLUDED' ? row.roomType.cpPrice : row.roomType.basePrice}
                        </span>
                      </div>
                    </td>

                    {/* Date Grid Cells */}
                    {row.dates.map((cell) => {
                      const isSoldOut = cell.availableRooms === 0;
                      const isLowInventory = cell.availableRooms > 0 && cell.availableRooms <= 2;
                      const isStopSell = cell.stopSell;

                      let cellBg = 'bg-white hover:bg-[#F7F0DF]/60';
                      let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:border-emerald-500';
                      let statusText = `${cell.availableRooms} LEFT`;

                      if (isStopSell) {
                        cellBg = 'bg-rose-50/70 hover:bg-rose-100/60';
                        badgeColor = 'bg-[#00174A] text-rose-300 border-rose-400 hover:border-rose-300';
                        statusText = 'STOP SELL';
                      } else if (isSoldOut) {
                        cellBg = 'bg-rose-50/50 hover:bg-rose-100/50';
                        badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 hover:border-rose-500';
                        statusText = 'SOLD OUT';
                      } else if (isLowInventory) {
                        cellBg = 'bg-amber-50/50 hover:bg-amber-100/50';
                        badgeColor = 'bg-amber-100 text-amber-900 border-amber-300 hover:border-amber-500';
                        statusText = `${cell.availableRooms} LEFT`;
                      }

                      return (
                        <td
                          key={cell.date}
                          onClick={() => handleCellClick(row, cell)}
                          title={`Click for ${row.roomType.name} on ${cell.date} details`}
                          className={`py-2 px-1.5 text-center border-l border-[#10184A]/10 cursor-pointer transition-all ${cellBg}`}
                        >
                          <div className="flex flex-col items-center justify-center space-y-1">
                            {/* Clickable Online Inventory Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenQuickInventory(row, cell);
                              }}
                              title={
                                cell.inventoryOverride !== null
                                  ? `Online inventory manually limited to ${cell.inventoryOverride} rooms`
                                  : `Click to edit online inventory (${cell.availableRooms} available)`
                              }
                              className={`w-full max-w-[82px] py-1 px-1 text-[10.5px] font-bold rounded-xs border tracking-tight uppercase cursor-pointer transition-all duration-150 transform hover:scale-[1.04] active:scale-[0.98] shadow-2xs hover:shadow-xs flex items-center justify-center gap-1 focus:outline-hidden focus:ring-1 focus:ring-[#00174A]/40 ${badgeColor}`}
                            >
                              <span>{statusText}</span>
                              {cell.inventoryOverride !== null && (
                                <span
                                  title={`Online inventory manually limited to ${cell.inventoryOverride} rooms`}
                                  className="w-1.5 h-1.5 rounded-full bg-[#8C6B1C] ring-1 ring-amber-400 shrink-0 inline-block"
                                />
                              )}
                            </button>

                            {/* Rate Display */}
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-[#00174A] text-xs">
                                ₹{cell.rates.doubleAdult}
                              </span>
                              {cell.rates.isCustomRate && (
                                <span
                                  title="Custom rate override"
                                  className="w-1.5 h-1.5 rounded-full bg-[#D6B369]"
                                />
                              )}
                            </div>

                            {/* Additional indicator pills */}
                            <div className="flex items-center gap-1 text-[9px] text-[#667085]">
                              {cell.bookedRooms > 0 && (
                                <span title={`${cell.bookedRooms} booked`} className="text-[#00174A]/70">
                                  {cell.bookedRooms}b
                                </span>
                              )}
                              {cell.minStay > 1 && (
                                <span
                                  title={`Min stay: ${cell.minStay} nights`}
                                  className="text-amber-800 font-bold"
                                >
                                  {cell.minStay}n
                                </span>
                              )}
                              {cell.inventoryOverride !== null && (
                                <span
                                  title={`Online inventory manually limited to ${cell.inventoryOverride} rooms`}
                                  className="text-[#8C6B1C] font-bold"
                                >
                                  c{cell.inventoryOverride}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* QUICK ONLINE INVENTORY MODAL                                              */}
      {/* ========================================================================= */}
      {quickInvCell && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#10184A]/30 rounded-sm w-full max-w-md shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-[#00174A] text-[#FAF9F6] p-4 flex items-center justify-between border-b border-[#D6B369]/30">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#D6B369]">
                  Online Inventory
                </div>
                <h3 className="font-serif font-bold text-base text-white mt-0.5">
                  {quickInvCell.row.roomType.name}
                </h3>
                <p className="text-xs text-white/75 mt-0.5">
                  {new Date(quickInvCell.cell.date + 'T00:00:00+05:30').toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickInvCell(null)}
                className="p-1 text-white/70 hover:text-white rounded-xs transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Stats Breakdown Cards */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-xs border border-[#10184A]/15 shadow-2xs">
                  <div className="text-[9.5px] font-bold uppercase text-[#667085] tracking-tight">Physical Rooms</div>
                  <div className="text-base font-serif font-bold text-[#00174A] mt-0.5">
                    {quickInvCell.cell.physicalRooms}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xs border border-[#10184A]/15 shadow-2xs">
                  <div className="text-[9.5px] font-bold uppercase text-rose-800 tracking-tight">Already Booked</div>
                  <div className="text-base font-serif font-bold text-rose-700 mt-0.5">
                    {quickInvCell.cell.bookedRooms}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xs border border-[#10184A]/15 shadow-2xs">
                  <div className="text-[9.5px] font-bold uppercase text-amber-800 tracking-tight">Currently Held</div>
                  <div className="text-base font-serif font-bold text-amber-700 mt-0.5">
                    {quickInvCell.cell.heldRooms}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xs border border-[#10184A]/15 shadow-2xs">
                  <div className="text-[9.5px] font-bold uppercase text-[#10184A]/70 tracking-tight">Currently Blocked</div>
                  <div className="text-base font-serif font-bold text-[#00174A] mt-0.5">
                    {quickInvCell.cell.maintenanceRooms}
                  </div>
                </div>
              </div>

              {/* Stepper / Online Cap Editor */}
              <div className="bg-white p-4 rounded-xs border border-[#10184A]/15 shadow-xs space-y-3">
                <div className="text-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#00174A] block">
                    Rooms to Sell Online
                  </label>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    Maximum rooms allowed to be sold through the website on this date
                  </p>
                </div>

                {/* Quick Stepper Control */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleStepQuickInv(-1)}
                    disabled={quickInvSaving || Number(quickInvValue) <= 0}
                    className="w-11 h-11 flex items-center justify-center rounded-xs border border-[#10184A]/30 bg-[#FAF9F6] text-[#00174A] hover:bg-[#F7F0DF] hover:border-[#D6B369] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs font-bold text-lg"
                    title="Decrease by 1"
                  >
                    <Minus size={18} />
                  </button>

                  <input
                    type="number"
                    min="0"
                    max={quickInvCell.cell.physicalRooms}
                    step="1"
                    value={quickInvValue}
                    onChange={handleQuickInvInputChange}
                    disabled={quickInvSaving}
                    className="w-24 h-11 text-center font-serif font-bold text-2xl text-[#00174A] bg-[#F7F0DF] border-2 border-[#10184A]/30 focus:border-[#D6B369] focus:outline-hidden rounded-xs shadow-inner"
                  />

                  <button
                    type="button"
                    onClick={() => handleStepQuickInv(1)}
                    disabled={quickInvSaving || Number(quickInvValue) >= quickInvCell.cell.physicalRooms}
                    className="w-11 h-11 flex items-center justify-center rounded-xs border border-[#10184A]/30 bg-[#FAF9F6] text-[#00174A] hover:bg-[#F7F0DF] hover:border-[#D6B369] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs font-bold text-lg"
                    title="Increase by 1"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="text-center text-[11px] font-semibold text-[#667085]">
                  Allowed: 0–{quickInvCell.cell.physicalRooms}
                </div>

                {/* Current override indicator banner if active */}
                {quickInvCell.cell.inventoryOverride !== null && (
                  <div className="text-[11px] text-[#8C6B1C] bg-[#F7F0DF] px-2.5 py-1 rounded-xs border border-[#D6B369]/40 text-center font-medium">
                    Current sellable override cap: <span className="font-bold">{quickInvCell.cell.inventoryOverride} rooms</span>
                  </div>
                )}
              </div>

              {/* Validation error display */}
              {quickInvError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xs text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                  <span>{quickInvError}</span>
                </div>
              )}

              {/* Revert to physical availability button */}
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={handleClearQuickInventoryOverride}
                  disabled={quickInvSaving}
                  className="text-xs font-semibold text-[#8C6B1C] hover:text-[#00174A] hover:bg-[#F7F0DF] px-3 py-1.5 rounded-xs border border-[#D6B369]/60 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Remove override and use normal physical calculation"
                >
                  <RefreshCw size={12} className={quickInvSaving ? 'animate-spin' : ''} />
                  USE PHYSICAL AVAILABILITY
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#10184A]/10">
                <button
                  type="button"
                  onClick={() => setQuickInvCell(null)}
                  disabled={quickInvSaving}
                  className="px-4 py-2 bg-white border border-[#10184A]/20 hover:bg-[#FAF9F6] text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickInventory}
                  disabled={quickInvSaving}
                  className="px-5 py-2 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {quickInvSaving ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> SAVING...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> SAVE
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DATE DETAILS MODAL (Cell Click)                                        */}
      {/* ========================================================================= */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#10184A]/30 rounded-sm w-full max-w-lg shadow-xl overflow-hidden font-sans">
            {/* Modal Header */}
            <div className="bg-[#00174A] text-[#FAF9F6] p-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#D6B369]">
                  Date Details & Instant Edit
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  {selectedCell.row.roomType.name} •{' '}
                  {new Date(selectedCell.cell.date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1 text-white/70 hover:text-white rounded-xs transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Inventory Breakdown Cards */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2.5 rounded-xs border border-[#10184A]/15 shadow-xs">
                  <div className="text-[10px] font-bold uppercase text-[#667085]">Physical</div>
                  <div className="text-lg font-serif font-bold text-[#00174A] mt-0.5">
                    {selectedCell.cell.physicalRooms}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xs border border-[#10184A]/15 shadow-xs">
                  <div className="text-[10px] font-bold uppercase text-rose-800">Booked</div>
                  <div className="text-lg font-serif font-bold text-rose-700 mt-0.5">
                    {selectedCell.cell.bookedRooms}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xs border border-[#10184A]/15 shadow-xs">
                  <div className="text-[10px] font-bold uppercase text-amber-800">Maint / Hold</div>
                  <div className="text-lg font-serif font-bold text-amber-700 mt-0.5">
                    {selectedCell.cell.maintenanceRooms + selectedCell.cell.heldRooms}
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xs border border-emerald-500/30 shadow-xs">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">Sellable</div>
                  <div className="text-lg font-serif font-bold text-emerald-700 mt-0.5">
                    {selectedCell.cell.availableRooms}
                  </div>
                </div>
              </div>

              {!isCellEditMode ? (
                /* READ-ONLY VIEW */
                <div className="space-y-4">
                  <div className="bg-white p-3.5 rounded-xs border border-[#10184A]/15 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-[#10184A]/10">
                      <span className="text-[#667085] font-medium">Rate Plan:</span>
                      <span className="font-bold text-[#00174A]">{activePlanName}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-[#10184A]/10">
                      <span className="text-[#667085] font-medium">2 Adults Rate (Base):</span>
                      <span className="font-bold text-[#00174A]">
                        ₹{selectedCell.cell.rates.doubleAdult}
                        {selectedCell.cell.rates.isCustomRate && (
                          <span className="text-[10px] text-[#8C6B1C] ml-1.5 font-semibold">
                            (Custom)
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-[#10184A]/10">
                      <span className="text-[#667085] font-medium">1 Adult Rate:</span>
                      <span className="font-bold text-[#00174A]">₹{selectedCell.cell.rates.singleAdult}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-[#10184A]/10">
                      <span className="text-[#667085] font-medium">Extra Adult Rate:</span>
                      <span className="font-bold text-[#00174A]">₹{selectedCell.cell.rates.extraAdultRate}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-[#10184A]/10">
                      <span className="text-[#667085] font-medium">Stop Sell:</span>
                      <span
                        className={`font-bold ${
                          selectedCell.cell.stopSell ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {selectedCell.cell.stopSell ? 'ON (Bookings Blocked)' : 'OFF (Available)'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-[#10184A]/10">
                      <span className="text-[#667085] font-medium">Minimum Stay:</span>
                      <span className="font-bold text-[#00174A]">
                        {selectedCell.cell.minStay} night{selectedCell.cell.minStay > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="text-[#667085] font-medium">Rooms to sell online:</span>
                      <span className="font-bold text-[#00174A]">
                        {selectedCell.cell.inventoryOverride !== null
                          ? `Capped at ${selectedCell.cell.inventoryOverride} rooms`
                          : 'None (Default Physical Calculation)'}
                      </span>
                    </div>
                  </div>

                  {selectedCell.cell.notes && (
                    <div className="bg-[#F7F0DF] p-3 rounded-xs border border-[#10184A]/15 text-xs">
                      <span className="font-bold text-[#8C6B1C]">Admin Notes: </span>
                      <span className="text-[#00174A]">{selectedCell.cell.notes}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCellEditMode(true)}
                      className="px-4 py-2 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Edit3 size={14} /> Edit This Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCell(null)}
                      className="px-4 py-2 bg-white border border-[#10184A]/20 hover:bg-[#F7F0DF] text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* INLINE EDIT FORM */
                <form onSubmit={handleQuickSaveCell} className="space-y-4">
                  <div className="bg-white p-3.5 rounded-xs border border-[#10184A]/15 space-y-3 text-xs">
                    <h4 className="font-serif font-bold text-[#00174A] text-xs uppercase tracking-wider border-b border-[#10184A]/10 pb-1.5">
                      Edit Rates ({activePlanName})
                    </h4>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-[#667085]">1 Adult (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={cellEditForm.singleAdult}
                          onChange={(e) =>
                            setCellEditForm({ ...cellEditForm, singleAdult: Number(e.target.value) })
                          }
                          className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#667085]">2 Adults (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={cellEditForm.doubleAdult}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCellEditForm({
                              ...cellEditForm,
                              doubleAdult: val,
                              tripleAdult:
                                selectedCell?.row.roomType.maxOccupancy >= 3
                                  ? val
                                  : val + Number(cellEditForm.extraAdultRate || 600),
                            });
                          }}
                          className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-[#667085]">Child Rate (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={cellEditForm.childRate}
                          onChange={(e) =>
                            setCellEditForm({ ...cellEditForm, childRate: Number(e.target.value) })
                          }
                          className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#667085]">Extra Adult (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={cellEditForm.extraAdultRate}
                          onChange={(e) =>
                            setCellEditForm({ ...cellEditForm, extraAdultRate: Number(e.target.value) })
                          }
                          className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xs border border-[#10184A]/15 space-y-3 text-xs">
                    <h4 className="font-serif font-bold text-[#00174A] text-xs uppercase tracking-wider border-b border-[#10184A]/10 pb-1.5">
                      Inventory & Restrictions
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#667085]">
                          Rooms to sell online (Max {selectedCell.cell.physicalRooms})
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={selectedCell.cell.physicalRooms}
                          placeholder="Leave blank for physical"
                          value={cellEditForm.inventoryOverride}
                          onChange={(e) =>
                            setCellEditForm({
                              ...cellEditForm,
                              inventoryOverride: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#667085]">Minimum Stay (Nights)</label>
                        <input
                          type="number"
                          min="1"
                          value={cellEditForm.minStay}
                          onChange={(e) =>
                            setCellEditForm({ ...cellEditForm, minStay: Number(e.target.value) })
                          }
                          className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="cellStopSell"
                        checked={cellEditForm.stopSell}
                        onChange={(e) =>
                          setCellEditForm({ ...cellEditForm, stopSell: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#00174A] cursor-pointer"
                      />
                      <label htmlFor="cellStopSell" className="font-bold text-rose-800 cursor-pointer">
                        Enable Stop Sell (Prevent online customer bookings for this date)
                      </label>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#667085]">Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Festival weekend pricing"
                        value={cellEditForm.notes}
                        onChange={(e) => setCellEditForm({ ...cellEditForm, notes: e.target.value })}
                        className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 text-xs text-[#00174A] mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#00174A] text-[#FAF9F6] hover:bg-[#10184A] text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check size={14} /> Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCellEditMode(false)}
                      className="px-4 py-2 bg-white border border-[#10184A]/20 hover:bg-[#F7F0DF] text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BULK UPDATE MODAL                                                      */}
      {/* ========================================================================= */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#10184A]/30 rounded-sm w-full max-w-xl shadow-xl overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-[#00174A] text-[#FAF9F6] p-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#D6B369] flex items-center gap-2">
                  <SlidersHorizontal size={18} /> Bulk Update Manager
                </h3>
                <p className="text-xs text-white/70 mt-0.5">
                  Update rates, inventory limits, or restrictions across multiple dates at once.
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-white/70 hover:text-white rounded-xs transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleBulkSubmitAttempt} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Type Switcher */}
              <div className="flex items-center gap-2 border-b border-[#10184A]/15 pb-3">
                <button
                  type="button"
                  onClick={() => setBulkType('RATES')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors ${
                    bulkType === 'RATES'
                      ? 'bg-[#00174A] text-[#FAF9F6]'
                      : 'bg-white text-[#00174A] hover:bg-[#F7F0DF] border border-[#10184A]/15'
                  }`}
                >
                  ( ) Rates
                </button>
                <button
                  type="button"
                  onClick={() => setBulkType('INVENTORY')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors ${
                    bulkType === 'INVENTORY'
                      ? 'bg-[#00174A] text-[#FAF9F6]'
                      : 'bg-white text-[#00174A] hover:bg-[#F7F0DF] border border-[#10184A]/15'
                  }`}
                >
                  ( ) Inventory Override
                </button>
                <button
                  type="button"
                  onClick={() => setBulkType('RESTRICTIONS')}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors ${
                    bulkType === 'RESTRICTIONS'
                      ? 'bg-[#00174A] text-[#FAF9F6]'
                      : 'bg-white text-[#00174A] hover:bg-[#F7F0DF] border border-[#10184A]/15'
                  }`}
                >
                  ( ) Restrictions
                </button>
              </div>

              {/* Shared Fields: Category & Dates */}
              <div className="bg-white p-3.5 rounded-xs border border-[#10184A]/15 space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#667085]">Room Category</label>
                    <select
                      value={bulkForm.roomTypeId}
                      onChange={(e) => setBulkForm({ ...bulkForm, roomTypeId: e.target.value })}
                      className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                    >
                      {allCategories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {bulkType === 'RATES' && (
                    <div>
                      <label className="text-[11px] font-semibold text-[#667085]">Rate Plan</label>
                      <select
                        value={bulkForm.ratePlanCode}
                        onChange={(e) => setBulkForm({ ...bulkForm, ratePlanCode: e.target.value })}
                        className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                      >
                        {ratePlans.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#667085]">From Date</label>
                    <input
                      type="date"
                      required
                      value={bulkForm.startDate}
                      onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                      className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#667085]">To Date</label>
                    <input
                      type="date"
                      required
                      min={bulkForm.startDate}
                      value={bulkForm.endDate}
                      onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                      className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Fields Based on Type */}
              {bulkType === 'RATES' && (
                <div className="bg-white p-3.5 rounded-xs border border-[#10184A]/15 space-y-3 text-xs">
                  <h4 className="font-serif font-bold text-[#00174A] uppercase tracking-wider text-[11px]">
                    Rates Configuration
                  </h4>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#667085]">For 1 Adult (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 2000"
                        value={bulkForm.singleAdult}
                        onChange={(e) => setBulkForm({ ...bulkForm, singleAdult: e.target.value })}
                        className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#667085]">For 2 Adults (₹)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="e.g. 2200"
                        value={bulkForm.doubleAdult}
                        onChange={(e) => setBulkForm({ ...bulkForm, doubleAdult: e.target.value })}
                        className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#667085]">For 3 Adults (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 2800"
                        value={bulkForm.tripleAdult}
                        onChange={(e) => setBulkForm({ ...bulkForm, tripleAdult: e.target.value })}
                        className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-[#667085]">Child (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={bulkForm.childRate}
                        onChange={(e) => setBulkForm({ ...bulkForm, childRate: e.target.value })}
                        className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#667085]">Extra Adult (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={bulkForm.extraAdultRate}
                        onChange={(e) => setBulkForm({ ...bulkForm, extraAdultRate: e.target.value })}
                        className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {bulkType === 'INVENTORY' && (
                <div className="bg-white p-3.5 rounded-xs border border-[#10184A]/15 space-y-3 text-xs">
                  <h4 className="font-serif font-bold text-[#00174A] uppercase tracking-wider text-[11px]">
                    Sellable Inventory Override
                  </h4>

                  <div>
                    <label className="text-[11px] font-semibold text-[#667085]">
                      Sellable Inventory Cap
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5 (leave blank to reset to full physical capacity)"
                      value={bulkForm.inventoryOverride}
                      onChange={(e) => setBulkForm({ ...bulkForm, inventoryOverride: e.target.value })}
                      className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                    />
                    <p className="text-[10px] text-[#667085] mt-1">
                      Safe Rule: Sellable inventory cannot exceed total physical rooms, and cannot be lower than existing confirmed bookings.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#667085]">Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Hold 2 rooms for offline walkins"
                      value={bulkForm.notes}
                      onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                      className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 text-xs text-[#00174A] mt-1"
                    />
                  </div>
                </div>
              )}

              {bulkType === 'RESTRICTIONS' && (
                <div className="bg-white p-3.5 rounded-xs border border-[#10184A]/15 space-y-3 text-xs">
                  <h4 className="font-serif font-bold text-[#00174A] uppercase tracking-wider text-[11px]">
                    Restrictions (Stop Sell & Minimum Stay)
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xs">
                      <input
                        type="checkbox"
                        id="bulkStopSell"
                        checked={bulkForm.stopSell}
                        onChange={(e) => setBulkForm({ ...bulkForm, stopSell: e.target.checked })}
                        className="w-4 h-4 accent-[#00174A] cursor-pointer"
                      />
                      <label htmlFor="bulkStopSell" className="font-bold text-rose-900 cursor-pointer text-xs">
                        Enable STOP SELL (Block new customer reservations for these dates)
                      </label>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#667085]">Minimum Stay (Nights)</label>
                      <input
                        type="number"
                        min="1"
                        value={bulkForm.minStay}
                        onChange={(e) => setBulkForm({ ...bulkForm, minStay: e.target.value })}
                        className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 font-bold text-[#00174A] mt-1"
                      />
                      <p className="text-[10px] text-[#667085] mt-1">
                        Arrivals on these dates must book at least this many nights.
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#667085]">Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Mandatory 2-night minimum stay for Diwali weekend"
                        value={bulkForm.notes}
                        onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                        className="w-full bg-[#F7F0DF] border border-[#10184A]/25 rounded-xs px-2.5 py-1.5 text-xs text-[#00174A] mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#10184A]/10">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D6B369] text-[#00174A] hover:bg-[#E8C56A] text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  Apply Update
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#10184A]/20 hover:bg-[#F7F0DF] text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONFIRMATION DIALOG (Mandatory before applying bulk update)             */}
      {/* ========================================================================= */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#10184A]/30 rounded-sm w-full max-w-md shadow-2xl p-6 font-sans space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#D6B369]/20 text-[#8C6B1C] flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h4 className="font-serif font-bold text-lg text-[#00174A]">Confirm Bulk Update</h4>
              <p className="text-xs text-[#667085] mt-2 leading-relaxed">
                You are about to update{' '}
                <strong className="text-[#00174A]">{bulkType.toLowerCase()}</strong> for{' '}
                <strong className="text-[#00174A]">{getTargetCategoryName}</strong> from{' '}
                <strong className="text-[#00174A]">{bulkForm.startDate}</strong> to{' '}
                <strong className="text-[#00174A]">{bulkForm.endDate}</strong>.
              </p>
            </div>

            <div className="bg-[#F7F0DF] p-3 rounded-xs border border-[#10184A]/15 text-xs text-left space-y-1.5">
              {bulkType === 'RATES' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#667085]">Rate Plan:</span>
                    <span className="font-bold text-[#00174A]">{bulkForm.ratePlanCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667085]">2 Adults Rate:</span>
                    <span className="font-bold text-[#00174A]">₹{bulkForm.doubleAdult}</span>
                  </div>
                </>
              )}
              {bulkType === 'INVENTORY' && (
                <div className="flex justify-between">
                  <span className="text-[#667085]">Rooms to sell online:</span>
                  <span className="font-bold text-[#00174A]">
                    {bulkForm.inventoryOverride !== '' ? `${bulkForm.inventoryOverride} Rooms` : 'Reset to Full Physical Capacity'}
                  </span>
                </div>
              )}
              {bulkType === 'RESTRICTIONS' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#667085]">Stop Sell:</span>
                    <span className={`font-bold ${bulkForm.stopSell ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {bulkForm.stopSell ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667085]">Minimum Stay:</span>
                    <span className="font-bold text-[#00174A]">{bulkForm.minStay} night(s)</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={bulkSubmitting}
                className="px-4 py-2 bg-white border border-[#10184A]/20 hover:bg-[#F7F0DF] text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkUpdate}
                disabled={bulkSubmitting}
                className="px-5 py-2 bg-[#00174A] hover:bg-[#10184A] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider rounded-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {bulkSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>Confirm Update</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. RATE PLANS OVERVIEW MODAL                                              */}
      {/* ========================================================================= */}
      {isRatePlansModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#10184A]/30 rounded-sm w-full max-w-lg shadow-xl p-5 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-[#10184A]/15 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base text-[#00174A]">Active Rate Plans</h3>
              </div>
              <button
                onClick={() => setIsRatePlansModalOpen(false)}
                className="p-1 text-[#667085] hover:text-[#00174A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-white p-3.5 rounded-xs border border-[#10184A]/15 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-[#00174A]">1. Room Only (EP)</span>
                  <span className="px-2 py-0.5 bg-[#F7F0DF] text-[#8C6B1C] font-bold text-[10px] rounded-xs uppercase">
                    Default Plan
                  </span>
                </div>
                <p className="text-[#667085] text-[11px]">
                  Standard room accommodation without breakfast. Uses category base rate.
                </p>
                <div className="text-[11px] font-semibold text-[#00174A] pt-1">
                  Code: <code className="bg-[#F7F0DF] px-1 py-0.5 rounded-xs">ROOM_ONLY</code>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xs border border-[#10184A]/15 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-[#00174A]">2. Breakfast Included (CP)</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold text-[10px] rounded-xs uppercase">
                    Meal Included
                  </span>
                </div>
                <p className="text-[#667085] text-[11px]">
                  Includes room accommodation plus daily buffet breakfast for registered guests at Swaad restaurant.
                </p>
                <div className="text-[11px] font-semibold text-[#00174A] pt-1">
                  Code: <code className="bg-[#F7F0DF] px-1 py-0.5 rounded-xs">BREAKFAST_INCLUDED</code>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsRatePlansModalOpen(false)}
                className="px-4 py-2 bg-[#00174A] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. RESTRICTIONS OVERVIEW MODAL                                            */}
      {/* ========================================================================= */}
      {isRestrictionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#10184A]/30 rounded-sm w-full max-w-lg shadow-xl p-5 font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-[#10184A]/15 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-rose-600" size={20} />
                <h3 className="font-serif font-bold text-base text-[#00174A]">Channel Restrictions Overview</h3>
              </div>
              <button
                onClick={() => setIsRestrictionsModalOpen(false)}
                className="p-1 text-[#667085] hover:text-[#00174A] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-white p-3.5 rounded-xs border border-rose-200 space-y-1.5 shadow-xs">
                <div className="font-serif font-bold text-sm text-rose-900">Stop Sell Restriction</div>
                <p className="text-[#667085] text-[11px]">
                  When Stop Sell is active for a room category on any stay date, the customer booking engine rejects bookings for that stay. Existing confirmed bookings are never deleted or modified.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xs border border-amber-200 space-y-1.5 shadow-xs">
                <div className="font-serif font-bold text-sm text-amber-900">Minimum Stay Restriction</div>
                <p className="text-[#667085] text-[11px]">
                  Enforces a minimum duration of stay (e.g. 2 nights) for arrivals on specific dates. A customer attempting a shorter duration is safely rejected on the server.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRestrictionsModalOpen(false);
                  openBulkUpdateModal('RESTRICTIONS');
                }}
                className="px-3.5 py-1.5 bg-[#D6B369] text-[#00174A] font-bold uppercase tracking-wider text-xs rounded-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus size={14} /> Bulk Set Restrictions
              </button>

              <button
                onClick={() => setIsRestrictionsModalOpen(false)}
                className="px-4 py-2 bg-white border border-[#10184A]/20 hover:bg-[#F7F0DF] text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
