import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import User from '../models/User';
import Order from '../models/Order';
import Product from '../models/Product';
import Category from '../models/Category';
import Collection from '../models/Collection';
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

/**
 * Customer-behaviour metrics the revenue chart can't show: how many buyers come
 * back, what a customer is worth over their lifetime, and where the funnel from
 * account to purchase leaks.
 *
 * "Settled" means paid, or COD that wasn't cancelled — a pending online payment
 * isn't revenue, and counting it would inflate every figure here.
 */
export const getCustomerAnalytics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settled = {
      $or: [{ paymentStatus: 'paid' }, { paymentMethod: 'cod', status: { $ne: 'cancelled' } }],
    };

    const [perCustomer, totals, funnel] = await Promise.all([
      Order.aggregate<{ _id: unknown; orders: number; spent: number; first: Date; last: Date }>([
        { $match: settled },
        {
          $group: {
            _id: '$user',
            orders: { $sum: 1 },
            spent: { $sum: '$total' },
            first: { $min: '$createdAt' },
            last: { $max: '$createdAt' },
          },
        },
      ]),
      Order.aggregate<{ _id: null; revenue: number; orders: number }>([
        { $match: settled },
        { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      ]),
      Promise.all([
        User.countDocuments({ role: 'customer' }),
        Cart.countDocuments({ 'items.0': { $exists: true } }),
        Order.countDocuments(),
        Order.countDocuments(settled),
      ]),
    ]);

    const buyers = perCustomer.length;
    const repeatBuyers = perCustomer.filter((c) => c.orders > 1).length;
    const revenue = totals[0]?.revenue || 0;
    const orders = totals[0]?.orders || 0;

    // Distribution of order counts — shows whether repeat business is a broad
    // habit or a handful of very loyal customers.
    const buckets = { one: 0, two: 0, threeToFive: 0, sixPlus: 0 };
    perCustomer.forEach((c) => {
      if (c.orders === 1) buckets.one += 1;
      else if (c.orders === 2) buckets.two += 1;
      else if (c.orders <= 5) buckets.threeToFive += 1;
      else buckets.sixPlus += 1;
    });

    const top = [...perCustomer].sort((a, b) => b.spent - a.spent).slice(0, 10);
    const topIds = top.map((t) => t._id);
    const topUsers = await User.find({ _id: { $in: topIds } }).select('name email').lean();
    const nameById = new Map(topUsers.map((u) => [String(u._id), u]));

    const [customers, activeCarts, allOrders, paidOrders] = funnel;

    sendSuccess(res, 'Customer analytics', {
      repeat: {
        buyers,
        repeatBuyers,
        // Share of buyers who came back at least once.
        rate: buyers ? Math.round((repeatBuyers / buyers) * 1000) / 10 : 0,
        buckets,
      },
      lifetime: {
        // Average revenue per buyer to date. Not a projection — it only
        // reflects orders already placed.
        averageValue: buyers ? Math.round(revenue / buyers) : 0,
        averageOrders: buyers ? Math.round((orders / buyers) * 10) / 10 : 0,
        averageOrderValue: orders ? Math.round(revenue / orders) : 0,
        totalRevenue: Math.round(revenue),
      },
      topCustomers: top.map((t) => ({
        name: nameById.get(String(t._id))?.name || 'Deleted customer',
        email: nameById.get(String(t._id))?.email || '',
        orders: t.orders,
        spent: Math.round(t.spent),
      })),
      funnel: [
        { stage: 'Registered', count: customers },
        { stage: 'Active cart', count: activeCarts },
        { stage: 'Placed order', count: allOrders },
        { stage: 'Paid', count: paidOrders },
      ],
    });
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, search, isActive } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    // Customers only. Staff and supplier logins are managed on their own pages,
    // so they must never appear in (or be editable from) the customer list.
    const filter: Record<string, unknown> = { role: 'customer' };
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
    const user = await User.findOne({ _id: req.params.id, role: 'customer' }).select(
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
    // Customer records only carry an active flag here — promoting someone to
    // staff happens on the Staff page, which is admin-only and audited.
    const { isActive } = req.body;
    const user = await User.findOne({ _id: req.params.id, role: 'customer' });
    if (!user) { sendError(res, 'Customer not found', 404); return; }

    if (isActive !== undefined) user.isActive = !!isActive;
    await user.save();
    sendSuccess(res, 'Customer updated', user);
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
    const { isActive } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { role: 'customer' };
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

/**
 * Units sold per product, from settled orders.
 *
 * Product carries no denormalised sales counter, so this is derived. One
 * aggregation keyed by product id is far cheaper than a $lookup per row, and
 * the result doubles as the "most bought" sort key and a visible column.
 */
const soldCountMap = async (): Promise<Map<string, number>> => {
  const rows = await Order.aggregate([
    {
      $match: {
        $or: [
          { paymentStatus: 'paid' },
          { paymentMethod: 'cod', status: { $nin: ['cancelled', 'returned'] } },
        ],
      },
    },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', sold: { $sum: '$items.quantity' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.sold as number]));
};

/** Resolve a slug-or-id reference to an ObjectId. */
const resolveCategoryRef = async (value: string): Promise<Types.ObjectId | null> => {
  if (Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  const doc = await Category.findOne({ slug: value }).select('_id').lean();
  return doc?._id ?? null;
};

const resolveCollectionRef = async (value: string): Promise<Types.ObjectId | null> => {
  if (Types.ObjectId.isValid(value)) return new Types.ObjectId(value);
  const doc = await Collection.findOne({ slug: value }).select('_id').lean();
  return doc?._id ?? null;
};

export const getAdminProducts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page, limit, sort = '-createdAt', search, isActive,
      productType, category, collection, provider,
      minPrice, maxPrice, stockStatus, lowStockThreshold,
    } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (isActive !== undefined && isActive !== '') filter.isActive = isActive === 'true';

    // Regex rather than $text: an admin looks a product up by a fragment of its
    // name or SKU, and a text index only matches whole words.
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { sku: { $regex: safe, $options: 'i' } },
        { 'variants.sku': { $regex: safe, $options: 'i' } },
      ];
    }

    if (productType) filter.productType = productType;

    if (category) {
      const id = await resolveCategoryRef(category);
      // An unknown slug must return nothing, not silently drop the filter.
      filter.category = id ?? new Types.ObjectId();
    }
    if (collection) {
      const id = await resolveCollectionRef(collection);
      filter.collections = id ?? new Types.ObjectId();
    }

    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (Number.isFinite(min) || Number.isFinite(max)) {
      const range: Record<string, number> = {};
      if (Number.isFinite(min)) range.$gte = min;
      if (Number.isFinite(max)) range.$lte = max;
      filter.salePrice = range;
    }

    const lowAt = Number(lowStockThreshold) > 0 ? Number(lowStockThreshold) : 5;
    if (stockStatus === 'out') filter.variants = { $not: { $elemMatch: { stock: { $gt: 0 } } } };
    else if (stockStatus === 'low') filter.variants = { $elemMatch: { stock: { $gt: 0, $lte: lowAt } } };
    else if (stockStatus === 'in') filter.variants = { $elemMatch: { stock: { $gt: lowAt } } };

    // Providers only ever see their own products. Set last so a `provider`
    // query param can never widen it.
    if (req.user?.role === 'provider') filter.provider = req.user.providerRef;
    else if (provider && Types.ObjectId.isValid(provider)) filter.provider = new Types.ObjectId(provider);

    const sold = await soldCountMap();
    const bySales = sort === '-sold' || sort === 'sold';

    let products: Record<string, unknown>[];
    let total: number;

    if (bySales) {
      // Sales live outside the products collection, so the ordering happens
      // here: pull matching ids, rank them by the sales map, then fetch only
      // the page. Ids are small, so this stays cheap.
      const ids = await Product.find(filter).select('_id').lean();
      total = ids.length;
      const ordered = ids
        .map((d) => String(d._id))
        .sort((a, b) => {
          const diff = (sold.get(b) || 0) - (sold.get(a) || 0);
          return sort === 'sold' ? -diff : diff;
        })
        .slice(skip, skip + l);

      const docs = await Product.find({ _id: { $in: ordered.map((id) => new Types.ObjectId(id)) } })
        .select('+purchasePrice')
        .populate('category', 'name slug')
        .populate('collections', 'name slug')
        .lean();

      // `$in` returns natural order, so restore the ranking.
      const byId = new Map(docs.map((d) => [String(d._id), d as Record<string, unknown>]));
      products = ordered.map((id) => byId.get(id)).filter(Boolean) as Record<string, unknown>[];
    } else {
      const [rows, count] = await Promise.all([
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
      products = rows as Record<string, unknown>[];
      total = count;
    }

    const withSales = products.map((doc) => ({
      ...doc,
      sold: sold.get(String(doc._id)) || 0,
    }));

    sendSuccess(res, 'Products fetched', withSales, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /admin/products/filters — the values the filter bar offers.
 *
 * Derived from what actually exists, so a category with no products never
 * shows up as a dead option.
 */
export const getProductFilterOptions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const scope: Record<string, unknown> = {};
    if (req.user?.role === 'provider') scope.provider = req.user.providerRef;

    const [types, categoryIds, collectionIds, priceRange] = await Promise.all([
      Product.distinct('productType', scope),
      Product.distinct('category', scope),
      Product.distinct('collections', scope),
      Product.aggregate([
        { $match: scope },
        { $group: { _id: null, min: { $min: '$salePrice' }, max: { $max: '$salePrice' } } },
      ]),
    ]);

    const [categories, collections] = await Promise.all([
      Category.find({ _id: { $in: categoryIds } }).select('name slug').sort('name').lean(),
      Collection.find({ _id: { $in: collectionIds } }).select('name slug').sort('name').lean(),
    ]);

    sendSuccess(res, 'Filter options', {
      productTypes: (types as string[]).filter(Boolean).sort(),
      categories,
      collections,
      price: {
        min: Math.floor(priceRange[0]?.min ?? 0),
        max: Math.ceil(priceRange[0]?.max ?? 0),
      },
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

/**
 * GET /admin/analytics/insights — the detail the revenue chart doesn't show.
 *
 * "Settled" here means paid, or COD that hasn't been cancelled — the same
 * definition the customer analytics uses, so the numbers agree across pages.
 */
export const getAnalyticsInsights = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const settled = {
      $or: [
        { paymentStatus: 'paid' },
        { paymentMethod: 'cod', status: { $nin: ['cancelled', 'returned'] } },
      ],
    };

    const [
      statusMix, paymentMix, byCategory, byHour, byWeekday,
      aovTrend, discountStats, fulfilment, topStates,
    ] = await Promise.all([
      // Where orders currently sit — the operational picture.
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$total' } } },
        { $sort: { count: -1 } },
      ]),

      // Which payment methods people actually use.
      Order.aggregate([
        { $match: settled },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
      ]),

      // Revenue by category, via the product each line item points at.
      Order.aggregate([
        { $match: { ...settled, createdAt: { $gte: since } } },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'p' } },
        { $unwind: '$p' },
        { $lookup: { from: 'categories', localField: 'p.category', foreignField: '_id', as: 'c' } },
        { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$c.name', 'Uncategorised'] },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            units: { $sum: '$items.quantity' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]),

      // When people order — drives staffing and campaign send times.
      Order.aggregate([
        { $match: { ...settled, createdAt: { $gte: since } } },
        { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { _id: 1 } },
      ]),

      Order.aggregate([
        { $match: { ...settled, createdAt: { $gte: since } } },
        { $group: { _id: { $dayOfWeek: '$createdAt' }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { _id: 1 } },
      ]),

      // Average order value over time — a revenue rise means something
      // different depending on whether AOV or order count moved.
      Order.aggregate([
        { $match: { ...settled, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' }, d: { $dayOfMonth: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $project: { revenue: 1, orders: 1, aov: { $divide: ['$revenue', '$orders'] } } },
        { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
      ]),

      // What discounting actually costs.
      Order.aggregate([
        { $match: { ...settled, createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: '$total' },
            discount: { $sum: { $ifNull: ['$discount', 0] } },
            shipping: { $sum: { $ifNull: ['$shippingCharge', 0] } },
            withCoupon: { $sum: { $cond: [{ $ifNull: ['$coupon', false] }, 1, 0] } },
          },
        },
      ]),

      // How long orders take to reach delivered.
      Order.aggregate([
        { $match: { status: 'delivered', createdAt: { $gte: since } } },
        { $project: { hours: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60] } } },
        { $group: { _id: null, avgHours: { $avg: '$hours' }, count: { $sum: 1 } } },
      ]),

      // Where the money comes from geographically.
      Order.aggregate([
        { $match: { ...settled, createdAt: { $gte: since } } },
        { $group: { _id: '$shippingAddress.state', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const d = discountStats[0] || { orders: 0, revenue: 0, discount: 0, shipping: 0, withCoupon: 0 };
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    sendSuccess(res, 'Analytics insights', {
      days,
      statusMix: statusMix.map((s) => ({ status: s._id || 'unknown', count: s.count, value: s.value })),
      paymentMix: paymentMix.map((p) => ({ method: p._id || 'unknown', count: p.count, revenue: p.revenue })),
      byCategory: byCategory.map((c) => ({ name: c._id, revenue: c.revenue, units: c.units })),
      byHour: Array.from({ length: 24 }, (_, h) => {
        const hit = byHour.find((x) => x._id === h);
        return { hour: `${String(h).padStart(2, '0')}:00`, orders: hit?.orders || 0, revenue: hit?.revenue || 0 };
      }),
      // Mongo's $dayOfWeek is 1=Sunday.
      byWeekday: byWeekday.map((w) => ({ day: WEEKDAYS[(w._id as number) - 1], orders: w.orders, revenue: w.revenue })),
      aovTrend: aovTrend.map((a) => ({
        label: `${String(a._id.d).padStart(2, '0')}/${String(a._id.m).padStart(2, '0')}`,
        aov: Math.round(a.aov),
        orders: a.orders,
      })),
      economics: {
        orders: d.orders,
        revenue: d.revenue,
        discount: d.discount,
        shipping: d.shipping,
        withCoupon: d.withCoupon,
        couponRate: d.orders ? Math.round((d.withCoupon / d.orders) * 1000) / 10 : 0,
        discountRate: d.revenue + d.discount
          ? Math.round((d.discount / (d.revenue + d.discount)) * 1000) / 10
          : 0,
      },
      fulfilment: {
        avgHours: fulfilment[0]?.avgHours ? Math.round(fulfilment[0].avgHours * 10) / 10 : null,
        delivered: fulfilment[0]?.count || 0,
      },
      topStates: topStates
        .filter((s) => s._id)
        .map((s) => ({ state: s._id, orders: s.orders, revenue: s.revenue })),
    });
  } catch (err) {
    next(err);
  }
};
