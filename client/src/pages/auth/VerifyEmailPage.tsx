import { useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as { email?: string })?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      await authApi.verifyEmail({ email, otp: code });
      toast.success('Email verified! Please login.');
      navigate('/auth/login');
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await authApi.resendOtp(email);
      toast.success('OTP resent!');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <Link to="/" className="block mb-10">
          <span className="font-heading text-2xl font-bold tracking-wider text-brand-text">STYLE IN NEED</span>
          <span className="block font-body text-[9px] tracking-[0.4em] uppercase text-primary mt-0.5">FASHIONS</span>
        </Link>
        <h1 className="heading-sm text-brand-text mb-3">Verify Your Email</h1>
        <p className="font-body text-brand-muted text-sm mb-8">
          We sent a 6-digit OTP to <strong>{email}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center gap-3 mb-8">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-heading font-bold border-2 border-brand-border focus:border-primary outline-none bg-transparent transition-colors"
              />
            ))}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify OTP'}
          </button>
        </form>
        <p className="font-body text-sm text-brand-muted mt-6">
          Didn't receive it?{' '}
          <button onClick={resend} className="text-primary hover:underline">Resend OTP</button>
        </p>
      </motion.div>
    </div>
  );
}
