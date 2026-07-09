import { useEffect, useState, useCallback } from 'react';
import { Search, Edit2, Users } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { customerApi } from '../../api';
import type { Customer, Pagination } from '../../types';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

const ROLES = ['customer', 'admin'];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  customer: { bg: '#F1F5F9', text: '#475569' },
  admin:    { bg: '#EEF2FF', text: '#3730A3' },
};

function Avatar({ name, email }: { name: string; email: string }) {
  const colors = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6'];
  const c = colors[(name.charCodeAt(0) + email.charCodeAt(0)) % colors.length];
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: c }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [roleForm, setRoleForm] = useState({ role: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customerApi.getAll({ page, limit: 20, search: search || undefined });
      setCustomers(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (c: Customer) => { setSelected(c); setRoleForm({ role: c.role, isActive: c.isActive }); };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await customerApi.updateRole(selected._id, roleForm);
      toast.success('Customer updated');
      setSelected(null); load();
    } catch {} finally { setSaving(false); }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-brand-text">Customers</h1>
            <p className="text-[10px] text-brand-muted mt-0.5">{pagination.total} total users</p>
          </div>
          <div className="relative w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email..." className="input-field pl-8 text-[11px]" />
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
                <th className="th text-left pl-5" style={{ width: '44px' }}>#</th>
                <th className="th text-left">Customer</th>
                <th className="th text-left" style={{ width: '140px' }}>Role</th>
                <th className="th text-center" style={{ width: '90px' }}>Verified</th>
                <th className="th text-center" style={{ width: '90px' }}>Status</th>
                <th className="th text-left" style={{ width: '110px' }}>Joined</th>
                <th className="th text-center" style={{ width: '90px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--c-border)' }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-3 py-3.5"><div className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: j === 1 ? '140px' : '70px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16"><Users size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No customers found</p></td></tr>
              ) : customers.map((c, idx) => {
                const rc = ROLE_COLORS[c.role] || ROLE_COLORS.customer;
                return (
                  <tr key={c._id} className="group transition-colors" style={{ borderBottom: '1px solid var(--c-border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                    <td className="pl-5 py-3 text-[10px] font-bold text-brand-muted/60">{(page - 1) * 20 + idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} email={c.email} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-brand-text truncate max-w-[160px]">{c.name}</p>
                          <p className="text-[10px] text-brand-muted truncate max-w-[160px]">{c.email}</p>
                          {c.phone && <p className="text-[10px] text-brand-muted">{c.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold capitalize" style={{ background: rc.bg, color: rc.text }}>{c.role.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-semibold ${c.isEmailVerified ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {c.isEmailVerified ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-semibold ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDate(c.createdAt)}</td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => openEdit(c)} className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all" style={{ color: '#64748B' }}
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
              <p className="text-[10px] text-brand-muted">Page {page} of {pagination.pages} · {pagination.total} users</p>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Edit Customer" size="sm">
        {selected && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-brand-bg rounded-xl">
              <Avatar name={selected.name} email={selected.email} />
              <div>
                <p className="text-[12px] font-semibold text-brand-text">{selected.name}</p>
                <p className="text-[10px] text-brand-muted">{selected.email}</p>
              </div>
            </div>
            <div><label className="input-label">Role</label>
              <Select value={roleForm.role} onChange={(v) => setRoleForm({ ...roleForm, role: v })}
                options={ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }))} />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={roleForm.isActive} onChange={(e) => setRoleForm({ ...roleForm, isActive: e.target.checked })} className="accent-primary w-4 h-4" />
              <span className="text-[12px] font-medium">Active Account</span>
            </label>
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
