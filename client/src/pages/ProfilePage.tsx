import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth.api';
import { formatDate } from '../utils/format';
import toast from 'react-hot-toast';

export function ProfileSection() {
  const { user, fetchMe } = useAuthStore();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) setProfileForm({ name: user.name, phone: user.phone || '' });
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authApi.updateProfile(profileForm);
      await fetchMe();
      toast.success('Profile updated');
    } catch {
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="bg-white border border-brand-border p-6">
      <h2 className="font-heading text-xl font-semibold mb-6">My Profile</h2>
      <form onSubmit={handleSaveProfile} className="space-y-5 max-w-xl">
        <div>
          <label className="input-label">Full Name</label>
          <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="input-field" required />
        </div>
        <div>
          <label className="input-label">Email Address</label>
          <input value={user?.email} disabled className="input-field opacity-60 cursor-not-allowed" />
        </div>
        <div>
          <label className="input-label">Phone Number</label>
          <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="input-field" placeholder="10-digit mobile" />
        </div>
        <div className="flex items-center gap-2">
          <label className="input-label m-0">Email Verified:</label>
          <span className={`font-body text-sm font-medium ${user?.isEmailVerified ? 'text-green-600' : 'text-orange-500'}`}>
            {user?.isEmailVerified
              ? <span className={'flex items-center gap-1'}><CheckCircle size={14} /> Verified</span>
              : <span className={'flex items-center gap-1'}><XCircle size={14} /> Not Verified</span>
            }
          </span>
        </div>
        <div>
          <label className="input-label">Member Since</label>
          <p className="font-body text-sm text-brand-muted">{user?.createdAt ? formatDate(user.createdAt) : '-'}</p>
        </div>
        <button type="submit" disabled={savingProfile} className="btn-primary">
          {savingProfile ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: 'var(--topbar-height)' }}>
      <div className="container-custom py-10 max-w-4xl">
        <Link to="/account" className="lg:hidden inline-flex items-center gap-1 font-body text-sm text-brand-muted hover:text-primary mb-4">
          <ChevronLeft size={16} /> My Account
        </Link>
        <ProfileSection />
      </div>
    </div>
  );
}
