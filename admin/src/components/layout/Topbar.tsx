import { Menu, ArrowLeft, Search } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ThemeSwitcher from './ThemeSwitcher';
import { useAuthStore } from '../../stores/authStore';

interface Props { onMenuClick: () => void; title: string; onSearchClick: () => void; }

export default function Topbar({ onMenuClick, title, onSearchClick }: Props) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = location.pathname === '/'; // no back button on the dashboard
  // Label the chord the way this OS writes it.
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

  return (
    <header className="h-14 flex items-center justify-between px-5"
      style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--c-muted)' }}>
          <Menu size={18} />
        </button>
        {!isRoot && (
          <button onClick={() => navigate(-1)} title="Go back"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--c-primary-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--c-muted)'; }}>
            <ArrowLeft size={16} />
          </button>
        )}
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--c-text)' }}>{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Command palette trigger. Shows its own shortcut so the keyboard
            route is discoverable rather than hidden. */}
        <button onClick={onSearchClick} title="Search pages (Ctrl+K)"
          className="flex items-center gap-2 h-8 rounded-lg transition-colors px-2.5 sm:pr-2 sm:pl-3"
          style={{ background: 'var(--c-input)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--c-border)'; }}>
          <Search size={14} />
          <span className="hidden sm:block text-[12px]">Search…</span>
          <kbd className="hidden sm:block text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>

        {/* Quick theme picker */}
        <ThemeSwitcher />

        {/* User badge */}
        <Link to="/profile" title="My Profile"
          className="flex items-center gap-2.5 pl-3 rounded-lg transition-opacity hover:opacity-80"
          style={{ borderLeft: '1px solid var(--c-border)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
            style={{ background: 'var(--c-primary)', color: '#fff' }}>
            {user?.name?.[0]}
          </div>
          <div className="hidden sm:block">
            <p className="text-[12px] font-semibold leading-none" style={{ color: 'var(--c-text)' }}>{user?.name}</p>
            <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--c-muted)' }}>{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
