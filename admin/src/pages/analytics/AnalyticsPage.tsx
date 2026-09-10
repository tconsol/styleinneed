import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, FunnelChart, Funnel, LabelList, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import { Repeat, Wallet, Receipt, TrendingDown, Percent, Truck, Clock, MapPin, Tag } from 'lucide-react';
import { useChartColors } from '../../hooks/useChartColors';
import { dashboardApi } from '../../api';
import { formatPrice } from '../../utils/format';
import { PageSpinner } from '../../components/common/Spinner';

interface CustomerAnalytics {
  repeat: {
    buyers: number; repeatBuyers: number; rate: number;
    buckets: { one: number; two: number; threeToFive: number; sixPlus: number };
  };
  lifetime: { averageValue: number; averageOrders: number; averageOrderValue: number; totalRevenue: number };
  topCustomers: { name: string; email: string; orders: number; spent: number }[];
  funnel: { stage: string; count: number }[];
}



interface Insights {
  days: number;
  statusMix: { status: string; count: number; value: number }[];
  paymentMix: { method: string; count: number; revenue: number }[];
  byCategory: { name: string; revenue: number; units: number }[];
  byHour: { hour: string; orders: number; revenue: number }[];
  byWeekday: { day: string; orders: number; revenue: number }[];
  aovTrend: { label: string; aov: number; orders: number }[];
  economics: {
    orders: number; revenue: number; discount: number; shipping: number;
    withCoupon: number; couponRate: number; discountRate: number;
  };
  fulfilment: { avgHours: number | null; delivered: number };
  topStates: { state: string; orders: number; revenue: number }[];
}

export default function AnalyticsPage() {
  // Charts follow the active theme instead of a hardcoded palette.
  const chart = useChartColors();
  const [monthly, setMonthly] = useState<{ _id: { year: number; month: number }; revenue: number; orders: number }[]>([]);
  const [daily, setDaily] = useState<{ _id: { year: number; month: number; day: number }; revenue: number; orders: number }[]>([]);
  const [cust, setCust] = useState<CustomerAnalytics | null>(null);
  const [ins, setIns] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardApi.getRevenue('monthly'),
      dashboardApi.getRevenue('daily'),
      dashboardApi.getCustomerAnalytics(),
      dashboardApi.getInsights(30),
    ]).then(([m, d, cu, i]) => {
      setMonthly(m.data.data || []);
      setDaily(d.data.data || []);
      setCust(cu.data.data || null);
      setIns(i.data.data || null);
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
                  <stop offset="5%" stopColor={chart.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chart.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="rev" orientation="left" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, name) => name === 'revenue' ? formatPrice(Number(v)) : v} contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
              <Legend />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke={chart.primary} strokeWidth={2} fill="url(#revGrad)" />
              <Bar yAxisId="ord" dataKey="orders" fill={chart.secondary} radius={[2, 2, 0, 0]} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h2 className="font-heading text-base font-semibold mb-4">Daily Revenue (Last 30 Days)</h2>
        {dailyData.length === 0 ? <p className="text-center py-10 text-sm text-brand-muted">No data yet</p> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatPrice(Number(v))} contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
              <Bar dataKey="revenue" fill={chart.primary} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {cust && (
        <>
          {/* Customer value */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Repeat rate', value: `${cust.repeat.rate}%`, icon: Repeat,
                hint: `${cust.repeat.repeatBuyers} of ${cust.repeat.buyers} buyers ordered again` },
              { label: 'Avg lifetime value', value: formatPrice(cust.lifetime.averageValue), icon: Wallet,
                hint: 'Revenue to date ÷ buyers' },
              { label: 'Avg order value', value: formatPrice(cust.lifetime.averageOrderValue), icon: Receipt,
                hint: `${cust.lifetime.averageOrders} orders per buyer` },
              { label: 'Settled revenue', value: formatPrice(cust.lifetime.totalRevenue), icon: Wallet,
                hint: 'Paid, plus COD not cancelled' },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="card p-4">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                    <Icon size={12} style={{ color: 'var(--c-primary)' }} /> {c.label}
                  </span>
                  <p className="text-[20px] font-black text-brand-text mt-1.5 leading-none">{c.value}</p>
                  <p className="text-[10px] text-brand-muted mt-1">{c.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Funnel */}
            <div className="card">
              <h2 className="font-heading text-base font-semibold mb-1">Conversion Funnel</h2>
              <p className="text-[11px] text-brand-muted mb-4">
                Where people drop off between signing up and paying
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <FunnelChart>
                  <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
                  <Funnel dataKey="count" data={cust.funnel} isAnimationActive>
                    {cust.funnel.map((_, i) => <Cell key={i} fill={chart.series[i % chart.series.length]} />)}
                    <LabelList position="right" dataKey="stage" fill={chart.text} stroke="none" fontSize={11} />
                    <LabelList position="left" dataKey="count" fill={chart.muted} stroke="none" fontSize={11} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              {(() => {
                const first = cust.funnel[0]?.count || 0;
                const last = cust.funnel[cust.funnel.length - 1]?.count || 0;
                const rate = first ? Math.round((last / first) * 1000) / 10 : 0;
                return (
                  <p className="flex items-center gap-1.5 text-[11px] text-brand-muted mt-2">
                    <TrendingDown size={12} />
                    {rate}% of registered customers reach a paid order.
                  </p>
                );
              })()}
            </div>

            {/* Order frequency */}
            <div className="card">
              <h2 className="font-heading text-base font-semibold mb-1">Orders per Customer</h2>
              <p className="text-[11px] text-brand-muted mb-4">
                Whether repeat business is broad or concentrated
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  { label: '1 order', customers: cust.repeat.buckets.one },
                  { label: '2 orders', customers: cust.repeat.buckets.two },
                  { label: '3-5', customers: cust.repeat.buckets.threeToFive },
                  { label: '6+', customers: cust.repeat.buckets.sixPlus },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
                  <Bar dataKey="customers" fill={chart.primary} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top customers */}
          <div className="card p-0 overflow-hidden">
            <h2 className="font-heading text-base font-semibold p-5 pb-3">Highest-Value Customers</h2>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--c-th-bg)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)' }}>
                  <th className="th text-left pl-5">Customer</th>
                  <th className="th text-center" style={{ width: '90px' }}>Orders</th>
                  <th className="th text-right pr-5" style={{ width: '130px' }}>Lifetime spend</th>
                </tr>
              </thead>
              <tbody>
                {cust.topCustomers.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-10 text-[11px] text-brand-muted">No settled orders yet</td></tr>
                ) : cust.topCustomers.map((c, i) => (
                  <tr key={`${c.email}-${i}`} style={{ borderBottom: '1px solid var(--c-border)' }}>
                    <td className="pl-5 py-2.5">
                      <p className="text-[11px] font-semibold text-brand-text">{c.name}</p>
                      <p className="text-[10px] text-brand-muted">{c.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[11px]">{c.orders}</td>
                    <td className="pr-5 py-2.5 text-right text-[11px] font-semibold">{formatPrice(c.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {ins && (
        <>
          {/* Unit economics — what each order actually earns */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Discount given', value: formatPrice(ins.economics.discount), icon: Percent,
                hint: `${ins.economics.discountRate}% of gross, last ${ins.days} days` },
              { label: 'Coupon usage', value: `${ins.economics.couponRate}%`, icon: Tag,
                hint: `${ins.economics.withCoupon} of ${ins.economics.orders} orders` },
              { label: 'Shipping collected', value: formatPrice(ins.economics.shipping), icon: Truck,
                hint: 'Charged to customers' },
              { label: 'Avg delivery time', value: ins.fulfilment.avgHours != null
                  ? `${Math.round((ins.fulfilment.avgHours / 24) * 10) / 10} days` : '—', icon: Clock,
                hint: `${ins.fulfilment.delivered} delivered` },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="card p-4">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                    <Icon size={12} style={{ color: chart.primary }} /> {k.label}
                  </span>
                  <p className="text-[20px] font-black text-brand-text mt-1.5 leading-none">{k.value}</p>
                  <p className="text-[10px] text-brand-muted mt-1">{k.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="font-heading text-base font-semibold mb-1">Revenue by Category</h2>
              <p className="text-[11px] text-brand-muted mb-4">Which parts of the catalogue actually earn</p>
              {ins.byCategory.length === 0 ? (
                <p className="text-center py-10 text-sm text-brand-muted">No settled orders yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ins.byCategory} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatPrice(Number(v))} contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
                    <Bar dataKey="revenue" radius={[0, 3, 3, 0]}>
                      {ins.byCategory.map((_, i) => <Cell key={i} fill={chart.series[i % chart.series.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="font-heading text-base font-semibold mb-1">Payment Methods</h2>
              <p className="text-[11px] text-brand-muted mb-4">How customers choose to pay</p>
              {ins.paymentMix.length === 0 ? (
                <p className="text-center py-10 text-sm text-brand-muted">No settled orders yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={ins.paymentMix} dataKey="revenue" nameKey="method"
                      cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {ins.paymentMix.map((_, i) => <Cell key={i} fill={chart.series[i % chart.series.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [formatPrice(Number(v)), String(n).toUpperCase()]}
                      contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
                    <Legend formatter={(v) => String(v).toUpperCase()} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="font-heading text-base font-semibold mb-1">Average Order Value</h2>
              <p className="text-[11px] text-brand-muted mb-4">
                Whether revenue moved because of basket size or order count
              </p>
              {ins.aovTrend.length === 0 ? (
                <p className="text-center py-10 text-sm text-brand-muted">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={ins.aovTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatPrice(Number(v))} contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
                    <Line type="monotone" dataKey="aov" stroke={chart.primary} strokeWidth={2} dot={{ r: 2, fill: chart.primary }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h2 className="font-heading text-base font-semibold mb-1">When People Order</h2>
              <p className="text-[11px] text-brand-muted mb-4">Best hours to send a campaign</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ins.byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
                  <Bar dataKey="orders" fill={chart.info} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-0 overflow-hidden">
              <h2 className="font-heading text-base font-semibold p-5 pb-1">Order Pipeline</h2>
              <p className="text-[11px] text-brand-muted px-5 pb-3">Where every order currently sits</p>
              <table className="w-full">
                <tbody>
                  {ins.statusMix.map((st, i) => (
                    <tr key={st.status} style={{ borderTop: '1px solid var(--c-border)' }}>
                      <td className="pl-5 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: chart.series[i % chart.series.length] }} />
                          <span className="text-[11px] font-semibold text-brand-text capitalize">{st.status}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-[11px] text-brand-muted">{st.count}</td>
                      <td className="pr-5 py-2.5 text-right text-[11px] font-semibold">{formatPrice(st.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card p-0 overflow-hidden">
              <h2 className="font-heading text-base font-semibold p-5 pb-1 flex items-center gap-1.5">
                <MapPin size={14} style={{ color: chart.primary }} /> Top Regions
              </h2>
              <p className="text-[11px] text-brand-muted px-5 pb-3">Revenue by delivery state</p>
              {ins.topStates.length === 0 ? (
                <p className="text-center py-10 text-sm text-brand-muted">No data yet</p>
              ) : (
                <table className="w-full">
                  <tbody>
                    {ins.topStates.map((st) => (
                      <tr key={st.state} style={{ borderTop: '1px solid var(--c-border)' }}>
                        <td className="pl-5 py-2.5 text-[11px] font-semibold text-brand-text">{st.state}</td>
                        <td className="px-3 py-2.5 text-center text-[11px] text-brand-muted">{st.orders} order(s)</td>
                        <td className="pr-5 py-2.5 text-right text-[11px] font-semibold">{formatPrice(st.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
