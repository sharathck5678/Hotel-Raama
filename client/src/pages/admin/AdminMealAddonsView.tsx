import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminBaseMealPrices,
  updateAdminBaseMealPrices,
  fetchAdminDateWiseMealPrices,
  bulkUpdateMealPrices,
  deleteAdminDateWiseMealPrice,
} from '../../services/api';

export interface IBaseMealPricesState {
  breakfast: number | string;
  lunch: number | string;
  dinner: number | string;
}

export interface IDateWiseOverrideRecord {
  _id?: string;
  date: string;
  breakfastPrice?: number;
  lunchPrice?: number;
  dinnerPrice?: number;
  updatedBy?: string;
  updatedAt?: string;
}

export const AdminMealAddonsView: React.FC = () => {
  const [subTab, setSubTab] = useState<'BASE' | 'DATE_WISE'>('BASE');

  // Base Meal Prices State
  const [basePrices, setBasePrices] = useState<IBaseMealPricesState>({
    breakfast: 150,
    lunch: 250,
    dinner: 300,
  });
  const [baseLoading, setBaseLoading] = useState<boolean>(true);
  const [baseSaving, setBaseSaving] = useState<boolean>(false);

  // Date-Wise Overrides State
  const [overrides, setOverrides] = useState<IDateWiseOverrideRecord[]>([]);
  const [overridesLoading, setOverridesLoading] = useState<boolean>(false);
  const [bulkSubmitting, setBulkSubmitting] = useState<boolean>(false);
  const [deleteSubmittingDate, setDeleteSubmittingDate] = useState<string | null>(null);

  // Date-Range Update Form State
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [overrideBreakfast, setOverrideBreakfast] = useState<string>('');
  const [overrideLunch, setOverrideLunch] = useState<string>('');
  const [overrideDinner, setOverrideDinner] = useState<string>('');

  // Confirmation Modal for Bulk Update
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  // Load Base Prices
  const loadBasePrices = async () => {
    setBaseLoading(true);
    try {
      const res = await fetchAdminBaseMealPrices();
      if (res?.success && res.data) {
        setBasePrices({
          breakfast: res.data.breakfast ?? 150,
          lunch: res.data.lunch ?? 250,
          dinner: res.data.dinner ?? 300,
        });
      } else {
        toast.error(res?.message || 'Failed to load base meal prices.');
      }
    } catch (err) {
      toast.error('Network error loading base meal prices.');
    } finally {
      setBaseLoading(false);
    }
  };

  // Load Date-Wise Overrides
  const loadOverrides = async () => {
    setOverridesLoading(true);
    try {
      const res = await fetchAdminDateWiseMealPrices();
      if (res?.success && Array.isArray(res.data)) {
        setOverrides(res.data);
      } else {
        toast.error(res?.message || 'Failed to load date-wise meal overrides.');
      }
    } catch (err) {
      toast.error('Network error loading meal overrides.');
    } finally {
      setOverridesLoading(false);
    }
  };

  useEffect(() => {
    loadBasePrices();
    loadOverrides();
  }, []);

  // Save Permanent Base Prices
  const handleSaveBasePrices = async (e: React.FormEvent) => {
    e.preventDefault();

    const b = Number(basePrices.breakfast);
    const l = Number(basePrices.lunch);
    const d = Number(basePrices.dinner);

    if (isNaN(b) || b < 0 || isNaN(l) || l < 0 || isNaN(d) || d < 0) {
      toast.error('Prices must be valid non-negative numbers.');
      return;
    }

    setBaseSaving(true);
    try {
      const res = await updateAdminBaseMealPrices({
        breakfast: Math.round(b),
        lunch: Math.round(l),
        dinner: Math.round(d),
      });

      if (res?.success) {
        toast.success(res.message || 'Base meal prices saved successfully!');
        if (res.data) {
          setBasePrices({
            breakfast: res.data.breakfast,
            lunch: res.data.lunch,
            dinner: res.data.dinner,
          });
        }
      } else {
        toast.error(res?.message || 'Failed to save base meal prices.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving base meal prices.');
    } finally {
      setBaseSaving(false);
    }
  };

  // Reset date-range form
  const handleResetBulkForm = () => {
    setFromDate('');
    setToDate('');
    setOverrideBreakfast('');
    setOverrideLunch('');
    setOverrideDinner('');
  };

  // Validate and open confirmation dialog
  const handleBulkSubmitAttempt = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromDate || !toDate) {
      toast.error('Please specify both From Date and To Date.');
      return;
    }

    if (toDate < fromDate) {
      toast.error('To Date must be on or after From Date.');
      return;
    }

    if (
      overrideBreakfast.trim() === '' &&
      overrideLunch.trim() === '' &&
      overrideDinner.trim() === ''
    ) {
      toast.error('Please enter at least one meal price to apply.');
      return;
    }

    if (overrideBreakfast.trim() !== '') {
      const b = Number(overrideBreakfast);
      if (isNaN(b) || b < 0) {
        toast.error('Breakfast price must be a valid non-negative number.');
        return;
      }
    }
    if (overrideLunch.trim() !== '') {
      const l = Number(overrideLunch);
      if (isNaN(l) || l < 0) {
        toast.error('Lunch price must be a valid non-negative number.');
        return;
      }
    }
    if (overrideDinner.trim() !== '') {
      const d = Number(overrideDinner);
      if (isNaN(d) || d < 0) {
        toast.error('Dinner price must be a valid non-negative number.');
        return;
      }
    }

    setIsConfirmModalOpen(true);
  };

  // Execute Confirmed Bulk Update
  const handleExecuteBulkUpdate = async () => {
    setBulkSubmitting(true);
    try {
      const payload: any = {
        startDate: fromDate,
        endDate: toDate,
      };

      if (overrideBreakfast.trim() !== '') payload.breakfastPrice = Number(overrideBreakfast);
      if (overrideLunch.trim() !== '') payload.lunchPrice = Number(overrideLunch);
      if (overrideDinner.trim() !== '') payload.dinnerPrice = Number(overrideDinner);

      const res = await bulkUpdateMealPrices(payload);

      if (res?.success) {
        toast.success(res.message || 'Date-wise meal prices applied successfully!');
        setIsConfirmModalOpen(false);
        handleResetBulkForm();
        loadOverrides();
      } else {
        toast.error(res?.message || 'Failed to apply date-wise prices.');
      }
    } catch (err: any) {
      toast.error('Error applying date-wise meal prices.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Delete / Revert an override
  const handleDeleteOverride = async (date: string) => {
    if (!window.confirm(`Revert meal prices on ${date} back to base rates?`)) {
      return;
    }

    setDeleteSubmittingDate(date);
    try {
      const res = await deleteAdminDateWiseMealPrice(date);
      if (res?.success) {
        toast.success(res.message || `Reverted ${date} to base meal prices.`);
        loadOverrides();
      } else {
        toast.error(res?.message || 'Failed to delete override.');
      }
    } catch (err) {
      toast.error('Error deleting override.');
    } finally {
      setDeleteSubmittingDate(null);
    }
  };

  // Populate form from existing override for editing
  const handleEditOverride = (rec: IDateWiseOverrideRecord) => {
    setFromDate(rec.date);
    setToDate(rec.date);
    setOverrideBreakfast(rec.breakfastPrice !== undefined ? String(rec.breakfastPrice) : '');
    setOverrideLunch(rec.lunchPrice !== undefined ? String(rec.lunchPrice) : '');
    setOverrideDinner(rec.dinnerPrice !== undefined ? String(rec.dinnerPrice) : '');
    window.scrollTo({ top: 120, behavior: 'smooth' });
    toast.info(`Loaded rates for ${rec.date} into edit form.`);
  };

  // Helper date formatter
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Sub-Tabs: BASE PRICES | DATE-WISE PRICES */}
      <div className="flex items-center justify-between border-b border-[#10184A]/15 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('BASE')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-sm transition-all cursor-pointer border-b-2 ${
              subTab === 'BASE'
                ? 'border-[#D6B369] bg-[#00174A] text-[#FAF9F6]'
                : 'border-transparent bg-white text-[#00174A]/80 hover:text-[#00174A] hover:bg-[#FAF9F6]'
            }`}
          >
            Base Prices
          </button>
          <button
            onClick={() => setSubTab('DATE_WISE')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-sm transition-all cursor-pointer border-b-2 ${
              subTab === 'DATE_WISE'
                ? 'border-[#D6B369] bg-[#00174A] text-[#FAF9F6]'
                : 'border-transparent bg-white text-[#00174A]/80 hover:text-[#00174A] hover:bg-[#FAF9F6]'
            }`}
          >
            <span>Date-Wise Prices</span>
            {overrides.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  subTab === 'DATE_WISE' ? 'bg-[#D6B369] text-[#00174A]' : 'bg-[#00174A]/10 text-[#00174A]'
                }`}
              >
                {overrides.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => {
            loadBasePrices();
            loadOverrides();
          }}
          disabled={baseLoading || overridesLoading}
          title="Refresh prices"
          className="p-1.5 text-[#00174A] hover:bg-white rounded-xs border border-[#10184A]/15 transition-colors cursor-pointer"
        >
          <RefreshCw size={13} className={baseLoading || overridesLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: BASE PRICES                                                    */}
      {/* ========================================================================= */}
      {subTab === 'BASE' && (
        <div className="bg-white rounded-sm border border-[#10184A]/15 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[#00174A]">Base Meal Prices</h3>
          </div>

          {baseLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#667085] text-xs">
              <RefreshCw size={20} className="animate-spin text-[#D6B369]" />
              <span>Loading base prices...</span>
            </div>
          ) : (
            <form onSubmit={handleSaveBasePrices} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#475467] block mb-1.5">
                    Breakfast (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[#667085] font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={basePrices.breakfast}
                      onChange={(e) => setBasePrices({ ...basePrices, breakfast: e.target.value })}
                      placeholder="150"
                      className="w-full h-10 bg-white border border-[#10184A]/25 rounded-xs pl-7 pr-3 font-mono font-bold text-sm text-[#00174A] focus:outline-hidden focus:border-[#00174A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#475467] block mb-1.5">
                    Lunch (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[#667085] font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={basePrices.lunch}
                      onChange={(e) => setBasePrices({ ...basePrices, lunch: e.target.value })}
                      placeholder="250"
                      className="w-full h-10 bg-white border border-[#10184A]/25 rounded-xs pl-7 pr-3 font-mono font-bold text-sm text-[#00174A] focus:outline-hidden focus:border-[#00174A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#475467] block mb-1.5">
                    Dinner (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[#667085] font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={basePrices.dinner}
                      onChange={(e) => setBasePrices({ ...basePrices, dinner: e.target.value })}
                      placeholder="300"
                      className="w-full h-10 bg-white border border-[#10184A]/25 rounded-xs pl-7 pr-3 font-mono font-bold text-sm text-[#00174A] focus:outline-hidden focus:border-[#00174A]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={baseSaving}
                  className="px-6 py-2.5 bg-[#00174A] hover:bg-[#071A3D] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {baseSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-[#D6B369]" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Prices</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: DATE-WISE PRICES                                               */}
      {/* ========================================================================= */}
      {subTab === 'DATE_WISE' && (
        <div className="space-y-4">
          {/* Compact Update Form */}
          <div className="bg-white rounded-sm border border-[#10184A]/15 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-[#00174A]">Date-Wise Meal Prices</h3>
              {(fromDate || toDate || overrideBreakfast || overrideLunch || overrideDinner) && (
                <button
                  type="button"
                  onClick={handleResetBulkForm}
                  className="text-xs text-[#667085] hover:text-[#00174A] transition-colors cursor-pointer"
                >
                  Clear form
                </button>
              )}
            </div>

            <form onSubmit={handleBulkSubmitAttempt} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Date Fields Together */}
                <div className="md:col-span-4 grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#475467] block mb-1">From Date *</label>
                    <input
                      type="date"
                      required
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full h-9 bg-white border border-[#10184A]/25 rounded-xs px-2.5 text-xs font-semibold text-[#00174A] focus:outline-hidden focus:border-[#00174A]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#475467] block mb-1">To Date *</label>
                    <input
                      type="date"
                      required
                      min={fromDate}
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full h-9 bg-white border border-[#10184A]/25 rounded-xs px-2.5 text-xs font-semibold text-[#00174A] focus:outline-hidden focus:border-[#00174A]"
                    />
                  </div>
                </div>

                {/* Meal Price Fields Together */}
                <div className="md:col-span-6 grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-[#475467] block mb-1">Breakfast (₹)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[#667085] font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={overrideBreakfast}
                        onChange={(e) => setOverrideBreakfast(e.target.value)}
                        placeholder={String(basePrices.breakfast)}
                        className="w-full h-9 bg-white border border-[#10184A]/25 rounded-xs pl-6 pr-2.5 text-xs font-mono font-bold text-[#00174A] focus:outline-hidden focus:border-[#00174A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#475467] block mb-1">Lunch (₹)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[#667085] font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={overrideLunch}
                        onChange={(e) => setOverrideLunch(e.target.value)}
                        placeholder={String(basePrices.lunch)}
                        className="w-full h-9 bg-white border border-[#10184A]/25 rounded-xs pl-6 pr-2.5 text-xs font-mono font-bold text-[#00174A] focus:outline-hidden focus:border-[#00174A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#475467] block mb-1">Dinner (₹)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[#667085] font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={overrideDinner}
                        onChange={(e) => setOverrideDinner(e.target.value)}
                        placeholder={String(basePrices.dinner)}
                        className="w-full h-9 bg-white border border-[#10184A]/25 rounded-xs pl-6 pr-2.5 text-xs font-mono font-bold text-[#00174A] focus:outline-hidden focus:border-[#00174A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Apply Update Button */}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-9 bg-[#00174A] hover:bg-[#071A3D] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer flex items-center justify-center shadow-xs"
                  >
                    Apply Update
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Overrides Table */}
          <div className="bg-white rounded-sm border border-[#10184A]/15 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-[#10184A]/10 flex items-center justify-between bg-[#FAF9F6]">
              <span className="text-xs font-bold text-[#00174A] uppercase tracking-wider">
                Date-Wise Overrides {overrides.length > 0 ? `(${overrides.length})` : ''}
              </span>
              <button
                type="button"
                onClick={loadOverrides}
                disabled={overridesLoading}
                title="Refresh overrides"
                className="p-1 text-[#00174A] hover:bg-white rounded-xs border border-[#10184A]/15 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={overridesLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {overridesLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#667085] text-xs">
                <RefreshCw size={20} className="animate-spin text-[#D6B369]" />
                <span>Loading overrides...</span>
              </div>
            ) : overrides.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#667085]">
                No date-wise overrides set. Base prices apply to all dates.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#071A3D] text-[#FAF9F6] text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">Date / Date Range</th>
                      <th className="py-2.5 px-4 text-center">Breakfast</th>
                      <th className="py-2.5 px-4 text-center">Lunch</th>
                      <th className="py-2.5 px-4 text-center">Dinner</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#10184A]/10">
                    {overrides.map((rec) => (
                      <tr key={rec.date} className="hover:bg-[#FAF9F6] transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-[#00174A]">
                          <span>{formatDateDisplay(rec.date)}</span>
                          <span className="text-[11px] text-[#667085] ml-2 font-mono">({rec.date})</span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {rec.breakfastPrice !== undefined ? (
                            <span className="font-bold text-[#00174A]">₹{rec.breakfastPrice}</span>
                          ) : (
                            <span className="text-[#667085] text-[11px]">Base (₹{basePrices.breakfast})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {rec.lunchPrice !== undefined ? (
                            <span className="font-bold text-[#00174A]">₹{rec.lunchPrice}</span>
                          ) : (
                            <span className="text-[#667085] text-[11px]">Base (₹{basePrices.lunch})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {rec.dinnerPrice !== undefined ? (
                            <span className="font-bold text-[#00174A]">₹{rec.dinnerPrice}</span>
                          ) : (
                            <span className="text-[#667085] text-[11px]">Base (₹{basePrices.dinner})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditOverride(rec)}
                              title="Edit override"
                              className="p-1.5 text-[#00174A] hover:bg-[#D6B369]/20 rounded-xs transition-colors cursor-pointer border border-[#10184A]/15"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteOverride(rec.date)}
                              disabled={deleteSubmittingDate === rec.date}
                              title="Delete override"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xs transition-colors cursor-pointer border border-rose-200"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF9F6] border border-[#10184A]/30 rounded-sm w-full max-w-sm shadow-xl overflow-hidden font-sans">
            <div className="bg-[#00174A] text-[#FAF9F6] p-3.5 flex items-center justify-between">
              <h4 className="font-serif font-bold text-xs text-[#D6B369] uppercase tracking-wider">
                Confirm Meal Price Update
              </h4>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="bg-white p-3 rounded-xs border border-[#10184A]/15 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#667085]">Dates:</span>
                  <span className="font-bold text-[#00174A]">{fromDate} to {toDate}</span>
                </div>
                {overrideBreakfast && (
                  <div className="flex justify-between">
                    <span className="text-[#667085]">Breakfast:</span>
                    <span className="font-bold font-mono text-[#00174A]">₹{overrideBreakfast}</span>
                  </div>
                )}
                {overrideLunch && (
                  <div className="flex justify-between">
                    <span className="text-[#667085]">Lunch:</span>
                    <span className="font-bold font-mono text-[#00174A]">₹{overrideLunch}</span>
                  </div>
                )}
                {overrideDinner && (
                  <div className="flex justify-between">
                    <span className="text-[#667085]">Dinner:</span>
                    <span className="font-bold font-mono text-[#00174A]">₹{overrideDinner}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#10184A]/10">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  disabled={bulkSubmitting}
                  className="px-3 py-1.5 border border-[#10184A]/20 rounded-xs text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkUpdate}
                  disabled={bulkSubmitting}
                  className="px-4 py-1.5 bg-[#00174A] hover:bg-[#071A3D] text-[#FAF9F6] rounded-xs text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {bulkSubmitting ? (
                    <>
                      <RefreshCw size={12} className="animate-spin text-[#D6B369]" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <span>Confirm</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
