import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Package, ShoppingBag, User } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore, selectItemCount } from '../../stores/cartStore';

/** Mobile-only tab bar mirroring the native app's (tabs) layout: Home, Categories, Orders, Bag, Profile. */
export default function BottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const { toggleCart, isOpen: cartOpen } = useCartStore();
  const itemCount = useCartStore(selectItemCount);

  const path = location.pathname;
  const tab = new URLSearchParams(location.search).get('tab') || 'profile';

  const isHome = path === '/';
  const isShop = path.startsWith('/products') || path.startsWith('/collections');
  const isOrders = path.startsWith('/account') && tab === 'orders';
  const isProfile = path.startsWith('/account') && tab !== 'orders';

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 flex-1 h-full ${
      active ? 'text-primary' : 'text-brand-muted'
    }`;

  const Dot = ({ active }: { active: boolean }) =>
    active ? <span className="w-1 h-1 rounded-full bg-primary" /> : <span className="w-1 h-1" />;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-brand-border flex items-stretch"
      style={{ height: 'var(--bottomnav-height)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Link to="/" className={itemClass(isHome)}>
        <Home size={21} strokeWidth={isHome ? 2.5 : 2} fill={isHome ? 'currentColor' : 'none'} fillOpacity={isHome ? 0.15 : 0} />
        <span className="font-body text-[10px] leading-none">Home</span>
        <Dot active={isHome} />
      </Link>

      <Link to="/products" className={itemClass(isShop)}>
        <LayoutGrid size={21} strokeWidth={isShop ? 2.5 : 2} />
        <span className="font-body text-[10px] leading-none">Categories</span>
        <Dot active={isShop} />
      </Link>

      <Link to={isAuthenticated ? '/account?tab=orders' : '/auth/login'} className={itemClass(isOrders)}>
        <Package size={21} strokeWidth={isOrders ? 2.5 : 2} />
        <span className="font-body text-[10px] leading-none">Orders</span>
        <Dot active={isOrders} />
      </Link>

      <button onClick={toggleCart} className={itemClass(cartOpen)}>
        <span className="relative">
          <ShoppingBag size={21} strokeWidth={cartOpen ? 2.5 : 2} />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-[3px] bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          )}
        </span>
        <span className="font-body text-[10px] leading-none">Bag</span>
        <Dot active={cartOpen} />
      </button>

      <Link to={isAuthenticated ? '/account' : '/auth/login'} className={itemClass(isProfile)}>
        <User size={21} strokeWidth={isProfile ? 2.5 : 2} />
        <span className="font-body text-[10px] leading-none">Profile</span>
        <Dot active={isProfile} />
      </Link>
    </nav>
  );
}
