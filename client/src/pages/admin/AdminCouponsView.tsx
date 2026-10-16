import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Percent,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  toggleAdminCouponStatus,
  deleteAdminCoupon,
} from '../../services/api';
import type { IAdminCoupon } from '../../services/api';
import { ScrollReveal } from '../../components/ScrollReveal';


// System coupons that cannot be renamed or deleted
const SYSTEM_COUPONS = ['WELCOME10', 'PREMIUM15', 'GRAND20', 'MEGA25', 'PLATINUM30'];

// Format ISO string to local IST string for display
const formatIstDateTime = (isoStr: string | null | undefined): string => {
  if (!isoStr) return 'Not Scheduled';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

// Convert ISO string to format required by datetime-local input in Asia/Kolkata
const isoToDatetimeLocalInput = (isoStr: string | null | undefined): string => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  // Format as YYYY-MM-DDTHH:mm in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => {
    partMap[p.type] = p.value;
  });
  return `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}`;
};

// Convert local IST datetime input value (YYYY-MM-DDTHH:mm) to standard ISO string
const datetimeLocalInputToIso = (val: string): string | null => {
  if (!val || !val.trim()) return null;
  // val is "YYYY-MM-DDTHH:mm". IST is UTC+05:30.
  const istIso = `${val}:00+05:30`;
  const parsed = new Date(istIso);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const AdminCouponsView: React.FC = () => {
  const [coupons, setCoupons] = useState<IAdminCoupon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Scheduled' | 'Expired' | 'Disabled'>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<IAdminCoupon | null>(null);

  // Confirmation dialog for disabling
  const [confirmDisableCoupon, setConfirmDisableCoupon] = useState<IAdminCoupon | null>(null);

  // Form states for Add/Edit
  const [formCode, setFormCode] = useState<string>('');
  const [formDiscount, setFormDiscount] = useState<string>('15');
  const [formStartDateTime, setFormStartDateTime] = useState<string>('');
  const [formEndDateTime, setFormEndDateTime] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminCoupons();
      if (res.success && Array.isArray(res.data)) {
        setCoupons(res.data);
      } else {
        toast.error(res.message || 'Failed to load coupons.');
      }
    } catch (err: any) {
      toast.error('Network error loading coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormCode('');
    setFormDiscount('15');
    setFormStartDateTime('');
    setFormEndDateTime('');
    setFormIsActive(true);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (coupon: IAdminCoupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormDiscount(coupon.discountPercentage.toString());
    setFormStartDateTime(isoToDatetimeLocalInput(coupon.startDate));
    setFormEndDateTime(isoToDatetimeLocalInput(coupon.endDate));
    setFormIsActive(coupon.isActive);
    setIsEditModalOpen(true);
  };

  // Handle Add Submit
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter a coupon code.');
      return;
    }
    if (/\s+/.test(cleanCode) || /[,+&]/.test(cleanCode)) {
      toast.error('Coupon code cannot contain spaces or separator characters (, + &).');
      return;
    }

    const pct = Number(formDiscount);
    if (isNaN(pct) || pct <= 0 || pct >= 100) {
      toast.error('Discount percentage must be greater than 0% and less than 100%.');
      return;
    }

    const isoStart = datetimeLocalInputToIso(formStartDateTime);
    const isoEnd = datetimeLocalInputToIso(formEndDateTime);

    if (isoStart && isoEnd && new Date(isoEnd) <= new Date(isoStart)) {
      toast.error('Scheduled end time must be later than start time.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createAdminCoupon({
        code: cleanCode,
        discountPercentage: pct,
        startDate: isoStart,
        endDate: isoEnd,
        isActive: formIsActive,
      });

      if (res.success) {
        toast.success(res.message || `Coupon ${cleanCode} created successfully.`);
        setIsAddModalOpen(false);
        await loadCoupons();
      } else {
        toast.error(res.message || 'Failed to create coupon.');
      }
    } catch (err: any) {
      toast.error('Network error creating coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter a coupon code.');
      return;
    }

    const pct = Number(formDiscount);
    if (isNaN(pct) || pct <= 0 || pct >= 100) {
      toast.error('Discount percentage must be greater than 0% and less than 100%.');
      return;
    }

    const isoStart = datetimeLocalInputToIso(formStartDateTime);
    const isoEnd = datetimeLocalInputToIso(formEndDateTime);

    if (isoStart && isoEnd && new Date(isoEnd) <= new Date(isoStart)) {
      toast.error('Scheduled end time must be later than start time.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateAdminCoupon(editingCoupon._id, {
        code: cleanCode,
        discountPercentage: pct,
        startDate: isoStart,
        endDate: isoEnd,
        isActive: formIsActive,
      });

      if (res.success) {
        toast.success(res.message || `Coupon ${cleanCode} updated successfully.`);
        setIsEditModalOpen(false);
        setEditingCoupon(null);
        await loadCoupons();
      } else {
        toast.error(res.message || 'Failed to update coupon.');
      }
    } catch (err: any) {
      toast.error('Network error updating coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  // Prompt confirmation when disabling, or directly enable
  const handleToggleStatusClick = (coupon: IAdminCoupon) => {
    if (coupon.isActive) {
      // Prompt confirmation before disabling
      setConfirmDisableCoupon(coupon);
    } else {
      // Enabling directly
      executeToggleStatus(coupon, true);
    }
  };

  const executeToggleStatus = async (coupon: IAdminCoupon, nextStatus: boolean) => {
    setSubmitting(true);
    try {
      const res = await toggleAdminCouponStatus(coupon._id, nextStatus);
      if (res.success) {
        toast.success(res.message || `Coupon ${coupon.code} ${nextStatus ? 'enabled' : 'disabled'}.`);
        setConfirmDisableCoupon(null);
        await loadCoupons();
      } else {
        toast.error(res.message || 'Failed to change coupon status.');
      }
    } catch (err: any) {
      toast.error('Network error changing coupon status.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteCoupon = async (coupon: IAdminCoupon) => {
    if (SYSTEM_COUPONS.includes(coupon.code)) {
      toast.error(`System coupon ${coupon.code} cannot be deleted.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete coupon ${coupon.code}?`)) {
      return;
    }

    try {
      const res = await deleteAdminCoupon(coupon._id);
      if (res.success) {
        toast.success(res.message || `Coupon ${coupon.code} deleted.`);
        await loadCoupons();
      } else {
        toast.error(res.message || 'Failed to delete coupon.');
      }
    } catch (err: any) {
      toast.error('Network error deleting coupon.');
    }
  };

  // Computed metrics
  const metrics = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.effectiveStatus === 'Active').length;
    const scheduled = coupons.filter((c) => c.effectiveStatus === 'Scheduled').length;
    const expired = coupons.filter((c) => c.effectiveStatus === 'Expired').length;
    const disabled = coupons.filter((c) => c.effectiveStatus === 'Disabled').length;
    return { total, active, scheduled, expired, disabled };
  }, [coupons]);

  // Filtered list
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (statusFilter !== 'ALL' && c.effectiveStatus !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        return c.code.toUpperCase().includes(q);
      }
      return true;
    });
  }, [coupons, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Metric Cards Header */}
      <ScrollReveal>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-sans">
          <div className="bg-white p-3.5 sm:p-4 rounded-sm border border-[#10184A]/15 shadow-xs">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#667085]">Total Coupons</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-[#00174A] mt-0.5">{metrics.total}</p>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-sm border border-emerald-500/20 shadow-xs">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-800">Active</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 mt-0.5">{metrics.active}</p>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-sm border border-amber-500/20 shadow-xs">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-800">Scheduled</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-amber-700 mt-0.5">{metrics.scheduled}</p>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-sm border border-rose-500/20 shadow-xs">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-800">Disabled</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-rose-700 mt-0.5">{metrics.disabled}</p>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-sm border border-slate-400/20 shadow-xs col-span-2 sm:col-span-1">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600">Expired</p>
            <p className="text-xl sm:text-2xl font-serif font-bold text-slate-700 mt-0.5">{metrics.expired}</p>
          </div>
        </div>
      </ScrollReveal>

      {/* Control Bar: Filters, Search, Actions */}
      <ScrollReveal delay={0.05}>
        <div className="bg-white p-4 rounded-sm border border-[#10184A]/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'Active', 'Scheduled', 'Expired', 'Disabled'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#00174A] text-[#FAF9F6] border border-[#D6B369]/40 shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-[#00174A]/80 border border-transparent'
                }`}
              >
                {st === 'ALL' ? 'All' : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-56">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search coupon code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#10184A]/20 focus:border-[#D6B369] focus:outline-hidden rounded-sm font-mono uppercase"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={loadCoupons}
              title="Refresh coupons"
              className="p-2 bg-white border border-[#10184A]/20 hover:border-[#D6B369] text-[#00174A] rounded-sm transition-colors cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00174A] hover:bg-[#071A3D] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider rounded-sm border border-[#D6B369]/40 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus size={15} className="text-[#D6B369]" />
              Add Coupon
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Coupons Table */}
      <ScrollReveal delay={0.1}>
        <div className="bg-white rounded-sm border border-[#10184A]/15 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#10184A]/10 text-[11px] font-bold uppercase tracking-wider text-[#667085]">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Effective Status</th>
                  <th className="py-3 px-4">Scheduled Window (IST)</th>
                  <th className="py-3 px-4 text-center">Enable / Disable</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {loading && coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#D6B369]" />
                      Loading coupons...
                    </td>
                  </tr>
                ) : filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400">
                      <Tag size={28} className="mx-auto mb-2 text-stone-300" />
                      No coupons found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCoupons.map((coupon) => {
                    const isSystem = SYSTEM_COUPONS.includes(coupon.code);
                    const requiresGstin = coupon.discountPercentage > 15;

                    return (
                      <tr
                        key={coupon._id}
                        className={`hover:bg-amber-50/20 transition-colors ${
                          !coupon.isActive ? 'bg-stone-50/60 opacity-80' : ''
                        }`}
                      >
                        {/* Coupon Code */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm tracking-wider text-[#00174A]">
                              {coupon.code}
                            </span>
                            <button
                              onClick={() => handleCopyCode(coupon.code)}
                              className="text-stone-400 hover:text-[#00174A] p-1 transition-colors"
                              title="Copy code"
                            >
                              {copiedCode === coupon.code ? (
                                <Check size={14} className="text-emerald-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                            {isSystem && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-stone-100 text-stone-600 border border-stone-200">
                                System
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Discount */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-serif font-bold text-base text-[#00174A]">
                              {coupon.discountPercentage}%
                            </span>
                            <span className="text-[10px] text-[#667085] font-semibold">OFF</span>
                          </div>
                          <div className="text-[10px] font-medium mt-0.5">
                            {requiresGstin ? (
                              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-xs border border-amber-200/60">
                                GSTIN Required (&gt;15%)
                              </span>
                            ) : (
                              <span className="text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-xs">
                                GSTIN Optional (≤15%)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Effective Status Badge */}
                        <td className="py-3.5 px-4">
                          {coupon.effectiveStatus === 'Active' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              Active
                            </span>
                          )}
                          {coupon.effectiveStatus === 'Scheduled' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Clock size={13} className="text-blue-600" />
                              Scheduled
                            </span>
                          )}
                          {coupon.effectiveStatus === 'Expired' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                              <XCircle size={13} className="text-slate-500" />
                              Expired
                            </span>
                          )}
                          {coupon.effectiveStatus === 'Disabled' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle size={13} className="text-rose-600" />
                              Disabled
                            </span>
                          )}
                        </td>

                        {/* Scheduled Window */}
                        <td className="py-3.5 px-4 text-stone-600 font-sans">
                          {coupon.startDate || coupon.endDate ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="font-semibold text-stone-500 w-10">Start:</span>
                                <span>{formatIstDateTime(coupon.startDate)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="font-semibold text-stone-500 w-10">End:</span>
                                <span>{formatIstDateTime(coupon.endDate)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">No time schedule (Always eligible)</span>
                          )}
                        </td>

                        {/* Enable/Disable Toggle */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatusClick(coupon)}
                            disabled={submitting}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              coupon.isActive ? 'bg-emerald-600' : 'bg-stone-300'
                            }`}
                            title={coupon.isActive ? 'Click to disable coupon' : 'Click to enable coupon'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                coupon.isActive ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(coupon)}
                              className="p-1.5 text-stone-500 hover:text-[#00174A] hover:bg-stone-100 rounded-sm transition-colors cursor-pointer"
                              title="Edit coupon"
                            >
                              <Edit2 size={15} />
                            </button>

                            {!isSystem && (
                              <button
                                onClick={() => handleDeleteCoupon(coupon)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                                title="Delete coupon"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      {/* Add Coupon Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl border border-[#10184A]/20 overflow-hidden font-sans">
            <div className="bg-[#00174A] text-[#FAF9F6] px-6 py-4 flex items-center justify-between border-b border-[#D6B369]/30">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-[#D6B369]" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Add New Coupon</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-6 space-y-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#00174A] mb-1">
                  Coupon Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#10184A]/20 focus:border-[#D6B369] focus:outline-hidden rounded-sm font-mono uppercase font-bold text-[#00174A]"
                />
                <span className="text-[11px] text-stone-500 block mt-1">
                  Normalized uppercase with spaces automatically trimmed.
                </span>
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#00174A] mb-1">
                  Discount Percentage (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    required
                    placeholder="e.g. 20"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#10184A]/20 focus:border-[#D6B369] focus:outline-hidden rounded-sm font-semibold text-[#00174A]"
                  />
                  <Percent size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                </div>
                <div className="text-[11px] text-stone-500 mt-1 space-y-0.5">
                  <p>• Applies strictly to the room tariff (never to meals or extra guests).</p>
                  <p>
                    • {Number(formDiscount) > 15 ? (
                      <span className="text-amber-700 font-semibold">
                        Discounts &gt; 15% will require guests to provide a valid GSTIN.
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Discounts ≤ 15% do not mandate GSTIN verification.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#00174A] mb-1">
                    Start Date & Time (IST)
                  </label>
                  <input
                    type="datetime-local"
                    value={formStartDateTime}
                    onChange={(e) => setFormStartDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#10184A]/20 focus:border-[#D6B369] focus:outline-hidden rounded-sm"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">Optional. Leave empty for immediate activation.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#00174A] mb-1">
                    End Date & Time (IST)
                  </label>
                  <input
                    type="datetime-local"
                    value={formEndDateTime}
                    onChange={(e) => setFormEndDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#10184A]/20 focus:border-[#D6B369] focus:outline-hidden rounded-sm"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">Optional. Leave empty for no expiry.</span>
                </div>
              </div>

              {/* Enabled Toggle */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#00174A] block">
                    Initial Status
                  </label>
                  <span className="text-[11px] text-stone-500">
                    {formIsActive ? 'Coupon is enabled for application.' : 'Coupon is created as disabled.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    formIsActive ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      formIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-100 rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#00174A] hover:bg-[#071A3D] text-[#FAF9F6] border border-[#D6B369]/40 rounded-sm shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {isEditModalOpen && editingCoupon && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-sm shadow-2xl border border-[#10184A]/20 overflow-hidden font-sans">
            <div className="bg-[#00174A] text-[#FAF9F6] px-6 py-4 flex items-center justify-between border-b border-[#D6B369]/30">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-[#D6B369]" />
                <h3 className="font-bold text-sm uppercase tracking-wider">
                  Edit Coupon: <span className="font-mono text-[#D6B369]">{editingCoupon.code}</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingCoupon(null);
                }}
                className="text-stone-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateCoupon} className="p-6 space-y-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#00174A] mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  disabled={SYSTEM_COUPONS.includes(editingCoupon.code)}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  className={`w-full px-3.5 py-2 text-sm border focus:outline-hidden rounded-sm font-mono uppercase font-bold text-[#00174A] ${
                    SYSTEM_COUPONS.includes(editingCoupon.code)
                      ? 'bg-stone-100 border-stone-200 cursor-not-allowed opacity-80'
                      : 'bg-white border-[#10184A]/20 focus:border-[#D6B369]'
                  }`}
                />
                {SYSTEM_COUPONS.includes(editingCoupon.code) ? (
                  <span className="text-[11px] text-amber-700 block mt-1">
                    System coupon code cannot be renamed.
                  </span>
                ) : (
                  <span className="text-[11px] text-stone-500 block mt-1">
                    Normalized uppercase with spaces trimmed.
                  </span>
                )}
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#00174A] mb-1">
                  Discount Percentage (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    step="1"
                    required
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#10184A]/20 focus:border-[#D6B369] focus:outline-hidden rounded-sm font-semibold text-[#00174A]"
                  />
                  <Percent size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                </div>
                <div className="text-[11px] text-stone-500 mt-1 space-y-0.5">
                  <p>• Applies strictly to room tariff.</p>
                  <p>
                    • {Number(formDiscount) > 15 ? (
                      <span className="text-amber-700 font-semibold">
                        Discounts &gt; 15% require guests to provide a valid GSTIN.
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Discounts ≤ 15% do not mandate GSTIN verification.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#00174A]">
                      Start Date (IST)
                    </label>
                    {formStartDateTime && (
                      <button
                        type="button"
                        onClick={() => setFormStartDateTime('')}
                        className="text-[10px] text-rose-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={formStartDateTime}
                    onChange={(e) => setFormStartDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#10184A]/20 focus:border-[#D6B369] focus:outline-hidden rounded-sm"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">Clear for immediate activation.</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#00174A]">
                      End Date (IST)
                    </label>
                    {formEndDateTime && (
                      <button
                        type="button"
                        onClick={() => setFormEndDateTime('')}
                        className="text-[10px] text-rose-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={formEndDateTime}
                    onChange={(e) => setFormEndDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#10184A]/20 focus:border-[#D6B369] focus:outline-hidden rounded-sm"
                  />
                  <span className="text-[10px] text-stone-400 block mt-0.5">Clear for no expiry.</span>
                </div>
              </div>

              {/* Enabled Toggle */}
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#00174A] block">
                    Enabled / Disabled
                  </label>
                  <span className="text-[11px] text-stone-500">
                    {formIsActive ? 'Coupon is currently enabled.' : 'Coupon is currently disabled.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    formIsActive ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      formIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingCoupon(null);
                  }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-100 rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-[#00174A] hover:bg-[#071A3D] text-[#FAF9F6] border border-[#D6B369]/40 rounded-sm shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disable Confirmation Dialog */}
      {confirmDisableCoupon && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-sm shadow-2xl border border-rose-500/30 overflow-hidden font-sans">
            <div className="bg-rose-50 px-6 py-4 flex items-center gap-3 border-b border-rose-200">
              <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-rose-900">Disable Coupon Confirmation</h3>
                <span className="text-[11px] text-rose-700">Immediate application lockout</span>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-stone-700 leading-relaxed">
                Are you sure you want to disable coupon{' '}
                <span className="font-mono font-bold text-[#00174A] bg-stone-100 px-1.5 py-0.5 rounded-sm">
                  {confirmDisableCoupon.code}
                </span>
                ?
              </p>
              <div className="bg-amber-50 p-3 rounded-xs border border-amber-200 text-[11px] text-amber-800 space-y-1">
                <p className="font-semibold">• Guests will be rejected immediately from applying this coupon.</p>
                <p>• This takes effect authoritatively even if the scheduled time window is currently active.</p>
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-3.5 flex items-center justify-end gap-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setConfirmDisableCoupon(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-200 rounded-sm cursor-pointer"
              >
                Keep Enabled
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => executeToggleStatus(confirmDisableCoupon, false)}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-sm shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Disabling...' : 'Yes, Disable Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
