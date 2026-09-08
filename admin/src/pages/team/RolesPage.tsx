import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, ShieldCheck, Users, Lock } from 'lucide-react';
import StatusToggle from '../../components/common/StatusToggle';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { staffApi } from '../../api';
import type { StaffRole, ProviderFeature } from '../../types';
import toast from 'react-hot-toast';

export default function RolesPage() {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [features, setFeatures] = useState<ProviderFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    staffApi.listRoles()
      .then(({ data }) => setRoles(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    staffApi.getFeatures().then(({ data }) => setFeatures(data.data || [])).catch(() => {});
  }, [load]);

  const toggleActive = async (r: StaffRole) => {
    const next = !r.isActive;
    setRoles((prev) => prev.map((x) => (x._id === r._id ? { ...x, isActive: next } : x)));
    try {
      await staffApi.updateRole(r._id, { isActive: next });
      toast.success(next ? 'Role enabled' : 'Role disabled — its staff lose access');
    } catch {
      setRoles((prev) => prev.map((x) => (x._id === r._id ? { ...x, isActive: !next } : x)));
    }
  };

  const remove = async (r: StaffRole) => {
    if (!(await confirm({
      title: `Delete "${r.name}"?`,
      message: r.staffCount
        ? `${r.staffCount} staff member(s) hold this role. Reassign them first.`
        : 'This role will be permanently removed.',
      confirmText: 'Delete', danger: true,
    }))) return;
    try { await staffApi.deleteRole(r._id); toast.success('Role deleted'); load(); } catch { /* interceptor */ }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-brand-text">Roles &amp; Permissions</h1>
            <p className="text-[10px] text-brand-muted mt-0.5">
              Define what each kind of staff member can reach, then assign a role on the Staff page
            </p>
          </div>
          <Link to="/roles/new" className="btn-primary"><Plus size={15} /> New Role</Link>
        </div>

        {loading ? (
          <div className="py-16 text-center"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></div>
        ) : roles.length === 0 ? (
          <div className="rounded-2xl py-16 text-center" style={{ border: '1px dashed var(--c-border)' }}>
            <ShieldCheck size={34} className="mx-auto mb-3 text-brand-border" />
            <p className="text-[13px] font-semibold text-brand-text">No roles yet</p>
            <p className="text-[11px] text-brand-muted mt-1 mb-4">
              Create one — say &ldquo;Catalogue Manager&rdquo; or &ldquo;Support Agent&rdquo; — then assign it to staff.
            </p>
            <Link to="/roles/new" className="btn-primary"><Plus size={15} /> Create the first role</Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <div key={r._id} className="card p-4" style={{ opacity: r.isActive ? 1 : 0.6 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-brand-text truncate flex items-center gap-1.5">
                      {r.isSystem && <Lock size={11} className="text-brand-muted" />} {r.name}
                    </p>
                    {r.description && <p className="text-[11px] text-brand-muted mt-0.5 line-clamp-2">{r.description}</p>}
                  </div>
                  <StatusToggle isActive={r.isActive} onToggle={() => void toggleActive(r)} />
                </div>

                <div className="flex items-center gap-3 mt-3 text-[10px] text-brand-muted">
                  <span className="inline-flex items-center gap-1"><ShieldCheck size={11} /> {r.permissions.length} feature(s)</span>
                  <span className="inline-flex items-center gap-1"><Users size={11} /> {r.staffCount || 0} staff</span>
                </div>

                <div className="flex flex-wrap gap-1 mt-3 min-h-[22px]">
                  {r.permissions.slice(0, 4).map((k) => (
                    <span key={k} className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                      style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary)' }}>
                      {features.find((f) => f.key === k)?.label || k}
                    </span>
                  ))}
                  {r.permissions.length > 4 && (
                    <span className="px-1.5 py-0.5 text-[9px] text-brand-muted">+{r.permissions.length - 4} more</span>
                  )}
                  {r.permissions.length === 0 && <span className="text-[10px] text-brand-muted">No access granted yet</span>}
                </div>

                <div className="flex gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--c-border)' }}>
                  <button onClick={() => navigate(`/roles/${r._id}/edit`)} className="btn-outline flex-1 justify-center !py-1.5 text-[11px]">
                    <Edit2 size={12} /> Edit
                  </button>
                  {!r.isSystem && (
                    <button onClick={() => remove(r)} title="Delete role"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
}
