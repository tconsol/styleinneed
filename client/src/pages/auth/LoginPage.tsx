import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useWishlistStore } from '../../stores/wishlistStore';

const FASHION_IMAGES = [
  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=80',
  'https://images.unsplash.com/photo-1583391733956-6c78276477e1?w=900&q=80',
  'https://images.unsplash.com/photo-1614093302611-8efc4c438a87?w=900&q=80',
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';
  const { login, googleLogin, isLoading } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { fetchWishlist } = useWishlistStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [imgIdx] = useState(Math.floor(Math.random() * FASHION_IMAGES.length));

  const afterLogin = async () => {
    await Promise.all([fetchCart(), fetchWishlist()]);
    navigate(from, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(form.email, form.password);
    if (ok) await afterLogin();
  };

  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const ok = await googleLogin(tokenResponse.access_token);
      if (ok) await afterLogin();
    },
    onError: () => {},
  });

  return (
    <div className="min-h-screen flex bg-brand-bg">
      {/* Left — Image (desktop only) */}
      <div className="hidden lg:block relative w-[45%] xl:w-1/2 flex-shrink-0">
        <img src={FASHION_IMAGES[imgIdx]} alt="Fashion" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-text/60 via-brand-text/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-10 xl:p-14">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}>
            <p className="font-body text-[10px] tracking-[0.4em] uppercase text-primary mb-3">STYLE IN NEED FASHIONS</p>
            <h2 className="font-heading text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Where Heritage<br />Meets Elegance
            </h2>
            <p className="font-body text-white/70 text-base max-w-xs leading-relaxed">
              Discover 5000+ handpicked styles from India's finest weavers and designers.
            </p>
            <div className="flex gap-6 mt-8">
              {[{ value: '5000+', label: 'Styles' }, { value: '50K+', label: 'Customers' }, { value: '4.8★', label: 'Rating' }].map((s) => (
                <div key={s.label}>
                  <p className="font-heading text-2xl font-bold text-primary">{s.value}</p>
                  <p className="font-body text-xs text-white/60">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Card */}
        <div className="flex-1 flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-12 xl:px-16 max-w-md mx-auto w-full lg:max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            {/* Logo */}
            <Link to="/" className="inline-block mb-8">
              <span className="font-heading text-2xl font-bold tracking-wider text-brand-text">STYLE IN NEED</span>
              <span className="block font-body text-[9px] tracking-[0.4em] uppercase text-primary -mt-0.5">FASHIONS</span>
            </Link>

            <div className="mb-6">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-brand-text mb-1.5">Welcome back</h1>
              <p className="font-body text-sm text-brand-muted">
                New here?{' '}
                <Link to="/auth/register" className="text-primary hover:text-primary-dark font-medium transition-colors">
                  Create an account
                </Link>
              </p>
            </div>

            {/* Google button */}
            <button
              type="button"
              onClick={() => handleGoogle()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-brand-border bg-white text-brand-text text-sm font-medium rounded-lg hover:bg-brand-surface transition-colors duration-200 mb-5 shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-brand-border" />
              <span className="font-body text-[11px] text-brand-muted uppercase tracking-wider">or sign in with email</span>
              <div className="flex-1 h-px bg-brand-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-body text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-brand-surface border border-brand-border text-brand-text text-sm outline-none focus:border-primary focus:bg-white transition-all duration-200 placeholder:text-brand-muted/60 rounded-lg"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-body text-xs font-semibold text-brand-muted uppercase tracking-wider">Password</label>
                  <Link to="/auth/forgot-password" className="font-body text-xs text-primary hover:text-primary-dark transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 bg-brand-surface border border-brand-border text-brand-text text-sm outline-none focus:border-primary focus:bg-white transition-all duration-200 placeholder:text-brand-muted/60 pr-12 rounded-lg"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-muted hover:text-primary transition-colors"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-body font-medium py-3 text-sm tracking-wider uppercase rounded-lg hover:bg-primary-dark transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
