import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Users, Info } from 'lucide-react';
import { PageSpinner } from '../../components/common/Spinner';
import { staffApi } from '../../api';
import type { StaffRole, ProviderFeature } from '../../types';
import toast from 'react-hot-toast';

const EMPTY = { name: '', description: '', permissions: [] as string[], isActive: true };

export default function RoleFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [features, setFeatures] = useState<ProviderFeature[]>([]);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    staffApi.getFeatures().then(({ data }) => setFeatures(data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    // There's no single-role endpoint — the list already carries everything
    // this form needs, including how many staff hold it.
    staffApi.listRoles()
      .then(({ data }) => {
        const role = (data.data as StaffRole[]).find((r) => r._id === id);
        if (!role) { toast.error('Role not found'); navigate('/roles'); return; }
        setForm({
          name: role.name,
          description: role.description || '',
          permissions: role.permissions || [],
          isActive: role.isActive,
        });
        setStaffCount(role.staffCount || 0);
      })
      .catch(() => navigate('/roles'))
      .finally(() => setLoading(false));
  }, [id, isEdit, navigate]);

  const toggleFeature = (key: string) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter((k) => k !== key) : [...f.permissions, key],
    }));

  const bySection = features.reduce<Record<string, ProviderFeature[]>>((acc, f) => {
    (acc[f.section] ||= []).push(f);
    return acc;
  }, {});

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Give the role a name'); return; }
    setSaving(true);
    try {
      if (isEdit) { await staffApi.updateRole(id!, form); toast.success('Role updated'); }
      else { await staffApi.createRole(form); toast.success('Role created'); }
      navigate('/roles');
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  if (loading) return <PageSpinner />;

  return (
    <form onSubmit={save} className="space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/roles')}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-text transition-colors">
          <ArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">{isEdit ? `Edit “${form.name}”` : 'New Role'}</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">
            Pick the features staff holding this role can reach
          </p>
        </div>
      </div>

      {isEdit && staffCount > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2.5" style={{ background: 'var(--c-info-soft)', border: '1px solid var(--c-info)' }}>
          <Users size={15} style={{ color: 'var(--c-info)' }} />
          <p className="text-[11px] text-brand-text">
            <b>{staffCount}</b> staff member{staffCount > 1 ? 's' : ''} hold this role. Changes apply to them
            immediately — they don&rsquo;t need to sign in again.
          </p>
        </div>
      )}

      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Role name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="e.g. Catalogue Manager" required />
          </div>
          <div>
            <label className="input-label">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field" placeholder="What this role is responsible for" />
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="accent-primary w-4 h-4" />
          <span className="text-[12px] font-medium">
            Active <span className="text-brand-muted font-normal">— disabling revokes access for everyone holding it</span>
          </span>
        </label>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
          <h2 className="font-heading text-base font-semibold flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: 'var(--c-primary)' }} /> Permissions
          </h2>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--c-primary)' }}>
            {form.permissions.length} of {features.length} selected
          </span>
        </div>

        <div className="space-y-5">
          {Object.entries(bySection).map(([section, list]) => {
            const keys = list.map((f) => f.key);
            const allOn = keys.every((k) => form.permissions.includes(k));
            return (
              <div key={section}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">{section}</p>
                  <button type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      permissions: allOn
                        ? f.permissions.filter((k) => !keys.includes(k))
                        : [...new Set([...f.permissions, ...keys])],
                    }))}
                    className="text-[10px] font-semibold" style={{ color: 'var(--c-primary)' }}>
                    {allOn ? 'Clear section' : 'Select all'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {list.map((ft) => {
                    const on = form.permissions.includes(ft.key);
                    return (
                      <button type="button" key={ft.key} onClick={() => toggleFeature(ft.key)}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors"
                        style={{ background: on ? 'var(--c-primary-soft)' : 'var(--c-surface)', border: `1px solid ${on ? 'var(--c-primary)' : 'var(--c-border)'}` }}>
                        <input type="checkbox" readOnly checked={on} className="w-4 h-4 accent-primary pointer-events-none mt-0.5" />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-medium text-brand-text">{ft.label}</span>
                          <span className="block text-[10px] text-brand-muted leading-snug">{ft.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="flex items-start gap-1.5 text-[10px] text-brand-muted mt-5 pt-4 border-t border-brand-border">
          <Info size={12} className="flex-shrink-0 mt-px" />
          Staff and role management, wallet adjustments and account deletion are admin-only and can&rsquo;t be granted
          here — a role can never be used to widen its own access.
        </p>
      </div>

      {/* Floating actions */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full p-1.5"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: '0 8px 28px rgba(0,0,0,0.16)' }}>
        <Link to="/roles" className="btn-outline !rounded-full">Cancel</Link>
        <button type="submit" disabled={saving} className="btn-primary !rounded-full min-w-[150px] justify-center">
          {saving ? 'Saving…' : isEdit ? 'Save Role' : 'Create Role'}
        </button>
      </div>
    </form>
  );
}
