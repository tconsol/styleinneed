import { useEffect, useState, useCallback } from 'react';
import { Mail, Trash2, X, Search } from 'lucide-react';
import Select from '../../components/common/Select';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { newsletterApi } from '../../api';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

interface Subscriber { _id: string; email: string; source?: string; subscribedAt?: string; createdAt: string; isSubscribed: boolean; }

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'subscribed', label: 'Subscribed' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
];

export default function NewsletterPage() {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    newsletterApi.getSubscribers({ page, limit: 20, status, search: search || undefined }).then(({ data }) => {
      setSubs(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, status, search]);

  useEffect(() => { load(); setChecked(new Set()); }, [load]);

  const allChecked = subs.length > 0 && subs.every((s) => checked.has(s._id));
  const toggleOne = (id: string) => setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(subs.map((s) => s._id)));

  const handleDelete = async (s: Subscriber) => {
    if (!(await confirm({ title: 'Delete subscriber?', message: `"${s.email}" will be permanently removed from the newsletter list.`, confirmText: 'Delete', danger: true }))) return;
    try {
      await newsletterApi.delete(s._id);
      toast.success('Subscriber deleted');
      setChecked((prev) => { const n = new Set(prev); n.delete(s._id); return n; });
      load();
    } catch {}
  };

  const bulkDelete = async () => {
    const ids = [...checked];
    if (!(await confirm({ title: `Delete ${ids.length} subscriber(s)?`, message: 'They will be permanently removed from the newsletter list. This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    setBulkBusy(true);
    try {
      await Promise.all(ids.map((id) => newsletterApi.delete(id).catch(() => null)));
      toast.success(`${ids.length} subscriber(s) deleted`);
      setChecked(new Set()); load();
    } finally { setBulkBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Newsletter</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">Manage email subscribers</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'linear-gradient(135deg, var(--c-primary), var(--c-info))' }}>
          <Mail size={16} className="text-white" />
          <div>
            <p className="text-[18px] font-black text-white leading-none">{pagination.total}</p>
            <p className="text-[9px] text-white/70 mt-0.5">{STATUS_OPTIONS.find((o) => o.value === status)?.label} Subscribers</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="w-44">
          <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} />
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search email..." className="input-field pl-8 text-[11px]" />
        </div>
      </div>

      {/* Bulk action bar — appears when rows are selected */}
      {checked.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'var(--c-primary-soft)', border: '1px solid var(--c-primary)' }}>
          <span className="text-[12px] font-bold" style={{ color: 'var(--c-primary)' }}>{checked.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={bulkDelete} disabled={bulkBusy} className="!py-1.5 px-3 text-[11px] font-semibold rounded-lg text-white disabled:opacity-70 inline-flex items-center gap-1.5" style={{ background: '#EF4444' }}>
              {bulkBusy
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deleting…</>
                : <><Trash2 size={13} /> Delete</>}
            </button>
            <button onClick={() => setChecked(new Set())} disabled={bulkBusy} title="Clear" className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-50" style={{ color: 'var(--c-muted)' }}><X size={14} /></button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-center pl-5" style={{ width: '36px' }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-primary cursor-pointer" aria-label="Select all" />
              </th>
              <th className="th text-left">Email</th>
              <th className="th text-center" style={{ width: '120px' }}>Source</th>
              <th className="th text-center" style={{ width: '100px' }}>Status</th>
              <th className="th text-left" style={{ width: '120px' }}>Subscribed On</th>
              <th className="th text-center" style={{ width: '70px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  <td className="pl-5 py-3"><div className="h-3 w-4 bg-brand-bg rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-3 w-48 bg-brand-bg rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-3 w-16 bg-brand-bg rounded animate-pulse mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-5 w-16 bg-brand-bg rounded-full animate-pulse mx-auto" /></td>
                  <td className="px-3 py-3"><div className="h-3 w-24 bg-brand-bg rounded animate-pulse" /></td>
                  <td className="px-3 py-3"><div className="h-3 w-6 bg-brand-bg rounded animate-pulse mx-auto" /></td>
                </tr>
              ))
            ) : subs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16"><Mail size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No subscribers found</p></td></tr>
            ) : subs.map((s) => (
              <tr key={s._id} className={`group transition-colors ${bulkBusy && checked.has(s._id) ? 'opacity-40 animate-pulse' : ''}`} style={{ borderBottom: '1px solid var(--c-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                <td className="pl-5 py-3 text-center">
                  <input type="checkbox" checked={checked.has(s._id)} onChange={() => toggleOne(s._id)} className="w-4 h-4 accent-primary cursor-pointer" aria-label="Select" />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--c-primary-soft)' }}>
                      <Mail size={12} style={{ color: 'var(--c-primary)' }} />
                    </div>
                    <span className="text-[11px] font-medium text-brand-text">{s.email}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold capitalize" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary)' }}>{s.source || 'website'}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold ${s.isSubscribed ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-bg text-brand-muted'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.isSubscribed ? 'bg-emerald-500' : 'bg-brand-muted'}`} />
                    {s.isSubscribed ? 'Subscribed' : 'Unsubscribed'}
                  </span>
                </td>
                <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDate(s.subscribedAt || s.createdAt)}</td>
                <td className="px-3 py-3">
                  <div className="flex justify-center">
                    <button onClick={() => handleDelete(s)} title="Delete subscriber"
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-brand-muted hover:bg-red-50 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
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
                    style={p === page ? { background: 'var(--c-primary)', color: 'white' } : { background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
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
