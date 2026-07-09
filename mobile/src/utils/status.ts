import type { OrderStatus } from '../types';

export const ORDER_FLOW: OrderStatus[] = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

export const statusColor = (status: OrderStatus): { bg: string; text: string } => {
  switch (status) {
    case 'delivered': return { bg: '#DCFCE7', text: '#166534' };
    case 'shipped': return { bg: '#EDE9FE', text: '#5B21B6' };
    case 'packed': return { bg: '#E0E7FF', text: '#3730A3' };
    case 'confirmed': return { bg: '#DBEAFE', text: '#1E40AF' };
    case 'cancelled': return { bg: '#FEE2E2', text: '#991B1B' };
    case 'returned': return { bg: '#FFEDD5', text: '#9A3412' };
    default: return { bg: '#FEF9C3', text: '#854D0E' };
  }
};
