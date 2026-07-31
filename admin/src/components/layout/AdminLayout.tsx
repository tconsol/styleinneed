import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar, { NAV_ITEMS } from './Sidebar';
import Topbar from './Topbar';
import NewOrderIsland from './NewOrderIsland';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { useBadgeStore } from '../../hooks/useAdminBadges';
import { getSocket, ADMIN_SOCKET_EVENTS } from '../../lib/socket';

const getTitle = (pathname: string): string => {
  const all = NAV_ITEMS.flatMap((s) => s.items);
  const match = all.find((item) => item.href !== '/' && pathname.startsWith(item.href))
    || all.find((item) => item.href === pathname);
  return match?.label || 'Dashboard';
};

interface OrderAlert {
  id: string;
  orderId: string;
  orderNumber: string;
  total?: number;
  customerName?: string;
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const title = getTitle(location.pathname);
  const { isDark } = useThemeStore();
  const { fetchMe, user } = useAuthStore();
  const { fetch: fetchBadges, incrementOrders, incrementSupport, markViewed } = useBadgeStore();
  const [orderAlert, setOrderAlert] = useState<OrderAlert | null>(null);
  const alertIdRef = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Reset the content scroll to the top whenever the route changes, so a new
  // page always opens at its top instead of inheriting the previous scroll.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  // Providers may only use the Products area + their own change-password page.
  // Any other route is bounced back to Products.
  useEffect(() => {
    if (user?.role !== 'provider') return;
    const allowed = location.pathname.startsWith('/products') || location.pathname === '/change-password' || location.pathname === '/profile';
    if (!allowed) navigate('/products', { replace: true });
  }, [location.pathname, user?.role, navigate]);

  // Hydrate user once on mount.
  useEffect(() => { void fetchMe(); }, []);

  // Order/support badges are admin-only — providers have no access to those APIs.
  useEffect(() => {
    if (user && user.role !== 'provider') void fetchBadges();
  }, [user?.role]);

  const isStaffAdmin = user && user.role !== 'provider';

  // Viewing a page (via nav OR refresh/direct-load on it) marks it seen, so its
  // badge stays cleared until genuinely new items arrive.
  useEffect(() => {
    if (location.pathname.startsWith('/orders')) markViewed('orders');
    else if (location.pathname.startsWith('/support')) markViewed('support');
  }, [location.pathname, markViewed]);

  // Real-time: listen for new orders + tickets via socket (admins only).
  useEffect(() => {
    if (!isStaffAdmin) return;
    const socket = getSocket();
    const orderHandler = (payload: { orderId: string; orderNumber: string; total?: number; customerName?: string }) => {
      alertIdRef.current += 1;
      setOrderAlert({ id: String(alertIdRef.current), ...payload });
      incrementOrders();
    };
    const ticketHandler = () => { incrementSupport(); };
    socket.on(ADMIN_SOCKET_EVENTS.orderNew, orderHandler);
    socket.on(ADMIN_SOCKET_EVENTS.ticketNew, ticketHandler);
    return () => {
      socket.off(ADMIN_SOCKET_EVENTS.orderNew, orderHandler);
      socket.off(ADMIN_SOCKET_EVENTS.ticketNew, ticketHandler);
    };
  }, [isStaffAdmin]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--c-bg)', transition: 'background 0.2s' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden lg:pl-[220px]">
        <div className="flex-shrink-0">
          <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        </div>
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Dynamic Island — fires when a new order arrives */}
      <NewOrderIsland alert={orderAlert} onClose={() => setOrderAlert(null)} />
    </div>
  );
}
