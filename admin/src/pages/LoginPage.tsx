import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, Package, ShoppingCart, Users, BarChart2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const FEATURES = [
  { icon: ShoppingCart, label: 'Orders',     sub: 'Manage & track all orders' },
  { icon: Package,      label: 'Products',   sub: 'Catalogue & inventory' },
  { icon: Users,        label: 'Customers',  sub: 'CRM & customer data' },
  { icon: BarChart2,    label: 'Analytics',  sub: 'Revenue & growth reports' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await login(form.email, form.password);
    if (ok) navigate('/');
    else setError('Invalid email or password');
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#0B0B1E' }}>
      {/* Left — brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] relative overflow-hidden p-10"
        style={{ background: 'linear-gradient(145deg, #0F0E2E 0%, #1a145e 60%, #0B0B1E 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent)' }} />
        <div className="absolute -bottom-32 right-0 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #818CF8, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.06] blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #4F46E5, transparent)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #818CF8)', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}>
              <span className="text-white text-[15px] font-black">A</span>
            </div>
            <div>
              <p className="text-white text-[16px] font-black tracking-widest">STYLE IN NEED</p>
              <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: '#818CF8' }}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: '#818CF8' }}>
              Fashion Management Suite
            </p>
            <h1 className="text-[32px] font-black text-white leading-tight mb-4">
              Control every part<br />of your store
            </h1>
            <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              One dashboard to manage products, orders, customers, and growth analytics for Style In Need Fashions.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8">
              {FEATURES.map(({ icon: Icon, label, sub }, i) => (
                <motion.div key={label}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: 'rgba(99,102,241,0.2)' }}>
                    <Icon size={14} style={{ color: '#818CF8' }} />
                  </div>
                  <p className="text-[12px] font-semibold text-white leading-none">{label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer credit */}
        <div className="relative z-10">
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            &copy; 2025 Style In Need Fashions. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right — login form (no card, full bleed) */}
      <div className="flex-1 flex items-center justify-center relative"
        style={{ background: '#0D0D24' }}>
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, #6366F1 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <motion.div
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full z-10 px-16 max-w-2xl"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #818CF8)' }}>
              <span className="text-white text-[14px] font-black">A</span>
            </div>
            <div>
              <p className="text-white text-[15px] font-black tracking-widest">STYLE IN NEED</p>
              <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: '#818CF8' }}>Admin</p>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)' }}>
              <ShieldCheck size={20} style={{ color: '#818CF8' }} />
            </div>
            <div>
              <h1 className="text-[28px] font-black text-white leading-none">Sign In</h1>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Secure admin access to Style In Need Fashions</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#6B7280' }}>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@styleinneed.com"
                required
                className="w-full px-5 py-4 rounded-2xl text-[14px] outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  color: '#E2E8F0',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366F1';
                  e.target.style.background = 'rgba(99,102,241,0.06)';
                  e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.background = 'rgba(255,255,255,0.04)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: '#6B7280' }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••"
                  required
                  className="w-full px-5 py-4 pr-14 rounded-2xl text-[14px] outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    color: '#E2E8F0',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366F1';
                    e.target.style.background = 'rgba(99,102,241,0.06)';
                    e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.background = 'rgba(255,255,255,0.04)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#818CF8'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-[12px] font-medium px-4 py-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-[15px] transition-all"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: 'white', boxShadow: '0 8px 24px rgba(79,70,229,0.4)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(79,70,229,0.5)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(79,70,229,0.4)'; }}>
              {isLoading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-[11px] mt-8" style={{ color: 'rgba(255,255,255,0.15)' }}>
            Authorised personnel only &mdash; unauthorised access is prohibited.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
