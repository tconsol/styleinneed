import { Menu, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';

interface Props { onMenuClick: () => void; title: string; }

export default function Topbar({ onMenuClick, title }: Props) {
  const { user } = useAuthStore();
  const { isDark, toggle } = useThemeStore();

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
        <h1 className="text-[15px] font-semibold" style={{ color: 'var(--c-text)' }}>{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: isDark ? 'rgba(129,140,248,0.12)' : '#F1F5F9',
            color: isDark ? '#818CF8' : '#64748B',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(129,140,248,0.2)' : '#E2E8F0';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(129,140,248,0.12)' : '#F1F5F9';
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User badge */}
        <div className="flex items-center gap-2.5 pl-3"
          style={{ borderLeft: '1px solid var(--c-border)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#818CF8)', color: '#fff' }}>
            {user?.name?.[0]}
          </div>
          <div className="hidden sm:block">
            <p className="text-[12px] font-semibold leading-none" style={{ color: 'var(--c-text)' }}>{user?.name}</p>
            <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--c-muted)' }}>{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
