import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, UserCog, KeyRound, ShieldCheck, Copy, Check } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import StatusToggle from '../../components/common/StatusToggle';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { staffApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
import type { StaffMember, StaffRole, Pagination } from '../../types';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

const EMPTY = { name: '', email: '', phone: '', password: '', roleId: '', isAdmin: false };

function Avatar({ name }: { name: string }) {
  const colors = ['var(--c-primary)', 'var(--c-sky)', 'var(--c-success)', 'var(--c-warning)', 'var(--c-purple)'];
  const c = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0" style={{ background: c }}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

export default function StaffPage() {
  const me = useAuthStore((s) => s.user);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  // A reset password is shown once and never stored, so it lives in state only.
  const [freshPassword, setFreshPassword] = useState<{ name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    staffApi.list({ page, limit: 20, search: search || undefined })
      .then(({ data }) => {
        setStaff(data.data || []);
        if (data.pagination) setPagination(data.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    load();
    staffApi.listRoles().then(({ data }) => setRoles(data.data || [])).catch(() => {});
  }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (m: StaffMember) => {
    setEditing(m);
    setForm({
      name: m.name, email: m.email, phone: m.phone || '', password: '',
      roleId: typeof m.roleRef === 'object' && m.roleRef ? m.roleRef._id : '',
      isAdmin: m.role === 'admin',
    });
    setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.isAdmin && !form.roleId) { toast.error('Pick a role for this staff member'); return; }
    setSaving(true);
    try {
      if (editing) {
        await staffApi.update(editing._id, {
          name: form.name, phone: form.phone, isAdmin: form.isAdmin,
          roleId: form.isAdmin ? undefined : form.roleId,
        });
        toast.success('Staff member updated');
      } else {
        await staffApi.create(form);
        toast.success('Staff account created');
      }
      setModal(false); load();
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  const toggleActive = async (m: StaffMember) => {
    const next = !m.isActive;
    setStaff((prev) => prev.map((x) => (x._id === m._id ? { ...x, isActive: next } : x)));
    try {
      await staffApi.update(m._id, { isActive: next });
      toast.success(next ? 'Account enabled' : 'Account disabled');
    } catch {
      setStaff((prev) => prev.map((x) => (x._id === m._id ? { ...x, isActive: !next } : x)));
    }
  };

  const resetPassword = async (m: StaffMember) => {
    if (!(await confirm({
      title: `Reset password for ${m.name}?`,
      message: 'A new password is generated and shown once. Their existing sessions are signed out.',
      confirmText: 'Reset',
    }))) return;
    try {
      const { data } = await staffApi.resetPassword(m._id);
      setFreshPassword({ name: m.name, password: data.data.password });
      setCopied(false);
    } catch { /* interceptor */ }
  };

  const remove = async (m: StaffMember) => {
    if (!(await confirm({
      title: `Remove ${m.name}?`,
      message: 'Their admin access is revoked immediately. This cannot be undone.',
      confirmText: 'Remove', danger: true,
    }))) return;
    try { await staffApi.remove(m._id); toast.success('Staff member removed'); load(); } catch { /* interceptor */ }
  };

  const roleOptions = [
    ...roles.filter((r) => r.isActive).map((r) => ({ value: r._id, label: r.name })),
  ];

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-brand-text">Staff</h1>
            <p className="text-[10px] text-brand-muted mt-0.5">{pagination.total} staff account(s)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search staff..." className="input-field pl-8 text-[11px]" />
            </div>
            <button onClick={openNew} className="btn-primary flex-shrink-0"><Plus size={15} /> Add Staff</button>
          </div>
        </div>

        {roles.length === 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'var(--c-warning-soft)', border: '1px solid var(--c-warning)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--c-warning)' }} />
            <p className="text-[11px] text-brand-text">
              No roles exist yet. <Link to="/roles" className="font-semibold underline">Create a role</Link> before adding
              non-admin staff — they need one to see anything.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
                <th className="th text-left pl-5">Staff member</th>
                <th className="th text-left" style={{ width: '180px' }}>Role</th>
                <th className="th text-center" style={{ width: '90px' }}>Status</th>
                <th className="th text-left" style={{ width: '110px' }}>Added</th>
                <th className="th text-center" style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16">
                  <UserCog size={32} className="mx-auto mb-2 text-brand-border" />
                  <p className="text-[11px] text-brand-muted">No staff accounts yet</p>
                </td></tr>
              ) : staff.map((m) => {
                const role = typeof m.roleRef === 'object' ? m.roleRef : null;
                const isSelf = m._id === me?._id;
                return (
                  <tr key={m._id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                    <td className="pl-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-brand-text truncate">
                            {m.name}{isSelf && <span className="ml-1.5 text-[9px] text-brand-muted">(you)</span>}
                          </p>
                          <p className="text-[10px] text-brand-muted truncate">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {m.role === 'admin' ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold" style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary-dark)' }}>
                          Administrator · full access
                        </span>
                      ) : (
                        <span className="text-[11px] text-brand-text">
                          {role?.name || <span className="text-brand-muted">No role</span>}
                          {role && <span className="block text-[9px] text-brand-muted">{role.permissions?.length || 0} feature(s)</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center">
                        {isSelf
                          ? <span className="text-[10px] text-brand-muted">—</span>
                          : <StatusToggle isActive={m.isActive} onToggle={() => void toggleActive(m)} />}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[10px] text-brand-muted">{formatDate(m.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(m)} title="Edit"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-primary transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => resetPassword(m)} title="Reset password"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-primary transition-colors">
                          <KeyRound size={13} />
                        </button>
                        {!isSelf && (
                          <button onClick={() => remove(m)} title="Remove"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:bg-red-50 hover:text-red-500 transition-colors">
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
              <p className="text-[10px] text-brand-muted">Page {page} of {pagination.pages}</p>
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

      {/* Create / edit */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.name}` : 'Add Staff Member'} size="md">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Full name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="input-label">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
            </div>
          </div>

          <div>
            <label className="input-label">Email *</label>
            <input type="email" value={form.email} disabled={!!editing}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field disabled:opacity-60" required />
            {editing && <p className="text-[10px] text-brand-muted mt-1">Sign-in email can&rsquo;t be changed here.</p>}
          </div>

          {!editing && (
            <div>
              <label className="input-label">Password *</label>
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field font-mono" placeholder="Min 8 characters" required minLength={8} />
              <p className="text-[10px] text-brand-muted mt-1">
                Share this with them directly — it&rsquo;s hashed on save and can&rsquo;t be read back, only reset.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg p-3" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
            <input type="checkbox" checked={form.isAdmin}
              onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
              className="accent-primary w-4 h-4" />
            <span>
              <span className="block text-[12px] font-medium text-brand-text">Full administrator</span>
              <span className="block text-[10px] text-brand-muted">Unrestricted access, including staff and role management.</span>
            </span>
          </label>

          {!form.isAdmin && (
            <div>
              <label className="input-label">Role *</label>
              <Select value={form.roleId} onChange={(v) => setForm({ ...form, roleId: v })}
                options={roleOptions} placeholder={roles.length ? 'Choose a role…' : 'No roles created yet'} />
              <p className="text-[10px] text-brand-muted mt-1">
                They&rsquo;ll see exactly the features this role grants. Manage those on{' '}
                <Link to="/roles" className="font-semibold text-primary">Roles &amp; Permissions</Link>.
              </p>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Staff Account'}
          </button>
        </form>
      </Modal>

      {/* Shown once after a reset */}
      <Modal open={!!freshPassword} onClose={() => setFreshPassword(null)} title="New password" size="sm">
        {freshPassword && (
          <div className="space-y-3">
            <p className="text-[12px] text-brand-text">
              New password for <b>{freshPassword.name}</b>. It isn&rsquo;t stored anywhere — copy it now.
            </p>
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(freshPassword.password); setCopied(true); }
                catch { toast.error('Could not copy — select it manually'); }
              }}
              className="w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition-colors"
              style={{ background: 'var(--c-bg)', border: '2px dashed var(--c-primary)' }}
            >
              <span className="font-mono text-[15px] font-bold text-brand-text">{freshPassword.password}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--c-primary)' }}>
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </span>
            </button>
            <button onClick={() => setFreshPassword(null)} className="btn-primary w-full justify-center">Done</button>
          </div>
        )}
      </Modal>
    </>
  );
}
