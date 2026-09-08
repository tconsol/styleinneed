import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Order from '../models/Order';
import Product from '../models/Product';
import Review from '../models/Review';
import AuditLog from '../models/AuditLog';
import Newsletter from '../models/Newsletter';
import SupportTicket from '../models/SupportTicket';
import Return from '../models/Return';
import Cart from '../models/Cart';
import Wishlist from '../models/Wishlist';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';
import { invalidateCache } from '../middleware/cache';
import { sendPushToUser, getStatusPushContent } from '../services/push.service';
import { toCsv, sendCsv, dateStamp } from '../utils/csv';
import { sanitizeFeatures } from '../config/providerFeatures';
import { createShiprocketOrder, generateAWB, trackShipment } from '../services/shiprocket.service';
import logger from '../utils/logger';

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
    const { role, isActive, permissions } = req.body;
    const update: Record<string, unknown> = {};
    if (role) update.role = role;
    if (isActive !== undefined) update.isActive = isActive;
    // Feature grants for a manager account. Whitelisted, and cleared entirely
    // if the account is moved back to a plain customer.
    if (permissions !== undefined) update.permissions = sanitizeFeatures(permissions);
    if (role && role !== 'manager' && role !== 'provider') update.permissions = [];

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) { sendError(res, 'User not found', 404); return; }
    sendSuccess(res, 'User updated', user);
  } catch (err) {
    next(err);
  }
};

// Hard-deletes a customer account. Only 'customer' accounts are deletable
// here (admin/provider accounts must be removed via their own management
// flows) — prevents an admin from accidentally nuking a colleague or a
// provider that still owns products. Orders/Reviews are left in place as
// historical records (their `user` ref simply orphans; the UI already
// renders those fields with a null-safe fallback).
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { sendError(res, 'Customer not found', 404); return; }
    if (user.role !== 'customer') { sendError(res, 'Only customer accounts can be deleted here', 400); return; }

    await Promise.all([
      Cart.deleteOne({ user: user._id }),
      Wishlist.deleteOne({ user: user._id }),
    ]);
    await user.deleteOne();

    await AuditLog.create({
      user: req.user!._id,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: user._id.toString(),
      changes: { name: user.name, email: user.email },
    });

    sendSuccess(res, 'Customer deleted');
  } catch (err) {
    next(err);
  }
};

/** Orders as CSV. Honours the same filters as the orders list. */
export const exportOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, paymentStatus, from, to } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(`${from}T00:00:00`);
      if (to) range.$lte = new Date(`${to}T23:59:59`);
      filter.createdAt = range;
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .sort('-createdAt')
      .limit(10_000)
      .lean();

    type Row = (typeof orders)[number];
    const addr = (o: Row) => o.shippingAddress || ({} as NonNullable<Row['shippingAddress']>);
    const csv = toCsv<Row>(orders, [
      { header: 'Order ID',       value: (o) => o.orderId },
      { header: 'Date',           value: (o) => new Date(o.createdAt).toISOString() },
      { header: 'Customer',       value: (o) => (o.user as { name?: string } | null)?.name },
      { header: 'Email',          value: (o) => (o.user as { email?: string } | null)?.email },
      { header: 'Phone',          value: (o) => addr(o).phone },
      { header: 'Ship To',        value: (o) => addr(o).fullName },
      { header: 'Items',          value: (o) => o.items?.length ?? 0 },
      { header: 'Products',       value: (o) => o.items?.map((i) => `${i.variant?.sku ?? ''} x${i.quantity}`).join(' | ') },
      { header: 'Currency',       value: (o) => o.currency || 'INR' },
      { header: 'Subtotal',       value: (o) => o.subtotal },
      { header: 'Shipping',       value: (o) => o.shippingCharge },
      { header: 'Discount',       value: (o) => o.discount },
      { header: 'Total',          value: (o) => o.total },
      { header: 'Payment Method', value: (o) => o.paymentMethod },
      { header: 'Payment Status', value: (o) => o.paymentStatus },
      { header: 'Order Status',   value: (o) => o.status },
      { header: 'City',           value: (o) => addr(o).city },
      { header: 'State',          value: (o) => addr(o).state },
      { header: 'Pincode',       value: (o) => addr(o).pincode },
      { header: 'Country',        value: (o) => addr(o).country },
    ]);

    sendCsv(res, `orders-${dateStamp()}.csv`, csv);
  } catch (err) {
    next(err);
  }
};

/** Customers as CSV (no credentials — profile + lifetime order stats only). */
export const exportCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, isActive } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    filter.role = role || 'customer';
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter)
      .select('name email phone role isActive isEmailVerified createdAt')
      .sort('-createdAt')
      .limit(10_000)
      .lean();

    // One aggregate for everyone's spend, rather than a query per customer.
    const stats = await Order.aggregate<{ _id: unknown; orders: number; spent: number; last: Date }>([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' }, last: { $max: '$createdAt' } } },
    ]);
    const byUser = new Map(stats.map((s) => [String(s._id), s]));

    type Row = (typeof users)[number];
    const csv = toCsv<Row>(users, [
      { header: 'Name',        value: (u) => u.name },
      { header: 'Email',       value: (u) => u.email },
      { header: 'Phone',       value: (u) => u.phone },
      { header: 'Verified',    value: (u) => (u.isEmailVerified ? 'Yes' : 'No') },
      { header: 'Active',      value: (u) => (u.isActive ? 'Yes' : 'No') },
      { header: 'Paid Orders', value: (u) => byUser.get(String(u._id))?.orders ?? 0 },
      { header: 'Total Spent', value: (u) => Math.round(byUser.get(String(u._id))?.spent ?? 0) },
      { header: 'Last Order',  value: (u) => byUser.get(String(u._id))?.last?.toISOString().slice(0, 10) ?? '' },
      { header: 'Joined',      value: (u) => new Date(u.createdAt).toISOString().slice(0, 10) },
    ]);

    sendCsv(res, `customers-${dateStamp()}.csv`, csv);
  } catch (err) {
    next(err);
  }
};

/**
 * Hand an order to Shiprocket and (optionally) assign a courier AWB.
 *
 * India-only, and refuses an order that already has a booking so a double click
 * can't create two shipments for the same order. Any AWB step failure is
 * reported but does NOT roll back the booking — the shipment exists at that
 * point and the admin can assign a courier from Shiprocket directly.
 */
export const bookShipment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
      sendError(res, 'Shiprocket is not configured. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.', 400);
      return;
    }

    const order = await Order.findById(req.params.id).populate('items.product', 'name');
    if (!order) { sendError(res, 'Order not found', 404); return; }
    if (order.shiprocketOrderId) { sendError(res, 'This order already has a shipment booked', 400); return; }
    if ((order.shippingAddress.country || 'India').toLowerCase() !== 'india') {
      sendError(res, 'Shiprocket handles India deliveries only', 400); return;
    }
    if (['cancelled', 'returned'].includes(order.status)) {
      sendError(res, 'Cannot ship a cancelled or returned order', 400); return;
    }

    const addr = order.shippingAddress;
    const booking = await createShiprocketOrder({
      orderId: order.orderId,
      orderDate: new Date(order.createdAt).toISOString().slice(0, 10),
      customerName: addr.fullName,
      customerEmail: addr.email || '',
      customerPhone: addr.phone,
      address: [addr.line1, addr.line2].filter(Boolean).join(', '),
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      items: order.items.map((i) => ({
        name: (i.product as unknown as { name?: string })?.name || i.variant.sku,
        sku: i.variant.sku,
        units: i.quantity,
        sellingPrice: i.price,
      })),
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      shippingCharge: order.shippingCharge,
    }) as { order_id?: number; shipment_id?: number };

    order.shiprocketOrderId = String(booking.order_id ?? '');
    const shipmentId = booking.shipment_id;

    // Assigning a courier can legitimately fail (no serviceable courier yet);
    // the booking still stands, so surface it rather than treating it as fatal.
    let awbWarning: string | undefined;
    if (shipmentId && req.body.courierId) {
      try {
        const awb = await generateAWB(Number(shipmentId), Number(req.body.courierId)) as {
          response?: { data?: { awb_code?: string; courier_name?: string } };
        };
        const code = awb?.response?.data?.awb_code;
        if (code) {
          order.awbCode = code;
          order.trackingUrl = `https://shiprocket.co/tracking/${code}`;
        } else {
          awbWarning = 'Shipment booked, but no AWB was returned.';
        }
      } catch (err) {
        logger.warn(`AWB assignment failed for order ${order.orderId}:`, err);
        awbWarning = 'Shipment booked, but the courier could not be assigned. Assign one in Shiprocket.';
      }
    }

    await order.save();

    await AuditLog.create({
      user: req.user!._id,
      action: 'BOOK_SHIPMENT',
      resource: 'order',
      resourceId: order._id.toString(),
      changes: { orderId: order.orderId, shiprocketOrderId: order.shiprocketOrderId, awbCode: order.awbCode },
    });

    sendSuccess(res, awbWarning || 'Shipment booked', {
      shiprocketOrderId: order.shiprocketOrderId,
      shipmentId,
      awbCode: order.awbCode,
      trackingUrl: order.trackingUrl,
      warning: awbWarning,
    });
  } catch (err) {
    // Never let an upstream 401 from Shiprocket reach the client as a 401 —
    // the admin panel would read it as their own session expiring.
    logger.error('Shiprocket booking failed', err);
    sendError(res, 'Could not book the shipment with Shiprocket. Check the credentials and pickup location.', 502);
  }
};

/** Live courier tracking for an order that has an AWB. */
export const getShipmentTracking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id).select('awbCode orderId').lean();
    if (!order) { sendError(res, 'Order not found', 404); return; }
    if (!order.awbCode) { sendError(res, 'No AWB on this order yet', 400); return; }

    const tracking = await trackShipment(order.awbCode);
    sendSuccess(res, 'Tracking', tracking);
  } catch (err) {
    logger.error('Shiprocket tracking failed', err);
    sendError(res, 'Could not fetch tracking from Shiprocket', 502);
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
        .select('+purchasePrice') // internal cost column, admin-only
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
      .select('+purchasePrice') // internal cost, admin-only
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
