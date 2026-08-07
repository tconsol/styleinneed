import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FolderOpen, ImagePlus, X } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { useConfirm } from '../../components/common/ConfirmDialog';
import StatusToggle from '../../components/common/StatusToggle';
import { useCategories, useProductTypes, CATALOG_KEYS } from '../../hooks/useCatalog';
import { categoryApi } from '../../api';
import type { Category } from '../../types';
import toast from 'react-hot-toast';

const empty = { name: '', productType: '', description: '', image: '', isActive: true, sortOrder: 0 };

// Distinct chip colour per product type (deterministic by slug).
const TYPE_COLORS: { bg: string; text: string }[] = [
  { bg: 'var(--c-primary-soft)', text: 'var(--c-primary-dark)' }, // indigo
  { bg: 'var(--c-warning-soft)', text: 'var(--c-warning)' }, // amber
  { bg: 'var(--c-success-soft)', text: 'var(--c-success)' }, // green
  { bg: 'var(--c-pink-soft)', text: 'var(--c-pink)' }, // pink
  { bg: 'var(--c-sky-soft)', text: '#075985' }, // sky
  { bg: 'var(--c-purple-soft)', text: 'var(--c-purple)' }, // purple
  { bg: 'var(--c-orange-soft)', text: 'var(--c-orange)' }, // orange
  { bg: 'var(--c-teal-soft)', text: 'var(--c-teal)' }, // teal
];
const typeColor = (slug?: string) => {
  if (!slug) return { bg: 'var(--c-th-bg)', text: 'var(--c-muted)' };
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return TYPE_COLORS[h % TYPE_COLORS.length];
};

export default function CategoriesPage() {
  const { data: categories = [], isLoading: loading } = useCategories();
  const allTypes = useProductTypes().data || [];
  const productTypes = allTypes.filter((t) => t.isActive);
  const typeLabel = (slug?: string) => allTypes.find((t) => t.slug === slug)?.name || slug || '—';
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: CATALOG_KEYS.categories });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const confirm = useConfirm();

  const openNew = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, productType: c.productType || '', description: c.description || '', image: c.image || '', isActive: c.isActive, sortOrder: c.sortOrder });
    setModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await categoryApi.uploadImage(fd);
      setForm((f) => ({ ...f, image: data.data.url }));
      toast.success('Image uploaded');
    } catch { /* error toast shown by api interceptor */ } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleImageRemove = () => {
    if (form.image) categoryApi.deleteImage(form.image).catch(() => {});
    setForm((f) => ({ ...f, image: '' }));
  };
  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete category?', message: 'This will permanently delete it from the database.', confirmText: 'Delete', danger: true }))) return;
    await categoryApi.delete(id).then(() => { toast.success('Category deleted'); refresh(); }).catch(() => { /* error toast shown by api interceptor */ });
  };

  const handleToggleStatus = async (c: Category) => {
    try {
      await categoryApi.update(c._id, { isActive: !c.isActive });
      toast.success(`${!c.isActive ? 'Activated' : 'Deactivated'}`);
      refresh();
    } catch { toast.error('Failed to update status'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productType) { toast.error('Select a product type'); return; }
    setSaving(true);
    try {
      if (editing) { await categoryApi.update(editing._id, form); toast.success('Category updated'); }
      else { await categoryApi.create(form); toast.success('Category created'); }
      setModal(false); refresh();
    } catch { /* error toast shown by api interceptor */ } finally { setSaving(false); }
  };

  return (
    <>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Categories</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">{categories.length} categories total</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-left pl-5" style={{ width: '48px' }}>#</th>
              <th className="th text-left" style={{ width: '200px' }}>Name</th>
              <th className="th text-left" style={{ width: '150px' }}>Product Type</th>
              <th className="th text-left">Description</th>
              <th className="th text-center" style={{ width: '80px' }}>Sort</th>
              <th className="th text-center" style={{ width: '100px' }}>Status</th>
              <th className="th text-center" style={{ width: '110px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" />
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <FolderOpen size={32} className="mx-auto mb-2 text-brand-border" />
                  <p className="text-[11px] text-brand-muted">No categories yet</p>
                </td>
              </tr>
            ) : categories.map((c, idx) => (
              <tr key={c._id}
                className="group transition-colors"
                style={{ borderBottom: '1px solid var(--c-border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-tr-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--c-surface)')}
              >
                {/* # */}
                <td className="pl-5 py-3 text-[10px] font-bold text-brand-muted/60">{idx + 1}</td>

                {/* Name */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    {c.image ? (
                      <img src={c.image} alt={c.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border" style={{ borderColor: 'var(--c-border)' }} loading="lazy" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, var(--c-primary-soft), var(--c-info-soft))' }}>
                        <FolderOpen size={13} style={{ color: 'var(--c-primary)' }} />
                      </div>
                    )}
                    <span className="text-[12px] font-semibold text-brand-text">{c.name}</span>
                  </div>
                </td>

                {/* Product Type */}
                <td className="px-3 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: typeColor(c.productType).bg, color: typeColor(c.productType).text }}>
                    {typeLabel(c.productType)}
                  </span>
                </td>

                {/* Description */}
                <td className="px-3 py-3 text-[11px] text-brand-muted max-w-xs">
                  <span className="line-clamp-1">{c.description || <span className="text-brand-border italic">No description</span>}</span>
                </td>

                {/* Sort */}
                <td className="px-3 py-3 text-center">
                  <span className="text-[11px] font-semibold text-brand-muted bg-brand-bg px-2 py-0.5 rounded-md">
                    {c.sortOrder}
                  </span>
                </td>

                {/* Status */}
                <td className="px-3 py-3 text-center">
                  <StatusToggle isActive={c.isActive} onToggle={() => void handleToggleStatus(c)} />
                </td>

                {/* Actions */}
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => openEdit(c)}
                      title="Edit"
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ color: 'var(--c-muted)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--c-primary-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-primary)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--c-muted)'; }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      title="Deactivate"
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ color: 'var(--c-muted)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--c-danger-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--c-danger)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--c-muted)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Category' : 'New Category'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Silk Sarees" required />
          </div>
          <div>
            <label className="input-label">Image</label>
            <div className="flex items-center gap-4">
              {form.image ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--c-border)' }}>
                  <img src={form.image} alt="Category" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    title="Remove image"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-brand-text/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center flex-shrink-0 text-brand-border" style={{ borderColor: 'var(--c-border)' }}>
                  <ImagePlus size={20} />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label
                  className={`inline-flex items-center gap-2 text-[11px] font-semibold px-4 py-2 rounded-lg cursor-pointer border transition-colors ${
                    uploading ? 'opacity-60 pointer-events-none' : 'hover:bg-brand-bg'
                  }`}
                  style={{ borderColor: 'var(--c-border)', color: 'var(--c-muted)' }}
                >
                  <ImagePlus size={13} />
                  {uploading ? 'Uploading...' : form.image ? 'Replace' : 'Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                </label>
                {form.image && (
                  <button type="button" onClick={handleImageRemove} className="text-[11px] font-medium text-red-500 hover:underline text-left">
                    Remove image
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--c-muted)' }}>Shown as the category tile on the storefront. JPG, PNG or WebP, max 2MB.</p>
          </div>
          <div>
            <label className="input-label">Product Type *</label>
            <Select value={form.productType} onChange={(v) => setForm({ ...form, productType: v })}
              placeholder="— Select type —"
              options={productTypes.map((t) => ({ value: t.slug, label: t.name }))} />
          </div>
          <div>
            <label className="input-label">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" placeholder="Brief description" />
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
              {saving ? 'Saving...' : editing ? 'Update Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
