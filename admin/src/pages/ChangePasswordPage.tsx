import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { authApi } from '../api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const logout = useAuthStore((s) => s.logout);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (form.next !== form.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await authApi.changePassword(form.current, form.next);
      toast.success('Password changed. Please sign in again.');
      await logout();
      window.location.href = '/login';
    } catch { /* interceptor toasts */ } finally { setSaving(false); }
  };

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={18} className="text-brand-muted" />
        <h1 className="text-[18px] font-bold text-brand-text">Change Password</h1>
      </div>
      <p className="text-[12px] text-brand-muted mb-5">Update your account password. You'll be signed out afterwards.</p>

      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="input-label">Current Password</label>
          <input type="password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} className="input-field" required autoComplete="current-password" />
        </div>
        <div>
          <label className="input-label">New Password</label>
          <input type="password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} className="input-field" placeholder="Min 8 characters" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <label className="input-label">Confirm New Password</label>
          <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="input-field" required autoComplete="new-password" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
          {saving ? 'Saving…' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
