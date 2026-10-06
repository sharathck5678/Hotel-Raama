import React, { useState, useEffect } from 'react';
import {
  Tag,
  RefreshCw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchAdminRoomTypes, updateAdminRoomTypeBaseRates } from '../../services/api';
import { ScrollReveal } from '../../components/ScrollReveal';

export interface IRoomTypeRecord {
  _id: string;
  name: string;
  code: string;
  description?: string;
  basePrice: number;
  cpPrice: number;
  maxOccupancy?: number;
  isAc?: boolean;
  isActive?: boolean;
}

interface EditModalState {
  isOpen: boolean;
  roomType: IRoomTypeRecord | null;
  plan: 'EP' | 'CP';
  newRate: string;
  step: 'INPUT' | 'CONFIRM';
  error: string;
  submitting: boolean;
}

export const AdminBaseRatesView: React.FC = () => {
  const [roomTypes, setRoomTypes] = useState<IRoomTypeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalState, setModalState] = useState<EditModalState>({
    isOpen: false,
    roomType: null,
    plan: 'EP',
    newRate: '',
    step: 'INPUT',
    error: '',
    submitting: false,
  });

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminRoomTypes();
      if (res?.success && Array.isArray(res.data)) {
        setRoomTypes(res.data);
      } else {
        toast.error(res?.message || 'Failed to load room categories.');
      }
    } catch (err) {
      toast.error('Network error loading room categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openEditModal = (roomType: IRoomTypeRecord, plan: 'EP' | 'CP') => {
    const currentPrice = plan === 'EP' ? roomType.basePrice : roomType.cpPrice;
    setModalState({
      isOpen: true,
      roomType,
      plan,
      newRate: String(currentPrice || ''),
      step: 'INPUT',
      error: '',
      submitting: false,
    });
  };

  const closeEditModal = () => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
      error: '',
      submitting: false,
    }));
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = Number(modalState.newRate.trim());

    if (
      !modalState.newRate.trim() ||
      isNaN(rateNum) ||
      !isFinite(rateNum) ||
      rateNum <= 0
    ) {
      setModalState((prev) => ({
        ...prev,
        error: 'Enter a valid base rate greater than ₹0.',
      }));
      return;
    }

    const rounded = Math.round(rateNum);
    if (rounded <= 0) {
      setModalState((prev) => ({
        ...prev,
        error: 'Enter a valid base rate greater than ₹0.',
      }));
      return;
    }

    setModalState((prev) => ({
      ...prev,
      newRate: String(rounded),
      error: '',
      step: 'CONFIRM',
    }));
  };

  const handleSaveBaseRate = async () => {
    if (!modalState.roomType) return;

    const rateNum = Math.round(Number(modalState.newRate.trim()));
    if (isNaN(rateNum) || rateNum <= 0) {
      setModalState((prev) => ({
        ...prev,
        error: 'Enter a valid base rate greater than ₹0.',
        step: 'INPUT',
      }));
      return;
    }

    setModalState((prev) => ({ ...prev, submitting: true, error: '' }));

    const isEP = modalState.plan === 'EP';
    const payload = isEP ? { basePrice: rateNum } : { cpPrice: rateNum };
    const oldPrice = isEP ? modalState.roomType.basePrice : modalState.roomType.cpPrice;
    const planLabel = isEP ? 'EP (Room Only)' : 'CP (Breakfast Included)';

    try {
      const res = await updateAdminRoomTypeBaseRates(modalState.roomType._id, payload);

      if (res?.success) {
        toast.success(
          `${modalState.roomType.name} — ${planLabel} base rate changed from ₹${oldPrice} to ₹${rateNum}.`
        );

        // Immediately update state in UI without full page reload
        setRoomTypes((prev) =>
          prev.map((rt) => {
            if (rt._id === modalState.roomType?._id) {
              return {
                ...rt,
                basePrice: isEP ? rateNum : rt.basePrice,
                cpPrice: !isEP ? rateNum : rt.cpPrice,
              };
            }
            return rt;
          })
        );

        closeEditModal();
      } else {
        setModalState((prev) => ({
          ...prev,
          error: res?.message || 'Failed to update base rate.',
          submitting: false,
        }));
      }
    } catch (err: any) {
      setModalState((prev) => ({
        ...prev,
        error: err.response?.data?.message || 'Network error updating base rate.',
        submitting: false,
      }));
    }
  };

  return (
    <div className="space-y-6 text-[#00174A]">
      {/* Header Banner */}
      <ScrollReveal direction="up" duration={0.6}>
        <div className="bg-white p-5 sm:p-6 rounded-sm border border-[#10184A]/15 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#D6B369]/15 text-[#8C6B1C] rounded-sm">
                  <Tag size={20} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#00174A]">
                    BASE ROOM RATES
                  </h2>
                  <p className="text-xs font-sans text-[#667085] mt-0.5">
                    Manage the standard/default rates used when no date-specific rate override exists.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={loadCategories}
              disabled={loading}
              title="Refresh room categories"
              className="self-start sm:self-auto px-3.5 py-2 bg-white border border-[#10184A]/20 hover:border-[#D6B369] text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-sm transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Pricing Hierarchy Clarification Banner */}
          <div className="bg-[#FAF9F6] border-l-4 border-[#D6B369] p-3.5 sm:p-4 rounded-r-sm text-xs font-sans text-[#00174A] flex items-start gap-3 shadow-2xs">
            <Info size={18} className="text-[#8C6B1C] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-[#00174A] uppercase tracking-wider text-[11px] block">
                PRICING HIERARCHY RULE
              </span>
              <p className="text-[#475467] leading-relaxed">
                When a guest searches dates, any date-specific <span className="font-semibold text-[#00174A]">DailyRate override</span> takes priority. If no date-specific override exists, these <span className="font-semibold text-[#00174A]">Base Rates</span> are used as the authoritative default. Changing a Base Rate will <span className="font-bold text-[#8C6B1C]">never modify or overwrite</span> existing date-specific rates.
              </p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Main Table Card */}
      <div className="bg-white rounded-sm border border-[#10184A]/15 shadow-xs overflow-hidden font-sans">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-[#D6B369]" />
            <p className="text-xs font-semibold text-[#667085]">Loading room categories & base rates...</p>
          </div>
        ) : roomTypes.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#667085]">
            No active room categories found.
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#071A3D] text-[#FAF9F6] text-[11px] font-bold uppercase tracking-wider border-b border-[#071A3D]">
                    <th className="py-3.5 px-4 sm:px-6">Room Category</th>
                    <th className="py-3.5 px-4 sm:px-6 text-center w-56">Room Only (EP)</th>
                    <th className="py-3.5 px-4 sm:px-6 text-center w-56">Breakfast Included (CP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#10184A]/10 text-xs">
                  {roomTypes.map((rt) => (
                    <tr
                      key={rt._id}
                      className="hover:bg-[#FAF9F6] transition-colors"
                    >
                      {/* Room Category Details */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-sm sm:text-base text-[#00174A]">
                              {rt.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs ${
                                rt.isAc
                                  ? 'bg-[#00174A]/10 text-[#00174A]'
                                  : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {rt.isAc ? 'A/C' : 'Non A/C'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#667085]">
                            <span className="font-mono font-medium text-[#8C6B1C] bg-[#D6B369]/10 px-1.5 py-0.5 rounded-xs">
                              {rt.code}
                            </span>
                            {rt.maxOccupancy && (
                              <span>Max {rt.maxOccupancy} Guests</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Room Only (EP) Base Rate */}
                      <td className="py-4 px-4 sm:px-6 text-center align-middle">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="font-serif font-bold text-base sm:text-lg text-[#00174A]">
                            ₹{rt.basePrice.toLocaleString('en-IN')}
                          </span>
                          <button
                            onClick={() => openEditModal(rt, 'EP')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F6] hover:bg-[#D6B369] text-[#00174A] border border-[#10184A]/20 hover:border-[#D6B369] rounded-xs text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            <Edit2 size={12} />
                            <span>Edit Rate</span>
                          </button>
                        </div>
                      </td>

                      {/* Breakfast Included (CP) Base Rate */}
                      <td className="py-4 px-4 sm:px-6 text-center align-middle">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="font-serif font-bold text-base sm:text-lg text-[#00174A]">
                            ₹{rt.cpPrice.toLocaleString('en-IN')}
                          </span>
                          <button
                            onClick={() => openEditModal(rt, 'CP')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F6] hover:bg-[#D6B369] text-[#00174A] border border-[#10184A]/20 hover:border-[#D6B369] rounded-xs text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                          >
                            <Edit2 size={12} />
                            <span>Edit Rate</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-[#FAF9F6] px-4 sm:px-6 py-3 border-t border-[#10184A]/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#667085] gap-2">
              <span>Showing {roomTypes.length} Active Room Categories</span>
              <span>All Base Rates are default per night direct tariffs (exclusive of GST)</span>
            </div>
          </>
        )}
      </div>

      {/* Edit Base Rate Modal */}
      {modalState.isOpen && modalState.roomType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-in fade-in duration-200">
          <div
            className="bg-white rounded-sm border border-[#10184A]/20 shadow-2xl max-w-md w-full overflow-hidden text-[#00174A]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="bg-[#071A3D] text-[#FAF9F6] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-[#D6B369]" />
                <h3 className="font-serif font-bold text-base">
                  {modalState.step === 'INPUT' ? 'EDIT BASE RATE' : 'CHANGE BASE RATE?'}
                </h3>
              </div>
              <button
                onClick={closeEditModal}
                disabled={modalState.submitting}
                className="text-[#FAF9F6]/70 hover:text-white p-1 rounded-sm hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Target Room Category & Plan Summary Card */}
              <div className="bg-[#FAF9F6] p-3.5 rounded-sm border border-[#10184A]/15 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-[#00174A]">
                    {modalState.roomType.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-[#D6B369]/20 text-[#8C6B1C] px-1.5 py-0.5 rounded-xs">
                    {modalState.roomType.code}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#8C6B1C]">
                  {modalState.plan === 'EP'
                    ? 'ROOM ONLY (EP)'
                    : 'BREAKFAST INCLUDED (CP)'}
                </div>
              </div>

              {/* STEP 1: Rate Input Step */}
              {modalState.step === 'INPUT' && (
                <form onSubmit={handleProceedToConfirm} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold uppercase tracking-wider text-[#475467] text-[11px]">
                        New Base Rate (₹)
                      </label>
                      <span className="text-[11px] text-[#667085]">
                        Current: ₹
                        {(modalState.plan === 'EP'
                          ? modalState.roomType.basePrice
                          : modalState.roomType.cpPrice
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-serif font-bold text-[#00174A]">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        autoFocus
                        value={modalState.newRate}
                        onChange={(e) =>
                          setModalState((prev) => ({
                            ...prev,
                            newRate: e.target.value,
                            error: '',
                          }))
                        }
                        placeholder="e.g. 1500"
                        className="w-full pl-8 pr-3 py-2.5 bg-white text-base font-serif font-bold text-[#00174A] border border-[#10184A]/25 rounded-xs focus:border-[#D6B369] focus:outline-none focus:ring-1 focus:ring-[#D6B369]"
                      />
                    </div>

                    {modalState.error && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{modalState.error}</span>
                      </div>
                    )}
                  </div>

                  {/* Informational Guidance */}
                  <p className="text-[11px] text-[#667085] leading-relaxed">
                    This new rate will serve as the permanent default. It will NOT overwrite any custom date-specific DailyRate overrides you have previously configured.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="px-4 py-2 border border-[#10184A]/20 hover:bg-stone-100 text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#00174A] hover:bg-[#071A3D] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Review Changes</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Confirmation Warning Step */}
              {modalState.step === 'CONFIRM' && (
                <div className="space-y-4">
                  {/* Before vs After comparison */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-[#FAF9F6] p-3 rounded-xs border border-[#10184A]/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085] block">
                        Current Base Rate
                      </span>
                      <span className="font-serif font-bold text-lg text-[#00174A] mt-1 block">
                        ₹
                        {(modalState.plan === 'EP'
                          ? modalState.roomType.basePrice
                          : modalState.roomType.cpPrice
                        ).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="bg-[#D6B369]/15 p-3 rounded-xs border border-[#D6B369]/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6B1C] block">
                        New Base Rate
                      </span>
                      <span className="font-serif font-bold text-lg text-[#00174A] mt-1 block">
                        ₹{Number(modalState.newRate).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Confirmation Warning Notice (Requirement Section 10) */}
                  <div className="bg-amber-500/10 border-l-3 border-amber-600 p-3 rounded-r-xs text-xs text-[#00174A] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px] uppercase tracking-wider">
                      <ShieldAlert size={14} className="text-amber-700 shrink-0" />
                      <span>Important Confirmation Warning</span>
                    </div>
                    <p className="text-[11px] text-[#475467] leading-relaxed">
                      This will become the default rate for dates without a date-specific rate override.
                    </p>
                    <p className="text-[11px] text-[#475467] leading-relaxed">
                      <strong className="text-[#00174A]">Existing date-specific rates will NOT be changed.</strong>
                      <br />
                      <span className="text-[10px] text-[#667085] italic">
                        (Example: If Oct 31 has a custom rate of ₹2000, it remains ₹2000.)
                      </span>
                    </p>
                  </div>

                  {modalState.error && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{modalState.error}</span>
                    </div>
                  )}

                  {/* Confirmation Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={modalState.submitting}
                      onClick={() =>
                        setModalState((prev) => ({ ...prev, step: 'INPUT', error: '' }))
                      }
                      className="px-4 py-2 border border-[#10184A]/20 hover:bg-stone-100 text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={modalState.submitting}
                      onClick={handleSaveBaseRate}
                      className="px-5 py-2 bg-[#D6B369] hover:bg-[#E8C56A] active:bg-[#D6B369]/90 text-[#00174A] text-xs font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm font-sans"
                    >
                      {modalState.submitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
