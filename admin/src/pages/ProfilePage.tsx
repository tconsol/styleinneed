import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle, Mail, Phone, ShieldCheck, KeyRound, Save, Pencil, X, Building2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authApi, providerApi } from '../api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateProfile, fetchMe } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin';
  const roleLabel = user?.role?.replace(/_/g, ' ');
  const dirty = form.name.trim() !== (user?.name || '') || form.phone.trim() !== (user?.phone || '');

  // Email-change (admin only): request OTP → verify OTP.
  const [emailStep, setEmailStep] = useState<'idle' | 'otp'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { toast.error('Name must be at least 2 characters'); return; }
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone.trim())) { toast.error('Enter a valid 10-digit phone number'); return; }
    setSaving(true);
    try {
      await updateProfile({ name: form.name.trim(), phone: form.phone.trim() || undefined });
    } finally { setSaving(false); }
  };

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Enter a valid email address'); return; }
    if (email === user?.email?.toLowerCase()) { toast.error('This is already your email'); return; }
    setEmailBusy(true);
    try {
      const { data } = await authApi.requestEmailChange(email);
      toast.success(data?.message || 'Verification code sent');
      setEmailStep('otp');
    } catch { /* interceptor toasts */ } finally { setEmailBusy(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setEmailBusy(true);
    try {
      await authApi.verifyEmailChange(otp.trim());
      toast.success('Email updated');
      await fetchMe();
      setEmailStep('idle'); setNewEmail(''); setOtp('');
    } catch { /* interceptor toasts */ } finally { setEmailBusy(false); }
  };

  const cancelEmail = () => { setEmailStep('idle'); setNewEmail(''); setOtp(''); };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: 'linear-gradient(120deg, #4338CA 0%, #4F46E5 45%, #818CF8 100%)' }}>
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-20 blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
        <div className="absolute -bottom-20 -left-8 w-52 h-52 rounded-full opacity-10 blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
        <div className="relative flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-[32px] font-black flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '2px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-black text-white leading-tight truncate">{user?.name}</h1>
            <p className="text-[12px] text-white/70 truncate flex items-center gap-1.5 mt-0.5"><Mail size={12} /> {user?.email}</p>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize"
                style={{ background: 'rgba(255,255,255,0.9)', color: '#4338CA' }}>
                <ShieldCheck size={11} /> {roleLabel}
              </span>
              {user?.isActive !== false && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white"
                  style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> Active
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account + Email grid */}
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Account details */}
        <form onSubmit={submit} className="card space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF', color: '#4338CA' }}>
              <UserCircle size={16} />
            </div>
            <div>
              <p className="text-[12px] font-bold text-brand-text leading-none">Account Details</p>
              <p className="text-[10px] text-brand-muted mt-0.5">Your name and contact number</p>
            </div>
          </div>

          <div>
            <label className="input-label">Full Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="Your name" required minLength={2} />
          </div>

          <div>
            <label className="input-label flex items-center gap-1.5"><Phone size={12} /> Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field" placeholder="10-digit mobile number" maxLength={10} inputMode="numeric" />
          </div>

          <button type="submit" disabled={saving || !dirty} className="btn-primary w-full justify-center disabled:opacity-50">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        {/* Email */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#DCFCE7', color: '#166534' }}>
                <Mail size={15} />
              </div>
              <div>
                <p className="text-[12px] font-bold text-brand-text leading-none">Email Address</p>
                <p className="text-[10px] text-brand-muted mt-0.5">{isAdmin ? 'Verified with an OTP' : 'Managed by administrator'}</p>
              </div>
            </div>
            {isAdmin && emailStep === 'idle' && (
              <button onClick={() => setEmailStep('otp')} className="btn-outline text-[11px] py-1">
                <Pencil size={12} /> Change
              </button>
            )}
            {isAdmin && emailStep !== 'idle' && (
              <button onClick={cancelEmail} className="text-brand-muted hover:text-brand-text"><X size={16} /></button>
            )}
          </div>

          <input value={user?.email || ''} disabled className="input-field opacity-60 cursor-not-allowed" />

          {isAdmin && emailStep === 'otp' && (
            <div className="pt-3 space-y-4" style={{ borderTop: '1px solid var(--c-border)' }}>
              {/* Step 1: new email */}
              <form onSubmit={requestOtp} className="space-y-2">
                <label className="input-label">New Email Address</label>
                <div className="flex gap-2">
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className="input-field flex-1" placeholder="new@email.com" required />
                  <button type="submit" disabled={emailBusy} className="btn-primary whitespace-nowrap disabled:opacity-50">
                    {emailBusy ? 'Sending…' : 'Send OTP'}
                  </button>
                </div>
                <p className="text-[10px] text-brand-muted">A 6-digit code will be sent to the new address to verify it.</p>
              </form>

              {/* Step 2: OTP */}
              <form onSubmit={verifyOtp} className="space-y-2">
                <label className="input-label">Verification Code</label>
                <div className="flex gap-2">
                  <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="input-field flex-1 tracking-[0.4em] font-semibold" placeholder="000000" maxLength={6} inputMode="numeric" />
                  <button type="submit" disabled={emailBusy || otp.length !== 6} className="btn-primary whitespace-nowrap disabled:opacity-50">
                    {emailBusy ? 'Verifying…' : 'Verify'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Provider business profile — provider fills / updates admin-created record */}
      {user?.role === 'provider' && <ProviderBusinessCard />}

      {/* Security */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7', color: '#92400E' }}>
            <KeyRound size={16} />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-brand-text">Password</p>
            <p className="text-[11px] text-brand-muted">Change your account password</p>
          </div>
        </div>
        <Link to="/change-password" className="btn-outline">Change</Link>
      </div>
    </div>
  );
}

type ProviderProfile = {
  name?: string; category?: string; contactPerson?: string; phone?: string; email?: string;
  address?: string; city?: string; state?: string; gstin?: string;
  bankAccountName?: string; bankAccountNumber?: string; bankIfsc?: string; bankName?: string;
};

const FIELDS: { key: keyof ProviderProfile; label: string; ph?: string }[] = [
  { key: 'contactPerson', label: 'Contact Person' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Business Email' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'gstin', label: 'GSTIN' },
  { key: 'bankName', label: 'Bank Name' },
  { key: 'bankAccountName', label: 'Account Holder Name' },
  { key: 'bankAccountNumber', label: 'Account Number' },
  { key: 'bankIfsc', label: 'IFSC Code' },
];

function ProviderBusinessCard() {
  const [data, setData] = useState<ProviderProfile | null>(null);
  const [form, setForm] = useState<ProviderProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    providerApi.getMine()
      .then((r) => { setData(r.data.data); setForm(r.data.data || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof ProviderProfile, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = data ? FIELDS.some((f) => (form[f.key] || '') !== (data[f.key] || '')) : false;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = Object.fromEntries(FIELDS.map((f) => [f.key, form[f.key]?.trim() || '']));
      const { data: res } = await providerApi.updateMine(payload);
      setData(res.data); setForm(res.data);
      toast.success('Business profile updated');
    } catch { /* interceptor toasts */ } finally { setSaving(false); }
  };

  if (loading) return <div className="card text-[12px] text-brand-muted">Loading business profile…</div>;
  if (!data) return null;

  return (
    <form onSubmit={save} className="card space-y-4">
      <div className="flex items-center gap-2 pb-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3E8FF', color: '#6B21A8' }}>
          <Building2 size={15} />
        </div>
        <div>
          <p className="text-[12px] font-bold text-brand-text leading-none">Business Profile</p>
          <p className="text-[10px] text-brand-muted mt-0.5">Your company & payout details</p>
        </div>
      </div>

      {/* Admin-set identity (read-only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="input-label">Business Name</label>
          <input value={data.name || ''} disabled className="input-field opacity-60 cursor-not-allowed" />
        </div>
        <div>
          <label className="input-label">Category</label>
          <input value={data.category || ''} disabled className="input-field opacity-60 cursor-not-allowed capitalize" />
        </div>
      </div>
      <p className="text-[10px] text-brand-muted -mt-1">Business name & category are set by the administrator. Fill in the rest below.</p>

      {/* Editable fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.key === 'address' ? 'sm:col-span-2' : ''}>
            <label className="input-label">{f.label}</label>
            <input value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}
              className="input-field" placeholder={f.ph || `Add ${f.label.toLowerCase()}`} />
          </div>
        ))}
      </div>

      <button type="submit" disabled={saving || !dirty} className="btn-primary justify-center disabled:opacity-50">
        <Save size={14} /> {saving ? 'Saving…' : 'Save Business Profile'}
      </button>
    </form>
  );
}
