import axios from 'axios';
import logger from '../utils/logger';

const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external';
let authToken: string | null = null;
let tokenExpiry: Date | null = null;

const getAuthToken = async (): Promise<string> => {
  if (authToken && tokenExpiry && tokenExpiry > new Date()) return authToken;

  const response = await axios.post(`${SHIPROCKET_BASE}/auth/login`, {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });

  authToken = response.data.token;
  tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
  return authToken as string;
};

const shiprocketApi = async (method: 'get' | 'post', endpoint: string, data?: unknown) => {
  const token = await getAuthToken();
  const response = await axios({
    method,
    url: `${SHIPROCKET_BASE}${endpoint}`,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  return response.data;
};

export const createShiprocketOrder = async (orderData: {
  orderId: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: { name: string; sku: string; units: number; sellingPrice: number }[];
  paymentMethod: string;
  subtotal: number;
  shippingCharge: number;
}) => {
  try {
    return await shiprocketApi('post', '/orders/create/adhoc', {
      order_id: orderData.orderId,
      order_date: orderData.orderDate,
      pickup_location: 'Primary',
      billing_customer_name: orderData.customerName,
      billing_last_name: '',
      billing_address: orderData.address,
      billing_city: orderData.city,
      billing_pincode: orderData.pincode,
      billing_state: orderData.state,
      billing_country: 'India',
      billing_email: orderData.customerEmail,
      billing_phone: orderData.customerPhone,
      shipping_is_billing: true,
      order_items: orderData.items.map((i) => ({
        name: i.name,
        sku: i.sku,
        units: i.units,
        selling_price: i.sellingPrice,
      })),
      payment_method: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: orderData.subtotal,
      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5,
    });
  } catch (err) {
    logger.error('Shiprocket order creation failed:', err);
    throw err;
  }
};

export const generateAWB = async (shipmentId: number, courierId: number) =>
  shiprocketApi('post', '/courier/assign/awb', { shipment_id: shipmentId, courier_id: courierId });

export const trackShipment = async (awbCode: string) =>
  shiprocketApi('get', `/courier/track/awb/${awbCode}`);

export const generateLabel = async (shipmentId: number) =>
  shiprocketApi('post', '/courier/generate/label', { shipment_id: [shipmentId] });

export const cancelShiprocketOrder = async (ids: number[]) =>
  shiprocketApi('post', '/orders/cancel', { ids });
