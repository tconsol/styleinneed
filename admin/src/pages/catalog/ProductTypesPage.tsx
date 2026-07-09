import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Shapes } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useConfirm } from '../../components/common/ConfirmDialog';
import StatusToggle from '../../components/common/StatusToggle';
import { useProductTypes, CATALOG_KEYS } from '../../hooks/useCatalog';
import { productTypeApi } from '../../api';
import type { ProductType } from '../../types';
import toast from 'react-hot-toast';

const empty = { name: '', sortOrder: 0, isActive: true };

export default function ProductTypesPage() {
  const { data: types = [], isLoading: loading } = useProductTypes();
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: CATALOG_KEYS.productTypes });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ProductType | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const openNew = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (t: ProductType) => {
    setEditing(t);
    setForm({ name: t.name, sortOrder: t.sortOrder, isActive: t.isActive });
    setModal(true);
  };
  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete product type?', message: 'This will permanently delete it from the database.', confirmText: 'Delete', danger: true }))) return;
    await productTypeApi.delete(id).then(() => { toast.success('Product type deleted'); refresh(); }).catch(() => {});
  };

  const handleToggleStatus = async (t: ProductType) => {
    try {
      await productTypeApi.update(t._id, { isActive: !t.isActive });
      toast.success(`${!t.isActive ? 'Activated' : 'Deactivated'}`);
      refresh();
    } catch { toast.error('Failed to update status'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await productTypeApi.update(editing._id, form); toast.success('Product type updated'); }
      else { await productTypeApi.create(form); toast.success('Product type created'); }
      setModal(false); refresh();
    } catch {} finally { setSaving(false); }
  };

  return (
    <>
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Product Types</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">{types.length} types — Clothing, Jewellery, etc.</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={14} /> Add Type
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-left pl-5" style={{ width: '48px' }}>#</th>
              <th className="th text-left">Name</th>
              <th className="th text-left" style={{ width: '160px' }}>Slug</th>
              <th className="th text-center" style={{ width: '80px' }}>Sort</th>
              <th className="th text-center" style={{ width: '100px' }}>Status</th>
              <th className="th text-center" style={{ width: '110px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12">
                <span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" />
              </td></tr>
            ) : types.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16">
                <Shapes size={32} className="mx-auto mb-2 text-brand-border" />
                <p className="text-[11px] text-brand-muted">No product types yet</p>
              </td></tr>
            ) : types.map((t, idx) => (
              <tr key={t._id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td className="pl-5 py-3 text-[10px] font-bold text-brand-muted/60">{idx + 1}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' }}>
                      <Shapes size={13} style={{ color: '#4F46E5' }} />
                    </div>
                    <span className="text-[12px] font-semibold text-brand-text">{t.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-[11px] text-brand-muted font-mono">{t.slug}</td>
                <td className="px-3 py-3 text-center">
                  <span className="text-[11px] font-semibold text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md">{t.sortOrder}</span>
                </td>
                <td className="px-3 py-3 text-center">
                  <StatusToggle isActive={t.isActive} onToggle={() => void handleToggleStatus(t)} />
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(t)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: '#64748B' }}><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(t._id)} title="Deactivate" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: '#64748B' }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product Type' : 'New Product Type'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Jewellery" required />
          </div>
          <div>
            <label className="input-label">Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="input-field" min="0" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary w-4 h-4" />
            <span className="text-[12px] font-medium text-brand-text">Active</span>
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
