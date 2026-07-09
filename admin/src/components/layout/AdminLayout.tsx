import { useEffect, useState, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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
  const title = getTitle(location.pathname);
  const { isDark } = useThemeStore();
  const { fetchMe } = useAuthStore();
  const { fetch: fetchBadges, incrementOrders, incrementSupport } = useBadgeStore();
  const [orderAlert, setOrderAlert] = useState<OrderAlert | null>(null);
  const alertIdRef = useRef(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Hydrate user + badge counts once on mount; socket events handle real-time increments
  useEffect(() => {
    void fetchMe();
    void fetchBadges();
  }, []);

  // Real-time: listen for new orders + tickets via socket
  useEffect(() => {
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
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--c-bg)', transition: 'background 0.2s' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden lg:pl-[220px]">
        <div className="flex-shrink-0">
          <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Dynamic Island — fires when a new order arrives */}
      <NewOrderIsland alert={orderAlert} onClose={() => setOrderAlert(null)} />
    </div>
  );
}
