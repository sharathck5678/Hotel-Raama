import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { BedDouble, CalendarCheck, UtensilsCrossed, TrendingUp, Award } from 'lucide-react';
import { fetchDashboardMetrics } from '../../services/api';
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from '../../components/ScrollReveal';

export const AdminDashboardView: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics()
      .then((res) => {
        if (res.success) setMetrics(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#333333]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cbc0ad]"></div>
      </div>
    );
  }

  const categoryData = metrics?.categoryBreakdown || [];
  const topItems = metrics?.topSellingItems || [];
  const revenueChartData = metrics?.revenueChart || [];

  return (
    <div className="space-y-6 sm:space-y-8 text-[#333333]">
      {/* Metric Cards Grid */}
      <ScrollRevealGroup staggerDelay={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <ScrollRevealItem>
          <div className="bg-[#47614d] text-[#f7f7f2] p-4 sm:p-6 rounded-sm border border-[#f7f7f2]/15 space-y-2.5 sm:space-y-3 shadow-md hover:border-[#d9b57d]/40 transition-all h-full">
            <div className="flex justify-between items-center text-[#f7f7f2]/70 text-xs font-sans font-bold uppercase tracking-wider">
              <span>Occupancy Rate</span>
              <BedDouble size={18} className="text-[#d9b57d]" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-[#f7f7f2]">{metrics?.occupancyRate || 0}%</div>
            <p className="text-[10px] font-sans text-[#f7f7f2]/60">
              {metrics?.occupiedRooms || 0} of {metrics?.totalRooms || 0} Rooms Occupied
            </p>
          </div>
        </ScrollRevealItem>

        <ScrollRevealItem>
          <div className="bg-[#47614d] text-[#f7f7f2] p-4 sm:p-6 rounded-sm border border-[#f7f7f2]/15 space-y-2.5 sm:space-y-3 shadow-md hover:border-[#d9b57d]/40 transition-all h-full">
            <div className="flex justify-between items-center text-[#f7f7f2]/70 text-xs font-sans font-bold uppercase tracking-wider">
              <span>Live Kitchen Orders</span>
              <UtensilsCrossed size={18} className="text-[#d9b57d]" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-[#d9b57d]">{metrics?.pendingOrdersCount || 0}</div>
            <p className="text-[10px] font-sans text-[#f7f7f2]/60">Active orders on kitchen board</p>
          </div>
        </ScrollRevealItem>

        <ScrollRevealItem>
          <div className="bg-[#47614d] text-[#f7f7f2] p-4 sm:p-6 rounded-sm border border-[#f7f7f2]/15 space-y-2.5 sm:space-y-3 shadow-md hover:border-[#d9b57d]/40 transition-all h-full">
            <div className="flex justify-between items-center text-[#f7f7f2]/70 text-xs font-sans font-bold uppercase tracking-wider">
              <span>Confirmed Bookings</span>
              <CalendarCheck size={18} className="text-[#d9b57d]" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-[#f7f7f2]">{metrics?.totalConfirmedBookings || 0}</div>
            <p className="text-[10px] font-sans text-[#f7f7f2]/60">Active room reservations</p>
          </div>
        </ScrollRevealItem>

        <ScrollRevealItem>
          <div className="bg-[#47614d] text-[#f7f7f2] p-4 sm:p-6 rounded-sm border border-[#f7f7f2]/15 space-y-2.5 sm:space-y-3 shadow-md hover:border-emerald-400/40 transition-all h-full">
            <div className="flex justify-between items-center text-[#f7f7f2]/70 text-xs font-sans font-bold uppercase tracking-wider">
              <span>Combined Revenue</span>
              <TrendingUp size={18} className="text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-400">
              ₹{(metrics?.totalCombinedRevenue || 0).toLocaleString()}
            </div>
            <p className="text-[10px] font-sans text-[#f7f7f2]/60">Rooms + Food Service Payments</p>
          </div>
        </ScrollRevealItem>
      </ScrollRevealGroup>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Revenue Growth Trend Chart (Spans 2 columns) */}
        <ScrollReveal direction="left" duration={0.85} className="lg:col-span-2 h-full">
          <div className="bg-[#47614d] text-[#f7f7f2] p-4 sm:p-6 rounded-sm border border-[#f7f7f2]/15 space-y-4 shadow-md h-full">
            <div className="flex justify-between items-center border-b border-[#f7f7f2]/10 pb-3">
              <div>
                <h3 className="text-lg sm:text-xl font-serif text-[#f7f7f2]">Revenue Analytics</h3>
                <p className="text-xs font-sans text-[#f7f7f2]/60">Monthly room bookings & culinary dining performance</p>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2 font-sans text-xs">
              {revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFDE74" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#FFDE74" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,252,225,0.1)" />
                    <XAxis dataKey="month" stroke="#f7f7f2" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#f7f7f2" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B1849', borderColor: '#FFDE74', borderRadius: '4px', color: '#f7f7f2' }}
                      formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Total Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#FFDE74" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#f7f7f2]/50 text-xs font-sans text-center px-4">
                  No revenue recorded yet. Placed food orders & bookings will automatically populate real-time analytics.
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Category Breakdown (1 column) */}
        <ScrollReveal direction="right" duration={0.85} className="h-full">
          <div className="bg-[#47614d] text-[#f7f7f2] p-4 sm:p-6 rounded-sm border border-[#f7f7f2]/15 space-y-4 shadow-md h-full">
            <div className="border-b border-[#f7f7f2]/10 pb-3">
              <h3 className="text-lg sm:text-xl font-serif text-[#f7f7f2]">Revenue Distribution</h3>
              <p className="text-xs font-sans text-[#f7f7f2]/60">Sales breakdown by category</p>
            </div>

            <div className="h-48 sm:h-56 w-full pt-2">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,252,225,0.1)" />
                    <XAxis type="number" stroke="#f7f7f2" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" stroke="#f7f7f2" hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B1849', borderColor: '#FFDE74', borderRadius: '4px', color: '#f7f7f2' }}
                      formatter={(val: any) => [`₹${val.toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {categoryData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#FFDE74'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#f7f7f2]/50 text-xs font-sans text-center px-4">
                  No category sales recorded yet.
                </div>
              )}
            </div>

            {categoryData.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#f7f7f2]/10 max-h-40 overflow-y-auto">
                {categoryData.map((cat: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-sans">
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                      <span className="text-[#f7f7f2]/80 truncate">{cat.name}</span>
                    </div>
                    <span className="font-bold text-[#f7f7f2] shrink-0">₹{cat.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>

      {/* Top Performing Menu Items Section */}
      <ScrollReveal direction="up" duration={0.85}>
        <div className="bg-[#47614d] text-[#f7f7f2] p-4 sm:p-6 rounded-sm border border-[#f7f7f2]/15 space-y-4 shadow-md font-sans">
          <div className="flex justify-between items-center border-b border-[#f7f7f2]/10 pb-3">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-[#d9b57d] shrink-0" />
              <div>
                <h3 className="text-lg sm:text-xl font-serif text-[#f7f7f2]">Top Ordered Menu Items</h3>
                <p className="text-xs text-[#f7f7f2]/60">Most popular menu items ordered in Swaad & Liquid Lounge</p>
              </div>
            </div>
          </div>

          {topItems.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-[#f7f7f2]/10 text-[#d9b57d] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 sm:px-4">Item Name</th>
                    <th className="py-3 px-3 sm:px-4">Category</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Orders Count</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f7f7f2]/5">
                  {topItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#f7f7f2]/5 transition-all">
                      <td className="py-3 px-3 sm:px-4 font-bold text-white">{item.name}</td>
                      <td className="py-3 px-3 sm:px-4">
                        <span className="px-2 py-0.5 rounded-sm bg-[#f7f7f2]/10 text-[#f7f7f2]/80 text-[10px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-center font-bold text-[#d9b57d]">{item.ordersCount}</td>
                      <td className="py-3 px-3 sm:px-4 text-right font-bold text-emerald-400">₹{item.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-[#f7f7f2]/50 text-xs font-sans">
              No item sales data recorded yet.
            </div>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
};

