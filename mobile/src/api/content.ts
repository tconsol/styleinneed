import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';

export interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  publishedAt?: string;
}

export interface Review {
  _id: string;
  user: { name: string };
  rating: number;
  title?: string;
  body: string;
  isVerifiedPurchase?: boolean;
  createdAt: string;
}

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  type: string;
  ctaText?: string;
  ctaLink?: string;
}

export interface Ticket {
  _id: string;
  subject: string;
  category: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  description?: string;
  messages?: { content: string; isInternal?: boolean; createdAt: string }[];
  createdAt: string;
}

/* ── Blog ── */
export const useBlogs = () =>
  useQuery({ queryKey: ['blogs'], queryFn: () => api.get('/blogs').then((r) => (r.data.data ?? []) as Blog[]) });

export const useBlog = (slug: string) =>
  useQuery({ queryKey: ['blog', slug], enabled: !!slug, queryFn: () => api.get(`/blogs/${slug}`).then((r) => r.data.data as Blog) });

/* ── Reviews ── */
export const useProductReviews = (productId: string) =>
  useQuery({
    queryKey: ['reviews', productId],
    enabled: !!productId,
    queryFn: () => api.get(`/reviews/product/${productId}`).then((r) => (r.data.data ?? []) as Review[]),
  });

export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { productId: string; orderId: string; rating: number; title?: string; body: string }) =>
      api.post('/reviews', p),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: ['reviews', p.productId] }),
  });
};

/* ── Announcements (notifications feed) ── */
export const useAnnouncements = () =>
  useQuery({ queryKey: ['announcements'], queryFn: () => api.get('/announcements/active').then((r) => (r.data.data ?? []) as Announcement[]) });

/* ── Support ── */
export const useTickets = () => {
  const isAuth = useAuth((s) => s.isAuthenticated);
  return useQuery({ queryKey: ['tickets'], enabled: isAuth, queryFn: () => api.get('/support/my').then((r) => (r.data.data ?? []) as Ticket[]) });
};

export const useTicket = (id: string) =>
  useQuery({ queryKey: ['ticket', id], enabled: !!id, queryFn: () => api.get(`/support/my/${id}`).then((r) => r.data.data as Ticket) });

export const useCreateTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { subject: string; category: string; description: string }) => api.post('/support', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
};

export const useAddTicketMessage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; content: string }) => api.post(`/support/${p.id}/message`, { content: p.content }),
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: ['ticket', p.id] }),
  });
};
