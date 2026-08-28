import React, { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../../services/api';

export const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs()
      .then((res) => {
        if (res.success) setLogs(res.data);
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

  return (
    <div className="space-y-6 text-[#333333]">
      <div className="border-b border-[#cbc0ad] pb-4">
        <h1 className="text-2xl font-serif text-[#333333]">Administrative Audit Trail</h1>
        <p className="text-xs font-sans text-[#666666]">Security audit log of all staff operations and admin authentication events</p>
      </div>

      <div className="bg-[#47614d] text-[#f7f7f2] rounded-sm border border-[#f7f7f2]/15 overflow-hidden shadow-xl font-sans text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f7f7f2]/10 text-[#d9b57d] uppercase font-bold border-b border-[#f7f7f2]/15 text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Admin Email</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7f7f2]/10 text-[#f7f7f2]/80">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-[#f7f7f2]/5 transition-colors">
                  <td className="p-4 text-[#f7f7f2]/50 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 font-semibold text-white">{log.adminEmail}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-sm bg-[#f7f7f2]/10 text-[#d9b57d] border border-[#f7f7f2]/15 text-[9px] font-bold uppercase tracking-wider">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[#d9b57d]">{log.entity}</td>
                  <td className="p-4 text-[10px] font-mono text-[#f7f7f2]/60">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
