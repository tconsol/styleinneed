import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Building2, Phone, Mail, MapPin, ChevronLeft, ChevronRight, X, Eye, CreditCard, FileText } from 'lucide-react';
import { providerApi } from '../../api';
import type { Provider } from '../../types';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/common/ConfirmDialog';
import Select from '../../components/common/Select';
import StatusToggle from '../../components/common/StatusToggle';

const CATEGORIES = ['all', 'clothing', 'jewellery', 'accessories', 'other'] as const;

const EMPTY = {
  name: '', contactPerson: '', phone: '', email: '',
  category: 'all', address: '', city: '', state: '',
  gstin: '', bankAccountName: '', bankAccountNumber: '', bankIfsc: '', bankName: '',
  notes: '', isActive: true,
  // Admin-panel login for this provider (restricted to the Products area).
  canLogin: false, loginEmail: '', loginPassword: '',
};

const CAT_COLORS: Record<string, string> = {
  clothing: '#3B82F6', jewellery: '#F59E0B', accessories: '#8B5CF6', all: '#10B981', other: '#94A3B8',
};

function EditModal({ title, onClose, onSave, saving, children }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
          <h2 className="text-[14px] font-bold text-brand-text">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-muted transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="px-6 py-4 border-t border-brand-border flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-outline text-[12px]">Cancel</button>
          <button onClick={onSave} disabled={saving} className="btn-primary text-[12px] disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Provider'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ provider, onClose, onEdit, onPrev, onNext, position }: {
  provider: Provider; onClose: () => void; onEdit: () => void;
  onPrev?: () => void; onNext?: () => void; position?: string;
}) {
  const hasBank = provider.bankAccountName || provider.bankAccountNumber || provider.bankIfsc || provider.bankName;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col" style={{ border: '1px solid var(--c-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${CAT_COLORS[provider.category] || '#94A3B8'}18` }}>
              <Building2 size={16} style={{ color: CAT_COLORS[provider.category] || '#94A3B8' }} />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-brand-text">{provider.name}</h2>
              {provider.contactPerson && <p className="text-[10px] text-brand-muted">{provider.contactPerson}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold text-white"
              style={{ background: CAT_COLORS[provider.category] || '#94A3B8' }}>
              {provider.category}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${provider.isActive ? 'bg-green-100 text-green-700' : 'bg-brand-bg text-brand-muted'}`}>
              {provider.isActive ? 'Active' : 'Inactive'}
            </span>
            {/* Prev / next provider navigation */}
            <div className="flex items-center gap-0.5 ml-1 border-l border-brand-border pl-2">
              <button onClick={onPrev} disabled={!onPrev} title="Previous provider"
                className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                <ChevronLeft size={16} />
              </button>
              {position && <span className="text-[10px] text-brand-muted tabular-nums min-w-[34px] text-center">{position}</span>}
              <button onClick={onNext} disabled={!onNext} title="Next provider"
                className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                <ChevronRight size={16} />
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-muted transition-colors ml-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Contact */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted mb-2">Contact</p>
            <div className="grid grid-cols-2 gap-3">
              {provider.phone && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-bg">
                  <Phone size={12} className="text-brand-muted flex-shrink-0" />
                  <span className="text-[12px] text-brand-text">{provider.phone}</span>
                </div>
              )}
              {provider.email && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand-bg">
                  <Mail size={12} className="text-brand-muted flex-shrink-0" />
                  <span className="text-[12px] text-brand-text truncate">{provider.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Login credentials */}
          {provider.login?.hasLogin && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted mb-2">Login Access</p>
              <div className="rounded-xl bg-indigo-50 px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-brand-muted">Email</span>
                  <span className="text-[12px] font-medium text-brand-text">{provider.login.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-brand-muted">Password</span>
                  <span className="text-[12px] font-mono font-semibold text-indigo-700">{provider.login.password || '—'}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-indigo-100">
                  <span className="text-[9px] font-bold uppercase text-brand-muted">Status</span>
                  <span className={`text-[10px] font-semibold ${provider.login.active ? 'text-emerald-600' : 'text-brand-muted'}`}>{provider.login.active ? 'Can sign in' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {(provider.address || provider.city || provider.state || provider.gstin) && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted mb-2">Address & Tax</p>
              <div className="rounded-xl bg-brand-bg px-4 py-3 space-y-1.5">
                {provider.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={11} className="text-brand-muted mt-0.5 flex-shrink-0" />
                    <span className="text-[12px] text-brand-text">{provider.address}</span>
                  </div>
                )}
                {(provider.city || provider.state) && (
                  <p className="text-[12px] text-brand-muted pl-[19px]">{[provider.city, provider.state].filter(Boolean).join(', ')}</p>
                )}
                {provider.gstin && (
                  <div className="flex items-center gap-2 pt-1 border-t border-brand-border mt-1">
                    <span className="text-[9px] font-bold uppercase text-brand-muted">GSTIN</span>
                    <span className="text-[11px] font-mono text-brand-text">{provider.gstin}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bank Details */}
          {hasBank && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted mb-2">Bank Details</p>
              <div className="rounded-xl bg-brand-bg px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={12} className="text-brand-muted flex-shrink-0" />
                  <span className="text-[12px] font-medium text-brand-text">{provider.bankName || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-[20px]">
                  <div>
                    <p className="text-[9px] text-brand-muted uppercase">Account Name</p>
                    <p className="text-[11px] text-brand-text">{provider.bankAccountName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-brand-muted uppercase">Account Number</p>
                    <p className="text-[11px] font-mono text-brand-text">{provider.bankAccountNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-brand-muted uppercase">IFSC Code</p>
                    <p className="text-[11px] font-mono text-brand-text">{provider.bankIfsc || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {provider.notes && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted mb-2">Notes</p>
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3">
                <FileText size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-brand-text whitespace-pre-wrap">{provider.notes}</p>
              </div>
            </div>
          )}

          {/* Meta */}
          {provider.createdAt && (
            <p className="text-[10px] text-brand-muted text-right">
              Added {new Date(provider.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-border flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-outline text-[12px]">Close</button>
          <button onClick={onEdit} className="btn-primary text-[12px] gap-1.5"><Pencil size={12} /> Edit Provider</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );
}

export default function ProvidersPage() {
  const confirm = useConfirm();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [viewing, setViewing] = useState<Provider | null>(null);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, limit: 15 };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      const { data } = await providerApi.getAll(params);
      setProviders(data.data);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error('Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(1); setPage(1); }, [search, categoryFilter]);
  useEffect(() => { void load(page); }, [page]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY }); setShowModal(true); };
  const openEdit = (p: Provider) => {
    setViewing(null);
    setEditing(p);
    setForm({
      name: p.name, contactPerson: p.contactPerson || '', phone: p.phone || '',
      email: p.email || '', category: p.category, address: p.address || '',
      city: p.city || '', state: p.state || '', gstin: p.gstin || '',
      bankAccountName: p.bankAccountName || '', bankAccountNumber: p.bankAccountNumber || '',
      bankIfsc: p.bankIfsc || '', bankName: p.bankName || '',
      notes: p.notes || '', isActive: p.isActive,
      canLogin: !!p.login?.hasLogin, loginEmail: p.login?.email || '', loginPassword: '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Provider name required'); return; }
    if (form.canLogin) {
      if (!form.loginEmail.trim()) { toast.error('Login email required to enable access'); return; }
      if (!editing?.login?.hasLogin && !form.loginPassword) { toast.error('Set a password for the provider login'); return; }
    }
    setSaving(true);
    try {
      if (editing) {
        const { data } = await providerApi.update(editing._id, form);
        setProviders((prev) => prev.map((p) => p._id === editing._id ? data.data : p));
        toast.success('Provider updated');
      } else {
        await providerApi.create(form);
        toast.success('Provider created');
        void load(1); setPage(1);
      }
      setShowModal(false);
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const handleToggleStatus = async (p: Provider) => {
    const next = !p.isActive;
    setProviders((prev) => prev.map((x) => (x._id === p._id ? { ...x, isActive: next } : x)));
    try {
      await providerApi.update(p._id, { isActive: next });
      toast.success(next ? 'Activated' : 'Deactivated');
    } catch {
      setProviders((prev) => prev.map((x) => (x._id === p._id ? { ...x, isActive: !next } : x)));
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (p: Provider) => {
    const ok = await confirm({ title: 'Delete Provider', message: `Delete "${p.name}"? This cannot be undone.`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await providerApi.delete(p._id);
      setProviders((prev) => prev.filter((x) => x._id !== p._id));
      setTotal((t) => t - 1);
      toast.success('Provider deleted');
    } catch { toast.error('Delete failed'); }
  };

  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-brand-text">Providers</h1>
          <p className="text-[11px] text-brand-muted mt-0.5">{total} supplier{total !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-1.5 text-[12px]">
          <Plus size={14} /> Add Provider
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search providers..."
            className="input-field pl-9 text-[12px] w-full"
          />
        </div>
        <div className="min-w-[160px]">
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All categories"
            options={[{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))]}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48 text-brand-muted text-[13px]">Loading...</div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-brand-muted">
            <Building2 size={28} className="opacity-30" />
            <p className="text-[12px]">No providers found</p>
            <button onClick={openCreate} className="btn-primary text-[11px] gap-1"><Plus size={12} /> Add one</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-brand-border bg-brand-bg">
                  <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Provider</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Contact</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Location</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Category</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand-muted">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p._id} className="border-b border-brand-border hover:bg-brand-bg transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-brand-text">{p.name}</p>
                      {p.contactPerson && <p className="text-[10px] text-brand-muted mt-0.5">{p.contactPerson}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        {p.phone && <div className="flex items-center gap-1 text-brand-muted"><Phone size={9} />{p.phone}</div>}
                        {p.email && <div className="flex items-center gap-1 text-brand-muted"><Mail size={9} />{p.email}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {(p.city || p.state) && (
                        <div className="flex items-center gap-1 text-brand-muted">
                          <MapPin size={9} />{[p.city, p.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold text-white"
                        style={{ background: CAT_COLORS[p.category] || '#94A3B8' }}>
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusToggle isActive={p.isActive} onToggle={() => void handleToggleStatus(p)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setViewing(p)} title="View details"
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-brand-muted hover:text-indigo-600 transition-colors">
                          <Eye size={12} />
                        </button>
                        <button onClick={() => openEdit(p)} title="Edit"
                          className="p-1.5 rounded-lg hover:bg-brand-bg text-brand-muted hover:text-primary transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => void handleDelete(p)} title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-brand-muted hover:text-red-500 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-brand-muted">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded hover:bg-brand-bg disabled:opacity-40"><ChevronLeft size={13} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded hover:bg-brand-bg disabled:opacity-40"><ChevronRight size={13} /></button>
          </div>
        </div>
      )}
    </div>

      {/* View Modal */}
      {viewing && (() => {
        const idx = providers.findIndex((x) => x._id === viewing._id);
        return (
          <ViewModal
            provider={viewing}
            position={idx >= 0 ? `${idx + 1} / ${providers.length}` : undefined}
            onPrev={idx > 0 ? () => setViewing(providers[idx - 1]) : undefined}
            onNext={idx >= 0 && idx < providers.length - 1 ? () => setViewing(providers[idx + 1]) : undefined}
            onClose={() => setViewing(null)}
            onEdit={() => openEdit(viewing)}
          />
        );
      })()}

      {/* Edit / Create Modal */}
      {showModal && (
        <EditModal title={editing ? 'Edit Provider' : 'Add Provider'} onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Provider / Company Name *">
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" placeholder="e.g. Silk Route Textiles" />
                </Field>
              </div>
              <Field label="Contact Person">
                <input value={form.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} className="input-field" placeholder="Full name" />
              </Field>
              <Field label="Category">
                <Select
                  value={form.category}
                  onChange={(v) => set('category', v)}
                  options={CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input-field" placeholder="+91 98765 43210" />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="input-field" placeholder="supplier@example.com" />
              </Field>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3 pt-1 border-t border-brand-border">Address</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3">
                  <Field label="Street Address">
                    <input value={form.address} onChange={(e) => set('address', e.target.value)} className="input-field" />
                  </Field>
                </div>
                <Field label="City">
                  <input value={form.city} onChange={(e) => set('city', e.target.value)} className="input-field" />
                </Field>
                <Field label="State">
                  <input value={form.state} onChange={(e) => set('state', e.target.value)} className="input-field" />
                </Field>
                <Field label="GSTIN">
                  <input value={form.gstin} onChange={(e) => set('gstin', e.target.value.toUpperCase())} className="input-field font-mono" placeholder="22AAAAA0000A1Z5" />
                </Field>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3 pt-1 border-t border-brand-border">Bank Details</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account Name">
                  <input value={form.bankAccountName} onChange={(e) => set('bankAccountName', e.target.value)} className="input-field" />
                </Field>
                <Field label="Account Number">
                  <input value={form.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)} className="input-field font-mono" />
                </Field>
                <Field label="IFSC Code">
                  <input value={form.bankIfsc} onChange={(e) => set('bankIfsc', e.target.value.toUpperCase())} className="input-field font-mono" placeholder="HDFC0001234" />
                </Field>
                <Field label="Bank Name">
                  <input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className="input-field" />
                </Field>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3 pt-1 border-t border-brand-border">Login Access</p>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.canLogin} onChange={(e) => set('canLogin', e.target.checked)} className="accent-primary w-4 h-4" />
                  <span className="text-[12px] text-brand-text">Allow this provider to sign in and add products</span>
                </label>
                {form.canLogin && (
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-brand-bg p-3">
                    <Field label="Login Email">
                      <input type="email" value={form.loginEmail} onChange={(e) => set('loginEmail', e.target.value)} className="input-field" placeholder="provider@example.com" />
                    </Field>
                    <Field label={editing?.login?.hasLogin ? 'New Password (leave blank to keep)' : 'Password'}>
                      <input type="text" value={form.loginPassword} onChange={(e) => set('loginPassword', e.target.value)} className="input-field font-mono" placeholder="Min 8 characters" />
                    </Field>
                    {editing?.login?.hasLogin && editing.login.password && (
                      <p className="col-span-2 text-[11px] text-brand-muted">Current password: <span className="font-mono font-semibold text-brand-text">{editing.login.password}</span></p>
                    )}
                    <p className="col-span-2 text-[10px] text-amber-600">The provider can change this password later; you'll still see the updated one here.</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-3 pt-1 border-t border-brand-border">Other</p>
              <div className="space-y-3">
                <Field label="Notes">
                  <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className="input-field resize-none" placeholder="Payment terms, lead times, specialties..." />
                </Field>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="accent-primary w-4 h-4" />
                  <span className="text-[12px] text-brand-text">Active (appears in product form dropdown)</span>
                </label>
              </div>
            </div>
          </div>
        </EditModal>
      )}
    </>
  );
}
