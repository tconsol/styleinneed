import { useEffect, useState, useCallback } from 'react';
import { RotateCcw, Edit2, Circle } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { returnApi } from '../../api';
import type { ReturnRequest, Pagination } from '../../types';
import { formatDate, formatPrice } from '../../utils/format';
import toast from 'react-hot-toast';

const STATUSES = ['all', 'requested', 'approved', 'processing', 'completed', 'rejected'];

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  requested:  { bg: '#FEF9C3', text: '#854D0E', dot: '#EAB308' },
  approved:   { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  processing: { bg: '#EDE9FE', text: '#5B21B6', dot: '#8B5CF6' },
  completed:  { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
  rejected:   { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('requested');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReturnRequest | null>(null);
  const [form, setForm] = useState({ status: '', refundAmount: '', adminNote: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    returnApi.getAll({ page, limit: 20, status: activeStatus === 'all' ? undefined : activeStatus }).then(({ data }) => {
      setReturns(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, activeStatus]);

  useEffect(() => { load(); }, [load]);

  const openUpdate = (r: ReturnRequest) => { setSelected(r); setForm({ status: r.status, refundAmount: String(r.refundAmount || ''), adminNote: '' }); };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await returnApi.updateStatus(selected._id, { ...form, refundAmount: form.refundAmount ? Number(form.refundAmount) : undefined });
      toast.success('Return updated');
      setSelected(null); load();
    } catch {} finally { setSaving(false); }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-brand-text">Returns & Refunds</h1>
            <p className="text-[10px] text-brand-muted mt-0.5">{pagination.total} total requests</p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUSES.map((s) => {
            const st = STATUS_STYLE[s] || { bg: '#EEF2FF', text: '#4F46E5', dot: '#4F46E5' };
            const isActive = activeStatus === s;
            return (
              <button key={s} onClick={() => { setActiveStatus(s); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all capitalize"
                style={isActive ? { background: st.bg, color: st.text, boxShadow: `0 0 0 2px ${st.dot}` } : { background: 'var(--c-bg)', color: 'var(--c-muted)' }}>
                <Circle size={6} fill={isActive ? st.dot : '#94A3B8'} style={{ color: isActive ? st.dot : '#94A3B8' }} />
                {s === 'all' ? 'All Returns' : s}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
                <th className="th text-left pl-5">Order</th>
                <th className="th text-left">Customer</th>
                <th className="th text-left">Reason</th>
                <th className="th text-right" style={{ width: '110px' }}>Refund</th>
                <th className="th text-center" style={{ width: '110px' }}>Status</th>
                <th className="th text-left" style={{ width: '100px' }}>Date</th>
                <th className="th text-center" style={{ width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
              ) : returns.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16"><RotateCcw size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No return requests</p></td></tr>
              ) : returns.map((r) => {
                const ss = STATUS_STYLE[r.status] || STATUS_STYLE.requested;
                return (
                  <tr key={r._id} className="group transition-colors" style={{ borderBottom: '1px solid var(--c-border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                    <td className="pl-5 px-3 py-3">
                      <span className="font-mono text-[11px] font-bold" style={{ color: '#4F46E5' }}>#{r.order?.orderId?.slice(-8) || '—'}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[11px] font-semibold text-brand-text">{r.user?.name}</p>
                      <p className="text-[10px] text-brand-muted">{r.user?.email}</p>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-brand-muted capitalize">{r.reason?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-3 py-3 text-right text-[11px] font-semibold text-brand-text">{r.refundAmount ? formatPrice(r.refundAmount) : '—'}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold capitalize" style={{ background: ss.bg, color: ss.text }}>
                        <Circle size={5} fill={ss.dot} style={{ color: ss.dot }} />{r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDate(r.createdAt)}</td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => openUpdate(r)} className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all" style={{ color: '#64748B' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#4F46E5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}>
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-brand-border/40" style={{ background: 'var(--c-th-bg)' }}>
              <p className="text-[10px] text-brand-muted">Page {page} of {pagination.pages}</p>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Update Return Request" size="sm">
        {selected && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid var(--c-border)' }}>
              <p className="text-[11px] font-semibold text-brand-text">Order #{selected.order?.orderId?.slice(-8)}</p>
              <p className="text-[10px] text-brand-muted">{selected.user?.name} · {selected.reason?.replace(/_/g, ' ')}</p>
            </div>
            <div><label className="input-label">Status</label>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {['requested','approved','processing','completed','rejected'].map((s) => {
                  const ss = STATUS_STYLE[s];
                  return (
                    <button key={s} type="button" onClick={() => setForm({ ...form, status: s })}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all text-left flex items-center gap-1"
                      style={form.status === s ? { background: ss.bg, color: ss.text, boxShadow: `0 0 0 1.5px ${ss.dot}` } : { background: 'var(--c-bg)', color: 'var(--c-muted)' }}>
                      <Circle size={5} fill={form.status === s ? ss.dot : '#CBD5E1'} style={{ color: form.status === s ? ss.dot : '#CBD5E1' }} />
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
            <div><label className="input-label">Refund Amount (Rs.)</label><input type="number" value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: e.target.value })} className="input-field" placeholder="0" /></div>
            <div><label className="input-label">Admin Note</label><textarea value={form.adminNote} onChange={(e) => setForm({ ...form, adminNote: e.target.value })} rows={3} className="input-field resize-none" /></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelected(null)} className="btn-outline flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Update'}</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
