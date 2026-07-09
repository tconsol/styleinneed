import { Request, Response, NextFunction } from 'express';
import Return from '../models/Return';
import Order from '../models/Order';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';

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

export const updateReturnStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, refundAmount, refundMethod, adminNote } = req.body;
    const returnReq = await Return.findByIdAndUpdate(
      req.params.id,
      { status, refundAmount, refundMethod, adminNote },
      { new: true }
    );
    if (!returnReq) { sendError(res, 'Return request not found', 404); return; }
    sendSuccess(res, 'Return status updated', returnReq);
  } catch (err) {
    next(err);
  }
};
