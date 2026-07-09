import { useEffect, useState, useCallback } from 'react';
import { Mail } from 'lucide-react';
import { newsletterApi } from '../../api';
import { formatDate } from '../../utils/format';

interface Subscriber { _id: string; email: string; source?: string; subscribedAt?: string; createdAt: string; isSubscribed: boolean; }

export default function NewsletterPage() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    newsletterApi.getSubscribers({ page, limit: 20 }).then(({ data }) => {
      setSubs(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Newsletter</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">Manage email subscribers</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #4F46E5, #6366F1)' }}>
          <Mail size={16} className="text-white" />
          <div>
            <p className="text-[18px] font-black text-white leading-none">{pagination.total}</p>
            <p className="text-[9px] text-white/70 mt-0.5">Active Subscribers</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-left pl-5" style={{ width: '44px' }}>#</th>
              <th className="th text-left">Email</th>
              <th className="th text-center" style={{ width: '120px' }}>Source</th>
              <th className="th text-center" style={{ width: '100px' }}>Status</th>
              <th className="th text-left" style={{ width: '120px' }}>Subscribed On</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td className="pl-5 py-3"><div className="h-3 w-4 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-3 w-48 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-3 w-16 bg-slate-100 rounded animate-pulse mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-3 w-24 bg-slate-100 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : subs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16"><Mail size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No subscribers yet</p></td></tr>
            ) : subs.map((s, idx) => (
              <tr key={s._id} className="group transition-colors" style={{ borderBottom: '1px solid var(--c-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                <td className="pl-5 py-3 text-[10px] font-bold text-brand-muted/60">{(page - 1) * 20 + idx + 1}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
                      <Mail size={12} style={{ color: '#4F46E5' }} />
                    </div>
                    <span className="text-[11px] font-medium text-brand-text">{s.email}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold capitalize" style={{ background: '#EEF2FF', color: '#4F46E5' }}>{s.source || 'website'}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold ${s.isSubscribed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.isSubscribed ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {s.isSubscribed ? 'Subscribed' : 'Unsubscribed'}
                  </span>
                </td>
                <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDate(s.subscribedAt || s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-brand-border/40" style={{ background: 'var(--c-th-bg)' }}>
            <p className="text-[10px] text-brand-muted">Page {page} of {pagination.pages} · {pagination.total} subscribers</p>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                const p = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)} className="w-7 h-7 text-[10px] font-semibold rounded-lg transition-all"
                    style={p === page ? { background: '#4F46E5', color: 'white' } : { background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
