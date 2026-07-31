import { Router } from 'express';
import {
  getDashboardStats, getRevenueAnalytics, getTopProducts,
  getUsers, getUserById, updateUserRole, getAuditLogs,
  getAllOrders, getAdminOrderById, updateOrderStatus, deleteOrder,
  getAdminProducts, getAdminProductById,
} from '../controllers/admin.controller';
import { protect, isAdminOrManager, isSuperAdmin, isProviderOrAdmin } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/dashboard', isAdminOrManager, getDashboardStats);
router.get('/analytics/revenue', isAdminOrManager, getRevenueAnalytics);
router.get('/analytics/top-products', isAdminOrManager, getTopProducts);

router.get('/users', isAdminOrManager, getUsers);
router.get('/users/:id', isAdminOrManager, getUserById);
router.patch('/users/:id', isSuperAdmin, updateUserRole);

router.get('/products', isProviderOrAdmin, getAdminProducts);
router.get('/products/:id', isProviderOrAdmin, getAdminProductById);

router.get('/orders', isAdminOrManager, getAllOrders);
router.get('/orders/:id', isAdminOrManager, getAdminOrderById);
router.patch('/orders/:id/status', isAdminOrManager, updateOrderStatus);
router.delete('/orders/:id', isAdminOrManager, deleteOrder);

router.get('/audit-logs', isAdminOrManager, getAuditLogs);

export default router;
