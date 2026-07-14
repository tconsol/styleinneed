import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';
import CartDrawer from '../cart/CartDrawer';
import CustomCursor from '../common/CustomCursor';
import ScrollToTop from '../common/ScrollToTop';
import CookieConsent from '../common/CookieConsent';
import { useLenis } from '../../hooks/useLenis';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useWishlistStore } from '../../stores/wishlistStore';

export default function Layout() {
  const location = useLocation();
  const { isAuthenticated, fetchMe } = useAuthStore();
  const { fetchCart } = useCartStore();
  const { fetchWishlist } = useWishlistStore();

  useLenis();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
      fetchCart();
      fetchWishlist();
    }
  }, [isAuthenticated]);

  const isAuthPage = location.pathname.startsWith('/auth');
  const isCheckout = location.pathname.startsWith('/checkout');
  // Listing pages are a fixed-height app-shell that render their own footer
  // inside the scrollable products pane, so skip the global footer.
  const isListing = location.pathname === '/products' || location.pathname === '/collections';
  // Bottom tab bar mirrors the native app: only on root-level tab-equivalent
  // pages, hidden on drill-down/detail screens (order tracking, product detail,
  // search, checkout, auth...). Listing (Sort/Filters) and product detail
  // (cart actions) pages render their own contextual bottom bar instead.
  const showBottomNav =
    !isAuthPage &&
    !isCheckout &&
    !isListing &&
    ['/', '/account', '/profile', '/orders', '/wishlist', '/addresses', '/returns', '/support']
      .includes(location.pathname);

  return (
    <>
      <ScrollToTop />
      <CustomCursor />
      {!isAuthPage && <Header isCheckout={isCheckout} />}
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={showBottomNav ? 'pb-[calc(var(--bottomnav-height)+env(safe-area-inset-bottom))] lg:pb-0' : ''}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      {!isAuthPage && !isListing && <Footer />}
      {showBottomNav && <BottomNav />}
      <CartDrawer />
      <CookieConsent />
    </>
  );
}
