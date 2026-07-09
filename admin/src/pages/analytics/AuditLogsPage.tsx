import { useEffect, useState, useCallback } from 'react';
import { ScrollText } from 'lucide-react';
import { auditApi } from '../../api';
import type { AuditLog, Pagination } from '../../types';
import { formatDateTime } from '../../utils/format';

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: '#DCFCE7', text: '#166534' },
  UPDATE: { bg: '#DBEAFE', text: '#1E40AF' },
  DELETE: { bg: '#FEE2E2', text: '#991B1B' },
  UPDATE_ORDER_STATUS: { bg: '#EDE9FE', text: '#5B21B6' },
  APPROVE: { bg: '#DCFCE7', text: '#166534' },
};

function getActionColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.startsWith(k));
  return key ? ACTION_COLORS[key] : { bg: '#F1F5F9', text: '#475569' };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    auditApi.getLogs({ page, limit: 20 }).then(({ data }) => {
      setLogs(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-bold text-brand-text">Audit Logs</h1>
        <p className="text-[10px] text-brand-muted mt-0.5">Admin activity history</p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-left pl-5">Admin User</th>
              <th className="th text-left">Action</th>
              <th className="th text-left" style={{ width: '120px' }}>Resource</th>
              <th className="th text-left">Resource ID</th>
              <th className="th text-left" style={{ width: '110px' }}>IP Address</th>
              <th className="th text-left" style={{ width: '140px' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-3 py-3"><div className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: j === 1 ? '130px' : '80px' }} /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16"><ScrollText size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No audit logs yet</p></td></tr>
            ) : logs.map((l) => {
              const ac = getActionColor(l.action);
              return (
                <tr key={l._id} className="group transition-colors" style={{ borderBottom: '1px solid var(--c-border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                  <td className="pl-5 px-3 py-3">
                    <p className="text-[11px] font-semibold text-brand-text">{l.user?.name || '—'}</p>
                    <p className="text-[9px] text-brand-muted capitalize">{l.user?.role?.replace(/_/g, ' ')}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[9px] font-bold px-2 py-1 rounded-md" style={{ background: ac.bg, color: ac.text }}>{l.action}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-[11px] text-brand-text capitalize font-medium">{l.resource}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[10px] text-brand-muted">{l.resourceId ? l.resourceId.slice(-12) : '—'}</span>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-brand-muted font-mono">{l.ip || '—'}</td>
                  <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDateTime(l.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-brand-border/40" style={{ background: 'var(--c-th-bg)' }}>
            <p className="text-[10px] text-brand-muted">Page {page} of {pagination.pages} · {pagination.total} logs</p>
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
