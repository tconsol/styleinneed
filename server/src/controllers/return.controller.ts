import { Request, Response, NextFunction } from 'express';
import Return, { IReturn } from '../models/Return';
import Order from '../models/Order';
import Product from '../models/Product';
import AuditLog from '../models/AuditLog';
import { AuthRequest, IOrder } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';
import { refundRazorpayPayment } from '../services/razorpay.service';
import { refundStripePayment } from '../services/stripe.service';
import { sendPushToUser } from '../services/push.service';
import { invalidateCache } from '../middleware/cache';
import logger from '../utils/logger';

export const createReturn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId, items, reason, description, images } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user!._id, status: 'delivered' });
    if (!order) { sendError(res, 'Order not found or not eligible for return', 404); return; }

    const existing = await Return.findOne({ order: orderId });
    if (existing) { sendError(res, 'Return already requested for this order', 400); return; }

    const returnRequest = await Return.create({
      order: orderId,
      user: req.user!._id,
      items,
      reason,
      description,
      images,
    });

    sendSuccess(res, 'Return request submitted', returnRequest, 201);
  } catch (err) {
    next(err);
  }
};

export const getMyReturns = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const returns = await Return.find({ user: req.user!._id })
      .populate('order', 'orderId total createdAt')
      .sort('-createdAt')
      .lean();
    sendSuccess(res, 'Returns fetched', returns);
  } catch (err) {
    next(err);
  }
};

export const getAllReturns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, status } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const [returns, total] = await Promise.all([
      Return.find(filter)
        .populate('user', 'name email')
        .populate('order', 'orderId total')
        .sort('-createdAt')
        .skip(skip)
        .limit(l)
        .lean(),
      Return.countDocuments(filter),
    ]);

    sendSuccess(res, 'Returns fetched', returns, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Push the refund through the gateway the order was paid with. Never refunds
 * twice: callers must check `refundStatus` first, and the status is flipped to
 * 'processing' before the network call so a concurrent request can't re-enter.
 * COD orders have no gateway — they're marked 'manual' for the admin to pay out.
 */
const issueRefund = async (returnReq: IReturn, order: IOrder, amount: number): Promise<void> => {
  const settled = order.paymentStatus === 'paid';

  if (!settled || order.paymentMethod === 'cod') {
    returnReq.refundStatus = 'manual';
    returnReq.refundMethod = returnReq.refundMethod || (order.paymentMethod === 'cod' ? 'bank_transfer' : 'manual');
    await returnReq.save();
    return;
  }

  returnReq.refundStatus = 'processing';
  await returnReq.save();

  try {
    if (order.razorpayPaymentId) {
      const r = await refundRazorpayPayment(order.razorpayPaymentId, amount);
      returnReq.refundReference = String((r as { id?: string }).id || '');
      returnReq.refundMethod = 'razorpay';
    } else if (order.stripePaymentIntentId) {
      const r = await refundStripePayment(order.stripePaymentIntentId, amount);
      returnReq.refundReference = String((r as { id?: string }).id || '');
      returnReq.refundMethod = 'stripe';
    } else {
      // Paid, but no gateway reference stored — can't automate it.
      returnReq.refundStatus = 'manual';
      returnReq.refundMethod = returnReq.refundMethod || 'manual';
      await returnReq.save();
      return;
    }
    returnReq.refundStatus = 'refunded';
    returnReq.refundedAt = new Date();
    returnReq.refundError = undefined;
  } catch (err) {
    // Leave the return marked failed so the admin can retry — never silently
    // report success for money that didn't move.
    returnReq.refundStatus = 'failed';
    returnReq.refundError = err instanceof Error ? err.message : 'Refund failed';
    logger.error(`Refund failed for return ${returnReq._id}:`, err);
  }
  await returnReq.save();
};

/** Put returned units back into stock (once). */
const restockReturn = async (returnReq: IReturn): Promise<void> => {
  if (returnReq.restocked) return;
  for (const item of returnReq.items) {
    await Product.updateOne(
      { _id: item.product, 'variants.sku': item.variantSku },
      { $inc: { 'variants.$.stock': item.quantity } }
    );
  }
  returnReq.restocked = true;
  await returnReq.save();
  void invalidateCache('/api/v1/products');
};

export const updateReturnStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, refundAmount, refundMethod, adminNote } = req.body;
    const returnReq = await Return.findById(req.params.id);
    if (!returnReq) { sendError(res, 'Return request not found', 404); return; }

    const wasCompleted = returnReq.status === 'completed';
    if (status) returnReq.status = status;
    if (refundAmount != null) returnReq.refundAmount = Number(refundAmount);
    if (refundMethod) returnReq.refundMethod = refundMethod;
    if (adminNote != null) returnReq.adminNote = adminNote;
    returnReq.processedBy = req.user!._id;
    await returnReq.save();

    // Completing a return refunds the customer and puts the stock back — but
    // only on the transition into 'completed', and only once.
    if (returnReq.status === 'completed' && !wasCompleted) {
      const order = await Order.findById(returnReq.order);
      if (order) {
        await restockReturn(returnReq);
        const amount = returnReq.refundAmount ?? order.total;
        const alreadyPaidOut = ['refunded', 'processing'].includes(returnReq.refundStatus);
        if (amount > 0 && !alreadyPaidOut) await issueRefund(returnReq, order, amount);

        await AuditLog.create({
          user: req.user!._id,
          action: 'COMPLETE_RETURN',
          resource: 'return',
          resourceId: returnReq._id.toString(),
          changes: {
            orderId: order.orderId,
            refundAmount: amount,
            refundStatus: returnReq.refundStatus,
            refundReference: returnReq.refundReference,
          },
        });

        void sendPushToUser({
          userId: returnReq.user,
          title: 'Return completed',
          body: returnReq.refundStatus === 'refunded'
            ? `Your refund of ${order.currency === 'USD' ? '$' : '₹'}${amount} is on its way.`
            : `Your return for order #${order.orderId} has been processed.`,
          type: 'order_status_changed',
          orderNumber: order.orderId,
        });
      }
    }

    sendSuccess(res, 'Return status updated', returnReq);
  } catch (err) {
    next(err);
  }
};

/** Retry a refund that failed at the gateway (admin-triggered). */
export const retryReturnRefund = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const returnReq = await Return.findById(req.params.id);
    if (!returnReq) { sendError(res, 'Return request not found', 404); return; }
    if (returnReq.refundStatus === 'refunded') { sendError(res, 'Already refunded', 400); return; }
    if (returnReq.refundStatus === 'processing') { sendError(res, 'A refund is already in flight', 409); return; }

    const order = await Order.findById(returnReq.order);
    if (!order) { sendError(res, 'Order not found', 404); return; }

    const amount = returnReq.refundAmount ?? order.total;
    if (amount <= 0) { sendError(res, 'Set a refund amount first', 400); return; }

    await issueRefund(returnReq, order, amount);
    if (returnReq.refundStatus === 'failed') {
      sendError(res, returnReq.refundError || 'Refund failed at the gateway', 502);
      return;
    }
    sendSuccess(res, 'Refund issued', returnReq);
  } catch (err) {
    next(err);
  }
};
