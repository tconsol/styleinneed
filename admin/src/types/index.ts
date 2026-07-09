export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  avatar?: string;
  isActive: boolean;
}

export interface DashboardStats {
  orders: { total: number; thisMonth: number; lastMonth: number };
  revenue: { total: number; thisMonth: number; lastMonth: number; growth: string | null };
  customers: { total: number; newThisMonth: number };
  products: { total: number; lowStock: number };
  pending: { reviews: number; tickets: number; returns: number };
  newsletter: { subscribers: number };
}

export interface Provider {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  category: 'clothing' | 'jewellery' | 'accessories' | 'all' | 'other';
  address?: string;
  city?: string;
  state?: string;
  gstin?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  productType: string; // ProductType slug
  category: { _id: string; name: string };
  collections: { _id: string; name: string }[];
  mrp: number;
  salePrice: number;
  usdMrp?: number;
  usdSalePrice?: number;
  discountPercentage: number;
  provider?: Provider | string;
  sizeChartId?: { _id: string; name: string } | string;
  variants: ProductVariant[];
  images: string[];
  attributes?: Record<string, string[]>; // product-level attribute values
  weightGrams?: number;
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isActive: boolean;
  ratings: { average: number; count: number };
  createdAt: string;
}

export interface ProductVariant {
  _id?: string;
  sku: string;
  stock: number;
  images?: string[];
  attributes?: Record<string, string>; // variant-level attribute values
}

export interface ProductType {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AttributeOption {
  label: string;
  value: string;
  hex?: string;
  sortOrder: number;
}

export interface Attribute {
  _id: string;
  name: string;
  slug: string;
  level: 'product' | 'variant';
  inputType: 'select' | 'multiselect' | 'chips' | 'color';
  options: AttributeOption[];
  productTypes: string[];
  isFilterable: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  productType?: string;
  description?: string;
  image?: string;
  parent?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface Order {
  _id: string;
  orderId: string;
  user: { _id: string; name: string; email: string; phone?: string };
  items: OrderItem[];
  shippingAddress: Address;
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  awbCode?: string;
  trackingUrl?: string;
  createdAt: string;
}

export interface OrderItem {
  product: { _id: string; name: string; images: string[]; provider?: { name: string; contactPerson?: string; phone?: string; email?: string; category?: string } };
  variant: ProductVariant;
  quantity: number;
  price: number;
}

export interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface SizeChartRow {
  size: string;
  values: string[];
}

export interface SizeChart {
  _id: string;
  name: string;
  productTypes: string[];
  columns: string[];
  unit: 'cm' | 'inches';
  rows: SizeChartRow[];
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  type: 'percentage' | 'flat' | 'free_shipping' | 'first_order' | 'festival';
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit?: number;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  description?: string;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: 'top_bar' | 'popup' | 'promotional_banner' | 'flash_sale' | 'festival';
  image?: string;
  ctaText?: string;
  ctaLink?: string;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  views: number;
  clicks: number;
  bgColor?: string;
  textColor?: string;
}

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: { name: string };
  category: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: string;
  views: number;
  createdAt: string;
}

export interface Review {
  _id: string;
  product: { _id: string; name: string };
  user: { _id: string; name: string; email: string };
  rating: number;
  title?: string;
  body: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
}

export interface SupportTicketMessage {
  _id?: string;
  sender: { _id: string; name: string; role: string } | string;
  senderRole: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  ticketId: string;
  user: { _id: string; name: string; email: string; phone?: string };
  subject: string;
  category: string;
  description?: string;
  images?: string[];
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: { name: string };
  messages?: SupportTicketMessage[];
  resolvedAt?: string;
  createdAt: string;
}

export interface ReturnRequest {
  _id: string;
  order: { _id: string; orderId: string; total: number };
  user: { name: string; email: string };
  reason: string;
  status: 'requested' | 'approved' | 'processing' | 'completed' | 'rejected';
  refundAmount?: number;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  user: { name: string; email: string; role: string };
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
