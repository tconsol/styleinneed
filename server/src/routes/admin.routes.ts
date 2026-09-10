import { Router } from 'express';
import {
  getDashboardStats, getRevenueAnalytics, getTopProducts,
  getUsers, getUserById, updateUserRole, deleteUser, getAuditLogs,
  getAllOrders, getAdminOrderById, updateOrderStatus, deleteOrder,
  getAdminProducts, getAdminProductById, getProductFilterOptions, exportOrders, exportCustomers,
  bookShipment, getShipmentTracking, getCustomerAnalytics, getAnalyticsInsights,
} from '../controllers/admin.controller';
import { getSystemHealth } from '../controllers/systemHealth.controller';
import { protect, isAdminOrManager, isSuperAdmin, isProviderOrAdmin, adminOrFeature } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/dashboard', adminOrFeature('dashboard'), getDashboardStats);
router.get('/analytics/revenue', adminOrFeature('analytics'), getRevenueAnalytics);
router.get('/analytics/top-products', adminOrFeature('analytics'), getTopProducts);
router.get('/analytics/customers', adminOrFeature('analytics'), getCustomerAnalytics);
router.get('/analytics/insights', adminOrFeature('analytics'), getAnalyticsInsights);

router.get('/users', adminOrFeature('customers'), getUsers);
router.get('/users/export', adminOrFeature('customers'), exportCustomers);
router.get('/users/:id', adminOrFeature('customers'), getUserById);
router.patch('/users/:id', isSuperAdmin, updateUserRole);
router.delete('/users/:id', isSuperAdmin, deleteUser);

router.get('/products', isProviderOrAdmin, getAdminProducts);
// Declared before /products/:id — otherwise "filters" is read as an id.
router.get('/products/filters', isProviderOrAdmin, getProductFilterOptions);
router.get('/products/:id', isProviderOrAdmin, getAdminProductById);

router.get('/orders', adminOrFeature('orders'), getAllOrders);
router.get('/orders/export', adminOrFeature('orders'), exportOrders);
router.get('/orders/:id', adminOrFeature('orders'), getAdminOrderById);
router.patch('/orders/:id/status', adminOrFeature('orders'), updateOrderStatus);
router.post('/orders/:id/ship', adminOrFeature('orders'), bookShipment);
router.get('/orders/:id/tracking', adminOrFeature('orders'), getShipmentTracking);
router.delete('/orders/:id', isAdminOrManager, deleteOrder);

router.get('/audit-logs', isAdminOrManager, getAuditLogs);

// Reveals which integrations are configured and probes them live — admin only.
router.get('/system-health', isSuperAdmin, getSystemHealth);

export default router;
