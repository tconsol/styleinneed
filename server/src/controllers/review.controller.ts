import { Request, Response, NextFunction } from 'express';
import Review from '../models/Review';
import Product from '../models/Product';
import Order from '../models/Order';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';

export const getProductReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.params;
    const { page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId, isApproved: true })
        .populate('user', 'name avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(l)
        .lean(),
      Review.countDocuments({ product: productId, isApproved: true }),
    ]);

    sendSuccess(res, 'Reviews fetched', reviews, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId, orderId, rating, title, body, images } = req.body;

    const order = await Order.findOne({
      _id: orderId, user: req.user!._id, status: 'delivered',
      'items.product': productId,
    });

    const existing = await Review.findOne({ product: productId, user: req.user!._id });
    if (existing) { sendError(res, 'Already reviewed this product', 400); return; }

    const review = await Review.create({
      product: productId,
      user: req.user!._id,
      order: orderId,
      rating,
      title,
      body,
      images,
      isVerifiedPurchase: !!order,
      isApproved: false,
    });

    sendSuccess(res, 'Review submitted. Pending approval.', review, 201);
  } catch (err) {
    next(err);
  }
};

export const approveReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!review) { sendError(res, 'Review not found', 404); return; }

    const stats = await Review.aggregate([
      { $match: { product: review.product, isApproved: true } },
      { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    if (stats.length > 0) {
      await Product.findByIdAndUpdate(review.product, {
        'ratings.average': Math.round(stats[0].avg * 10) / 10,
        'ratings.count': stats[0].count,
      });
    }

    sendSuccess(res, 'Review approved', review);
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Review deleted');
  } catch (err) {
    next(err);
  }
};

export const getAllReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, isApproved } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = {};
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('product', 'name slug')
        .populate('user', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(l)
        .lean(),
      Review.countDocuments(filter),
    ]);

    sendSuccess(res, 'Reviews fetched', reviews, 200, { page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (err) {
    next(err);
  }
};
