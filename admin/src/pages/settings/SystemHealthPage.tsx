import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar, PieChart, Pie,
} from 'recharts';
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, MinusCircle, RefreshCw,
  Server, Database, Cpu, Clock, KeyRound, Loader2, Gauge, HardDrive,
  Zap, Play, Pause, ShieldCheck,
} from 'lucide-react';
import { dashboardApi } from '../../api';
import { useChartColors } from '../../hooks/useChartColors';

type CheckStatus = 'ok' | 'warn' | 'fail' | 'off';

interface Check {
  key: string; label: string; group: string;
  status: CheckStatus; detail: string; ms?: number; fix?: string;
}

interface Health {
  overall: CheckStatus;
  counts: Record<CheckStatus, number>;
  checks: Check[];
  runtime: {
    node: string; platform: string; uptimeSeconds: number;
    memoryMb: { heapUsed: number; heapTotal: number; rss: number };
    cpuCores: number; loadAverage: number[]; serverTime: string;
    eventLoopLagMs: number; totalMemoryMb: number; freeMemoryMb: number;
  };
  database: {
    collections: number; dataSizeMb: number | null; storageSizeMb: number | null;
    indexSizeMb: number | null; indexes: number | null; objects: number | null;
    topCollections: { name: string; count: number }[];
  } | null;
  activity: { hour: string; orders: number; signups: number }[];
  data: {
    products: number; activeProducts: number; outOfStock: number;
    orders: number; customers: number; staff: number;
  };
  env: { name: string; set: boolean }[];
}

const STATUS: Record<CheckStatus, { label: string; token: string; icon: typeof CheckCircle2 }> = {
  ok: { label: 'Operational', token: '--c-success', icon: CheckCircle2 },
  warn: { label: 'Degraded', token: '--c-warning', icon: AlertTriangle },
  fail: { label: 'Failing', token: '--c-danger', icon: XCircle },
  off: { label: 'Not configured', token: '--c-muted', icon: MinusCircle },
};

const uptimeText = (s: number): string => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
};

/**
 * Recent latency for one service, as a filled sparkline.
 *
 * Scaled between the run's own min and max rather than from zero — the point is
 * to show a dependency drifting, and a 30ms wobble is invisible on an axis that
 * starts at zero.
 */
function Spark({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;

  const w = 64;
  const h = 18;
  const pad = 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const xy = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = pad + (1 - (p - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} ${w},${h} 0,${h}`;
  const [lastX, lastY] = xy[xy.length - 1];
  const id = `sp-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg width={w} height={h} className="flex-shrink-0" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

export default function SystemHealthPage() {
  const chart = useChartColors();
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [auto, setAuto] = useState(false);
  // Latency per check across refreshes, so the sparklines have something to draw.
  const history = useRef<Record<string, number[]>>({});

  const load = useCallback(() => {
    setLoading(true);
    dashboardApi.getSystemHealth()
      .then(({ data }) => {
        const h: Health = data.data;
        h.checks.forEach((c) => {
          if (c.ms == null) return;
          const prev = history.current[c.key] || [];
          history.current[c.key] = [...prev, c.ms].slice(-20);
        });
        setHealth(h);
        setCheckedAt(new Date());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [auto, load]);

  if (loading && !health) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-3">
        <Loader2 size={28} className="animate-spin" style={{ color: chart.primary }} />
        <p className="text-[12px] text-brand-muted">Probing every integration…</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="card text-center py-16">
        <XCircle size={30} className="mx-auto mb-2" style={{ color: chart.danger }} />
        <p className="text-[12px] text-brand-muted">Could not load system health.</p>
        <button onClick={load} className="btn-primary mt-4"><RefreshCw size={14} /> Retry</button>
      </div>
    );
  }

  const col = (s: CheckStatus) => `var(${STATUS[s].token})`;
  const overall = STATUS[health.overall];
  const OverallIcon = overall.icon;

  const probed = health.checks.filter((c) => c.ms != null);
  const healthScore = Math.round(
    (health.counts.ok / Math.max(health.checks.length - health.counts.off, 1)) * 100
  );

  const heapPct = Math.round((health.runtime.memoryMb.heapUsed / health.runtime.memoryMb.heapTotal) * 100);
  const configuredCount = health.env.filter((e) => e.set).length;
  const configPct = Math.round((configuredCount / health.env.length) * 100);

  const db = health.database;
  const storageParts = db ? [
    { name: 'Data', value: db.dataSizeMb || 0 },
    { name: 'Indexes', value: db.indexSizeMb || 0 },
  ] : [];

  const groups = [...new Set(health.checks.map((c) => c.group))];

  const gauge = (value: number, color: string, label: string, sub: string) => (
    <div className="card p-4 flex items-center gap-3">
      <div style={{ width: 74, height: 74 }} className="flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="68%" outerRadius="100%" data={[{ value }]}
            startAngle={90} endAngle={-270}>
            <YAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar dataKey="value" cornerRadius={20} fill={color} background={{ fill: 'var(--c-input)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="min-w-0">
        <p className="text-[20px] font-black leading-none" style={{ color }}>{value}%</p>
        <p className="text-[11px] font-bold text-brand-text mt-1">{label}</p>
        <p className="text-[10px] text-brand-muted">{sub}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text flex items-center gap-2">
            <Activity size={16} style={{ color: chart.primary }} /> System Health
          </h1>
          <p className="text-[10px] text-brand-muted mt-0.5">
            Every integration probed live — not merely checked for a non-empty setting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAuto((a) => !a)} className="btn-outline"
            style={auto ? { borderColor: chart.success, color: chart.success } : undefined}>
            {auto ? <Pause size={13} /> : <Play size={13} />} {auto ? 'Auto 30s' : 'Auto refresh'}
          </button>
          <button onClick={load} disabled={loading} className="btn-primary">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Run checks
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${col(health.overall)}`, background: 'var(--c-surface)' }}>
        <div className="p-5 flex items-center gap-5 flex-wrap"
          style={{ background: `color-mix(in srgb, ${col(health.overall)} 8%, transparent)` }}>
          <div style={{ width: 96, height: 96 }} className="flex-shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%"
                data={[{ value: healthScore }]} startAngle={90} endAngle={-270}>
                <YAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                <RadialBar dataKey="value" cornerRadius={20} fill={col(health.overall)}
                  background={{ fill: 'var(--c-input)' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <OverallIcon size={20} style={{ color: col(health.overall) }} />
            </div>
          </div>

          <div className="flex-1 min-w-[220px]">
            <p className="text-[19px] font-black leading-tight" style={{ color: col(health.overall) }}>
              {health.overall === 'ok' ? 'All systems operational'
                : health.overall === 'warn' ? 'Running with warnings'
                  : 'Something is failing'}
            </p>
            <p className="text-[11px] text-brand-muted mt-1">
              {healthScore}% of configured services healthy
              {checkedAt && ` · last checked ${checkedAt.toLocaleTimeString()}`}
            </p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {(['ok', 'warn', 'fail', 'off'] as CheckStatus[]).map((s) => (
                <span key={s} className="px-2 py-1 rounded-lg text-[10px] font-bold"
                  style={{
                    background: `color-mix(in srgb, ${col(s)} 14%, transparent)`,
                    color: col(s),
                  }}>
                  {health.counts[s]} {STATUS[s].label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Failing items surfaced up front — no scrolling to find the problem */}
          {health.checks.filter((c) => c.status === 'fail' || c.status === 'warn').length > 0 && (
            <div className="min-w-[220px] max-w-[320px] rounded-xl p-3"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-1.5">
                Needs attention
              </p>
              {health.checks.filter((c) => c.status === 'fail' || c.status === 'warn').slice(0, 4).map((c) => (
                <p key={c.key} className="text-[11px] flex items-start gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: col(c.status) }} />
                  <span className="text-brand-text"><b>{c.label}</b> — {c.detail}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gauges */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {gauge(healthScore, col(health.overall), 'Service health', `${health.counts.ok} of ${health.checks.length} checks`)}
        {gauge(heapPct, heapPct > 85 ? chart.danger : heapPct > 70 ? chart.warning : chart.info,
          'Heap in use', `${health.runtime.memoryMb.heapUsed} / ${health.runtime.memoryMb.heapTotal} MB`)}
        {gauge(configPct, configPct === 100 ? chart.success : chart.warning,
          'Configuration', `${configuredCount} of ${health.env.length} values set`)}
        <div className="card p-4 flex items-center gap-3">
          <div className="w-[74px] h-[74px] rounded-full flex flex-col items-center justify-center flex-shrink-0"
            style={{
              border: `4px solid ${health.runtime.eventLoopLagMs > 50 ? chart.danger : chart.success}`,
            }}>
            <Zap size={16} style={{ color: health.runtime.eventLoopLagMs > 50 ? chart.danger : chart.success }} />
          </div>
          <div className="min-w-0">
            <p className="text-[20px] font-black leading-none"
              style={{ color: health.runtime.eventLoopLagMs > 50 ? chart.danger : chart.success }}>
              {health.runtime.eventLoopLagMs}<span className="text-[12px]">ms</span>
            </p>
            <p className="text-[11px] font-bold text-brand-text mt-1">Event loop lag</p>
            <p className="text-[10px] text-brand-muted">Blocked time — under 50ms is healthy</p>
          </div>
        </div>
      </div>

      {/* Latency + activity */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-heading text-base font-semibold mb-1">Dependency Latency</h2>
          <p className="text-[11px] text-brand-muted mb-4">Round-trip time of each live probe</p>
          {probed.length === 0 ? (
            <p className="text-center py-10 text-sm text-brand-muted">Nothing probed</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, probed.length * 34)}>
              <BarChart data={probed.map((c) => ({ name: c.label, ms: c.ms, status: c.status }))}
                layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis type="number" unit="ms" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`${v} ms`, 'Latency']}
                  contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
                <Bar dataKey="ms" radius={[0, 4, 4, 0]}>
                  {probed.map((c) => <Cell key={c.key} fill={col(c.status)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="font-heading text-base font-semibold mb-1">Activity — Last 24 Hours</h2>
          <p className="text-[11px] text-brand-muted mb-4">Orders and sign-ups, so a quiet system is obvious</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={health.activity}>
              <defs>
                <linearGradient id="actOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chart.primary} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={chart.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="actSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chart.info} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chart.info} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={3} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
              <Area type="monotone" dataKey="orders" stroke={chart.primary} strokeWidth={2} fill="url(#actOrders)" />
              <Area type="monotone" dataKey="signups" stroke={chart.info} strokeWidth={2} fill="url(#actSignups)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Checks — one dense grid rather than a stack of half-empty rows */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--c-border)' }}>
          <div>
            <h2 className="font-heading text-base font-semibold">Service Checks</h2>
            <p className="text-[11px] text-brand-muted mt-0.5">
              {health.checks.length} dependencies probed · {health.counts.ok} healthy
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {(['ok', 'warn', 'fail', 'off'] as CheckStatus[]).filter((s) => health.counts[s] > 0).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[10px] font-semibold"
                style={{ color: col(s) }}>
                <span className="w-2 h-2 rounded-full" style={{ background: col(s) }} />
                {health.counts[s]}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-5">
          {groups.map((group) => {
            const items = health.checks.filter((c) => c.group === group);
            const worst: CheckStatus = items.some((i) => i.status === 'fail') ? 'fail'
              : items.some((i) => i.status === 'warn') ? 'warn' : 'ok';
            return (
              <div key={group}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: col(worst) }} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted whitespace-nowrap">
                    {group}
                  </p>
                  <span className="h-px flex-1" style={{ background: 'var(--c-border)' }} />
                  <span className="text-[9px] text-brand-muted">{items.length}</span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((c) => {
                    const Icon = STATUS[c.status].icon;
                    const pts = history.current[c.key] || [];
                    const tint = `color-mix(in srgb, ${col(c.status)} 8%, transparent)`;
                    return (
                      <div key={c.key} className="rounded-xl p-3 flex flex-col transition-all"
                        style={{
                          border: `1px solid color-mix(in srgb, ${col(c.status)} 28%, var(--c-border))`,
                          background: c.status === 'off' ? 'var(--c-surface)' : tint,
                        }}>
                        {/* Title row: icon, name, status pill */}
                        <div className="flex items-start gap-2.5">
                          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `color-mix(in srgb, ${col(c.status)} 16%, var(--c-surface))` }}>
                            <Icon size={14} style={{ color: col(c.status) }} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-brand-text leading-tight truncate">{c.label}</p>
                            <p className="text-[11px] leading-snug mt-0.5" style={{ color: col(c.status) }}>
                              {c.detail}
                            </p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide flex-shrink-0"
                            style={{ background: `color-mix(in srgb, ${col(c.status)} 18%, var(--c-surface))`, color: col(c.status) }}>
                            {c.status === 'off' ? 'off' : c.status}
                          </span>
                        </div>

                        {c.fix && (
                          <p className="text-[10px] text-brand-muted leading-relaxed mt-2 pl-[38px]">{c.fix}</p>
                        )}

                        {/* Latency pinned to the bottom so cards in a row align */}
                        {c.ms !== undefined && (
                          <div className="flex items-center justify-between gap-2 mt-auto pt-2.5">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: 'var(--c-input)', color: 'var(--c-muted)' }}>
                              {c.ms} ms
                            </span>
                            {pts.length > 1
                              ? <Spark points={pts} color={col(c.status)} />
                              : <span className="text-[9px] text-brand-muted">
                                  {auto ? 'building trend…' : 'enable auto-refresh for a trend'}
                                </span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Database + runtime */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-heading text-base font-semibold mb-1 flex items-center gap-1.5">
            <Database size={14} style={{ color: chart.primary }} /> Database
          </h2>
          {!db ? (
            <p className="text-center py-10 text-sm text-brand-muted">Unavailable</p>
          ) : (
            <>
              <p className="text-[11px] text-brand-muted mb-3">
                {db.objects?.toLocaleString()} documents across {db.collections} collections ·{' '}
                {db.indexes} indexes
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div style={{ width: 130, height: 130 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={storageParts} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3}>
                        {storageParts.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? chart.primary : chart.info} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} MB`, '']} contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: 'Data', value: db.dataSizeMb, color: chart.primary },
                    { label: 'Indexes', value: db.indexSizeMb, color: chart.info },
                    { label: 'Allocated', value: db.storageSizeMb, color: 'var(--c-muted)' },
                  ].map((r) => (
                    <p key={r.label} className="flex items-center gap-2 text-[11px]">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                      <span className="text-brand-muted w-16">{r.label}</span>
                      <b className="text-brand-text">{r.value ?? '—'} MB</b>
                    </p>
                  ))}
                </div>
              </div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mt-4 mb-1.5">
                Largest collections
              </p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={db.topCollections} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} docs`, '']}
                    contentStyle={{ fontFamily: 'Inter', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                    {db.topCollections.map((_, i) => (
                      <Cell key={i} fill={chart.series[i % chart.series.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Node', value: health.runtime.node, icon: Server },
              { label: 'Uptime', value: uptimeText(health.runtime.uptimeSeconds), icon: Clock },
              { label: 'CPU cores', value: String(health.runtime.cpuCores), icon: Cpu },
              { label: 'RSS', value: `${health.runtime.memoryMb.rss} MB`, icon: HardDrive },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="card p-4">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                    <Icon size={12} style={{ color: chart.primary }} /> {r.label}
                  </span>
                  <p className="text-[15px] font-black text-brand-text mt-1.5 leading-none">{r.value}</p>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h2 className="font-heading text-base font-semibold mb-1 flex items-center gap-1.5">
              <Gauge size={14} style={{ color: chart.primary }} /> Host Memory
            </h2>
            <p className="text-[11px] text-brand-muted mb-3">
              {health.runtime.freeMemoryMb.toLocaleString()} MB free of{' '}
              {health.runtime.totalMemoryMb.toLocaleString()} MB
            </p>
            <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--c-input)' }}>
              <div style={{
                width: `${((health.runtime.totalMemoryMb - health.runtime.freeMemoryMb) / health.runtime.totalMemoryMb) * 100}%`,
                background: chart.primary,
              }} />
            </div>
            <p className="text-[10px] text-brand-muted mt-2">{health.runtime.platform}</p>
            <p className="text-[10px] text-brand-muted">
              Load average {health.runtime.loadAverage.join(' · ')} · server time{' '}
              {new Date(health.runtime.serverTime).toLocaleTimeString()}
            </p>
          </div>

          <div className="card">
            <h2 className="font-heading text-base font-semibold mb-3 flex items-center gap-1.5">
              <ShieldCheck size={14} style={{ color: chart.primary }} /> Catalogue
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Products', value: `${health.data.activeProducts}/${health.data.products}` },
                { label: 'Orders', value: String(health.data.orders) },
                { label: 'Customers', value: String(health.data.customers) },
              ].map((d) => (
                <div key={d.label} className="rounded-xl py-2.5" style={{ background: 'var(--c-input)' }}>
                  <p className="text-[16px] font-black text-brand-text leading-none">{d.value}</p>
                  <p className="text-[9px] uppercase tracking-wider text-brand-muted mt-1">{d.label}</p>
                </div>
              ))}
            </div>
            {health.data.outOfStock > 0 && (
              <p className="text-[10px] mt-2.5" style={{ color: chart.warning }}>
                {health.data.outOfStock} product(s) have a variant at zero stock.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Config */}
      <div className="card">
        <h2 className="font-heading text-base font-semibold mb-1 flex items-center gap-1.5">
          <KeyRound size={14} style={{ color: chart.primary }} /> Configuration
        </h2>
        <p className="text-[11px] text-brand-muted mb-3">
          {configuredCount} of {health.env.length} values set. Only presence is shown — never the value
          itself, so this page is safe to open in front of anyone who can already reach it.
        </p>
        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {health.env.map((e) => (
            <div key={e.name} className="flex items-center gap-2 min-w-0 rounded px-1.5 py-0.5"
              style={{ background: e.set ? 'transparent' : 'color-mix(in srgb, var(--c-warning) 8%, transparent)' }}>
              {e.set
                ? <CheckCircle2 size={11} style={{ color: chart.success }} className="flex-shrink-0" />
                : <MinusCircle size={11} style={{ color: chart.warning }} className="flex-shrink-0" />}
              <span className="font-mono text-[10px] truncate"
                style={{ color: e.set ? 'var(--c-text)' : 'var(--c-muted)' }}>
                {e.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
