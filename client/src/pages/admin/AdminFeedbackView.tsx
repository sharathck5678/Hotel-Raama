import React, { useEffect, useState } from 'react';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Mail,
  Archive,
  Trash2,
  Search,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAdminFeedbacks,
  updateAdminFeedbackStatus,
  deleteAdminFeedback,
} from '../../services/api';
import { ScrollReveal } from '../../components/ScrollReveal';

export interface AdminFeedbackItem {
  _id: string;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  overallRating: number;
  roomRating: number;
  foodRating: number;
  cleanlinessRating: number;
  serviceRating: number;
  recommendation: boolean;
  comment?: string;
  submittedAt: string;
  status: 'new' | 'read' | 'archived';
  emailNotificationSent: boolean;
  emailNotificationError?: string;
}

export interface FeedbackSummaryMetrics {
  totalFeedback: number;
  averageRating: number;
  recommendCount: number;
  recommendPercentage: number;
  newCount: number;
  ratingDistribution: Record<number, number>;
}

export const AdminFeedbackView: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<AdminFeedbackItem[]>([]);
  const [summary, setSummary] = useState<FeedbackSummaryMetrics>({
    totalFeedback: 0,
    averageRating: 0,
    recommendCount: 0,
    recommendPercentage: 0,
    newCount: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  const loadFeedbacks = () => {
    setLoading(true);
    const params: any = { sort: sortBy };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (ratingFilter !== 'all') params.rating = ratingFilter;
    if (searchQuery.trim()) params.search = searchQuery.trim();

    fetchAdminFeedbacks(params)
      .then((res) => {
        if (res.success && res.data) {
          setFeedbacks(res.data.feedbacks || []);
          if (res.data.summary) {
            setSummary(res.data.summary);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFeedbacks();
  }, [statusFilter, ratingFilter, sortBy]);

  // Debounced search trigger
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFeedbacks();
  };

  const handleStatusUpdate = async (id: string, newStatus: 'new' | 'read' | 'archived') => {
    try {
      const res = await updateAdminFeedbackStatus(id, newStatus);
      if (res && res.success) {
        toast.success(`Feedback marked as ${newStatus}.`);
        setFeedbacks((prev) =>
          prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
        );
        // Update summary new count
        if (newStatus === 'read') {
          setSummary((s) => ({ ...s, newCount: Math.max(0, s.newCount - 1) }));
        }
      } else {
        toast.error(res?.message || 'Failed to update feedback status.');
      }
    } catch {
      toast.error('Failed to update feedback status.');
    }
  };

  const handleDelete = async (id: string, bookingId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete feedback for booking ${bookingId}?`)) {
      return;
    }

    try {
      const res = await deleteAdminFeedback(id);
      if (res && res.success) {
        toast.success('Feedback entry deleted.');
        setFeedbacks((prev) => prev.filter((item) => item._id !== id));
        loadFeedbacks();
      } else {
        toast.error(res?.message || 'Failed to delete feedback.');
      }
    } catch {
      toast.error('Failed to delete feedback.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={13}
            className={star <= rating ? 'fill-[#D6B369] text-[#D6B369]' : 'text-slate-300'}
          />
        ))}
        <span className="ml-1 text-[11px] font-bold text-[#00174A]">{rating}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-[#00174A]">
      {/* Title Header */}
      <ScrollReveal direction="up" duration={0.8}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#10184A]/15 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif text-[#00174A]">Customer Feedback</h1>
              {summary.newCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D6B369] text-[#00174A] tracking-wider animate-pulse">
                  {summary.newCount} NEW
                </span>
              )}
            </div>
            <p className="text-xs font-sans text-[#667085]">
              Private post-stay ratings and comments from verified Hotel Raama guests
            </p>
          </div>

          <button
            onClick={loadFeedbacks}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 bg-white text-[#00174A] hover:bg-[#00174A]/5 rounded-md border border-[#00174A]/15 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </ScrollReveal>

      {/* Summary KPI Cards */}
      <ScrollReveal direction="up" duration={0.85}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Received */}
          <div className="bg-white rounded-xl p-4 border border-[#00174A]/10 shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-[#667085] font-bold block mb-1">
              Total Responses
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold text-[#00174A]">
                {summary.totalFeedback}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Guest Stays</span>
            </div>
          </div>

          {/* Average Rating */}
          <div className="bg-white rounded-xl p-4 border border-[#00174A]/10 shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-[#667085] font-bold block mb-1">
              Average Rating
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold text-[#00174A]">
                {summary.averageRating}
              </span>
              <div className="flex items-center text-[#D6B369]">
                <Star size={18} className="fill-[#D6B369]" />
                <span className="text-[11px] text-slate-500 ml-1">/ 5.0</span>
              </div>
            </div>
          </div>

          {/* Recommendation Rate */}
          <div className="bg-white rounded-xl p-4 border border-[#00174A]/10 shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-[#667085] font-bold block mb-1">
              Recommend Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700">
                {summary.recommendPercentage}%
              </span>
              <span className="text-[11px] text-slate-500">Would Recommend</span>
            </div>
          </div>

          {/* New / Unread */}
          <div className="bg-white rounded-xl p-4 border border-[#00174A]/10 shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-[#667085] font-bold block mb-1">
              Unreviewed
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-serif font-bold text-[#D6B369]">
                {summary.newCount}
              </span>
              <span className="text-[11px] text-slate-500">Pending Review</span>
            </div>
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="bg-white rounded-xl p-4 border border-[#00174A]/10 shadow-xs mt-3">
          <span className="text-[11px] uppercase tracking-wider text-[#00174A] font-bold block mb-3">
            Star Distribution
          </span>
          <div className="grid grid-cols-5 gap-2 sm:gap-4">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = summary.ratingDistribution[stars] || 0;
              const percent = summary.totalFeedback > 0 ? Math.round((count / summary.totalFeedback) * 100) : 0;
              return (
                <div key={stars} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">{stars} ★</span>
                    <span className="text-slate-500">{count}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D6B369] rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 block text-right">{percent}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* Filter & Search Bar */}
      <ScrollReveal direction="up" duration={0.9}>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-[#00174A]/10 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, booking ID, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs text-[#00174A] focus:outline-hidden focus:ring-1 focus:ring-[#D6B369]"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="new">New / Unread</option>
              <option value="read">Read</option>
              <option value="archived">Archived</option>
            </select>

            {/* Rating Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rating_desc">Highest Rating</option>
              <option value="rating_asc">Lowest Rating</option>
            </select>
          </div>
        </div>
      </ScrollReveal>

      {/* Feedbacks List / Table */}
      <ScrollReveal direction="up" duration={0.95}>
        <div className="bg-[#F7F0DF] rounded-xl border border-[#10184A]/20 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#00174A]">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D6B369] border-t-transparent mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading feedback records...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <MessageSquare size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-[#00174A]">No customer feedback found</p>
              <p className="text-xs text-slate-400 mt-1">
                {statusFilter !== 'all' || ratingFilter !== 'all' || searchQuery
                  ? 'Try adjusting your search or filters.'
                  : 'Customer feedback submitted via post-stay email invitations will appear here privately.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#10184A]/10 bg-white">
              {feedbacks.map((fb) => {
                const isExpanded = expandedId === fb._id;
                const isNew = fb.status === 'new';

                return (
                  <div
                    key={fb._id}
                    className={`p-4 sm:p-5 transition-colors ${
                      isNew ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#00174A] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {fb.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#00174A]">{fb.customerName}</span>
                            <span className="text-[11px] font-mono text-slate-500">
                              ({fb.bookingId})
                            </span>
                            {isNew && (
                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-[#D6B369] text-[#00174A]">
                                NEW
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block">{fb.customerEmail}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          {renderStars(fb.overallRating)}
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(fb.submittedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            fb.recommendation
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {fb.recommendation ? (
                            <>
                              <ThumbsUp size={10} /> Recommended
                            </>
                          ) : (
                            <>
                              <ThumbsDown size={10} /> Not Recommended
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Customer Written Comment */}
                    {fb.comment ? (
                      <div className="my-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 italic">
                        "{fb.comment}"
                      </div>
                    ) : (
                      <div className="my-1 text-[11px] text-slate-400 italic">
                        No written comments provided.
                      </div>
                    )}

                    {/* Category Ratings Bar / Collapsible Breakdown */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50/60 p-3 rounded-lg">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            Room & Comfort
                          </span>
                          {renderStars(fb.roomRating)}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            Food & Dining
                          </span>
                          {renderStars(fb.foodRating)}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            Cleanliness
                          </span>
                          {renderStars(fb.cleanlinessRating)}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            Staff & Service
                          </span>
                          {renderStars(fb.serviceRating)}
                        </div>
                      </div>
                    )}

                    {/* Action Toolbar */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => toggleExpand(fb._id)}
                        className="text-[11px] font-semibold text-[#00174A] hover:text-[#D6B369] flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={14} /> Hide Category Details
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} /> View All 5 Category Ratings
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5 text-xs">
                        {/* Admin Email Notification Status Indicator */}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold flex items-center gap-1 ${
                            fb.emailNotificationSent
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-amber-700 bg-amber-50'
                          }`}
                          title={
                            fb.emailNotificationSent
                              ? 'Admin received notification email for this submission.'
                              : fb.emailNotificationError || 'Admin notification pending or failed'
                          }
                        >
                          <Mail size={11} />
                          {fb.emailNotificationSent ? 'Alert Sent' : 'Alert Pending'}
                        </span>

                        {/* Status Badges & Quick Actions */}
                        {fb.status === 'new' && (
                          <button
                            onClick={() => handleStatusUpdate(fb._id, 'read')}
                            className="px-2 py-1 rounded bg-[#00174A]/10 hover:bg-[#00174A]/20 text-[#00174A] text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Mark Read
                          </button>
                        )}

                        {fb.status === 'read' && (
                          <button
                            onClick={() => handleStatusUpdate(fb._id, 'new')}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Mark Unread
                          </button>
                        )}

                        {fb.status !== 'archived' ? (
                          <button
                            onClick={() => handleStatusUpdate(fb._id, 'archived')}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Archive feedback"
                          >
                            <Archive size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusUpdate(fb._id, 'read')}
                            className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Unarchive
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(fb._id, fb.bookingId)}
                          className="p-1 rounded text-slate-300 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Delete feedback"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
};

export default AdminFeedbackView;
