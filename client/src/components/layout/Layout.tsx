import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
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
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      {!isAuthPage && !isListing && <Footer />}
      <CartDrawer />
      <CookieConsent />
    </>
  );
}
