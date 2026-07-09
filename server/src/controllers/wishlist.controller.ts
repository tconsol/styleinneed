import { Response, NextFunction } from 'express';
import Wishlist from '../models/Wishlist';
import Product from '../models/Product';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { Types } from 'mongoose';

export const getWishlist = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user!._id }).populate(
      'products',
      'name slug images salePrice mrp discountPercentage ratings variants category isActive'
    );
    sendSuccess(res, 'Wishlist fetched', wishlist?.products || []);
  } catch (err) {
    next(err);
  }
};

export const toggleWishlist = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) { sendError(res, 'Product not found', 404); return; }

    let wishlist = await Wishlist.findOne({ user: req.user!._id });
    if (!wishlist) wishlist = new Wishlist({ user: req.user!._id, products: [] });

    const productObjId = new Types.ObjectId(productId);
    const exists = wishlist.products.some((p) => p.equals(productObjId));

    if (exists) {
      wishlist.products = wishlist.products.filter((p) => !p.equals(productObjId));
      await wishlist.save();
      sendSuccess(res, 'Removed from wishlist', { added: false });
    } else {
      wishlist.products.push(productObjId);
      await wishlist.save();
      sendSuccess(res, 'Added to wishlist', { added: true });
    }
  } catch (err) {
    next(err);
  }
};
