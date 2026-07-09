import { Router } from 'express';
import {
  getDashboardStats, getRevenueAnalytics, getTopProducts,
  getUsers, updateUserRole, getAuditLogs,
  getAllOrders, getAdminOrderById, updateOrderStatus,
  getAdminProductById,
} from '../controllers/admin.controller';
import { protect, isAdminOrManager, isSuperAdmin } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/dashboard', isAdminOrManager, getDashboardStats);
router.get('/analytics/revenue', isAdminOrManager, getRevenueAnalytics);
router.get('/analytics/top-products', isAdminOrManager, getTopProducts);

router.get('/users', isAdminOrManager, getUsers);
router.patch('/users/:id', isSuperAdmin, updateUserRole);

router.get('/products/:id', isAdminOrManager, getAdminProductById);

router.get('/orders', isAdminOrManager, getAllOrders);
router.get('/orders/:id', isAdminOrManager, getAdminOrderById);
router.patch('/orders/:id/status', isAdminOrManager, updateOrderStatus);

router.get('/audit-logs', isAdminOrManager, getAuditLogs);

export default router;
