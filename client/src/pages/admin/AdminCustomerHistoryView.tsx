import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchCustomerHistory } from '../../services/api';

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
    <div className="space-y-6 text-[#333333]">
      <div className="flex justify-between items-center border-b border-[#cbc0ad] pb-4">
        <div>
          <h1 className="text-2xl font-serif text-[#333333]">Customer Order & Spend Analytics</h1>
          <p className="text-xs font-sans text-[#666666]">Guest history, last ordered room, and lifetime spend totals</p>
        </div>

        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-2.5 text-[#0B1849]/40" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f7f7f2] border border-[#cbc0ad] rounded-sm pl-9 pr-3 py-2 text-xs font-sans text-[#333333] focus:border-[#cbc0ad]"
          />
        </div>
      </div>

      <div className="bg-[#47614d] text-[#f7f7f2] rounded-sm border border-[#f7f7f2]/15 overflow-hidden shadow-xl font-sans text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f7f7f2]/10 text-[#d9b57d] uppercase font-bold border-b border-[#f7f7f2]/15 text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Guest Name</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Total Orders</th>
                <th className="p-4">Total Spent</th>
                <th className="p-4">Last Order Room</th>
                <th className="p-4">Last Order Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f7f2]/10 text-[#f7f7f2]/80">
              {filtered.map((c, idx) => (
                <tr key={idx} className="hover:bg-[#f7f7f2]/5 transition-colors">
                  <td className="p-4 font-semibold text-white">{c.guestName}</td>
                  <td className="p-4 font-mono text-[11px]">{c.guestPhone}</td>
                  <td className="p-4 font-bold">{c.totalOrders} Orders</td>
                  <td className="p-4 font-serif font-bold text-emerald-400">₹{c.totalSpent}</td>
                  <td className="p-4 font-semibold text-[#d9b57d]">Room #{c.lastOrderRoom}</td>
                  <td className="p-4 text-[#f7f7f2]/50 text-[11px]">{new Date(c.lastOrderDate).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
