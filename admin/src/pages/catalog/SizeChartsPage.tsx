import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Ruler, X } from 'lucide-react';
import { sizeChartApi } from '../../api';
import type { SizeChart, SizeChartRow } from '../../types';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { useConfirm } from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const PRODUCT_TYPES = [
  { label: 'Sarees', value: 'sarees' },
  { label: 'Kurtis / Tops', value: 'kurtis' },
  { label: 'Pants / Bottoms', value: 'pants' },
  { label: 'Lehengas', value: 'lehengas' },
  { label: 'Blouses', value: 'blouses' },
  { label: 'Jewelry', value: 'jewelry' },
  { label: 'Clothing (General)', value: 'clothing' },
];

interface FormState {
  name: string;
  productTypes: string[];
  columns: string[];
  unit: 'cm' | 'inches';
  rows: SizeChartRow[];
  isActive: boolean;
}

const empty: FormState = {
  name: '', productTypes: [], columns: ['Bust', 'Waist', 'Hip'], unit: 'cm',
  rows: [
    { size: 'XS', values: ['', '', ''] },
    { size: 'S', values: ['', '', ''] },
    { size: 'M', values: ['', '', ''] },
    { size: 'L', values: ['', '', ''] },
    { size: 'XL', values: ['', '', ''] },
    { size: 'XXL', values: ['', '', ''] },
  ],
  isActive: true,
};

export default function SizeChartsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { data: charts = [], isLoading } = useQuery<SizeChart[]>({
    queryKey: ['size-charts'],
    queryFn: () => sizeChartApi.getAll().then((r) => r.data.data),
  });

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SizeChart | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['size-charts'] });

  const openNew = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (c: SizeChart) => {
    setEditing(c);
    setForm({
      name: c.name,
      productTypes: c.productTypes || [],
      columns: c.columns,
      unit: c.unit,
      rows: c.rows,
      isActive: c.isActive,
    });
    setModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete size chart?', message: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    await sizeChartApi.delete(id).then(() => { toast.success('Deleted'); refresh(); }).catch(() => toast.error('Failed to delete'));
  };

  // Column helpers
  const addColumn = () => {
    setForm((f) => ({
      ...f,
      columns: [...f.columns, ''],
      rows: f.rows.map((r) => ({ ...r, values: [...r.values, ''] })),
    }));
  };
  const updateColumn = (i: number, val: string) => {
    setForm((f) => { const c = [...f.columns]; c[i] = val; return { ...f, columns: c }; });
  };
  const removeColumn = (i: number) => {
    setForm((f) => ({
      ...f,
      columns: f.columns.filter((_, idx) => idx !== i),
      rows: f.rows.map((r) => ({ ...r, values: r.values.filter((_, idx) => idx !== i) })),
    }));
  };

  // Row helpers
  const addRow = () => {
    setForm((f) => ({
      ...f,
      rows: [...f.rows, { size: '', values: Array(f.columns.length).fill('') }],
    }));
  };
  const updateRowSize = (ri: number, val: string) => {
    setForm((f) => { const rows = [...f.rows]; rows[ri] = { ...rows[ri], size: val }; return { ...f, rows }; });
  };
  const updateCell = (ri: number, ci: number, val: string) => {
    setForm((f) => {
      const rows = [...f.rows];
      const vals = [...rows[ri].values];
      vals[ci] = val;
      rows[ri] = { ...rows[ri], values: vals };
      return { ...f, rows };
    });
  };
  const removeRow = (ri: number) => {
    setForm((f) => ({ ...f, rows: f.rows.filter((_, i) => i !== ri) }));
  };

  const toggleType = (val: string) => {
    setForm((f) => ({
      ...f,
      productTypes: f.productTypes.includes(val) ? f.productTypes.filter((s) => s !== val) : [...f.productTypes, val],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.columns.some((c) => !c.trim())) { toast.error('Column names cannot be empty'); return; }
    setSaving(true);
    try {
      const payload = { ...form, columns: form.columns.map((c) => c.trim()) };
      if (editing) {
        await sizeChartApi.update(editing._id, payload);
        toast.success('Size chart updated');
      } else {
        await sizeChartApi.create(payload);
        toast.success('Size chart created');
      }
      refresh();
      setModal(false);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--c-text)' }}>Size Charts</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--c-muted)' }}>
            Create reusable size charts for different product types.
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ background: 'var(--c-primary)' }}>
          <Plus size={16} /> New Chart
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16" style={{ color: 'var(--c-muted)' }}>Loading…</div>
      ) : charts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: 'var(--c-muted)' }}>
          <Ruler size={40} className="opacity-30" />
          <p className="text-sm">No size charts yet. Create one to assign to products.</p>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ background: 'var(--c-primary)' }}>
            <Plus size={14} /> Create Size Chart
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {charts.map((c) => (
            <div key={c._id} className="rounded-xl p-5 flex items-start gap-4 border"
              style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--c-primary-fade, rgba(79,70,229,0.1))' }}>
                <Ruler size={18} style={{ color: 'var(--c-primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>{c.name}</span>
                  {!c.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--c-border)', color: 'var(--c-muted)' }}>Inactive</span>
                  )}
                </div>
                {c.productTypes?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.productTypes.map((pt) => (
                      <span key={pt} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--c-primary-fade, rgba(79,70,229,0.08))', color: 'var(--c-primary)' }}>
                        {PRODUCT_TYPES.find((t) => t.value === pt)?.label ?? pt}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--c-muted)' }}>
                  {c.rows.length} sizes · {c.columns.join(', ')} · {c.unit}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(c)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 transition-colors"
                  style={{ color: 'var(--c-muted)' }}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(c._id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Size Chart' : 'New Size Chart'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name + Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Chart Name *</label>
              <input className="input-field" placeholder="e.g., Kurtis Standard" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="input-label">Unit</label>
              <Select value={form.unit}
                onChange={(v) => setForm((f) => ({ ...f, unit: v as 'cm' | 'inches' }))}
                options={[{ value: 'cm', label: 'cm' }, { value: 'inches', label: 'inches' }]} />
            </div>
          </div>

          {/* Product Types */}
          <div>
            <label className="input-label">Applicable Product Types</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {PRODUCT_TYPES.map((pt) => {
                const active = form.productTypes.includes(pt.value);
                return (
                  <button type="button" key={pt.value} onClick={() => toggleType(pt.value)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border transition-all"
                    style={{
                      background: active ? 'var(--c-primary)' : 'var(--c-surface)',
                      color: active ? '#fff' : 'var(--c-muted)',
                      borderColor: active ? 'var(--c-primary)' : 'var(--c-border)',
                    }}>
                    {pt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label mb-0">Measurement Columns *</label>
              <button type="button" onClick={addColumn}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg"
                style={{ color: 'var(--c-primary)', background: 'var(--c-primary-fade, rgba(79,70,229,0.08))' }}>
                <Plus size={12} /> Add Column
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.columns.map((col, i) => (
                <div key={i} className="flex items-center gap-1 border rounded-lg px-2" style={{ borderColor: 'var(--c-border)' }}>
                  <input
                    className="bg-transparent outline-none text-sm py-1.5 w-24 font-medium"
                    style={{ color: 'var(--c-text)' }}
                    value={col}
                    onChange={(e) => updateColumn(i, e.target.value)}
                    placeholder="Column name"
                    required
                  />
                  {form.columns.length > 1 && (
                    <button type="button" onClick={() => removeColumn(i)} className="text-red-400 hover:text-red-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rows Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="input-label mb-0">Size Rows</label>
              <button type="button" onClick={addRow}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg"
                style={{ color: 'var(--c-primary)', background: 'var(--c-primary-fade, rgba(79,70,229,0.08))' }}>
                <Plus size={12} /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--c-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--c-bg)' }}>
                    <th className="text-left px-3 py-2 font-medium text-xs" style={{ color: 'var(--c-muted)', width: 80 }}>SIZE</th>
                    {form.columns.map((col, i) => (
                      <th key={i} className="text-left px-3 py-2 font-medium text-xs" style={{ color: 'var(--c-muted)', minWidth: 90 }}>{col || `Col ${i + 1}`}</th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {form.rows.map((row, ri) => (
                    <tr key={ri} className="border-t" style={{ borderColor: 'var(--c-border)' }}>
                      <td className="px-3 py-1.5">
                        <input
                          className="input py-1 px-2 text-xs font-semibold w-full"
                          value={row.size}
                          onChange={(e) => updateRowSize(ri, e.target.value)}
                          placeholder="e.g., M"
                        />
                      </td>
                      {form.columns.map((_, ci) => (
                        <td key={ci} className="px-3 py-1.5">
                          <input
                            className="input py-1 px-2 text-xs w-full"
                            value={row.values[ci] ?? ''}
                            onChange={(e) => updateCell(ri, ci, e.target.value)}
                            placeholder="—"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-600">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 accent-primary" />
            <span className="text-sm" style={{ color: 'var(--c-text)' }}>Active</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-outline" disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Chart'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
