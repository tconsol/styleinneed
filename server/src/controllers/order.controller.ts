import { Response, NextFunction } from 'express';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';
import Coupon from '../models/Coupon';
import PaymentSession, { IPaymentSession } from '../models/PaymentSession';
import { getSettings } from '../models/Settings';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';
import { invalidateCache } from '../middleware/cache';
import { createRazorpayPaymentLink, fetchRazorpayPaymentLink } from '../services/razorpay.service';
import { createStripeCheckoutSession, retrieveStripeCheckoutSession } from '../services/stripe.service';
import { sendOrderConfirmationEmail } from '../services/email.service';
import { sendPushToUser } from '../services/push.service';
import { primaryClientUrl } from '../middleware/security';
import { computeOrderPricing, regionOf, PricedLine } from '../utils/pricing';
import { IOrder } from '../types';

const pushStatus = (order: IOrder, status: IOrder['status'], note?: string): void => {
  order.status = status;
  order.statusHistory.push({ status, note, at: new Date() });
};

const emitOrderUpdate = (order: IOrder): void => {
  emitEvent(SOCKET_EVENTS.orderUpdated, {
    orderId: String(order._id),
    orderNumber: order.orderId,
    status: order.status,
    statusHistory: order.statusHistory,
  });
};

/** Publishable keys the storefront/mobile need to mount the payment UIs. */
export const getPaymentConfig = async (_req: AuthRequest, res: Response): Promise<void> => {
  sendSuccess(res, 'Payment config', {
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    codEnabled: true,
  });
};

/**
 * Validate cart + address + coupon and compute currency-correct pricing.
 * Shared by createOrder (COD + online). Returns null after sending an error.
 */
const buildPricing = async (req: AuthRequest, res: Response, couponCode?: string) => {
  const user = req.user!;
  const { addressId } = req.body;
  const address = user.addresses.find((a) => a._id?.toString() === addressId);
  if (!address) { sendError(res, 'Address not found', 404); return null; }

  const cart = await Cart.findOne({ user: user._id });
  if (!cart || !cart.items.length) { sendError(res, 'Cart is empty', 400); return null; }

  const lines: PricedLine[] = [];
  const stale: typeof cart.items = [];
  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    const variant = product?.variants.find((v) => v.sku === item.variantSku);
    // Product deleted/inactive, or its variant no longer exists → drop it from the
    // cart instead of blocking the whole checkout.
    if (!product || !product.isActive || !variant) { stale.push(item); continue; }
    if (variant.stock < item.quantity) {
      sendError(res, `Insufficient stock for ${product.name}`, 400);
      return null;
    }
    lines.push({ product, variantSku: item.variantSku, quantity: item.quantity });
  }

  // Self-heal: persist the cart without the dead items.
  if (stale.length) {
    cart.items = cart.items.filter((i) => !stale.includes(i));
    await cart.save();
  }
  if (lines.length === 0) {
    sendError(res, 'Your cart items are no longer available. Please refresh your cart and try again.', 400);
    return null;
  }

  // Validate coupon (expiry / start / min / usage / restricted) before applying.
  let couponDoc;
  if (couponCode) {
    const found = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    const now = new Date();
    const valid =
      found &&
      found.expiryDate > now &&
      found.startDate <= now &&
      !(found.usageLimit && found.usedCount >= found.usageLimit) &&
      !found.restrictedUsers.some((u) => u.toString() === user._id.toString());
    if (valid && found) couponDoc = found;
  }

  const settings = await getSettings();
  // minOrderValue is checked against the INR subtotal for INR carts; skip for USD.
  const pricing = await computeOrderPricing(lines, address, couponDoc, settings);
  if (couponDoc && pricing.currency === 'INR' && pricing.subtotal < couponDoc.minOrderValue) {
    // Coupon below min — recompute without it.
    const clean = await computeOrderPricing(lines, address, undefined, settings);
    return { pricing: clean, address, coupon: undefined };
  }
  return { pricing, address, coupon: couponDoc };
};

/** Create the Order + run fulfillment (stock, coupon, cart clear, email, push, sockets). */
const fulfillOrder = async (
  data: {
    user: AuthRequest['user'];
    pricing: Awaited<ReturnType<typeof computeOrderPricing>>;
    address: IOrder['shippingAddress'];
    coupon?: unknown;
    paymentMethod: IOrder['paymentMethod'];
    paymentStatus: IOrder['paymentStatus'];
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    stripePaymentIntentId?: string;
  }
): Promise<IOrder> => {
  const user = data.user!;
  const order = await Order.create({
    user: user._id,
    items: data.pricing.items,
    shippingAddress: data.address,
    currency: data.pricing.currency,
    subtotal: data.pricing.subtotal,
    shippingCharge: data.pricing.shippingCharge,
    discount: data.pricing.discount,
    total: data.pricing.total,
    coupon: (data.coupon as { _id?: unknown })?._id,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    razorpayOrderId: data.razorpayOrderId,
    razorpayPaymentId: data.razorpayPaymentId,
    stripePaymentIntentId: data.stripePaymentIntentId,
  });

  pushStatus(order, 'confirmed', data.paymentMethod === 'cod' ? 'Order placed (Cash on Delivery)' : 'Payment received, order confirmed');

  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.product, 'variants.sku': item.variant.sku },
      { $inc: { 'variants.$.stock': -item.quantity } }
    );
    emitEvent(SOCKET_EVENTS.stockUpdated, { productId: String(item.product), sku: item.variant.sku });
  }
  void invalidateCache('/api/v1/products');

  if (order.coupon) await Coupon.findByIdAndUpdate(order.coupon, { $inc: { usedCount: 1 } });

  await order.save();
  emitOrderUpdate(order);
  emitEvent(SOCKET_EVENTS.orderNew, {
    orderId: String(order._id),
    orderNumber: order.orderId,
    total: order.total,
    customerName: user.name,
  });

  await Cart.findOneAndUpdate({ user: user._id }, { items: [], coupon: undefined });

  const addressEmail = order.shippingAddress.email?.trim();
  const fallbackEmail = user.email;
  try {
    await sendOrderConfirmationEmail(addressEmail || fallbackEmail, user.name, order.orderId, order.total);
  } catch {
    if (addressEmail && addressEmail.toLowerCase() !== fallbackEmail.toLowerCase()) {
      try { await sendOrderConfirmationEmail(fallbackEmail, user.name, order.orderId, order.total); } catch { /* email must not block */ }
    }
  }

  void sendPushToUser({
    userId: user._id,
    title: '✅ Order Confirmed',
    body: `Your order #${order.orderId} is confirmed and being processed!`,
    type: 'order_confirmed',
    orderId: String(order._id),
    orderNumber: order.orderId,
  });

  return order;
};

/**
 * Start a checkout. COD creates the Order immediately. Online payments create a
 * short-lived PaymentSession + hosted gateway link — the real Order is created
 * ONLY after the payment verifies (confirmPaidSession). Nothing persists as an
 * order for an abandoned/failed online payment.
 */
export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentMethod, couponCode } = req.body;
    const built = await buildPricing(req, res, couponCode);
    if (!built) return;
    const { pricing, address, coupon } = built;
    const user = req.user!;

    if (paymentMethod === 'cod') {
      if (pricing.region !== 'IN') { sendError(res, 'Cash on Delivery is available for India only', 400); return; }
      const order = await fulfillOrder({ user, pricing, address, coupon, paymentMethod: 'cod', paymentStatus: 'pending' });
      sendSuccess(res, 'COD Order placed', { orderId: order._id, orderNumber: order.orderId }, 201);
      return;
    }

    if (paymentMethod === 'razorpay' && pricing.currency !== 'INR') {
      sendError(res, 'Razorpay supports INR orders only. Use card payment.', 400); return;
    }
    if (paymentMethod !== 'razorpay' && paymentMethod !== 'stripe') {
      sendError(res, 'Unsupported payment method', 400); return;
    }

    const session = await PaymentSession.create({
      user: user._id,
      items: pricing.items,
      shippingAddress: address,
      currency: pricing.currency,
      subtotal: pricing.subtotal,
      shippingCharge: pricing.shippingCharge,
      discount: pricing.discount,
      total: pricing.total,
      coupon: (coupon as { _id?: unknown })?._id,
      paymentMethod,
      provider: paymentMethod,
    });

    const clientUrl = primaryClientUrl();
    const successUrl = `${clientUrl}/payment-return?session=${session._id}&status=success`;
    const cancelUrl = `${clientUrl}/payment-return?session=${session._id}&status=cancel`;
    const receipt = String(session._id);

    if (paymentMethod === 'stripe') {
      const checkout = await createStripeCheckoutSession(
        pricing.total, receipt, successUrl, cancelUrl, pricing.currency.toLowerCase()
      );
      session.stripeSessionId = checkout.id;
      await session.save();
      sendSuccess(res, 'Payment session created', {
        sessionId: session._id, provider: 'stripe', url: checkout.url,
        amount: pricing.total, currency: pricing.currency,
      }, 201);
    } else {
      const link = await createRazorpayPaymentLink(
        pricing.total, receipt,
        { name: address.fullName, email: user.email, contact: address.phone },
        successUrl, 'INR'
      );
      session.razorpayLinkId = link.id;
      await session.save();
      sendSuccess(res, 'Payment session created', {
        sessionId: session._id, provider: 'razorpay', url: link.short_url,
        amount: pricing.total, currency: pricing.currency,
      }, 201);
    }
  } catch (err) {
    next(err);
  }
};

/** Turn a paid session into a real Order (idempotent). */
const confirmPaidSession = async (session: IPaymentSession, user: AuthRequest['user'], paymentRef?: string): Promise<IOrder> => {
  if (session.status === 'consumed' && session.order) {
    return (await Order.findById(session.order)) as IOrder;
  }
  const order = await fulfillOrder({
    user,
    pricing: {
      region: regionOf(session.shippingAddress.country),
      currency: session.currency,
      items: session.items,
      subtotal: session.subtotal,
      shippingCharge: session.shippingCharge,
      discount: session.discount,
      total: session.total,
    },
    address: session.shippingAddress,
    coupon: session.coupon ? { _id: session.coupon } : undefined,
    paymentMethod: session.paymentMethod,
    paymentStatus: 'paid',
    razorpayOrderId: session.provider === 'razorpay' ? session.razorpayLinkId : undefined,
    razorpayPaymentId: session.provider === 'razorpay' ? paymentRef : undefined,
    stripePaymentIntentId: session.provider === 'stripe' ? session.stripeSessionId : undefined,
  });
  session.status = 'consumed';
  session.order = order._id;
  await session.save();
  return order;
};

/** Verify a Razorpay Payment Link, then create the order from the session. */
export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const session = await PaymentSession.findOne({ _id: sessionId, user: req.user!._id });
    if (!session) { sendError(res, 'Payment session not found or expired', 404); return; }
    if (session.status === 'consumed' && session.order) {
      const existing = await Order.findById(session.order);
      sendSuccess(res, 'Order already confirmed', { orderId: existing?._id, orderNumber: existing?.orderId });
      return;
    }
    if (!session.razorpayLinkId) { sendError(res, 'No Razorpay link on this session', 400); return; }

    let link = await fetchRazorpayPaymentLink(session.razorpayLinkId);
    for (let i = 0; i < 4 && link.status !== 'paid'; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      link = await fetchRazorpayPaymentLink(session.razorpayLinkId);
    }
    if (link.status !== 'paid') { sendError(res, `Payment not completed (status: ${link.status})`, 400); return; }

    const payments = (link.payments as unknown as Array<{ payment_id: string }> | undefined) ?? [];
    const order = await confirmPaidSession(session, req.user!, payments[0]?.payment_id);
    sendSuccess(res, 'Payment verified. Order confirmed.', { orderId: order._id, orderNumber: order.orderId });
  } catch (err) {
    next(err);
  }
};

/** Verify a Stripe Checkout Session, then create the order from the session. */
export const verifyStripePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const session = await PaymentSession.findOne({ _id: sessionId, user: req.user!._id });
    if (!session) { sendError(res, 'Payment session not found or expired', 404); return; }
    if (session.status === 'consumed' && session.order) {
      const existing = await Order.findById(session.order);
      sendSuccess(res, 'Order already confirmed', { orderId: existing?._id, orderNumber: existing?.orderId });
      return;
    }
    if (!session.stripeSessionId) { sendError(res, 'No Stripe session on this session', 400); return; }

    let checkout = await retrieveStripeCheckoutSession(session.stripeSessionId);
    for (let i = 0; i < 4 && checkout.payment_status !== 'paid'; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      checkout = await retrieveStripeCheckoutSession(session.stripeSessionId);
    }
    if (checkout.payment_status !== 'paid') { sendError(res, `Payment not completed (status: ${checkout.payment_status})`, 400); return; }

    const order = await confirmPaidSession(session, req.user!, String(checkout.payment_intent || ''));
    sendSuccess(res, 'Payment verified. Order confirmed.', { orderId: order._id, orderNumber: order.orderId });
  } catch (err) {
    next(err);
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user!._id })
        .populate('items.product', 'name slug images salePrice mrp')
        .sort('-createdAt').skip(skip).limit(l).lean(),
      Order.countDocuments({ user: req.user!._id }),
    ]);

    const clean = orders.map((o) => ({ ...o, items: o.items.filter((i) => i.product != null) }));
    sendSuccess(res, 'Orders fetched', clean, 200, { page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user!._id })
      .populate('items.product', 'name slug images')
      .populate('coupon', 'code type value');
    if (!order) { sendError(res, 'Order not found', 404); return; }
    sendSuccess(res, 'Order details', order);
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user!._id });
    if (!order) { sendError(res, 'Order not found', 404); return; }
    if (!['pending', 'confirmed'].includes(order.status)) {
      sendError(res, 'Order cannot be cancelled at this stage', 400); return;
    }
    order.cancelReason = req.body.reason || 'Cancelled by customer';
    pushStatus(order, 'cancelled', order.cancelReason);
    await order.save();
    emitOrderUpdate(order);

    void sendPushToUser({
      userId: req.user!._id,
      title: '❌ Order Cancelled',
      body: `Your order #${order.orderId} has been cancelled.`,
      type: 'order_cancelled',
      orderId: String(order._id),
      orderNumber: order.orderId,
    });

    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, 'variants.sku': item.variant.sku },
        { $inc: { 'variants.$.stock': item.quantity } }
      );
    }
    sendSuccess(res, 'Order cancelled');
  } catch (err) {
    next(err);
  }
};
