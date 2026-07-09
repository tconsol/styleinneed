import { Response, NextFunction } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await Cart.findOne({ user: req.user!._id }).populate(
      'items.product',
      'name slug images isActive variants'
    );
    sendSuccess(res, 'Cart fetched', cart || { items: [] });
  } catch (err) {
    next(err);
  }
};

export const addToCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId, variantSku, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) { sendError(res, 'Product not found', 404); return; }

    const variant = product.variants.find((v) => v.sku === variantSku);
    if (!variant) { sendError(res, 'Variant not found', 404); return; }
    if (variant.stock < quantity) { sendError(res, 'Insufficient stock', 400); return; }

    let cart = await Cart.findOne({ user: req.user!._id });
    if (!cart) cart = new Cart({ user: req.user!._id, items: [] });

    const existingIdx = cart.items.findIndex(
      (i) => i.product.toString() === productId && i.variantSku === variantSku
    );

    if (existingIdx > -1) {
      const newQty = cart.items[existingIdx].quantity + quantity;
      if (variant.stock < newQty) { sendError(res, 'Insufficient stock', 400); return; }
      cart.items[existingIdx].quantity = newQty;
    } else {
      cart.items.push({ product: product._id, variantSku, quantity, price: product.salePrice });
    }

    await cart.save();
    const populated = await Cart.findById(cart._id)
      .populate('items.product', 'name slug images isActive salePrice mrp variants');
    sendSuccess(res, 'Item added to cart', populated);
  } catch (err) {
    next(err);
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { variantSku, quantity } = req.body;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user!._id });
    if (!cart) { sendError(res, 'Cart not found', 404); return; }

    const idx = cart.items.findIndex(
      (i) => i.product.toString() === productId && i.variantSku === variantSku
    );
    if (idx === -1) { sendError(res, 'Item not in cart', 404); return; }

    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      const product = await Product.findById(productId);
      const variant = product?.variants.find((v) => v.sku === variantSku);
      if (variant && variant.stock < quantity) { sendError(res, 'Insufficient stock', 400); return; }
      cart.items[idx].quantity = quantity;
    }

    await cart.save();
    const populated = await Cart.findById(cart._id)
      .populate('items.product', 'name slug images isActive salePrice mrp variants');
    sendSuccess(res, 'Cart updated', populated);
  } catch (err) {
    next(err);
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { productId } = req.params;
    const { variantSku } = req.body;

    const cart = await Cart.findOne({ user: req.user!._id });
    if (!cart) { sendError(res, 'Cart not found', 404); return; }

    cart.items = cart.items.filter(
      (i) => !(i.product.toString() === productId && i.variantSku === variantSku)
    );
    await cart.save();
    const populated = await Cart.findById(cart._id)
      .populate('items.product', 'name slug images isActive salePrice mrp variants');
    sendSuccess(res, 'Item removed from cart', populated);
  } catch (err) {
    next(err);
  }
};

export const clearCart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Cart.findOneAndUpdate({ user: req.user!._id }, { items: [], coupon: undefined });
    sendSuccess(res, 'Cart cleared');
  } catch (err) {
    next(err);
  }
};
