import { useEffect } from 'react';
import { NavLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Package, Heart, RotateCcw, Headphones, LogOut, MapPin, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ProfileSection } from '../ProfilePage';

const MENU = [
  { path: '/profile', label: 'My Profile', icon: User },
  { path: '/orders', label: 'My Orders', icon: Package },
  { path: '/wishlist', label: 'Wishlist', icon: Heart },
  { path: '/addresses', label: 'Addresses', icon: MapPin },
  { path: '/returns', label: 'Returns', icon: RotateCcw },
  { path: '/support', label: 'Support', icon: Headphones },
];

export default function AccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout, fetchMe } = useAuthStore();

  useEffect(() => { fetchMe(); }, []);

  // Legacy links: /account?tab=orders -> /orders
  const legacyTab = searchParams.get('tab');
  if (legacyTab) {
    return <Navigate to={legacyTab === 'profile' ? '/profile' : `/${legacyTab}`} replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-bg" style={{ paddingTop: "var(--topbar-height)" }}>
      <div className="container-custom py-10">
        <h1 className="heading-sm text-brand-text mb-8">My Account</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="bg-brand-surface border border-brand-border p-5 mb-4">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-brand-border">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-heading font-bold text-xl">
                  {user?.name[0]}
                </div>
                <div>
                  <p className="font-body font-semibold text-brand-text">{user?.name}</p>
                  <p className="font-body text-xs text-brand-muted">{user?.email}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {MENU.map(({ path, label, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className="flex items-center justify-between gap-3 px-3 py-3 lg:py-2.5 font-body text-sm text-brand-text hover:bg-brand-border/30 hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-3"><Icon size={16} />{label}</span>
                    <ChevronRight size={15} className="text-brand-muted" />
                  </NavLink>
                ))}
              </nav>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 font-body text-sm text-red-500 hover:bg-red-50 border border-brand-border transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </aside>

          {/* Desktop convenience: show profile inline next to the menu */}
          <div className="hidden lg:block lg:col-span-3">
            <ProfileSection />
          </div>
        </div>
      </div>
    </div>
  );
}
