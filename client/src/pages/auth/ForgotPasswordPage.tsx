import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../../api/auth.api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent if account exists.');
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/" className="block mb-10">
          <span className="font-heading text-2xl font-bold tracking-wider text-brand-text">STYLE IN NEED</span>
          <span className="block font-body text-[9px] tracking-[0.4em] uppercase text-primary mt-0.5">FASHIONS</span>
        </Link>
        <h1 className="heading-sm text-brand-text mb-3">Reset Password</h1>
        <p className="font-body text-brand-muted text-sm mb-8">
          Enter your email and we'll send you a reset link.
        </p>
        {sent ? (
          <div className="bg-green-50 border border-green-200 p-5 text-center">
            <p className="font-body text-sm text-green-700 mb-3">Check your inbox for the reset link.</p>
            <Link to="/auth/login" className="text-primary font-medium hover:underline text-sm">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send Reset Link'}
            </button>
            <p className="text-center font-body text-sm">
              <Link to="/auth/login" className="text-primary hover:underline">Back to Login</Link>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}
