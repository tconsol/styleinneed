import { useEffect } from 'react';
import { NavLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Package, Heart, RotateCcw, Headphones, LogOut, MapPin, ChevronRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ProfileSection } from '../ProfilePage';
import { formatDate } from '../../utils/format';

const MENU = [
  { path: '/profile', label: 'My Profile', hint: 'Personal details & security', icon: User },
  { path: '/orders', label: 'My Orders', hint: 'Track and manage orders', icon: Package },
  { path: '/wishlist', label: 'Wishlist', hint: 'Your saved styles', icon: Heart },
  { path: '/addresses', label: 'Addresses', hint: 'Saved delivery addresses', icon: MapPin },
  { path: '/returns', label: 'Returns', hint: 'Returns & refunds', icon: RotateCcw },
  { path: '/support', label: 'Support', hint: 'Help centre & tickets', icon: Headphones },
];

export default function AccountPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout, fetchMe } = useAuthStore();

  useEffect(() => { fetchMe(); }, [fetchMe]);

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
      <div className="container-custom py-8 md:py-12">
        {/* Hero strip */}
        <div className="relative bg-brand-text rounded-2xl px-6 md:px-10 py-8 md:py-10 overflow-hidden mb-8 md:mb-10">
          <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-28 -left-10 w-72 h-72 rounded-full bg-secondary/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
              backgroundSize: '22px 22px',
            }}
          />
          <div className="relative flex flex-wrap items-center gap-5">
            <div className="w-16 h-16 md:w-[76px] md:h-[76px] rounded-full bg-gradient-to-br from-primary via-primary-light to-primary-dark text-brand-text flex items-center justify-center font-heading text-2xl md:text-3xl font-bold ring-4 ring-white/10">
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-body text-[10px] tracking-[0.35em] uppercase text-primary font-semibold mb-1 flex items-center gap-2">
                <Sparkles size={11} /> My Account
              </p>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-white leading-tight">
                Welcome back, {user?.name?.split(' ')[0] || 'there'}
              </h1>
              <p className="font-body text-sm text-white/55 mt-1.5">
                {user?.email}
                {user?.createdAt ? ` · Member since ${formatDate(user.createdAt)}` : ''}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="sm:ml-auto inline-flex items-center gap-2 font-body text-[10px] font-semibold uppercase tracking-[0.2em] px-5 py-3 rounded-full bg-white/5 border border-white/15 text-white/70 hover:text-red-400 hover:border-red-400/40 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Menu */}
          <aside className="lg:col-span-1">
            <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {MENU.map(({ path, label, hint, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `group flex items-center gap-4 bg-white border rounded-2xl p-4 transition-all duration-300 ${
                      isActive
                        ? 'border-primary/60 shadow-[0_8px_30px_rgba(200,169,126,0.2)]'
                        : 'border-brand-border hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(28,28,28,0.05)]'
                    }`
                  }
                >
                  <span className="w-11 h-11 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all duration-300">
                    <Icon size={18} className="text-brand-text group-hover:text-white transition-colors" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-body text-sm font-semibold text-brand-text">{label}</span>
                      <ChevronRight size={14} className="text-brand-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </span>
                    <span className="font-body text-[11px] text-brand-muted">{hint}</span>
                  </span>
                </NavLink>
              ))}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-4 lg:hidden w-full flex items-center justify-center gap-2 font-body text-xs font-semibold uppercase tracking-[0.2em] text-red-500 border border-red-200 bg-red-50/50 rounded-2xl py-4 hover:bg-red-50 transition-colors"
            >
              <LogOut size={14} /> Sign Out
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
