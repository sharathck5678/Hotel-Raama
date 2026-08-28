import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { adminLogin } from '../../services/api';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both admin email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await adminLogin({ email: email.trim(), password });
      if (res.success) {
        toast.success('Authenticated successfully!');
        navigate('/admin');
      } else {
        toast.error(res.message || 'Authentication failed. Check your credentials.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#333333] flex items-center justify-center p-6">
      <div className="bg-[#ffffff] text-[#333333] border border-[#cbc0ad] rounded-[20px] p-8 sm:p-10 max-w-md w-full space-y-7 shadow-xl">
        
        {/* Header Badge */}
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 rounded-full bg-[#47614d]/10 border border-[#47614d]/30 text-[#47614d] flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck size={28} />
          </div>
          <span className="text-[10px] font-bold text-[#47614d] uppercase tracking-[1.6px] block">
            Hotel Raama Control Panel
          </span>
          <h1 className="text-3xl font-bold text-[#333333]">Admin Login</h1>
          <p className="text-xs text-[#666666]">
            Enter authorized management credentials to access live operations
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#666666] uppercase tracking-[1.6px] mb-1.5 text-[10px]">
              Admin Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3 text-[#666666]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f7f7f2] border border-[#cbc0ad] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#333333] focus-design transition-colors"
                required
                placeholder="admin@hotelraama.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#666666] uppercase tracking-[1.6px] mb-1.5 text-[10px]">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3 text-[#666666]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f7f7f2] border border-[#cbc0ad] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#333333] focus-design transition-colors"
                required
                placeholder="••••••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#47614d] text-[#f7f7f2] hover:bg-[#374c3c] font-semibold text-xs uppercase tracking-[1.6px] shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 focus-design mt-2"
          >
            {loading ? 'Authenticating...' : 'Authenticate & Sign In'} <ArrowRight size={15} />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#cbc0ad]/40 text-[10px] text-[#666666]">
          Protected JWT HTTP-Only Cookie Session
        </div>
      </div>
    </div>
  );
};
