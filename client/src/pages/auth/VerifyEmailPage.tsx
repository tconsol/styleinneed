import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, MessageCircle } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const nav = (location.state || {}) as {
    email?: string; phone?: string; channel?: 'whatsapp' | 'email'; whatsappFailed?: boolean;
  };
  const email = nav.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  // Where the code actually went, as reported by the server.
  const [channel, setChannel] = useState<'whatsapp' | 'email'>(nav.channel || 'email');
  const [whatsappFailed, setWhatsappFailed] = useState(!!nav.whatsappFailed);
  const onWhatsApp = channel === 'whatsapp';
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    digits.split('').forEach((c, i) => { next[i] = c; });
    setOtp(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.verifyEmail({ email, otp: code });

      // The code already proved they own the address, so the server hands back
      // a session rather than making them type the password again.
      if (data.data?.autoLogin && data.data.accessToken) {
        setSession({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          user: data.data.user,
        });
        toast.success(`Welcome, ${data.data.user?.name || 'there'}!`);
        navigate('/', { replace: true });
        return;
      }
      toast.success('Email verified! Please sign in.');
      navigate('/auth/login', { replace: true });
    } catch { /* error toast shown by api interceptor */ } finally {
      setLoading(false);
    }
  };

  const resend = async (forceEmail = false) => {
    try {
      const { data } = await authApi.resendOtp(email, forceEmail ? 'email' : undefined);
      const next = data.data?.otpChannel === 'whatsapp' ? 'whatsapp' : 'email';
      setChannel(next);
      setWhatsappFailed(!!data.data?.whatsappFailed);
      toast.success(next === 'whatsapp' ? 'Code resent on WhatsApp' : 'Code resent by email');
    } catch { /* error toast shown by api interceptor */ }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <Link to="/" className="block mb-10">
          <span className="font-heading text-2xl font-bold tracking-wider text-brand-text">STYLE IN NEED</span>
          <span className="block font-body text-[9px] tracking-[0.4em] uppercase text-primary mt-0.5">FASHIONS</span>
        </Link>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
          style={onWhatsApp
            ? { background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.35)' }
            : { background: 'var(--c-primary-soft, rgba(0,0,0,0.05))', border: '1px solid rgba(0,0,0,0.08)' }}>
          {onWhatsApp
            ? <MessageCircle size={22} style={{ color: '#25D366' }} />
            : <Mail size={22} className="text-primary" />}
        </div>
        <h1 className="heading-sm text-brand-text mb-3">
          {onWhatsApp ? 'Check WhatsApp' : 'Verify Your Account'}
        </h1>
        <p className="font-body text-brand-muted text-sm mb-3">
          We sent a 6-digit code to{' '}
          <strong className="text-brand-text">{onWhatsApp && nav.phone ? nav.phone : email}</strong>
        </p>

        {whatsappFailed && (
          <p className="font-body text-xs mb-6 mx-auto max-w-sm rounded-lg px-3 py-2"
            style={{ background: 'rgba(234,179,8,0.12)', color: '#8A6D1F', border: '1px solid rgba(234,179,8,0.3)' }}>
            That number doesn&rsquo;t have WhatsApp, so we emailed your code to <strong>{email}</strong> instead.
          </p>
        )}
        {!whatsappFailed && <div className="mb-6" />}
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-2.5 sm:gap-3 mb-8" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-heading font-bold text-brand-text caret-primary bg-brand-surface border rounded-lg outline-none transition-all duration-200 hover:border-primary/50 ${digit ? 'border-primary/60' : 'border-brand-border'} focus:bg-white focus:border-primary focus:ring-[3px] focus:ring-primary/20 focus:scale-105`}
              />
            ))}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify OTP'}
          </button>
        </form>
        <p className="font-body text-sm text-brand-muted mt-6">
          Didn&rsquo;t receive it?{' '}
          <button onClick={() => resend()} className="text-primary hover:underline">Resend code</button>
        </p>
        {onWhatsApp && (
          <p className="font-body text-xs text-brand-muted mt-2">
            <button onClick={() => resend(true)} className="hover:underline">
              Send it to my email instead
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}
