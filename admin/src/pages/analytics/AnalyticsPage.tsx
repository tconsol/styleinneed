import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { dashboardApi } from '../../api';
import { formatPrice } from '../../utils/format';
import { PageSpinner } from '../../components/common/Spinner';

export default function AnalyticsPage() {
  const [monthly, setMonthly] = useState<{ _id: { year: number; month: number }; revenue: number; orders: number }[]>([]);
  const [daily, setDaily] = useState<{ _id: { year: number; month: number; day: number }; revenue: number; orders: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getRevenue('monthly'),
      dashboardApi.getRevenue('daily'),
    ]).then(([m, d]) => {
      setMonthly(m.data.data || []);
      setDaily(d.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const monthlyData = monthly.map((d) => ({
    label: `${d._id.year}-${String(d._id.month).padStart(2, '0')}`,
    revenue: d.revenue,
    orders: d.orders,
  }));

  const dailyData = daily.map((d) => ({
    label: `${String(d._id.month).padStart(2, '0')}/${String(d._id.day).padStart(2, '0')}`,
    revenue: d.revenue,
    orders: d.orders,
  }));

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-heading text-base font-semibold mb-4">Monthly Revenue & Orders</h2>
        {monthlyData.length === 0 ? <p className="text-center py-10 text-sm text-brand-muted">No data yet</p> : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8A97E" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C8A97E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD4" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="rev" orientation="left" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => name === 'revenue' ? formatPrice(Number(v)) : v} contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
              <Legend />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#C8A97E" strokeWidth={2} fill="url(#revGrad)" />
              <Bar yAxisId="ord" dataKey="orders" fill="#D8A7B1" radius={[2, 2, 0, 0]} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h2 className="font-heading text-base font-semibold mb-4">Daily Revenue (Last 30 Days)</h2>
        {dailyData.length === 0 ? <p className="text-center py-10 text-sm text-brand-muted">No data yet</p> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD4" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatPrice(Number(v))} contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#C8A97E" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
