import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import Order from '../models/Order';
import User from '../models/User';
import Cart, { ICart } from '../models/Cart';
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
import { checkLowStock } from '../services/stockAlert.service';
import { primaryClientUrl } from '../middleware/security';
import { computeOrderPricing, regionOf, PricedLine } from '../utils/pricing';
import logger from '../utils/logger';
import { IOrder, IUser, IAddress } from '../types';

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
 * Find-or-create the account a guest checkout belongs to.
 *
 * Orders always hang off a User, so a guest gets a lightweight one keyed by
 * their email. If that email already has an account (guest or registered) the
 * order joins it — but nothing about that account is ever returned to the
 * caller, and no session is issued, so this can't be used to probe or take
 * over a registered account.
 */
const resolveGuestUser = async (
  email: string,
  name: string,
  phone?: string
): Promise<IUser> => {
  const normalised = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalised });
  if (existing) return existing;

  return User.create({
    name: name || normalised.split('@')[0],
    email: normalised,
    phone,
    // Unusable random password — a guest signs in only after a real reset.
    password: crypto.randomBytes(24).toString('hex'),
    role: 'customer',
    isGuest: true,
    isEmailVerified: false,
  });
};

/** The parties + items a checkout is being built for. */
interface CheckoutActor {
  user: IUser;
  address: IAddress;
  /** Cart doc to clear on success — guests have none. */
  cart?: ICart;
  isGuest: boolean;
}

/**
 * Work out who is checking out and with what.
 * - Signed in: address from their saved list, items from their server cart.
 * - Guest: address + items come from the request body (there is no server cart).
 * Returns null after sending an error.
 */
const resolveActor = async (req: AuthRequest, res: Response): Promise<CheckoutActor | null> => {
  if (req.user) {
    const address = req.user.addresses.find((a) => a._id?.toString() === req.body.addressId);
    if (!address) { sendError(res, 'Address not found', 404); return null; }
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || !cart.items.length) { sendError(res, 'Cart is empty', 400); return null; }
    return { user: req.user, address, cart, isGuest: false };
  }

  // ── Guest ──
  const { email, address } = req.body as { email?: string; address?: IAddress };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    sendError(res, 'A valid email is required to check out as a guest', 400); return null;
  }
  if (!address?.fullName || !address?.phone || !address?.line1 || !address?.city || !address?.state || !address?.pincode) {
    sendError(res, 'A complete shipping address is required', 400); return null;
  }
  const user = await resolveGuestUser(email, address.fullName, address.phone);
  return { user, address: { ...address, email }, isGuest: true };
};

/**
 * Validate items + address + coupon and compute currency-correct pricing.
 * Shared by createOrder (COD + online). Returns null after sending an error.
 */
const buildPricing = async (
  req: AuthRequest,
  res: Response,
  actor: CheckoutActor,
  couponCode?: string
) => {
  const { user, address, cart } = actor;

  // Signed-in shoppers check out their server cart; guests post the items.
  const requested: { product: string; variantSku: string; quantity: number }[] = cart
    ? cart.items.map((i) => ({ product: String(i.product), variantSku: i.variantSku, quantity: i.quantity }))
    : ((req.body.items || []) as { productId?: string; product?: string; variantSku: string; quantity: number }[])
        .map((i) => ({ product: String(i.productId || i.product), variantSku: i.variantSku, quantity: Number(i.quantity) || 0 }));

  if (requested.length === 0) { sendError(res, 'Cart is empty', 400); return null; }

  const lines: PricedLine[] = [];
  const staleSkus: string[] = [];
  for (const item of requested) {
    if (item.quantity < 1) continue;
    const product = await Product.findById(item.product).catch(() => null);
    const variant = product?.variants.find((v) => v.sku === item.variantSku);
    // Product deleted/inactive, or its variant no longer exists → drop it
    // instead of blocking the whole checkout.
    if (!product || !product.isActive || !variant) { staleSkus.push(item.variantSku); continue; }
    if (variant.stock < item.quantity) {
      sendError(res, `Insufficient stock for ${product.name}`, 400);
      return null;
    }
    lines.push({ product, variantSku: item.variantSku, quantity: item.quantity });
  }

  // Self-heal: persist the signed-in cart without the dead items.
  if (staleSkus.length && cart) {
    cart.items = cart.items.filter((i) => !staleSkus.includes(i.variantSku));
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
    isGuestOrder?: boolean;
    guestToken?: string;
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
    isGuestOrder: !!data.isGuestOrder,
    guestToken: data.guestToken,
  });

  pushStatus(order, 'confirmed', data.paymentMethod === 'cod' ? 'Order placed (Cash on Delivery)' : 'Payment received, order confirmed');

  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.product, 'variants.sku': item.variant.sku },
      { $inc: { 'variants.$.stock': -item.quantity } }
    );
    emitEvent(SOCKET_EVENTS.stockUpdated, { productId: String(item.product), sku: item.variant.sku });
    // Best-effort admin alert; never blocks or fails the order.
    void checkLowStock(String(item.product), item.variant.sku, item.quantity);
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
    const actor = await resolveActor(req, res);
    if (!actor) return;
    const built = await buildPricing(req, res, actor, couponCode);
    if (!built) return;
    const { pricing, address, coupon } = built;
    const { user, isGuest } = actor;

    if (paymentMethod === 'cod') {
      if (pricing.region !== 'IN') { sendError(res, 'Cash on Delivery is available for India only', 400); return; }
      const guestToken = isGuest ? crypto.randomBytes(24).toString('hex') : undefined;
      const order = await fulfillOrder({
        user, pricing, address, coupon, paymentMethod: 'cod', paymentStatus: 'pending',
        isGuestOrder: isGuest, guestToken,
      });
      sendSuccess(res, 'COD Order placed', {
        orderId: order._id, orderNumber: order.orderId, guestToken,
      }, 201);
      return;
    }

    if (paymentMethod === 'razorpay' && pricing.currency !== 'INR') {
      sendError(res, 'Razorpay supports INR orders only. Use card payment.', 400); return;
    }
    if (paymentMethod !== 'razorpay' && paymentMethod !== 'stripe') {
      sendError(res, 'Unsupported payment method', 400); return;
    }

    // Guests get an unguessable token; without it a session id (a sequential-ish
    // ObjectId) would be enough to consume someone else's checkout.
    const sessionToken = isGuest ? crypto.randomBytes(24).toString('hex') : undefined;

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
      isGuest,
      guestToken: sessionToken,
    });

    const clientUrl = primaryClientUrl();
    const successUrl = `${clientUrl}/payment-return?session=${session._id}&status=success`;
    const cancelUrl = `${clientUrl}/payment-return?session=${session._id}&status=cancel`;
    const receipt = String(session._id);

    // Gateway calls can throw an upstream auth error (e.g. bad keys → HTTP 401).
    // Trap it so the upstream status never propagates to the client — a bare 401
    // would make the storefront think the user's session expired and log them out.
    try {
      if (paymentMethod === 'stripe') {
        const checkout = await createStripeCheckoutSession(
          pricing.total, receipt, successUrl, cancelUrl, pricing.currency.toLowerCase()
        );
        session.stripeSessionId = checkout.id;
        await session.save();
        sendSuccess(res, 'Payment session created', {
          sessionId: session._id, provider: 'stripe', url: checkout.url,
          amount: pricing.total, currency: pricing.currency, sessionToken,
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
          amount: pricing.total, currency: pricing.currency, sessionToken,
        }, 201);
      }
    } catch (gwErr) {
      await PaymentSession.deleteOne({ _id: session._id }).catch(() => {});
      logger.error('Payment gateway error', gwErr);
      sendError(res, 'Could not start payment. The payment gateway is misconfigured or unavailable — please try again or contact support.', 502);
    }
  } catch (err) {
    next(err);
  }
};

/** Turn a paid session into a real Order (idempotent). */
const confirmPaidSession = async (session: IPaymentSession, paymentRef?: string): Promise<IOrder> => {
  if (session.status === 'consumed' && session.order) {
    return (await Order.findById(session.order)) as IOrder;
  }
  // The session records who it belongs to — for a guest that's the
  // auto-provisioned account, so this works with or without a login.
  const user = await User.findById(session.user);
  const order = await fulfillOrder({
    user: user || undefined,
    isGuestOrder: session.isGuest,
    guestToken: session.isGuest ? session.guestToken : undefined,
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

/**
 * Load the payment session a verify call refers to.
 *
 * Signed in: the session must belong to them. Guest: the session must be a
 * guest session AND the caller must present its token — a session id alone is
 * an ObjectId, which is not unguessable enough to authorise consuming a
 * checkout. Returns null after sending an error.
 */
const loadSessionForVerify = async (
  req: AuthRequest,
  res: Response
): Promise<IPaymentSession | null> => {
  const { sessionId, sessionToken } = req.body as { sessionId?: string; sessionToken?: string };
  if (!sessionId) { sendError(res, 'sessionId is required', 400); return null; }

  if (req.user) {
    const owned = await PaymentSession.findOne({ _id: sessionId, user: req.user._id });
    if (owned) return owned;
    // Fall through: a guest may have started this checkout before signing in.
  }

  if (!sessionToken) { sendError(res, 'Payment session not found or expired', 404); return null; }
  const session = await PaymentSession.findOne({ _id: sessionId, isGuest: true }).select('+guestToken');
  if (!session || !session.guestToken || session.guestToken !== sessionToken) {
    sendError(res, 'Payment session not found or expired', 404); return null;
  }
  return session;
};

/** Verify a Razorpay Payment Link, then create the order from the session. */
export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await loadSessionForVerify(req, res);
    if (!session) return;
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
    const order = await confirmPaidSession(session, payments[0]?.payment_id);
    sendSuccess(res, 'Payment verified. Order confirmed.', { orderId: order._id, orderNumber: order.orderId });
  } catch (err) {
    next(err);
  }
};

/** Verify a Stripe Checkout Session, then create the order from the session. */
export const verifyStripePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await loadSessionForVerify(req, res);
    if (!session) return;
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

    const order = await confirmPaidSession(session, String(checkout.payment_intent || ''));
    sendSuccess(res, 'Payment verified. Order confirmed.', { orderId: order._id, orderNumber: order.orderId });
  } catch (err) {
    next(err);
  }
};

/**
 * Let a guest open the order they just placed, using the token issued at
 * checkout (also included in their confirmation email link). Matching on the
 * token — not just the id — keeps orders from being enumerable.
 */
export const getGuestOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = String(req.query.token || '');
    if (!token) { sendError(res, 'Order not found', 404); return; }

    const order = await Order.findOne({ _id: req.params.id, isGuestOrder: true })
      .select('+guestToken')
      .populate('items.product', 'name slug images salePrice mrp');

    if (!order || !order.guestToken || order.guestToken !== token) {
      sendError(res, 'Order not found', 404); return;
    }

    const plain = order.toObject();
    delete (plain as { guestToken?: string }).guestToken;
    sendSuccess(res, 'Order fetched', plain);
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

// Customer removes their own order from their history — only once it's a final
// state (delivered / cancelled / returned). Active orders can't be deleted.
export const deleteMyOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user!._id });
    if (!order) { sendError(res, 'Order not found', 404); return; }
    if (!['delivered', 'cancelled', 'returned'].includes(order.status)) {
      sendError(res, 'Only delivered, cancelled or returned orders can be deleted', 400); return;
    }
    await order.deleteOne();
    sendSuccess(res, 'Order removed from your history');
  } catch (err) {
    next(err);
  }
};
