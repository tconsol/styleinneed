import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, Tag, Layers, ShoppingCart, Users,
  Ticket, Megaphone, Zap, FileText, Mail, Headphones,
  RotateCcw, FileEdit, BarChart2, ScrollText,
  Star, LogOut, Settings, X, Shapes, SlidersHorizontal, Truck, BellRing, Ruler, Globe,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useBadgeStore } from '../../hooks/useAdminBadges';

export const NAV_ITEMS = [
  { section: 'Overview', items: [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  ]},
  { section: 'Catalog', items: [
    { label: 'Products', href: '/products', icon: Package },
    { label: 'Product Types', href: '/product-types', icon: Shapes },
    { label: 'Attributes', href: '/attributes', icon: SlidersHorizontal },
    { label: 'Size Charts', href: '/size-charts', icon: Ruler },
    { label: 'Categories', href: '/categories', icon: Tag },
    { label: 'Collections', href: '/collections', icon: Layers },
  ]},
  { section: 'Commerce', items: [
    { label: 'Orders', href: '/orders', icon: ShoppingCart },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Coupons', href: '/coupons', icon: Ticket },
    { label: 'Returns', href: '/returns', icon: RotateCcw },
    { label: 'Providers', href: '/providers', icon: Truck },
    { label: 'Shipping Rates', href: '/shipping-rates', icon: Globe },
  ]},
  { section: 'Marketing', items: [
    { label: 'Announcements', href: '/announcements', icon: Megaphone },
    { label: 'Promotions', href: '/promotions', icon: Zap },
    { label: 'Push Notifications', href: '/push-notifications', icon: BellRing },
    { label: 'Newsletter', href: '/newsletter', icon: Mail },
  ]},
  { section: 'Content', items: [
    { label: 'Blog', href: '/blogs', icon: FileText },
    { label: 'Reviews', href: '/reviews', icon: Star },
    { label: 'CMS Pages', href: '/cms', icon: FileEdit },
  ]},
  { section: 'System', items: [
    { label: 'Support', href: '/support', icon: Headphones },
    { label: 'Audit Logs', href: '/audit-logs', icon: ScrollText },
  ]},
];

interface Props { isOpen: boolean; onClose: () => void; }

export default function Sidebar({ isOpen, onClose }: Props) {
  const { user, logout } = useAuthStore();
  const { isDark } = useThemeStore();
  const navigate = useNavigate();
  const { orders: orderBadge, support: supportBadge, markViewed } = useBadgeStore();

  // Clear badge when user navigates to the relevant page
  const getBadge = (href: string): number => {
    if (href === '/orders') return orderBadge;
    if (href === '/support') return supportBadge;
    return 0;
  };
  const handleNavClick = (href: string) => {
    if (href === '/orders') markViewed('orders');
    if (href === '/support') markViewed('support');
    onClose();
  };
  const handleLogout = async () => { await logout(); navigate('/login'); };

  // Theme-specific tokens
  const bg         = isDark ? '#080816'                       : '#FFFFFF';
  const border     = isDark ? 'rgba(255,255,255,0.06)'        : '#E2E8F0';
  const labelClr   = isDark ? 'rgba(255,255,255,0.18)'        : '#94A3B8';
  const navDefault = isDark ? 'rgba(255,255,255,0.42)'        : '#64748B';
  const activeGrad = isDark
    ? 'linear-gradient(135deg, rgba(79,70,229,0.45), rgba(129,140,248,0.25))'
    : 'linear-gradient(135deg, #EEF2FF, #E0E7FF)';
  const activeClr  = isDark ? '#C7D2FE'                       : '#4F46E5';
  const activeShadow = isDark ? '0 2px 8px rgba(79,70,229,0.2)' : '0 1px 4px rgba(79,70,229,0.15)';
  const iconActive = isDark ? '#818CF8'                       : '#4F46E5';
  const footerClr  = isDark ? 'rgba(255,255,255,0.3)'         : '#94A3B8';
  const footerHoverBg = isDark ? 'rgba(255,255,255,0.05)'     : '#F1F5F9';
  const logoutHoverBg = isDark ? 'rgba(239,68,68,0.1)'        : '#FEE2E2';
  const logoutHoverClr = '#EF4444';
  const userNameClr  = isDark ? 'rgba(255,255,255,0.82)'      : '#1E293B';
  const userRoleClr  = isDark ? 'rgba(255,255,255,0.3)'       : '#94A3B8';
  const hoverBg    = isDark ? 'rgba(255,255,255,0.05)'        : '#F8FAFF';

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: bg, borderRight: `1px solid ${border}`, transition: 'background 0.2s' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #818CF8)', boxShadow: '0 2px 8px rgba(79,70,229,0.35)' }}>
            <span className="text-white text-[12px] font-black">A</span>
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-wide leading-none"
              style={{ color: isDark ? 'white' : '#1E293B' }}>STYLE IN NEED</p>
            <p className="text-[10px] leading-none mt-0.5" style={{ color: '#818CF8' }}>Admin Panel</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1 rounded-md transition-colors"
          style={{ color: navDefault }}>
          <X size={15} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV_ITEMS.map(({ section, items }) => (
          <div key={section} className="mb-4">
            <p className="px-2.5 mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em]"
              style={{ color: labelClr }}>{section}</p>
            {items.map(({ label, href, icon: Icon }) => {
              const badge = getBadge(href);
              return (
                <NavLink key={href} to={href} end={href === '/'} onClick={() => handleNavClick(href)} className="block mb-0.5">
                  {({ isActive }) => (
                    <span
                      className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium rounded-lg transition-all duration-150"
                      style={isActive ? {
                        background: activeGrad,
                        color: activeClr,
                        boxShadow: activeShadow,
                      } : { color: navDefault }}
                      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <Icon size={14} style={{ color: isActive ? iconActive : undefined, flexShrink: 0 }} />
                      <span className="flex-1">{label}</span>
                      {badge > 0 && (
                        <span style={{
                          background: '#EF4444', color: '#fff',
                          fontSize: 9, fontWeight: 700,
                          borderRadius: 99, minWidth: 16, height: 16,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '0 4px', lineHeight: 1,
                        }}>
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-2.5" style={{ borderTop: `1px solid ${border}` }}>
        <NavLink to="/settings"
          className="flex items-center gap-2.5 px-3 py-2 text-[11px] rounded-lg transition-colors mb-0.5"
          style={{ color: footerClr }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = footerHoverBg; (e.currentTarget as HTMLElement).style.color = isDark ? 'rgba(255,255,255,0.6)' : '#475569'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = footerClr; }}>
          <Settings size={12} /> Settings
        </NavLink>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[11px] rounded-lg transition-colors mb-2"
          style={{ color: footerClr }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = logoutHoverBg; (e.currentTarget as HTMLElement).style.color = logoutHoverClr; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = footerClr; }}>
          <LogOut size={12} /> Sign Out
        </button>
        <div className="flex items-center gap-2.5 px-2 pt-2" style={{ borderTop: `1px solid ${border}` }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #818CF8)', color: '#fff' }}>
            {user?.name?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold truncate" style={{ color: userNameClr }}>{user?.name}</p>
            <p className="text-[9px] capitalize" style={{ color: userRoleClr }}>{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30" style={{ width: '220px' }}>
        {SidebarContent()}
      </aside>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden" style={{ width: '220px' }}>
              {SidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
