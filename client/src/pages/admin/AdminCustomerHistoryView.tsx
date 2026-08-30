import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchCustomerHistory } from '../../services/api';
import { ScrollReveal } from '../../components/ScrollReveal';

export const AdminCustomerHistoryView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomerHistory()
      .then((res) => {
        if (res.success) setCustomers(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.guestName.toLowerCase().includes(search.toLowerCase()) ||
      c.guestPhone.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#333333]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cbc0ad]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 text-[#333333]">
      <ScrollReveal direction="up" duration={0.8}>
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-[#cbc0ad] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-serif text-[#333333]">Customer Order & Spend Analytics</h1>
            <p className="text-xs font-sans text-[#666666]">Guest history, last ordered room, and lifetime spend totals</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-2.5 text-[#0B1849]/40" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#f7f7f2] border border-[#cbc0ad] rounded-sm pl-9 pr-3 py-2 text-xs font-sans text-[#333333] focus:border-[#47614d]"
            />
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal direction="up" duration={0.85}>
        <div className="bg-[#47614d] text-[#f7f7f2] rounded-sm border border-[#f7f7f2]/15 shadow-xl font-sans text-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[620px]">
              <thead className="bg-[#f7f7f2]/10 text-[#d9b57d] uppercase font-bold border-b border-[#f7f7f2]/15 text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Guest Name</th>
                  <th className="py-3 px-3.5">Phone Number</th>
                  <th className="py-3 px-3.5">Total Orders</th>
                  <th className="py-3 px-3.5">Total Spent</th>
                  <th className="py-3 px-3.5">Last Order Room</th>
                  <th className="py-3 px-3.5">Last Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7f7f2]/10 text-[#f7f7f2]/80">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#f7f7f2]/50 text-xs">
                      {search ? 'No matching customer records found.' : 'No customer history yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c, idx) => (
                    <tr key={idx} className="hover:bg-[#f7f7f2]/5 transition-colors">
                      <td className="py-3 px-3.5 font-semibold text-white whitespace-nowrap">{c.guestName}</td>
                      <td className="py-3 px-3.5 font-mono text-[11px] whitespace-nowrap">{c.guestPhone}</td>
                      <td className="py-3 px-3.5 font-bold whitespace-nowrap">{c.totalOrders} Orders</td>
                      <td className="py-3 px-3.5 font-serif font-bold text-emerald-400 whitespace-nowrap">₹{c.totalSpent}</td>
                      <td className="py-3 px-3.5 font-semibold text-[#d9b57d] whitespace-nowrap">Room #{c.lastOrderRoom}</td>
                      <td className="py-3 px-3.5 text-[#f7f7f2]/50 text-[11px] whitespace-nowrap">{new Date(c.lastOrderDate).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
};

