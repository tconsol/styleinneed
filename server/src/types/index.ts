import { Request } from 'express';
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password: string;
  plainPassword?: string;
  providerRef?: Types.ObjectId;
  role: 'customer' | 'admin' | 'provider';
  isEmailVerified: boolean;
  isActive: boolean;
  googleId?: string;
  avatar?: string;
  addresses: IAddress[];
  refreshTokens: string[];
  otp?: string;
  otpExpiry?: Date;
  pendingEmail?: string;
  emailChangeOtp?: string;
  emailChangeOtpExpiry?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  pushToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

export interface IAddress {
  _id?: Types.ObjectId;
  label: string;
  fullName: string;
  phone: string;
  email?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface IProductVariant {
  sku: string;
  stock: number;
  images?: string[];
  // Variant-level attribute values (slug -> single value), e.g. { size: 'M', color: 'Red' }
  attributes?: Record<string, string>;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  productType: string; // ProductType slug (admin-defined)
  category: Types.ObjectId;
  subcategory?: string;
  collections: Types.ObjectId[];
  // Product-level attribute values (slug -> values), e.g. { metal: ['1 Gram Gold'], occasion: ['Wedding'] }
  attributes?: Record<string, string[]>;
  weightGrams?: number; // dedicated numeric field (range-filterable)
  mrp: number;
  salePrice: number;
  usdMrp?: number;
  usdSalePrice?: number;
  discountPercentage: number;
  returnDays: number;
  provider?: Types.ObjectId;
  sizeChartId?: Types.ObjectId;
  variants: IProductVariant[];
  images: string[];
  videos?: string[];
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isActive: boolean;
  metaTitle?: string;
  metaDescription?: string;
  ratings: { average: number; count: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  product: Types.ObjectId;
  variant: IProductVariant;
  quantity: number;
  price: number;
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderId: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IAddress;
  currency: 'INR' | 'USD';
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
  coupon?: Types.ObjectId;
  paymentMethod: 'razorpay' | 'stripe' | 'upi' | 'card' | 'netbanking' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  stripePaymentIntentId?: string;
  status: 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
  statusHistory: { status: string; note?: string; at: Date }[];
  shiprocketOrderId?: string;
  awbCode?: string;
  trackingUrl?: string;
  cancelReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = IUser['role'];

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
