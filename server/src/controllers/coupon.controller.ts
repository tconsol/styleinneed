import { Request, Response, NextFunction } from 'express';
import Coupon from '../models/Coupon';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';

export const applyCoupon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, cartTotal } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) { sendError(res, 'Invalid coupon code', 404); return; }
    if (coupon.expiryDate < new Date()) { sendError(res, 'Coupon expired', 400); return; }
    if (coupon.startDate > new Date()) { sendError(res, 'Coupon not yet active', 400); return; }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      sendError(res, 'Coupon usage limit reached', 400);
      return;
    }
    if (cartTotal < coupon.minOrderValue) {
      sendError(res, `Minimum order value is ₹${coupon.minOrderValue}`, 400);
      return;
    }
    if (coupon.restrictedUsers.some((u) => u.toString() === req.user!._id.toString())) {
      sendError(res, 'Coupon not applicable for your account', 400);
      return;
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage' || coupon.type === 'festival' || coupon.type === 'first_order') {
      discountAmount = (cartTotal * coupon.value) / 100;
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    } else if (coupon.type === 'flat') {
      discountAmount = coupon.value;
    } else if (coupon.type === 'free_shipping') {
      discountAmount = 0;
    }

    sendSuccess(res, 'Coupon applied', {
      code: coupon.code,
      type: coupon.type,
      discountAmount,
      freeShipping: coupon.type === 'free_shipping',
    });
  } catch (err) {
    next(err);
  }
};

export const getCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const [coupons, total] = await Promise.all([
      Coupon.find().sort('-createdAt').skip(skip).limit(l).lean(),
      Coupon.countDocuments(),
    ]);

    sendSuccess(res, 'Coupons fetched', coupons, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const createCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coupon = await Coupon.create({ ...req.body, code: req.body.code?.toUpperCase() });
    sendSuccess(res, 'Coupon created', coupon, 201);
  } catch (err) {
    next(err);
  }
};

export const updateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) { sendError(res, 'Coupon not found', 404); return; }
    sendSuccess(res, 'Coupon updated', coupon);
  } catch (err) {
    next(err);
  }
};

export const deleteCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Coupon deleted');
  } catch (err) {
    next(err);
  }
};
