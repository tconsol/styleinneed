import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, SlidersHorizontal, X } from 'lucide-react';
import StatusToggle from '../../components/common/StatusToggle';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { useAttributes, useProductTypes, CATALOG_KEYS } from '../../hooks/useCatalog';
import { attributeApi } from '../../api';
import type { Attribute, AttributeOption } from '../../types';
import toast from 'react-hot-toast';

type FormState = {
  name: string;
  level: 'product' | 'variant';
  inputType: 'select' | 'multiselect' | 'chips' | 'color';
  options: AttributeOption[];
  productTypes: string[];
  isFilterable: boolean;
  isActive: boolean;
  sortOrder: number;
};

const empty: FormState = {
  name: '', level: 'product', inputType: 'chips', options: [],
  productTypes: [], isFilterable: true, isActive: true, sortOrder: 0,
};

export default function AttributesPage() {
  const { data: attributes = [], isLoading: loading } = useAttributes();
  const types = useProductTypes().data || [];
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: CATALOG_KEYS.attributes });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Attribute | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  const openNew = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (a: Attribute) => {
    setEditing(a);
    setForm({
      name: a.name, level: a.level, inputType: a.inputType,
      options: a.options || [], productTypes: a.productTypes || [],
      isFilterable: a.isFilterable, isActive: a.isActive, sortOrder: a.sortOrder,
    });
    setModal(true);
  };
  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete attribute?', message: 'This will permanently delete it from the database.', confirmText: 'Delete', danger: true }))) return;
    await attributeApi.delete(id).then(() => { toast.success('Attribute deleted'); refresh(); }).catch(() => {});
  };

  const handleToggleStatus = async (a: Attribute) => {
    try {
      await attributeApi.update(a._id, { isActive: !a.isActive });
      toast.success(`${!a.isActive ? 'Activated' : 'Deactivated'}`);
      refresh();
    } catch { toast.error('Failed to update status'); }
  };

  // Option editor helpers
  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, { label: '', value: '', hex: '', sortOrder: f.options.length }] }));
  const updateOption = (i: number, key: keyof AttributeOption, val: string | number) =>
    setForm((f) => { const o = [...f.options]; o[i] = { ...o[i], [key]: val }; return { ...f, options: o }; });
  const removeOption = (i: number) => setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));

  const toggleType = (slug: string) =>
    setForm((f) => ({ ...f, productTypes: f.productTypes.includes(slug) ? f.productTypes.filter((s) => s !== slug) : [...f.productTypes, slug] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // auto-fill option value from label when blank
    const payload = {
      ...form,
      options: form.options
        .filter((o) => o.label.trim())
        .map((o, i) => ({ ...o, value: o.value.trim() || o.label.trim(), sortOrder: i })),
    };
    setSaving(true);
    try {
      if (editing) { await attributeApi.update(editing._id, payload); toast.success('Attribute updated'); }
      else { await attributeApi.create(payload); toast.success('Attribute created'); }
      setModal(false); refresh();
    } catch {} finally { setSaving(false); }
  };

  return (
    <>
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Attributes</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">{attributes.length} attributes — Metal, Purity, Size, Colour, etc.</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={14} /> Add Attribute
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
              <th className="th text-left pl-5">Name</th>
              <th className="th text-left" style={{ width: '90px' }}>Level</th>
              <th className="th text-left" style={{ width: '100px' }}>Input</th>
              <th className="th text-center" style={{ width: '80px' }}>Options</th>
              <th className="th text-left">Applies To</th>
              <th className="th text-center" style={{ width: '90px' }}>Filter</th>
              <th className="th text-center" style={{ width: '90px' }}>Status</th>
              <th className="th text-center" style={{ width: '90px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12">
                <span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" />
              </td></tr>
            ) : attributes.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16">
                <SlidersHorizontal size={32} className="mx-auto mb-2 text-brand-border" />
                <p className="text-[11px] text-brand-muted">No attributes yet</p>
              </td></tr>
            ) : attributes.map((a) => (
              <tr key={a._id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td className="pl-5 py-3">
                  <span className="text-[12px] font-semibold text-brand-text">{a.name}</span>
                  <span className="text-[10px] text-brand-muted font-mono ml-1.5">{a.slug}</span>
                </td>
                <td className="px-3 py-3 text-[11px] capitalize text-brand-muted">{a.level}</td>
                <td className="px-3 py-3 text-[11px] capitalize text-brand-muted">{a.inputType}</td>
                <td className="px-3 py-3 text-center text-[11px] text-brand-muted">{a.options?.length || 0}</td>
                <td className="px-3 py-3 text-[10px] text-brand-muted">
                  {a.productTypes?.length ? a.productTypes.join(', ') : <span className="italic">All types</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${a.isFilterable ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                </td>
                <td className="px-3 py-3 text-center">
                  <StatusToggle isActive={a.isActive} onToggle={() => void handleToggleStatus(a)} />
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(a)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: '#64748B' }}><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(a._id)} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: '#64748B' }}><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Attribute' : 'New Attribute'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="e.g. Metal" required />
            </div>
            <div>
              <label className="input-label">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="input-field" min="0" />
            </div>
            <div>
              <label className="input-label">Level *</label>
              <Select
                value={form.level}
                onChange={(v) => setForm({ ...form, level: v as FormState['level'] })}
                options={[
                  { value: 'product', label: 'Product (e.g. Metal, Occasion)' },
                  { value: 'variant', label: 'Variant (e.g. Size, Colour)' },
                ]}
              />
            </div>
            <div>
              <label className="input-label">Input Type *</label>
              <Select
                value={form.inputType}
                onChange={(v) => setForm({ ...form, inputType: v as FormState['inputType'] })}
                options={[
                  { value: 'chips', label: 'Chips (multi)' },
                  { value: 'multiselect', label: 'Multi-select' },
                  { value: 'select', label: 'Single select' },
                  { value: 'color', label: 'Colour swatch' },
                ]}
              />
            </div>
          </div>

          {/* Applies to */}
          <div>
            <label className="input-label">Applies To Product Types <span className="text-brand-muted font-normal">(none = all types)</span></label>
            <div className="flex flex-wrap gap-2">
              {types.map((t) => {
                const active = form.productTypes.includes(t.slug);
                return (
                  <button key={t._id} type="button" onClick={() => toggleType(t.slug)}
                    className={`text-[11px] px-3 py-1.5 border rounded-full transition-colors ${active ? 'bg-primary text-white border-primary' : 'border-brand-border text-brand-muted hover:border-primary'}`}>
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label mb-0">Options</label>
              <button type="button" onClick={addOption} className="btn-outline text-[11px] py-1 px-2.5"><Plus size={12} /> Add Option</button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {form.options.length === 0 && <p className="text-[11px] text-brand-muted italic">No options yet.</p>}
              {form.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={o.label} onChange={(e) => updateOption(i, 'label', e.target.value)} className="input-field flex-1" placeholder="Label (e.g. 1 Gram Gold)" />
                  <input value={o.value} onChange={(e) => updateOption(i, 'value', e.target.value)} className="input-field flex-1" placeholder="Value (defaults to label)" />
                  {form.inputType === 'color' && (
                    <input type="color" value={o.hex || '#000000'} onChange={(e) => updateOption(i, 'hex', e.target.value)} className="w-10 h-9 border border-brand-border rounded cursor-pointer flex-shrink-0" />
                  )}
                  <button type="button" onClick={() => removeOption(i)} className="text-red-500 hover:text-red-700 flex-shrink-0"><X size={15} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={form.isFilterable} onChange={(e) => setForm({ ...form, isFilterable: e.target.checked })} className="accent-primary w-4 h-4" />
              <span className="text-[12px] font-medium text-brand-text">Show as storefront filter</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary w-4 h-4" />
              <span className="text-[12px] font-medium text-brand-text">Active</span>
            </label>
          </div>

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
