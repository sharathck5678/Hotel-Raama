import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Utensils,
  Leaf,
  Beef,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminMenuItems,
  createAdminMenuItem,
  updateAdminMenuItem,
  deleteAdminMenuItem,
  toggleAdminMenuItemAvailability,
} from '../../services/api';

export const AdminMenuView: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    halfPrice: '',
    isHalfAvailable: false,
    isVeg: true,
    section: 'SWAAD',
    categoryId: '',
    isAvailable: true,
  });

  const loadData = () => {
    setLoading(true);
    fetchAdminMenuItems()
      .then((res) => {
        if (res.success && res.data) {
          const rawItems = res.data.items || res.data || [];
          const itemList = (Array.isArray(rawItems) ? rawItems : []).map((i: any) => ({
            ...i,
            isAvailable: i.isAvailable !== false,
          }));
          setItems(itemList);
          setCategories(res.data.categories || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load menu items:', err);
        toast.error('Failed to load menu items');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      price: '',
      halfPrice: '',
      isHalfAvailable: false,
      isVeg: true,
      section: 'SWAAD',
      categoryId: categories[0]?._id || '',
      isAvailable: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      description: item.description || '',
      price: item.price !== undefined ? String(item.price) : '',
      halfPrice: item.halfPrice !== undefined && item.halfPrice !== null ? String(item.halfPrice) : '',
      isHalfAvailable: !!item.isHalfAvailable,
      isVeg: item.isVeg !== undefined ? !!item.isVeg : true,
      section: item.section || 'SWAAD',
      categoryId: item.categoryId || '',
      isAvailable: item.isAvailable !== false,
    });
    setIsModalOpen(true);
  };

  const handleToggleAvailability = async (item: any) => {
    try {
      const currentAvailable = item.isAvailable !== false;
      const nextAvailable = !currentAvailable;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, isAvailable: nextAvailable } : i))
      );

      const res = await toggleAdminMenuItemAvailability(item._id);
      if (res.success) {
        toast.success(`${item.name} is now ${nextAvailable ? 'In Stock' : 'Out of Stock'}`);
      } else {
        loadData(); // Revert
      }
    } catch {
      toast.error('Failed to toggle status');
      loadData();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await deleteAdminMenuItem(deleteTarget._id);
      if (res.success) {
        toast.success(`"${deleteTarget.name}" deleted successfully.`);
        setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
        setDeleteTarget(null);
      } else {
        toast.error(res.message || 'Failed to delete item.');
      }
    } catch {
      toast.error('Error deleting menu item.');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      toast.error('Please enter dish name and price.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        halfPrice: formData.isHalfAvailable && formData.halfPrice ? Number(formData.halfPrice) : null,
        isHalfAvailable: formData.isHalfAvailable,
        isVeg: formData.isVeg,
        section: formData.section,
        categoryId: formData.categoryId || null,
        isAvailable: formData.isAvailable,
      };

      if (editingItem) {
        const res = await updateAdminMenuItem(editingItem._id, payload);
        if (res.success) {
          toast.success(`Updated "${formData.name}" successfully!`);
          setIsModalOpen(false);
          loadData();
        } else {
          toast.error(res.message || 'Failed to update item.');
        }
      } else {
        const res = await createAdminMenuItem(payload);
        if (res.success) {
          toast.success(`Created "${formData.name}" successfully!`);
          setIsModalOpen(false);
          loadData();
        } else {
          toast.error(res.message || 'Failed to create item.');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error saving menu item.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSection = selectedSection === 'ALL' || item.section === selectedSection;

    const matchesDiet =
      dietaryFilter === 'ALL'
        ? true
        : dietaryFilter === 'VEG'
        ? item.isVeg === true
        : item.isVeg === false;

    return matchesSearch && matchesSection && matchesDiet;
  });

  return (
    <div className="p-6 space-[#f7f7f2] space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#cbc0ad]/40 pb-5">
        <div>
          <span className="text-[#8c764b] text-[10px] font-sans font-bold uppercase tracking-[0.2em] block">
            Restaurant Management
          </span>
          <h1 className="text-3xl font-serif text-[#333333] flex items-center gap-2">
            <BookOpen className="text-[#47614d]" size={28} /> Menu Catalog
          </h1>
          <p className="text-xs font-sans text-[#666666] mt-1">
            Manage dish titles, categories, pricing, portion rates, and real-time kitchen availability.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 bg-[#47614d] hover:bg-[#374c3c] text-white px-5 py-2.5 rounded-sm font-sans text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
        >
          <Plus size={16} /> Add New Dish
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-sm border border-[#cbc0ad] shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search dish or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#f7f7f2] border border-[#cbc0ad] rounded-sm text-xs font-sans text-[#333333] focus:border-[#47614d] focus:outline-none"
            />
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#f7f7f2] border border-[#cbc0ad] rounded-sm text-xs font-sans text-[#333333] focus:border-[#47614d] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Restaurant Sections</option>
              <option value="SWAAD">Swaad Fine Dining</option>
              <option value="LLB">Liquid Lounge Bar (LLB)</option>
              <option value="HOTEL_RAAMA">Hotel Raama Room Service</option>
              <option value="SAMBHRAMA">Sambhrama Banquet</option>
            </select>
          </div>

          {/* Dietary Filter */}
          <div>
            <select
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value as any)}
              className="w-full px-3.5 py-2 bg-[#f7f7f2] border border-[#cbc0ad] rounded-sm text-xs font-sans text-[#333333] focus:border-[#47614d] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Dietary Tags</option>
              <option value="VEG">🟢 Vegetarian Only</option>
              <option value="NON_VEG">🔴 Non-Vegetarian Only</option>
            </select>
          </div>

          {/* Item Count Summary */}
          <div className="flex items-center justify-end text-xs font-sans text-[#666666] font-medium px-2">
            Showing {filteredItems.length} of {items.length} dishes
          </div>
        </div>
      </div>

      {/* Menu Table / Grid */}
      {loading ? (
        <div className="text-center py-20 bg-white border border-[#cbc0ad] rounded-sm">
          <div className="w-8 h-8 border-3 border-[#47614d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-sans text-[#666666]">Loading menu catalog...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#cbc0ad] rounded-sm">
          <Utensils className="mx-auto text-[#cbc0ad] mb-3" size={40} />
          <p className="text-sm font-serif text-[#333333] font-semibold">No dishes found matching your criteria</p>
          <p className="text-xs font-sans text-[#666666] mt-1">Try adjusting your search terms or filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#cbc0ad] rounded-sm overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#181e19] text-white text-[11px] font-sans uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Dish Details</th>
                  <th className="py-3.5 px-4 font-semibold">Section</th>
                  <th className="py-3.5 px-4 font-semibold">Dietary</th>
                  <th className="py-3.5 px-4 font-semibold">Full Price</th>
                  <th className="py-3.5 px-4 font-semibold">Half Price</th>
                  <th className="py-3.5 px-4 font-semibold">Availability</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cbc0ad]/30 text-xs font-sans">
                {filteredItems.map((item) => (
                  <tr key={item._id} className="hover:bg-[#f7f7f2]/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                        />
                        <div>
                          <span className="font-bold text-[#333333] block text-sm font-serif">
                            {item.name}
                          </span>
                          {item.description && (
                            <span className="text-[11px] text-[#666666] line-clamp-1">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-[#0B1849]/5 border border-[#cbc0ad] rounded-sm text-[10px] uppercase font-bold text-[#333333] tracking-wider">
                        {item.section || 'SWAAD'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.isVeg ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-500/10 border border-emerald-700/30 px-2 py-0.5 rounded-sm font-bold text-[10px]">
                          <Leaf size={12} /> VEG
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-800 bg-red-500/10 border border-red-700/30 px-2 py-0.5 rounded-sm font-bold text-[10px]">
                          <Beef size={12} /> NON-VEG
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold font-serif text-[#333333] text-sm">
                      ₹{item.price}
                    </td>

                    <td className="py-3.5 px-4 text-[#666666]">
                      {item.isHalfAvailable && item.halfPrice ? (
                        <span className="font-semibold text-emerald-800">₹{item.halfPrice}</span>
                      ) : (
                        <span className="text-gray-400 text-[11px]">N/A</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {(() => {
                        const isItemAvailable = item.isAvailable !== false;
                        return (
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                              isItemAvailable
                                ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-600/30'
                                : 'bg-red-500/15 text-red-800 border border-red-600/30'
                            }`}
                          >
                            {isItemAvailable ? (
                              <>
                                <Check size={12} /> In Stock
                              </>
                            ) : (
                              <>
                                <X size={12} /> Out of Stock
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-[#47614d] hover:bg-[#47614d]/10 rounded-sm transition-colors cursor-pointer"
                        title="Edit Dish"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 text-red-700 hover:bg-red-500/10 rounded-sm transition-colors cursor-pointer"
                        title="Delete Dish"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT / ADD DISH MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#f7f7f2] border border-[#cbc0ad] text-[#333333] rounded-sm max-w-lg w-full p-6 relative shadow-2xl space-y-5"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="border-b border-[#cbc0ad] pb-3">
                <span className="text-[#8c764b] text-[10px] font-sans font-bold uppercase tracking-[0.2em]">
                  {editingItem ? 'Edit Dish Details' : 'New Dish Entry'}
                </span>
                <h2 className="text-2xl font-serif text-[#333333]">
                  {editingItem ? editingItem.name : 'Create New Menu Dish'}
                </h2>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-sans">
                {/* Dish Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paneer Butter Masala"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] focus:border-[#47614d] focus:outline-none"
                  />
                </div>

                {/* Section & Dietary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                      Restaurant Section *
                    </label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] focus:border-[#47614d] focus:outline-none cursor-pointer"
                    >
                      <option value="SWAAD">Swaad Fine Dining</option>
                      <option value="LLB">Liquid Lounge Bar (LLB)</option>
                      <option value="HOTEL_RAAMA">Hotel Raama Room Service</option>
                      <option value="SAMBHRAMA">Sambhrama Banquet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                      Dietary Type *
                    </label>
                    <select
                      value={formData.isVeg ? 'VEG' : 'NON_VEG'}
                      onChange={(e) => setFormData({ ...formData, isVeg: e.target.value === 'VEG' })}
                      className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] focus:border-[#47614d] focus:outline-none cursor-pointer"
                    >
                      <option value="VEG">🟢 Vegetarian</option>
                      <option value="NON_VEG">🔴 Non-Vegetarian</option>
                    </select>
                  </div>
                </div>

                {/* Pricing: Full Rate & Half Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                      Full Portion Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 240"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] focus:border-[#47614d] focus:outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                      Half Portion Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Optional e.g. 140"
                      disabled={!formData.isHalfAvailable}
                      value={formData.halfPrice}
                      onChange={(e) => setFormData({ ...formData, halfPrice: e.target.value })}
                      className={`w-full border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans focus:outline-none ${
                        formData.isHalfAvailable
                          ? 'bg-white text-[#333333] focus:border-[#47614d]'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                {/* Checkbox: Half Portion Available */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isHalfAvailable"
                    checked={formData.isHalfAvailable}
                    onChange={(e) =>
                      setFormData({ ...formData, isHalfAvailable: e.target.checked })
                    }
                    className="rounded accent-[#47614d] cursor-pointer"
                  />
                  <label htmlFor="isHalfAvailable" className="text-xs text-[#333333] cursor-pointer font-medium">
                    Enable Half Portion / Half Plate Option
                  </label>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#666666] mb-1">
                    Dish Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short appetizing description or key ingredients..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white border border-[#cbc0ad] rounded-sm px-3.5 py-2 text-xs font-sans text-[#333333] focus:border-[#47614d] focus:outline-none"
                  />
                </div>

                {/* Availability Checkbox */}
                <div className="flex items-center gap-2 p-3 bg-white border border-[#cbc0ad] rounded-sm">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="rounded accent-[#47614d] cursor-pointer"
                  />
                  <label htmlFor="isAvailable" className="text-xs text-[#333333] cursor-pointer font-semibold">
                    In Stock (Available for ordering in Kitchen / QR menu)
                  </label>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-[#cbc0ad]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-sm border border-[#cbc0ad] text-xs font-sans text-[#666666] hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-sm bg-[#47614d] text-white font-sans text-xs font-bold uppercase tracking-wider hover:bg-[#374c3c] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Dish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION WARNING MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#f7f7f2] border border-red-300 text-[#333333] rounded-sm max-w-md w-full p-6 relative shadow-2xl space-y-4"
            >
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 text-red-700 border-b border-[#cbc0ad]/40 pb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                  <AlertTriangle size={22} className="text-red-700" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#333333]">Confirm Dish Deletion</h3>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-red-700 block">
                    Permanent Removal Warning
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs font-sans text-[#333333]">
                <p className="text-sm">
                  Are you sure you want to delete <span className="font-bold font-serif text-black text-base">"{deleteTarget.name}"</span>?
                </p>
                <div className="text-[#666666] leading-relaxed bg-red-500/10 p-3 rounded-sm border border-red-200 text-[11px] space-y-1">
                  <p className="font-bold text-red-800 flex items-center gap-1">
                    ⚠️ Warning: This action cannot be undone.
                  </p>
                  <p className="text-red-900">
                    This dish will be permanently deleted from the menu catalog, room service, and guest QR code ordering directories.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#cbc0ad]/40">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-sm border border-[#cbc0ad] text-xs font-sans font-medium text-[#666666] hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-5 py-2 rounded-sm bg-red-700 hover:bg-red-800 text-white font-sans text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Yes, Delete Dish'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminMenuView;
