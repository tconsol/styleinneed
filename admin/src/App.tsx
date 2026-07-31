import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminLayout from './components/layout/AdminLayout';
import { PageSpinner } from './components/common/Spinner';
import { ConfirmProvider } from './components/common/ConfirmDialog';
import { useAuthStore } from './stores/authStore';
import { refreshTheme, applyAppearance, type Appearance } from './lib/theme';
import { getSocket, ADMIN_SOCKET_EVENTS } from './lib/socket';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'));
const AuditLogsPage = lazy(() => import('./pages/analytics/AuditLogsPage'));
const ProductsPage = lazy(() => import('./pages/products/ProductsPage'));
const ProductFormPage = lazy(() => import('./pages/products/ProductFormPage'));
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage'));
const CategoriesPage = lazy(() => import('./pages/catalog/CategoriesPage'));
const CollectionsPage = lazy(() => import('./pages/catalog/CollectionsPage'));
const ProductTypesPage = lazy(() => import('./pages/catalog/ProductTypesPage'));
const AttributesPage = lazy(() => import('./pages/catalog/AttributesPage'));
const SizeChartsPage = lazy(() => import('./pages/catalog/SizeChartsPage'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/customers/CustomerDetailPage'));
const CouponsPage = lazy(() => import('./pages/coupons/CouponsPage'));
const AnnouncementsPage = lazy(() => import('./pages/content/AnnouncementsPage'));
const PromotionsPage = lazy(() => import('./pages/content/PromotionsPage'));
const ReviewsPage = lazy(() => import('./pages/content/ReviewsPage'));
const BlogsPage = lazy(() => import('./pages/content/BlogsPage'));
const NewsletterPage = lazy(() => import('./pages/content/NewsletterPage'));
const SupportPage = lazy(() => import('./pages/content/SupportPage'));
const SupportTicketDetailPage = lazy(() => import('./pages/content/SupportTicketDetailPage'));
const ReturnsPage = lazy(() => import('./pages/content/ReturnsPage'));
const CmsPage = lazy(() => import('./pages/content/CmsPage'));
const ProvidersPage = lazy(() => import('./pages/providers/ProvidersPage'));
const PushNotificationsPage = lazy(() => import('./pages/marketing/PushNotificationsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const ShippingRatesPage = lazy(() => import('./pages/settings/ShippingRatesPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ThemesPage = lazy(() => import('./pages/settings/ThemesPage'));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const hasToken = !!localStorage.getItem('adminAccessToken');
  return isAuthenticated && hasToken ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  useEffect(() => {
    void refreshTheme();
    // Apply theme changes made from any other admin session live.
    const socket = getSocket();
    const onTheme = (a: Appearance) => applyAppearance(a);
    socket.on(ADMIN_SOCKET_EVENTS.themeChanged, onTheme);
    return () => { socket.off(ADMIN_SOCKET_EVENTS.themeChanged, onTheme); };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
      <BrowserRouter>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/new" element={<ProductFormPage />} />
              <Route path="/products/:id/edit" element={<ProductFormPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/product-types" element={<ProductTypesPage />} />
              <Route path="/attributes" element={<AttributesPage />} />
              <Route path="/size-charts" element={<SizeChartsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/blogs" element={<BlogsPage />} />
              <Route path="/newsletter" element={<NewsletterPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/support/:id" element={<SupportTicketDetailPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/cms" element={<CmsPage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/push-notifications" element={<PushNotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/shipping-rates" element={<ShippingRatesPage />} />
              <Route path="/themes" element={<ThemesPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'var(--font-body)', fontSize: '12px', borderRadius: '10px', background: 'var(--c-surface)', color: 'var(--c-text)', border: '1px solid var(--c-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
            success: { iconTheme: { primary: 'var(--c-primary)', secondary: 'var(--c-surface)' } },
            error: { iconTheme: { primary: '#EF4444', secondary: 'var(--c-surface)' } },
          }}
        />
      </BrowserRouter>
      </ConfirmProvider>
    </QueryClientProvider>
  );
}
