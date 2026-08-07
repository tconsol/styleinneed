import { useState } from 'react';
import { BadgeCheck, Phone, Save, UserRound } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth.api';
import { formatDate } from '../utils/format';
import toast from 'react-hot-toast';
import AccountHeader from '../components/account/AccountHeader';

export function ProfileSection() {
  const { user, fetchMe } = useAuthStore();
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSavingProfile(true);
    try {
      await authApi.updateProfile({ name: String(data.get('name') || ''), phone: String(data.get('phone') || '') });
      await fetchMe();
      toast.success('Profile updated');
    } catch { /* error toast shown by api interceptor */ } finally {
      setSavingProfile(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-xl text-brand-text text-sm outline-none focus:border-primary focus:bg-white transition-all duration-200 placeholder:text-brand-muted/60';

  return (
    <div className="bg-white border border-brand-border rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(28,28,28,0.05)]">
      {/* Identity band */}
      <div className="relative bg-brand-text px-6 md:px-9 py-8 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-64 h-64 rounded-full bg-secondary/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-full bg-gradient-to-br from-primary via-primary-light to-primary-dark text-brand-text flex items-center justify-center font-heading text-2xl md:text-3xl font-bold ring-4 ring-white/10">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="font-heading text-xl md:text-2xl font-bold text-white truncate">{user?.name}</p>
            <p className="font-body text-sm text-white/55 truncate">{user?.email}</p>
          </div>
          <div className="ml-auto hidden sm:block text-right">
            <p className="font-body text-[9px] uppercase tracking-[0.3em] text-white/35 mb-1">Member Since</p>
            <p className="font-heading text-sm text-primary">{user?.createdAt ? formatDate(user.createdAt) : '-'}</p>
          </div>
        </div>

        <div className="relative mt-7 pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <BadgeCheck size={16} className={user?.isEmailVerified ? 'text-primary' : 'text-white/30'} />
            </div>
            <div>
              <p className="font-body text-[9px] uppercase tracking-[0.25em] text-white/35">Email</p>
              <p className={`font-body text-xs font-medium ${user?.isEmailVerified ? 'text-primary' : 'text-amber-300'}`}>
                {user?.isEmailVerified ? 'Verified' : 'Not verified'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Phone size={15} className="text-white/60" />
            </div>
            <div>
              <p className="font-body text-[9px] uppercase tracking-[0.25em] text-white/35">Phone</p>
              <p className="font-body text-xs font-medium text-white/85">{user?.phone || 'Not added'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <UserRound size={15} className="text-white/60" />
            </div>
            <div>
              <p className="font-body text-[9px] uppercase tracking-[0.25em] text-white/35">Member</p>
              <p className="font-body text-xs font-medium text-white/85 capitalize">{user?.role || 'Customer'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="p-6 md:p-9">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-5 bg-primary rounded-full" />
          <h3 className="font-heading text-lg font-semibold text-brand-text">Edit Profile</h3>
        </div>
        <form key={user?._id} onSubmit={handleSaveProfile} className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="input-label">Full Name</label>
            <input name="name" defaultValue={user?.name || ''} className={inputCls} required />
          </div>
          <div>
            <label className="input-label">Email Address</label>
            <input value={user?.email || ''} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
          </div>
          <div className="sm:col-span-2">
            <label className="input-label">Phone Number</label>
            <input name="phone" defaultValue={user?.phone || ''} className={inputCls} placeholder="10-digit mobile" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 bg-primary text-white font-body font-medium px-7 py-3 text-xs tracking-widest uppercase rounded-xl hover:bg-primary-dark transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingProfile ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-8 md:py-12 max-w-4xl">
        <AccountHeader
          eyebrow="Account"
          title="My Profile"
          subtitle="Your personal details, contact info and account status — all in one place."
        />
        <ProfileSection />
      </div>
    </div>
  );
}
