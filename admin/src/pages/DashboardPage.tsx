import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, IndianRupee, Users, Package,
  TrendingUp, TrendingDown, AlertTriangle, Star,
  Headphones, RotateCcw, ArrowRight, Circle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { PageSpinner } from '../components/common/Spinner';
import type { DashboardStats, Order } from '../types';
import { dashboardApi, orderApi } from '../api';
import { formatPrice, formatNumber } from '../utils/format';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: 'var(--c-warning-soft)', text: 'var(--c-warning)', dot: 'var(--c-warning)' },
  confirmed: { bg: 'var(--c-info-soft)', text: 'var(--c-info)', dot: 'var(--c-info)' },
  packed:    { bg: 'var(--c-info-soft)', text: 'var(--c-primary-dark)', dot: 'var(--c-info)' },
  shipped:   { bg: 'var(--c-purple-soft)', text: 'var(--c-purple)', dot: 'var(--c-purple)' },
  delivered: { bg: 'var(--c-success-soft)', text: 'var(--c-success)', dot: 'var(--c-success)' },
  cancelled: { bg: 'var(--c-danger-soft)', text: 'var(--c-danger)', dot: 'var(--c-danger)' },
  returned:  { bg: 'var(--c-orange-soft)', text: 'var(--c-orange)', dot: 'var(--c-orange)' },
};

const BAR_PALETTE = ['var(--c-primary)','var(--c-sky)','var(--c-success)','var(--c-warning)','var(--c-danger)','var(--c-purple)'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<{ _id: { year: number; month: number }; revenue: number; orders: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ product: { name: string }; totalSold: number; revenue: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getRevenue('monthly'),
      dashboardApi.getTopProducts(),
      orderApi.getAll({ page: 1, limit: 6 }),
    ]).then(([s, r, tp, o]) => {
      setStats(s.data.data);
      setRevenue(r.data.data || []);
      setTopProducts(tp.data.data || []);
      setRecentOrders(o.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;
  if (!stats) return null;

  const chartData = revenue.slice(-7).map((d) => ({
    month: MONTHS[d._id.month - 1],
    revenue: d.revenue,
    orders: d.orders,
  }));

  const STAT_CARDS = [
    {
      label: 'Total Revenue',
      value: formatPrice(stats.revenue.total),
      sub: `${formatPrice(stats.revenue.thisMonth)} this month`,
      icon: IndianRupee,
      growth: stats.revenue.growth ? parseFloat(stats.revenue.growth) : null,
      gradient: 'linear-gradient(135deg, var(--c-primary) 0%, var(--c-info) 100%)',
      glow: 'rgba(79,70,229,0.15)',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    {
      label: 'Total Orders',
      value: formatNumber(stats.orders.total),
      sub: `${stats.orders.thisMonth} new this month`,
      icon: ShoppingCart,
      growth: null,
      gradient: 'linear-gradient(135deg, var(--c-sky) 0%, var(--c-sky) 100%)',
      glow: 'rgba(14,165,233,0.15)',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    {
      label: 'Customers',
      value: formatNumber(stats.customers.total),
      sub: `+${stats.customers.newThisMonth} new this month`,
      icon: Users,
      growth: null,
      gradient: 'linear-gradient(135deg, var(--c-success) 0%, var(--c-success) 100%)',
      glow: 'rgba(16,185,129,0.15)',
      iconBg: 'rgba(255,255,255,0.2)',
    },
    {
      label: 'Active Products',
      value: formatNumber(stats.products.total),
      sub: `${stats.products.lowStock} low stock`,
      icon: Package,
      growth: null,
      gradient: 'linear-gradient(135deg, var(--c-warning) 0%, var(--c-warning) 100%)',
      glow: 'rgba(245,158,11,0.15)',
      iconBg: 'rgba(255,255,255,0.2)',
    },
  ];

  const QUICK_ACTIONS = [
    { label: 'Pending Reviews', count: stats.pending.reviews, icon: Star, href: '/reviews', color: 'var(--c-warning)', bg: 'var(--c-warning-soft)' },
    { label: 'Open Tickets', count: stats.pending.tickets, icon: Headphones, href: '/support', color: 'var(--c-primary)', bg: 'var(--c-info-soft)' },
    { label: 'Return Requests', count: stats.pending.returns, icon: RotateCcw, href: '/returns', color: 'var(--c-danger)', bg: 'var(--c-danger-soft)' },
    { label: 'Low Stock Items', count: stats.products.lowStock, icon: AlertTriangle, href: '/products', color: 'var(--c-success)', bg: 'var(--c-success-soft)' },
  ];

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-text">{getGreeting()}, {(stats as unknown as { adminName?: string })['adminName'] || 'Admin'} 👋</h1>
          <p className="text-[11px] text-brand-muted mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/analytics" className="btn-outline text-[11px]">View Analytics</Link>
          <Link to="/products/new" className="btn-primary text-[11px]">+ Add Product</Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, sub, icon: Icon, growth, gradient, glow, iconBg }) => (
          <div key={label} className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: gradient, boxShadow: `0 8px 24px ${glow}` }}>
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 bg-white" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: iconBg, backdropFilter: 'blur(8px)' }}>
                <Icon size={16} className="text-white" />
              </div>
              <p className="text-[24px] font-extrabold text-white leading-none mb-1">{value}</p>
              <p className="text-[11px] font-medium text-white/80 mb-2">{label}</p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/60">{sub}</p>
                {growth !== null && (
                  <span className={`flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    growth >= 0 ? 'bg-white/20 text-white' : 'bg-red-500/20 text-white'
                  }`}>
                    {growth >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                    {Math.abs(growth)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(({ label, count, icon: Icon, href, color, bg }) => (
          <Link key={label} to={href}
            className="bg-white rounded-xl p-4 flex items-center gap-3 group transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ border: '1px solid var(--c-border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: bg }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[20px] font-extrabold leading-none" style={{ color: count > 0 ? color : 'var(--c-text)' }}>{count}</p>
              <p className="text-[10px] text-brand-muted mt-0.5 leading-tight">{label}</p>
            </div>
            <ArrowRight size={13} className="flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color }} />
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[13px] font-bold text-brand-text">Revenue Trend</p>
              <p className="text-[10px] text-brand-muted mt-0.5">Last 7 months performance</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-brand-muted">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />Revenue</span>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-[11px] text-brand-muted">No revenue data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--c-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--c-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--c-th-bg)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--c-muted)', fontFamily: 'Poppins' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--c-muted)', fontFamily: 'Poppins' }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(v) => [formatPrice(Number(v)), 'Revenue']}
                  contentStyle={{ fontFamily: 'Poppins', fontSize: 11, borderRadius: 10, border: '1px solid var(--c-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                  cursor={{ stroke: 'var(--c-border)', strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--c-primary)" strokeWidth={2.5}
                  fill="url(#revGrad)" dot={false} activeDot={{ r: 4, fill: 'var(--c-primary)', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products */}
        <div className="card">
          <p className="text-[13px] font-bold text-brand-text mb-1">Top Products</p>
          <p className="text-[10px] text-brand-muted mb-4">By units sold</p>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 gap-2">
              <Package size={28} className="text-brand-border" />
              <p className="text-[10px] text-brand-muted">No sales data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topProducts.slice(0, 5).map((p, i) => ({ name: p.product?.name?.split(' ')[0] || '—', units: p.totalSold, i }))}
                layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--c-muted)', fontFamily: 'Poppins' }} tickLine={false} axisLine={false} width={56} />
                <Tooltip formatter={(v) => [v, 'Units']} contentStyle={{ fontFamily: 'Poppins', fontSize: 10, borderRadius: 8, border: '1px solid var(--c-border)' }} />
                <Bar dataKey="units" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {topProducts.slice(0, 5).map((_, i) => <Cell key={i} fill={BAR_PALETTE[i % BAR_PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card p-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div>
            <p className="text-[13px] font-bold text-brand-text">Recent Orders</p>
            <p className="text-[10px] text-brand-muted mt-0.5">Latest customer orders</p>
          </div>
          <Link to="/orders" className="btn-outline text-[10px] gap-1">
            View All <ArrowRight size={11} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--c-th-bg)', borderBottom: '1px solid var(--c-border)' }}>
                {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date'].map((h) => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-[11px] text-brand-muted">No orders yet</td></tr>
              ) : recentOrders.map((order) => {
                const sc = STATUS_COLORS[order.status] || { bg: 'var(--c-th-bg)', text: 'var(--c-muted)', dot: 'var(--c-muted)' };
                const pc = STATUS_COLORS[order.paymentStatus] || { bg: 'var(--c-th-bg)', text: 'var(--c-muted)', dot: 'var(--c-muted)' };
                return (
                  <tr key={order._id} className="border-b border-brand-border/40 hover:bg-brand-bg/60 transition-colors">
                    <td className="td">
                      <Link to={`/orders/${order._id}`} className="font-semibold hover:text-primary transition-colors" style={{ color: 'var(--c-primary)', fontSize: 11 }}>
                        #{order.orderId?.slice(-8) || order._id.slice(-8)}
                      </Link>
                    </td>
                    <td className="td">
                      <p className="font-medium text-[11px] text-brand-text">{order.user?.name || '—'}</p>
                    </td>
                    <td className="td text-brand-muted">{order.items?.length || 0}</td>
                    <td className="td font-semibold text-brand-text">{formatPrice(order.total)}</td>
                    <td className="td">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold"
                        style={{ background: pc.bg, color: pc.text }}>
                        <Circle size={5} fill={pc.dot} style={{ color: pc.dot }} />
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="td">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold"
                        style={{ background: sc.bg, color: sc.text }}>
                        <Circle size={5} fill={sc.dot} style={{ color: sc.dot }} />
                        {order.status}
                      </span>
                    </td>
                    <td className="td text-brand-muted text-[10px]">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
