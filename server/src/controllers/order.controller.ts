import { Response, NextFunction } from 'express';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product';
import Coupon from '../models/Coupon';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { emitEvent, SOCKET_EVENTS } from '../config/socket';
import { invalidateCache } from '../middleware/cache';
import { createRazorpayPaymentLink, fetchRazorpayPaymentLink } from '../services/razorpay.service';
import { createStripeCheckoutSession, retrieveStripeCheckoutSession } from '../services/stripe.service';
import { sendOrderConfirmationEmail } from '../services/email.service';
import { sendPushToUser } from '../services/push.service';
import { primaryClientUrl } from '../middleware/security';
import { IOrder } from '../types';

/** Append a status event + broadcast it so clients live-update the tracker. */
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

export const createOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { addressId, paymentMethod, couponCode } = req.body;

    const user = req.user!;
    const address = user.addresses.find((a) => a._id?.toString() === addressId);
    if (!address) { sendError(res, 'Address not found', 404); return; }

    const cart = await Cart.findOne({ user: user._id }).populate('items.product');
    if (!cart || !cart.items.length) { sendError(res, 'Cart is empty', 400); return; }

    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) { sendError(res, `Product unavailable`, 400); return; }

      const variant = product.variants.find((v) => v.sku === item.variantSku);
      if (!variant || variant.stock < item.quantity) {
        sendError(res, `Insufficient stock for ${product.name}`, 400);
        return;
      }

      const price = product.salePrice;
      subtotal += price * item.quantity;
      orderItems.push({ product: product._id, variant, quantity: item.quantity, price });
    }

    let discount = 0;
    let freeShipping = false;
    let couponDoc;
    if (couponCode) {
      const found = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      const now = new Date();
      const valid =
        found &&
        found.expiryDate > now &&
        found.startDate <= now &&
        subtotal >= found.minOrderValue &&
        !(found.usageLimit && found.usedCount >= found.usageLimit) &&
        !found.restrictedUsers.some((u) => u.toString() === user._id.toString());

      if (valid && found) {
        couponDoc = found;
        if (found.type === 'percentage' || found.type === 'festival' || found.type === 'first_order') {
          discount = (subtotal * found.value) / 100;
          if (found.maxDiscount) discount = Math.min(discount, found.maxDiscount);
        } else if (found.type === 'flat') {
          discount = found.value;
        } else if (found.type === 'free_shipping') {
          freeShipping = true;
        }
      }
    }

    const shippingCharge = freeShipping ? 0 : subtotal >= 999 ? 0 : 99;
    const total = subtotal - discount + shippingCharge;

    const order = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress: address,
      subtotal,
      shippingCharge,
      discount,
      total,
      coupon: couponDoc?._id,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    });

    const clientUrl = primaryClientUrl();
    const successUrl = `${clientUrl}/payment-return?order=${order._id}&status=success`;
    const cancelUrl = `${clientUrl}/payment-return?order=${order._id}&status=cancel`;

    if (paymentMethod === 'stripe') {
      const session = await createStripeCheckoutSession(total, order.orderId, successUrl, cancelUrl);
      order.stripePaymentIntentId = session.id; // store session id for verification
      await order.save();

      sendSuccess(res, 'Order created', {
        orderId: order._id,
        orderNumber: order.orderId,
        provider: 'stripe',
        url: session.url,
        amount: total,
        currency: 'INR',
      }, 201);
    } else if (paymentMethod !== 'cod') {
      const link = await createRazorpayPaymentLink(
        total,
        order.orderId,
        { name: address.fullName, email: user.email, contact: address.phone },
        successUrl
      );
      order.razorpayOrderId = link.id; // store payment-link id for verification
      await order.save();

      sendSuccess(res, 'Order created', {
        orderId: order._id,
        orderNumber: order.orderId,
        provider: 'razorpay',
        url: link.short_url,
        amount: total,
        currency: 'INR',
      }, 201);
    } else {
      await confirmOrderFulfillment(order, user);
      sendSuccess(res, 'COD Order placed', { orderId: order._id, orderNumber: order.orderId }, 201);
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Verify a Razorpay hosted Payment Link after the user returns from checkout.
 * We poll the gateway for the link status rather than trusting the client.
 */
export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user!._id }).populate('user');
    if (!order) { sendError(res, 'Order not found', 404); return; }
    if (order.paymentStatus === 'paid') { sendSuccess(res, 'Order already confirmed'); return; }
    if (!order.razorpayOrderId) { sendError(res, 'No payment link for this order', 400); return; }

    // Razorpay marks the link 'paid' slightly after the customer pays — poll a
    // few times so we don't fail when the user returns before the webhook lands.
    let link = await fetchRazorpayPaymentLink(order.razorpayOrderId);
    for (let i = 0; i < 4 && link.status !== 'paid'; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      link = await fetchRazorpayPaymentLink(order.razorpayOrderId);
    }

    if (link.status !== 'paid') {
      sendError(res, `Payment not completed (status: ${link.status})`, 400);
      return;
    }

    const payments = (link.payments as unknown as Array<{ payment_id: string }> | undefined) ?? [];
    order.razorpayPaymentId = payments[0]?.payment_id;
    order.paymentStatus = 'paid';
    await order.save();

    await confirmOrderFulfillment(order, req.user!);
    sendSuccess(res, 'Payment verified. Order confirmed.');
  } catch (err) {
    next(err);
  }
};

/** Verify a Stripe hosted Checkout Session after the user returns from checkout. */
export const verifyStripePayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user!._id }).populate('user');
    if (!order) { sendError(res, 'Order not found', 404); return; }
    if (order.paymentStatus === 'paid') { sendSuccess(res, 'Order already confirmed'); return; }
    if (!order.stripePaymentIntentId) { sendError(res, 'No checkout session for this order', 400); return; }

    let session = await retrieveStripeCheckoutSession(order.stripePaymentIntentId);
    for (let i = 0; i < 4 && session.payment_status !== 'paid'; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      session = await retrieveStripeCheckoutSession(order.stripePaymentIntentId);
    }

    if (session.payment_status !== 'paid') {
      sendError(res, `Payment not completed (status: ${session.payment_status})`, 400);
      return;
    }

    order.paymentStatus = 'paid';
    await order.save();

    await confirmOrderFulfillment(order, req.user!);
    sendSuccess(res, 'Payment verified. Order confirmed.');
  } catch (err) {
    next(err);
  }
};

const confirmOrderFulfillment = async (order: InstanceType<typeof Order>, user: AuthRequest['user']) => {
  if (!user) return;

  pushStatus(order, 'confirmed', 'Payment received, order confirmed');

  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.product, 'variants.sku': item.variant.sku },
      { $inc: { 'variants.$.stock': -item.quantity } }
    );
    emitEvent(SOCKET_EVENTS.stockUpdated, { productId: String(item.product), sku: item.variant.sku });
  }
  void invalidateCache('/api/v1/products'); // stock changed → drop stale product cache

  if (order.coupon) {
    await Coupon.findByIdAndUpdate(order.coupon, { $inc: { usedCount: 1 } });
  }

  await order.save();
  emitOrderUpdate(order);

  // Notify admin panel of new confirmed order (triggers Dynamic Island)
  emitEvent(SOCKET_EVENTS.orderNew, {
    orderId: String(order._id),
    orderNumber: order.orderId,
    total: order.total,
    customerName: user.name,
  });

  await Cart.findOneAndUpdate({ user: user._id }, { items: [], coupon: undefined });

  // Send confirmation email
  const addressEmail = order.shippingAddress.email?.trim();
  const fallbackEmail = user.email;
  try {
    await sendOrderConfirmationEmail(addressEmail || fallbackEmail, user.name, order.orderId, order.total);
  } catch {
    if (addressEmail && addressEmail.toLowerCase() !== fallbackEmail.toLowerCase()) {
      try {
        await sendOrderConfirmationEmail(fallbackEmail, user.name, order.orderId, order.total);
      } catch {
        // Email failure must not block order confirmation.
      }
    }
  }

  // Push notification (fire-and-forget)
  void sendPushToUser({
    userId: user._id,
    title: '✅ Order Confirmed',
    body: `Your order #${order.orderId} is confirmed and being processed!`,
    type: 'order_confirmed',
    orderId: String(order._id),
    orderNumber: order.orderId,
  });
};

export const getMyOrders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user!._id })
        .populate('items.product', 'name slug images salePrice mrp')
        .sort('-createdAt')
        .skip(skip)
        .limit(l)
        .lean(),
      Order.countDocuments({ user: req.user!._id }),
    ]);

    // Filter out items where product was deleted
    const clean = orders.map((o) => ({
      ...o,
      items: o.items.filter((i) => i.product != null),
    }));

    sendSuccess(res, 'Orders fetched', clean, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
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
      sendError(res, 'Order cannot be cancelled at this stage', 400);
      return;
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
