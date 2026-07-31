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
    if (ok) {
      const role = useAuthStore.getState().user?.role;
      navigate(role === 'provider' ? '/products' : '/');
    } else setError('Invalid email or password');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--c-bg)' }}>
      {/* Left — brand panel (primary gradient) */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] relative overflow-hidden p-10"
        style={{ background: 'linear-gradient(145deg, var(--c-primary-dark) 0%, var(--c-primary) 65%, var(--c-primary-dark) 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
        <div className="absolute -bottom-32 right-0 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--c-secondary), transparent)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.35)' }}>
              <span className="text-white text-[15px] font-black">A</span>
            </div>
            <div>
              <p className="text-white text-[16px] font-black tracking-widest">STYLE IN NEED</p>
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/70">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3 text-white/75">
              Fashion Management Suite
            </p>
            <h1 className="text-[32px] font-black text-white leading-tight mb-4">
              Control every part<br />of your store
            </h1>
            <p className="text-[13px] leading-relaxed text-white/60">
              One dashboard to manage products, orders, customers, and growth analytics for Style In Need Fashions.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-8">
              {FEATURES.map(({ icon: Icon, label, sub }, i) => (
                <motion.div key={label}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                    style={{ background: 'rgba(255,255,255,0.18)' }}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <p className="text-[12px] font-semibold text-white leading-none">{label}</p>
                  <p className="text-[10px] mt-0.5 text-white/55">{sub}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer credit */}
        <div className="relative z-10">
          <p className="text-[10px] text-white/40">
            &copy; 2025 Style In Need Fashions. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center relative" style={{ background: 'var(--c-surface)' }}>
        <motion.div
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative w-full z-10 px-16 max-w-2xl"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--c-primary)' }}>
              <span className="text-white text-[14px] font-black">A</span>
            </div>
            <div>
              <p className="text-[15px] font-black tracking-widest" style={{ color: 'var(--c-text)' }}>STYLE IN NEED</p>
              <p className="text-[9px] tracking-[0.3em] uppercase" style={{ color: 'var(--c-primary)' }}>Admin</p>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--c-primary-soft)' }}>
              <ShieldCheck size={20} style={{ color: 'var(--c-primary)' }} />
            </div>
            <div>
              <h1 className="text-[28px] font-black leading-none" style={{ color: 'var(--c-text)' }}>Sign In</h1>
              <p className="text-[12px] mt-1" style={{ color: 'var(--c-muted)' }}>Secure admin access to Style In Need Fashions</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-muted)' }}>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@styleinneed.com"
                required
                className="w-full px-5 py-4 rounded-2xl text-[14px] outline-none transition-all"
                style={{ background: 'var(--c-input)', border: '1.5px solid var(--c-border)', color: 'var(--c-text)' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--c-primary)'; e.target.style.boxShadow = '0 0 0 4px var(--c-primary-soft)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--c-muted)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••"
                  required
                  className="w-full px-5 py-4 pr-14 rounded-2xl text-[14px] outline-none transition-all"
                  style={{ background: 'var(--c-input)', border: '1.5px solid var(--c-border)', color: 'var(--c-text)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--c-primary)'; e.target.style.boxShadow = '0 0 0 4px var(--c-primary-soft)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--c-border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--c-muted)' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="text-[12px] font-medium px-4 py-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-[15px] transition-all text-white"
              style={{ background: 'var(--c-primary)', boxShadow: '0 8px 24px var(--c-primary-soft)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}>
              {isLoading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-[11px] mt-8" style={{ color: 'var(--c-muted)' }}>
            Authorised personnel only &mdash; unauthorised access is prohibited.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
