import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Edit2, Users, Eye, Trash2, X } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import StatusToggle from '../../components/common/StatusToggle';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { customerApi } from '../../api';
import type { Customer, Pagination } from '../../types';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

const ROLES = ['customer', 'admin'];

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  customer: { bg: 'var(--c-th-bg)', text: 'var(--c-muted)' },
  admin:    { bg: 'var(--c-primary-soft)', text: 'var(--c-primary-dark)' },
};

function Avatar({ name, email }: { name: string; email: string }) {
  const colors = ['var(--c-primary)','var(--c-sky)','var(--c-success)','var(--c-warning)','var(--c-danger)','var(--c-purple)'];
  const c = colors[(name.charCodeAt(0) + email.charCodeAt(0)) % colors.length];
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: c }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [roleForm, setRoleForm] = useState({ role: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const confirm = useConfirm();

  // Only plain customer accounts are deletable (admin accounts are managed elsewhere).
  const deletable = customers.filter((c) => c.role === 'customer');
  const allChecked = deletable.length > 0 && deletable.every((c) => checked.has(c._id));
  const toggleOne = (id: string) => setChecked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(deletable.map((c) => c._id)));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customerApi.getAll({ page, limit: 20, search: search || undefined });
      setCustomers(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    } catch {} finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); setChecked(new Set()); }, [load]);

  const handleDelete = async (c: Customer) => {
    if (!(await confirm({ title: 'Delete customer?', message: `"${c.name}" (${c.email}) will be permanently deleted along with their cart and wishlist. Their past orders are kept for records. This cannot be undone.`, confirmText: 'Delete', danger: true }))) return;
    try {
      await customerApi.delete(c._id);
      toast.success('Customer deleted');
      setChecked((prev) => { const n = new Set(prev); n.delete(c._id); return n; });
      load();
    } catch {}
  };

  const bulkDelete = async () => {
    const ids = [...checked];
    if (!(await confirm({ title: `Delete ${ids.length} customer(s)?`, message: 'They will be permanently deleted along with their carts and wishlists. Their past orders are kept for records. This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    setBulkBusy(true);
    try {
      await Promise.all(ids.map((id) => customerApi.delete(id).catch(() => null)));
      toast.success(`${ids.length} customer(s) deleted`);
      setChecked(new Set()); load();
    } finally { setBulkBusy(false); }
  };

  const openEdit = (c: Customer) => { setSelected(c); setRoleForm({ role: c.role, isActive: c.isActive }); };

  const handleToggleStatus = async (c: Customer) => {
    const next = !c.isActive;
    setCustomers((prev) => prev.map((x) => (x._id === c._id ? { ...x, isActive: next } : x)));
    try {
      await customerApi.updateRole(c._id, { isActive: next });
      toast.success(next ? 'Account activated' : 'Account deactivated');
    } catch {
      setCustomers((prev) => prev.map((x) => (x._id === c._id ? { ...x, isActive: !next } : x)));
      toast.error('Failed to update status');
    }
  };

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
                      <td key={j} className="px-3 py-3.5"><div className="h-3 rounded bg-brand-bg animate-pulse" style={{ width: j === 1 ? '140px' : '70px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16"><Users size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No customers found</p></td></tr>
              ) : customers.map((c) => {
                const rc = ROLE_COLORS[c.role] || ROLE_COLORS.customer;
                return (
                  <tr key={c._id} className={`group transition-colors ${bulkBusy && checked.has(c._id) ? 'opacity-40 animate-pulse' : ''}`} style={{ borderBottom: '1px solid var(--c-border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                    <td className="pl-5 py-3 text-center">
                      {c.role === 'customer' && (
                        <input type="checkbox" checked={checked.has(c._id)} onChange={() => toggleOne(c._id)} className="w-4 h-4 accent-primary cursor-pointer" aria-label="Select" />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => navigate(`/customers/${c._id}`)} className="flex items-center gap-2.5 text-left group/cust">
                        <Avatar name={c.name} email={c.email} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-brand-text truncate max-w-[160px] group-hover/cust:text-indigo-600 transition-colors">{c.name}</p>
                          <p className="text-[10px] text-brand-muted truncate max-w-[160px]">{c.email}</p>
                          {c.phone && <p className="text-[10px] text-brand-muted">{c.phone}</p>}
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold capitalize" style={{ background: rc.bg, color: rc.text }}>{c.role.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-semibold ${c.isEmailVerified ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {c.isEmailVerified ? '✓ Yes' : '✗ No'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center">
                        <StatusToggle isActive={c.isActive} onToggle={() => void handleToggleStatus(c)} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDate(c.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => navigate(`/customers/${c._id}`)} title="View details"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-brand-muted hover:bg-indigo-50 hover:text-indigo-600">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => openEdit(c)} title="Edit role / status"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-brand-muted hover:bg-brand-bg hover:text-brand-text">
                          <Edit2 size={13} />
                        </button>
                        {c.role === 'customer' && (
                          <button onClick={() => handleDelete(c)} title="Delete customer"
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-brand-muted hover:bg-red-50 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
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
