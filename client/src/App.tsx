import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import { PageLoader } from './components/common/Spinner';
import { useAuthStore } from './stores/authStore';
import { refreshTheme, applyAppearance, type Appearance } from './lib/theme';
import { socket, SOCKET_EVENTS } from './lib/socket';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const BlogListPage = lazy(() => import('./pages/BlogListPage'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CmsPage = lazy(() => import('./pages/CmsPage'));
const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const AddressesPage = lazy(() => import('./pages/AddressesPage'));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));
const PaymentReturnPage = lazy(() => import('./pages/PaymentReturnPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth/login" replace />;
}

export default function App() {
  useEffect(() => {
    void refreshTheme();
    // Live theme updates pushed from the admin panel — recolour without refresh.
    const onTheme = (a: Appearance) => applyAppearance(a);
    socket.on(SOCKET_EVENTS.themeChanged, onTheme);
    return () => { socket.off(SOCKET_EVENTS.themeChanged, onTheme); };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<ProductListPage />} />
              <Route path="/products/:slug" element={<ProductDetailPage />} />
              <Route path="/collections" element={<ProductListPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/cms/:key" element={<CmsPage />} />
              <Route path="/blogs" element={<BlogListPage />} />
              <Route path="/blogs/:slug" element={<BlogDetailPage />} />
              <Route
                path="/checkout"
                element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>}
              />
              <Route
                path="/orders"
                element={<ProtectedRoute><OrdersPage /></ProtectedRoute>}
              />
              <Route
                path="/orders/:id"
                element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>}
              />
              <Route
                path="/payment-return"
                element={<ProtectedRoute><PaymentReturnPage /></ProtectedRoute>}
              />
              <Route
                path="/account"
                element={<ProtectedRoute><AccountPage /></ProtectedRoute>}
              />
              <Route
                path="/profile"
                element={<ProtectedRoute><ProfilePage /></ProtectedRoute>}
              />
              <Route
                path="/wishlist"
                element={<ProtectedRoute><WishlistPage /></ProtectedRoute>}
              />
              <Route
                path="/addresses"
                element={<ProtectedRoute><AddressesPage /></ProtectedRoute>}
              />
              <Route
                path="/returns"
                element={<ProtectedRoute><ReturnsPage /></ProtectedRoute>}
              />
              <Route
                path="/support"
                element={<ProtectedRoute><SupportPage /></ProtectedRoute>}
              />
              {/* Old nested account URLs -> new top-level pages */}
              <Route path="/account/profile" element={<Navigate to="/profile" replace />} />
              <Route path="/account/orders" element={<Navigate to="/orders" replace />} />
              <Route path="/account/wishlist" element={<Navigate to="/wishlist" replace />} />
              <Route path="/account/addresses" element={<Navigate to="/addresses" replace />} />
              <Route path="/account/returns" element={<Navigate to="/returns" replace />} />
              <Route path="/account/support" element={<Navigate to="/support" replace />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              borderRadius: '0',
              background: 'rgb(var(--color-surface))',
              color: 'rgb(var(--color-text))',
              border: '1px solid rgb(var(--color-border))',
            },
            success: { iconTheme: { primary: 'rgb(var(--color-primary))', secondary: 'rgb(var(--color-surface))' } },
            error: { iconTheme: { primary: '#EF4444', secondary: 'rgb(var(--color-surface))' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
