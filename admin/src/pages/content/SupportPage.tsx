import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Eye, Circle } from 'lucide-react';
import { supportApi } from '../../api';
import type { SupportTicket, Pagination } from '../../types';
import { formatDateTime } from '../../utils/format';

const STATUSES = ['all', 'open', 'pending', 'resolved', 'closed'];

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  open:     { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  pending:  { bg: '#FEF9C3', text: '#854D0E', dot: '#EAB308' },
  resolved: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
  closed:   { bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
};

const PRIORITY_STYLE: Record<string, { bg: string; text: string }> = {
  high:   { bg: '#FEE2E2', text: '#991B1B' },
  medium: { bg: '#FEF9C3', text: '#854D0E' },
  low:    { bg: '#DCFCE7', text: '#166534' },
};

export default function SupportPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('open');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    supportApi.getAll({ page, limit: 20, status: activeStatus === 'all' ? undefined : activeStatus }).then(({ data }) => {
      setTickets(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, activeStatus]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Support Tickets</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">{pagination.total} total tickets</p>
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
              {s === 'all' ? 'All Tickets' : s}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-left pl-5">Ticket ID</th>
              <th className="th text-left">Customer</th>
              <th className="th text-left">Subject</th>
              <th className="th text-left" style={{ width: '120px' }}>Category</th>
              <th className="th text-center" style={{ width: '90px' }}>Priority</th>
              <th className="th text-center" style={{ width: '100px' }}>Status</th>
              <th className="th text-left" style={{ width: '120px' }}>Date</th>
              <th className="th text-center" style={{ width: '90px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16"><Headphones size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No tickets found</p></td></tr>
            ) : tickets.map((t) => {
              const ss = STATUS_STYLE[t.status] || STATUS_STYLE.closed;
              const ps = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.low;
              return (
                <tr key={t._id} className="group cursor-pointer transition-colors" style={{ borderBottom: '1px solid var(--c-border)' }}
                  onClick={() => navigate(`/support/${t._id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                  <td className="pl-5 px-3 py-3">
                    <span className="font-mono text-[11px] font-bold" style={{ color: '#4F46E5' }}>{t.ticketId}</span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-[11px] font-semibold text-brand-text">{t.user?.name}</p>
                    <p className="text-[10px] text-brand-muted">{t.user?.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-[11px] text-brand-text line-clamp-1 max-w-[200px]">{t.subject}</p>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-brand-muted capitalize">{t.category}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold capitalize" style={{ background: ps.bg, color: ps.text }}>{t.priority}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold capitalize" style={{ background: ss.bg, color: ss.text }}>
                      <Circle size={5} fill={ss.dot} style={{ color: ss.dot }} />{t.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-brand-muted whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center transition-all" style={{ color: '#64748B' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = '#4F46E5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; }}>
                      <Eye size={13} />
                    </div>
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
                  <button key={p} onClick={(e) => { e.stopPropagation(); setPage(p); }} className="w-7 h-7 text-[10px] font-semibold rounded-lg transition-all"
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
