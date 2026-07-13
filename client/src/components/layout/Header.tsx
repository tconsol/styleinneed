import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, ShoppingBag, User, Menu, X, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore, selectItemCount } from '../../stores/cartStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useUiStore } from '../../stores/uiStore';
import { useCategories, useCollections, useProductTypes } from '../../hooks/useCatalog';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import AnnouncementBar from '../common/AnnouncementBar';

interface NavSub { label: string; href: string }
interface NavItem { label: string; href: string; sub?: NavSub[]; badge?: string }

export default function Header({ isCheckout = false }: { isCheckout?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [expandedNav, setExpandedNav] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { toggleCart } = useCartStore();
  const itemCount = useCartStore(selectItemCount);
  const { products: wishlistProducts } = useWishlistStore();
  const { isMobileMenuOpen, isSearchOpen, openMobileMenu, closeMobileMenu, openSearch, closeSearch } = useUiStore();
  useBodyScrollLock(isMobileMenuOpen || isSearchOpen);
  const searchRef = useRef<HTMLInputElement>(null);
  // Cached catalog data (shared/deduped via React Query)
  const productTypes = useProductTypes().data || [];
  const categories = useCategories().data || [];
  const collections = useCollections().data || [];

  // Build the nav from live catalog data (product types = main links,
  // categories + collections = sub-links).
  const NAV: NavItem[] = [
    ...productTypes.map((t) => ({
      label: t.name,
      href: `/products?productType=${t.slug}`,
      sub: categories
        .filter((c) => c.productType === t.slug)
        .map((c) => ({ label: c.name, href: `/products?productType=${t.slug}&category=${c.slug}` })),
    })),
    { label: 'New Arrivals', href: '/products?isNewArrival=true' },
    {
      label: 'Collections',
      href: '/collections',
      sub: collections.map((c) => ({ label: c.name, href: `/products?collection=${c.slug}` })),
    },
    { label: 'Sale', href: '/products?sort=-discountPercentage', badge: 'SALE' },
    { label: 'Blog', href: '/blogs' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    closeMobileMenu();
    closeSearch();
  }, [location.pathname]);

  useEffect(() => {
    if (isSearchOpen) setTimeout(() => searchRef.current?.focus(), 100);
  }, [isSearchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
      setSearchQuery('');
    }
  };

  const isHome = location.pathname === '/';
  const transparent = isHome && !scrolled;

  // Keep --topbar-height in sync with the REAL header height (announcement bar
  // can wrap to 2 lines on small screens, making the fixed header taller than
  // the static CSS value and tucking page content underneath it).
  const topbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty('--topbar-height', `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);
    return () => { ro.disconnect(); window.removeEventListener('resize', apply); };
  }, [isCheckout]);

  return (
    <>
      {/* Single fixed container: announcement bar + nav */}
      <div ref={topbarRef} className="fixed top-0 left-0 right-0 z-50">
        {!isCheckout && <AnnouncementBar />}
      <header
        className={`transition-all duration-500 ${
          transparent
            ? 'bg-transparent'
            : 'bg-brand-bg/95 backdrop-blur-md shadow-[0_1px_0_rgba(200,169,126,0.15)]'
        }`}
      >
        <div className="container-custom">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <span
                className={`font-heading text-xl md:text-2xl font-bold tracking-wider transition-colors duration-300 ${
                  transparent ? 'text-white' : 'text-brand-text'
                }`}
              >
                STYLE IN NEED
              </span>
              <span
                className={`block font-body text-[9px] tracking-[0.4em] uppercase transition-colors duration-300 -mt-1 ${
                  transparent ? 'text-white/70' : 'text-primary'
                }`}
              >
                FASHIONS
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {NAV.map((item) => (
                <div
                  key={item.label}
                  className="relative group"
                  onMouseEnter={() => item.sub?.length && setHoveredNav(item.label)}
                  onMouseLeave={() => setHoveredNav(null)}
                >
                  <Link
                    to={item.href}
                    className={`flex items-center gap-1 font-body text-sm tracking-wider transition-colors duration-200 ${
                      transparent
                        ? 'text-white/90 hover:text-white'
                        : 'text-brand-text hover:text-primary'
                    }`}
                  >
                    {item.badge ? (
                      <span className="text-red-500 font-semibold">{item.label}</span>
                    ) : (
                      item.label
                    )}
                    {!!item.sub?.length && <ChevronDown size={14} />}
                  </Link>

                  {!!item.sub?.length && (
                    <AnimatePresence>
                      {hoveredNav === item.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-brand-bg border border-brand-border shadow-xl py-2 z-50"
                        >
                          {item.sub?.map((sub) => (
                            <Link
                              key={typeof sub === 'string' ? sub : sub.label}
                              to={typeof sub === 'string' ? `/products?search=${sub}` : sub.href}
                              className="block px-4 py-2.5 font-body text-sm text-brand-text hover:text-primary hover:bg-brand-surface transition-colors duration-150"
                            >
                              {typeof sub === 'string' ? sub : sub.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4 md:gap-5">
              <button
                onClick={openSearch}
                className={`transition-colors duration-200 ${
                  transparent ? 'text-white/90 hover:text-white' : 'text-brand-text hover:text-primary'
                }`}
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              <Link
                to={isAuthenticated ? '/account?tab=wishlist' : '/auth/login'}
                className={`relative transition-colors duration-200 ${
                  transparent ? 'text-white/90 hover:text-white' : 'text-brand-text hover:text-primary'
                }`}
                aria-label="Wishlist"
              >
                <Heart size={20} />
                {wishlistProducts.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-secondary text-white text-[9px] rounded-full flex items-center justify-center font-medium">
                    {wishlistProducts.length}
                  </span>
                )}
              </Link>

              <button
                onClick={toggleCart}
                className={`relative transition-colors duration-200 ${
                  transparent ? 'text-white/90 hover:text-white' : 'text-brand-text hover:text-primary'
                }`}
                aria-label="Cart"
              >
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-white text-[9px] rounded-full flex items-center justify-center font-medium">
                    {itemCount}
                  </span>
                )}
              </button>

              <Link
                to={isAuthenticated ? '/account' : '/auth/login'}
                className={`hidden md:block transition-colors duration-200 ${
                  transparent ? 'text-white/90 hover:text-white' : 'text-brand-text hover:text-primary'
                }`}
                aria-label={isAuthenticated ? `Account (${user?.name})` : 'Login'}
              >
                <User size={20} />
              </Link>

              <button
                onClick={openMobileMenu}
                className={`lg:hidden transition-colors duration-200 ${
                  transparent ? 'text-white/90 hover:text-white' : 'text-brand-text hover:text-primary'
                }`}
                aria-label="Menu"
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
        </div>
      </header>
      </div>{/* end fixed top container */}

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/80 backdrop-blur-sm z-[60] flex items-start pt-24 px-4"
            onClick={closeSearch}
          >
            <motion.form
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              onSubmit={handleSearch}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl mx-auto"
            >
              <div className="flex items-center bg-brand-bg border-b-2 border-primary px-4 py-3">
                <Search size={20} className="text-primary mr-3 flex-shrink-0" />
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sarees, kurtis, lehengas..."
                  className="flex-1 bg-transparent font-body text-brand-text text-lg outline-none placeholder:text-brand-muted"
                />
                <button type="button" onClick={closeSearch} className="ml-3 text-brand-muted hover:text-primary">
                  <X size={20} />
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-full max-w-sm bg-brand-bg z-[70] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-brand-border">
              <span className="font-heading text-xl font-bold">STYLE IN NEED</span>
              <button onClick={closeMobileMenu} className="text-brand-text hover:text-primary">
                <X size={24} />
              </button>
            </div>
            <nav className="p-5">
              {NAV.map((item) => {
                const expanded = expandedNav === item.label;
                // Items with a submenu: tap to expand the accordion (no navigation).
                if (item.sub?.length) {
                  return (
                    <div key={item.label} className="border-b border-brand-border/50">
                      <button
                        onClick={() => setExpandedNav(expanded ? null : item.label)}
                        className="w-full flex items-center justify-between py-3.5 font-body text-base text-brand-text hover:text-primary transition-colors"
                      >
                        {item.label}
                        <ChevronDown
                          size={18}
                          className={`text-brand-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 pb-2 space-y-0.5">
                              {item.sub?.map((sub) => (
                                <Link
                                  key={typeof sub === 'string' ? sub : sub.label}
                                  to={typeof sub === 'string' ? `/products?search=${sub}` : sub.href}
                                  className="block py-2 font-body text-sm text-brand-muted hover:text-primary transition-colors"
                                  onClick={closeMobileMenu}
                                >
                                  {typeof sub === 'string' ? sub : sub.label}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }
                // Items without a submenu: direct link.
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={closeMobileMenu}
                    className="block py-3.5 font-body text-base text-brand-text hover:text-primary border-b border-brand-border/50 transition-colors"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-5 space-y-3 border-t border-brand-border">
              {isAuthenticated ? (
                <Link to="/account" className="btn-primary w-full justify-center">
                  My Account
                </Link>
              ) : (
                <>
                  <Link to="/auth/login" className="btn-primary w-full justify-center">Login</Link>
                  <Link to="/auth/register" className="btn-outline w-full justify-center">Register</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/50 z-[65]"
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>
    </>
  );
}
