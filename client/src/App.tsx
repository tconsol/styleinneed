import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Layout from './components/layout/Layout';
import CinematicLoader from './components/home/CinematicLoader';
import { PageLoader } from './components/common/Spinner';
import { useAuthStore } from './stores/authStore';

const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const BlogListPage = lazy(() => import('./pages/BlogListPage'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CmsPage = lazy(() => import('./pages/CmsPage'));
const AccountPage = lazy(() => import('./pages/account/AccountPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
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
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CinematicLoader />
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
                path="/orders/:id"
                element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>}
              />
              <Route
                path="/payment-return"
                element={<ProtectedRoute><PaymentReturnPage /></ProtectedRoute>}
              />
              <Route
                path="/account/*"
                element={<ProtectedRoute><AccountPage /></ProtectedRoute>}
              />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              borderRadius: '0',
              border: '1px solid #E8DDD4',
            },
            success: { iconTheme: { primary: '#C8A97E', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
