import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Order from '../models/Order';
import Product from '../models/Product';
import Review from '../models/Review';
import AuditLog from '../models/AuditLog';
import Newsletter from '../models/Newsletter';
import SupportTicket from '../models/SupportTicket';
import Return from '../models/Return';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';
import { invalidateCache } from '../middleware/cache';
import { sendPushToUser, getStatusPushContent } from '../services/push.service';

export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalOrders, monthOrders, lastMonthOrders,
      revenueResult, monthRevenueResult, lastMonthRevenueResult,
      totalCustomers, newCustomers,
      totalProducts, lowStockCount,
      pendingReviews, openTickets, pendingReturns,
      totalSubscribers,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
      Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([{ $match: { paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([{ $match: { paymentStatus: 'paid', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: startOfMonth } }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, 'variants.stock': { $lte: 5 } }),
      Review.countDocuments({ isApproved: false }),
      SupportTicket.countDocuments({ status: 'open' }),
      Return.countDocuments({ status: 'requested' }),
      Newsletter.countDocuments({ isSubscribed: true }),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const monthRevenue = monthRevenueResult[0]?.total || 0;
    const lastMonthRevenue = lastMonthRevenueResult[0]?.total || 0;

    sendSuccess(res, 'Dashboard stats', {
      orders: { total: totalOrders, thisMonth: monthOrders, lastMonth: lastMonthOrders },
      revenue: { total: totalRevenue, thisMonth: monthRevenue, lastMonth: lastMonthRevenue, growth: lastMonthRevenue > 0 ? (((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1) : null },
      customers: { total: totalCustomers, newThisMonth: newCustomers },
      products: { total: totalProducts, lowStock: lowStockCount },
      pending: { reviews: pendingReviews, tickets: openTickets, returns: pendingReturns },
      newsletter: { subscribers: totalSubscribers },
    });
  } catch (err) {
    next(err);
  }
};

export const getRevenueAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { period = 'monthly' } = req.query as Record<string, string>;

    const groupStage =
      period === 'daily'
        ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }
        : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };

    const data = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: groupStage, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      { $limit: period === 'daily' ? 30 : 12 },
    ]);

    sendSuccess(res, 'Revenue analytics', data);
  } catch (err) {
    next(err);
  }
};

export const getTopProducts = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await Order.aggregate([
      { $match: { status: { $in: ['delivered', 'shipped', 'confirmed', 'packed'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { _id: 0, product: { _id: 1, name: 1, slug: 1, images: { $slice: ['$product.images', 1] } }, totalSold: 1, revenue: 1 } },
    ]);
    sendSuccess(res, 'Top products', data);
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, role, search, isActive } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const [users, total] = await Promise.all([
      User.find(filter).sort('-createdAt').skip(skip).limit(l).lean(),
      User.countDocuments(filter),
    ]);

    sendSuccess(res, 'Users fetched', users, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

// Full customer profile + their entire order history + aggregate stats.
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password -refreshTokens -otp -otpExpiry -passwordResetToken -passwordResetExpiry -googleId'
    );
    if (!user) { sendError(res, 'Customer not found', 404); return; }

    const orders = await Order.find({ user: user._id })
      .populate('items.product', 'name slug images')
      .sort('-createdAt')
      .lean();

    const byStatus: Record<string, number> = {};
    let paidOrders = 0;
    let totalSpentINR = 0;
    let totalSpentUSD = 0;
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      const settled = o.paymentStatus === 'paid' || o.paymentMethod === 'cod';
      if (settled && o.status !== 'cancelled') {
        paidOrders += 1;
        if (o.currency === 'USD') totalSpentUSD += o.total || 0;
        else totalSpentINR += o.total || 0;
      }
    }

    sendSuccess(res, 'Customer detail', {
      user,
      orders,
      stats: {
        totalOrders: orders.length,
        paidOrders,
        totalSpentINR: Math.round(totalSpentINR),
        totalSpentUSD: Math.round(totalSpentUSD * 100) / 100,
        byStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, isActive } = req.body;
    const update: Record<string, unknown> = {};
    if (role) update.role = role;
    if (isActive !== undefined) update.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) { sendError(res, 'User not found', 404); return; }
    sendSuccess(res, 'User updated', user);
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, resource, userId } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (resource) filter.resource = resource;
    if (userId) filter.user = userId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'name email role')
        .sort('-createdAt')
        .skip(skip)
        .limit(l)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    sendSuccess(res, 'Audit logs fetched', logs, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const getAllOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, status, paymentStatus, since } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    // `since` (ms epoch) powers the sidebar "new since last viewed" badge count.
    if (since && !isNaN(Number(since))) filter.createdAt = { $gt: new Date(Number(since)) };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .populate('items.product', 'name images')
        .sort('-createdAt')
        .skip(skip)
        .limit(l)
        .lean(),
      Order.countDocuments(filter),
    ]);

    sendSuccess(res, 'Orders fetched', orders, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminProducts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, sort = '-createdAt', search, isActive } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.$text = { $search: search };
    // Providers only ever see the products they own.
    if (req.user?.role === 'provider') filter.provider = req.user.providerRef;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('collections', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(l)
        .lean(),
      Product.countDocuments(filter),
    ]);

    sendSuccess(res, 'Products fetched', products, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminProductById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('collections', 'name slug')
      .populate('sizeChartId', '_id name');

    if (!product) { sendError(res, 'Product not found', 404); return; }
    // A provider may only open their own products.
    if (req.user?.role === 'provider' && String(product.provider) !== String(req.user.providerRef)) {
      sendError(res, 'Forbidden', 403); return;
    }
    sendSuccess(res, 'Product fetched', product);
  } catch (err) {
    next(err);
  }
};

export const getAdminOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate({ path: 'items.product', select: 'name slug images provider', populate: { path: 'provider', select: 'name contactPerson phone email category' } })
      .populate('coupon', 'code type value');

    if (!order) { sendError(res, 'Order not found', 404); return; }
    sendSuccess(res, 'Order details', order);
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, awbCode, trackingUrl, shiprocketOrderId, note } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) { sendError(res, 'Order not found', 404); return; }

    if (awbCode) order.awbCode = awbCode;
    if (trackingUrl) order.trackingUrl = trackingUrl;
    if (shiprocketOrderId) order.shiprocketOrderId = shiprocketOrderId;

    const prevStatus = order.status;
    if (status && status !== order.status) {
      order.status = status;
      order.statusHistory.push({ status, note: note || `Marked ${status} by admin`, at: new Date() });
    }
    await order.save();

    emitEvent(SOCKET_EVENTS.orderUpdated, {
      orderId: String(order._id),
      orderNumber: order.orderId,
      status: order.status,
      statusHistory: order.statusHistory,
    });

    if (status && status !== prevStatus) {
      const { title, body, type } = getStatusPushContent(status, order.orderId);
      void sendPushToUser({ userId: order.user, title, body, type, orderId: String(order._id), orderNumber: order.orderId });
    }

    await AuditLog.create({
      user: req.user!._id,
      action: 'UPDATE_ORDER_STATUS',
      resource: 'order',
      resourceId: order._id.toString(),
      changes: { status },
    });

    sendSuccess(res, 'Order status updated', order);
  } catch (err) {
    next(err);
  }
};

// Permanently delete an order (admin cleanup of test/erroneous orders).
// Restores stock only for orders still holding it (active statuses).
export const deleteOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { sendError(res, 'Order not found', 404); return; }

    const holdsStock = ['pending', 'confirmed', 'packed', 'shipped'].includes(order.status);
    if (holdsStock) {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product, 'variants.sku': item.variant.sku },
          { $inc: { 'variants.$.stock': item.quantity } }
        );
      }
      void invalidateCache('/api/v1/products');
    }

    await order.deleteOne();

    await AuditLog.create({
      user: req.user!._id,
      action: 'DELETE_ORDER',
      resource: 'order',
      resourceId: order._id.toString(),
      changes: { orderId: order.orderId, status: order.status, restoredStock: holdsStock },
    });

    sendSuccess(res, 'Order deleted');
  } catch (err) {
    next(err);
  }
};
