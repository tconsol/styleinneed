import express from 'express';
import morgan from 'morgan';
import 'dotenv/config';

import { applySecurityMiddleware, globalLimiter } from './middleware/security';
import { errorHandler, notFound } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import cartRoutes from './routes/cart.routes';
import wishlistRoutes from './routes/wishlist.routes';
import orderRoutes from './routes/order.routes';
import reviewRoutes from './routes/review.routes';
import couponRoutes from './routes/coupon.routes';
import blogRoutes from './routes/blog.routes';
import newsletterRoutes from './routes/newsletter.routes';
import announcementRoutes from './routes/announcement.routes';
import returnRoutes from './routes/return.routes';
import supportRoutes from './routes/support.routes';
import adminRoutes from './routes/admin.routes';
import cmsRoutes from './routes/cms.routes';
import promotionRoutes from './routes/promotion.routes';
import notificationRoutes from './routes/notification.routes';
import providerRoutes from './routes/provider.routes';
import sizeChartRoutes from './routes/sizeChart.routes';

const app = express();

applySecurityMiddleware(app);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
morgan.token('x-cache', (_req, res) => (res.getHeader('X-Cache') as string) || '-');
app.use(
  morgan(
    process.env.NODE_ENV === 'production'
      ? 'combined'
      : ':method :url :status :response-time ms :x-cache'
  )
);
app.use(globalLimiter);

const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/catalog`, categoryRoutes);
app.use(`${API}/cart`, cartRoutes);
app.use(`${API}/wishlist`, wishlistRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/reviews`, reviewRoutes);
app.use(`${API}/coupons`, couponRoutes);
app.use(`${API}/blogs`, blogRoutes);
app.use(`${API}/newsletter`, newsletterRoutes);
app.use(`${API}/announcements`, announcementRoutes);
app.use(`${API}/returns`, returnRoutes);
app.use(`${API}/support`, supportRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/cms`, cmsRoutes);
app.use(`${API}/promotions`, promotionRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/providers`, providerRoutes);
app.use(`${API}/size-charts`, sizeChartRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

app.use(notFound);
app.use(errorHandler);

export default app;
