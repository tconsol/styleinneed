import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Layers, Star } from 'lucide-react';
import StatusToggle from '../../components/common/StatusToggle';
import Modal from '../../components/common/Modal';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useCollections, CATALOG_KEYS } from '../../hooks/useCatalog';
import { collectionApi } from '../../api';
import type { Collection } from '../../types';
import toast from 'react-hot-toast';

const empty = { name: '', description: '', isActive: true, isFeatured: false, sortOrder: 0 };

function ActionBtn({ onClick, variant }: { onClick: () => void; variant: 'edit' | 'delete' }) {
  const edit = variant === 'edit';
  return (
    <button onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
      style={{ color: 'var(--c-muted)' }}
      onMouseEnter={(e) => { const el = e.currentTarget; el.style.background = edit ? 'var(--c-primary-soft)' : 'var(--c-danger-soft)'; el.style.color = edit ? 'var(--c-primary)' : 'var(--c-danger)'; }}
      onMouseLeave={(e) => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.color = 'var(--c-muted)'; }}>
      {edit ? <Edit2 size={13} /> : <Trash2 size={13} />}
    </button>
  );
}

export default function CollectionsPage() {
  const { data: collections = [], isLoading: loading } = useCollections();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: CATALOG_KEYS.collections });
  const confirm = useConfirm();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (c: Collection) => { setEditing(c); setForm({ name: c.name, description: c.description || '', isActive: c.isActive, isFeatured: c.isFeatured, sortOrder: c.sortOrder }); setModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await collectionApi.update(editing._id, form); toast.success('Collection updated'); }
      else { await collectionApi.create(form); toast.success('Collection created'); }
      setModal(false); refresh();
    } catch {} finally { setSaving(false); }
  };

  const handleToggleStatus = async (c: Collection) => {
    try {
      await collectionApi.update(c._id, { isActive: !c.isActive });
      toast.success(`${!c.isActive ? 'Activated' : 'Deactivated'}`);
      refresh();
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-bold text-brand-text">Collections</h1>
            <p className="text-[10px] text-brand-muted mt-0.5">{collections.length} collections total</p>
          </div>
          <button onClick={openNew} className="btn-primary"><Plus size={14} /> Add Collection</button>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
                <th className="th text-left pl-5" style={{ width: '44px' }}>#</th>
                <th className="th text-left">Name</th>
                <th className="th text-left">Description</th>
                <th className="th text-center" style={{ width: '90px' }}>Sort</th>
                <th className="th text-center" style={{ width: '90px' }}>Featured</th>
                <th className="th text-center" style={{ width: '100px' }}>Status</th>
                <th className="th text-center" style={{ width: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
              ) : collections.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16"><Layers size={32} className="mx-auto mb-2 text-brand-border" /><p className="text-[11px] text-brand-muted">No collections yet</p></td></tr>
              ) : collections.map((c, idx) => (
                <tr key={c._id} className="group transition-colors" style={{ borderBottom: '1px solid var(--c-border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}>
                  <td className="pl-5 py-3 text-[10px] font-bold text-brand-muted/60">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--c-primary-soft), var(--c-info-soft))' }}>
                        <Layers size={13} style={{ color: 'var(--c-primary)' }} />
                      </div>
                      <span className="text-[12px] font-semibold text-brand-text">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-brand-muted max-w-xs"><span className="line-clamp-1">{c.description || <span className="italic text-brand-border">No description</span>}</span></td>
                  <td className="px-3 py-3 text-center"><span className="text-[11px] font-semibold text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md">{c.sortOrder}</span></td>
                  <td className="px-3 py-3 text-center">
                    {c.isFeatured
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-700"><Star size={9} fill="currentColor" />Featured</span>
                      : <span className="text-[10px] text-brand-muted">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <StatusToggle isActive={c.isActive} onToggle={() => void handleToggleStatus(c)} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ActionBtn onClick={() => openEdit(c)} variant="edit" />
                      <ActionBtn onClick={async () => { if (!(await confirm({ title: 'Delete collection?', message: 'This will permanently delete it.', confirmText: 'Delete', danger: true }))) return; await collectionApi.delete(c._id); toast.success('Deleted'); refresh(); }} variant="delete" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Collection' : 'New Collection'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="input-label">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Wedding Collection" required /></div>
          <div><label className="input-label">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" /></div>
          <div><label className="input-label">Sort Order</label><input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="input-field" min="0" /></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary w-4 h-4" /><span className="text-[12px] font-medium">Active</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="accent-primary w-4 h-4" /><span className="text-[12px] font-medium">Featured</span></label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
