import { Router } from 'express';
import {
  getDashboardStats, getRevenueAnalytics, getTopProducts,
  getUsers, getUserById, updateUserRole, deleteUser, getAuditLogs,
  getAllOrders, getAdminOrderById, updateOrderStatus, deleteOrder,
  getAdminProducts, getAdminProductById, exportOrders, exportCustomers,
} from '../controllers/admin.controller';
import { protect, isAdminOrManager, isSuperAdmin, isProviderOrAdmin, adminOrFeature } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/dashboard', adminOrFeature('dashboard'), getDashboardStats);
router.get('/analytics/revenue', adminOrFeature('analytics'), getRevenueAnalytics);
router.get('/analytics/top-products', adminOrFeature('analytics'), getTopProducts);

router.get('/users', isAdminOrManager, getUsers);
router.get('/users/export', isAdminOrManager, exportCustomers);
router.get('/users/:id', isAdminOrManager, getUserById);
router.patch('/users/:id', isSuperAdmin, updateUserRole);
router.delete('/users/:id', isSuperAdmin, deleteUser);

router.get('/products', isProviderOrAdmin, getAdminProducts);
router.get('/products/:id', isProviderOrAdmin, getAdminProductById);

router.get('/orders', adminOrFeature('orders'), getAllOrders);
router.get('/orders/export', adminOrFeature('orders'), exportOrders);
router.get('/orders/:id', adminOrFeature('orders'), getAdminOrderById);
router.patch('/orders/:id/status', adminOrFeature('orders'), updateOrderStatus);
router.delete('/orders/:id', isAdminOrManager, deleteOrder);

router.get('/audit-logs', isAdminOrManager, getAuditLogs);

export default router;
