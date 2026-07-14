import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Upload } from 'lucide-react';
import { productApi, providerApi, sizeChartApi } from '../../api';
import { useCategories, useCollections, useProductTypes, useAttributes } from '../../hooks/useCatalog';
import Select from '../../components/common/Select';
import type { ProductVariant, Attribute, SizeChart } from '../../types';
import toast from 'react-hot-toast';
import { PageSpinner } from '../../components/common/Spinner';
import { colorNameFromHex, isHex } from '../../utils/colorName';

const skuCode = (s: string, n = 3) =>
  (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, n) || 'GEN';

interface FormState {
  name: string;
  shortDescription: string;
  description: string;
  productType: string;
  category: string;
  collections: string[];
  mrp: string;
  salePrice: string;
  usdMrp: string;
  usdSalePrice: string;
  returnDays: string;
  provider: string;
  images: string[];
  tags: string;
  attributes: Record<string, string[]>; // product-level
  weightGrams: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isActive: boolean;
  variants: ProductVariant[];
  metaTitle: string;
  metaDescription: string;
  sizeChartId: string;
}

const emptyForm: FormState = {
  name: '', shortDescription: '', description: '', productType: 'clothing', category: '', collections: [],
  mrp: '', salePrice: '', usdMrp: '', usdSalePrice: '', returnDays: '7', provider: '', images: [], tags: '',
  attributes: {}, weightGrams: '',
  isFeatured: false, isNewArrival: true, isBestSeller: false, isTrending: false, isActive: true,
  variants: [{ sku: '', stock: 0, attributes: {} }],
  metaTitle: '', metaDescription: '',
  sizeChartId: '',
};

const appliesTo = (a: Attribute, typeSlug: string) =>
  a.isActive && (a.productTypes.length === 0 || a.productTypes.includes(typeSlug));

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id && id !== 'new';

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit ? true : false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [providers, setProviders] = useState<{ _id: string; name: string; category: string }[]>([]);
  const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);

  // Cached catalog config (shared across pages — no refetch on revisit)
  const categories = useCategories().data || [];
  const collections = useCollections().data || [];
  const productTypes = (useProductTypes().data || []).filter((t) => t.isActive);
  const attributes = (useAttributes().data || []).filter((a) => a.isActive);

  // Load providers and size charts for dropdowns
  useEffect(() => {
    providerApi.getAllSimple().then(({ data }) => setProviders(data.data || [])).catch(() => {});
    sizeChartApi.getAll({ isActive: true }).then(({ data }) => setSizeCharts(data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    productApi.getById(id!).then(({ data }) => {
      const p = data.data;
      setForm({
        name: p.name, shortDescription: p.shortDescription, description: p.description,
        productType: p.productType || 'clothing',
        category: p.category?._id || '', collections: p.collections?.map((c: { _id: string }) => c._id) || [],
        mrp: String(p.mrp), salePrice: String(p.salePrice),
        usdMrp: p.usdMrp != null ? String(p.usdMrp) : '',
        usdSalePrice: p.usdSalePrice != null ? String(p.usdSalePrice) : '',
        returnDays: p.returnDays != null ? String(p.returnDays) : '7',
        provider: typeof p.provider === 'object' ? p.provider?._id || '' : p.provider || '',
        sizeChartId: typeof p.sizeChartId === 'object' ? p.sizeChartId?._id || '' : p.sizeChartId || '',
        images: p.images || [], tags: p.tags?.join(', ') || '',
        attributes: p.attributes || {},
        weightGrams: p.weightGrams != null ? String(p.weightGrams) : '',
        isFeatured: p.isFeatured, isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller,
        isTrending: p.isTrending, isActive: p.isActive,
        variants: p.variants?.length
          ? p.variants.map((v: ProductVariant) => ({ sku: v.sku, stock: v.stock, images: v.images, attributes: v.attributes || {} }))
          : emptyForm.variants,
        metaTitle: p.metaTitle || '', metaDescription: p.metaDescription || '',
      });
    }).catch(() => navigate('/products')).finally(() => setLoading(false));
  }, [id, isEdit]);

  // Attributes that apply to the chosen product type
  const productAttrs = useMemo(
    () => attributes.filter((a) => a.level === 'product' && appliesTo(a, form.productType)).sort((a, b) => a.sortOrder - b.sortOrder),
    [attributes, form.productType]
  );
  const variantAttrs = useMemo(
    () => attributes.filter((a) => a.level === 'variant' && appliesTo(a, form.productType)).sort((a, b) => a.sortOrder - b.sortOrder),
    [attributes, form.productType]
  );

  const removeImage = async (i: number, url: string) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }));
    productApi.deleteImage(url).catch(() => {}); // purge from bucket, best-effort
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      const { data } = await productApi.uploadImages(fd);
      setForm((prev) => ({ ...prev, images: [...prev.images, ...data.data.urls] }));
      toast.success(`${files.length} image(s) uploaded`);
    } catch {} finally { setUploading(false); }
  };

  // ── Product-level attribute setters ──
  const toggleProductAttr = (slug: string, value: string) =>
    setForm((prev) => {
      const cur = prev.attributes[slug] || [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, attributes: { ...prev.attributes, [slug]: next } };
    });
  const setProductAttrSingle = (slug: string, value: string) =>
    setForm((prev) => ({ ...prev, attributes: { ...prev.attributes, [slug]: value ? [value] : [] } }));

  // ── SKU preview (editable; server re-validates uniqueness) ──
  const catName = categories.find((c) => c._id === form.category)?.name || '';
  const genSku = (idx: number) =>
    `AVY-${skuCode(form.productType)}-${skuCode(catName)}-${Date.now().toString().slice(-5)}-${String(idx + 1).padStart(2, '0')}`;

  // Auto-fill blank variant SKUs once type + category are chosen, so the
  // generated SKU is visible in the field (admin can still edit it).
  useEffect(() => {
    if (!form.productType || !form.category) return;
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (v.sku?.trim() ? v : { ...v, sku: genSku(i) })),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productType, form.category]);

  // ── Variant builder state ──
  const [builderColor, setBuilderColor] = useState('');
  const [builderSizes, setBuilderSizes] = useState<Record<string, { stock: number; sku: string }>>({});

  const colorAttr = variantAttrs.find((a) => a.inputType === 'color');
  const sizeAttr = variantAttrs.find((a) => a.inputType !== 'color');

  const toggleBuilderSize = (sizeVal: string) =>
    setBuilderSizes((prev) => {
      const next = { ...prev };
      if (sizeVal in next) {
        delete next[sizeVal];
      } else {
        next[sizeVal] = { stock: 0, sku: genSku(Object.keys(prev).length) };
      }
      return next;
    });

  const setBuilderSizeStock = (sizeVal: string, stock: number) =>
    setBuilderSizes((prev) => ({ ...prev, [sizeVal]: { ...prev[sizeVal], stock } }));

  const setBuilderSizeSku = (sizeVal: string, sku: string) =>
    setBuilderSizes((prev) => ({ ...prev, [sizeVal]: { ...prev[sizeVal], sku } }));

  const addVariantGroup = () => {
    const entries = Object.entries(builderSizes);
    if (entries.length === 0) { toast.error('Select at least one size'); return; }
    const base = form.variants.filter((v) => v.sku?.trim()).length;
    const newVariants = entries.map(([size, { stock, sku }], idx) => ({
      sku: sku.trim() || genSku(base + idx),
      stock,
      attributes: {
        ...(colorAttr && builderColor ? { [colorAttr.slug]: builderColor } : {}),
        ...(sizeAttr ? { [sizeAttr.slug]: size } : {}),
      },
    }));
    setForm((prev) => ({ ...prev, variants: [...prev.variants.filter((v) => v.sku?.trim()), ...newVariants] }));
    setBuilderColor('');
    setBuilderSizes({});
  };

  // ── Variants (individual edits) ──
  const updateVariant = (i: number, key: 'sku' | 'stock', val: string | number) =>
    setForm((prev) => { const vs = [...prev.variants]; vs[i] = { ...vs[i], [key]: val }; return { ...prev, variants: vs }; });
  const removeVariant = (i: number) =>
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productType) { toast.error('Select a product type'); return; }
    if (!form.category) { toast.error('Select a category'); return; }
    if (form.images.length === 0) { toast.error('Add at least one image'); return; }
    // SKU is optional — blank ones are auto-generated server-side.

    setSaving(true);
    const payload = {
      ...form,
      mrp: Number(form.mrp),
      salePrice: Number(form.salePrice),
      usdMrp: form.usdMrp ? Number(form.usdMrp) : undefined,
      usdSalePrice: form.usdSalePrice ? Number(form.usdSalePrice) : undefined,
      returnDays: form.returnDays !== '' ? Number(form.returnDays) : 7,
      provider: form.provider || undefined,
      sizeChartId: form.sizeChartId || undefined,
      weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (isEdit) { await productApi.update(id!, payload); toast.success('Product updated'); }
      else { await productApi.create(payload); toast.success('Product created'); }
      navigate('/products');
    } catch {} finally { setSaving(false); }
  };

  if (loading) return <PageSpinner />;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic info */}
          <div className="card space-y-4">
            <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3">Basic Information</h2>
            <div>
              <label className="input-label">Product Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="input-label">Short Description *</label>
              <input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="input-label">Full Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className="input-field resize-none" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">MRP (₹) *</label>
                <input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="input-field" min="0" required />
              </div>
              <div>
                <label className="input-label">Sale Price (₹) *</label>
                <input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} className="input-field" min="0" required />
              </div>
              <div>
                <label className="input-label">MRP ($)</label>
                <input type="number" value={form.usdMrp} onChange={(e) => setForm({ ...form, usdMrp: e.target.value })} className="input-field" min="0" step="0.01" placeholder="Optional" />
              </div>
              <div>
                <label className="input-label">Sale Price ($)</label>
                <input type="number" value={form.usdSalePrice} onChange={(e) => setForm({ ...form, usdSalePrice: e.target.value })} className="input-field" min="0" step="0.01" placeholder="Optional" />
              </div>
            </div>
            <div>
              <label className="input-label">Provider / Supplier</label>
              <Select
                value={form.provider}
                onChange={(v) => setForm({ ...form, provider: v })}
                placeholder="— No provider selected —"
                options={[
                  { value: '', label: '— No provider —' },
                  ...providers.map((p) => ({ value: p._id, label: `${p.name} (${p.category})` })),
                ]}
              />
            </div>
            <div>
              <label className="input-label">Tags (comma separated)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-field" placeholder="silk, festive, bridal" />
            </div>
            <div>
              <label className="input-label">Return Window (days)</label>
              <input type="number" min="0" value={form.returnDays} onChange={(e) => setForm({ ...form, returnDays: e.target.value })} className="input-field" placeholder="7" />
              <p className="text-[11px] text-brand-muted mt-1">Shown on the product page. Set <b>0</b> for non-returnable items.</p>
            </div>
          </div>

          {/* Dynamic product-level attributes */}
          {(productAttrs.length > 0 || form.productType !== 'clothing') && (
            <div className="card space-y-4">
              <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3">Specifications</h2>
              {productAttrs.map((attr) => {
                const selected = form.attributes[attr.slug] || [];
                if (attr.inputType === 'select') {
                  return (
                    <div key={attr._id}>
                      <label className="input-label">{attr.name}</label>
                      <Select value={selected[0] || ''} onChange={(v) => setProductAttrSingle(attr.slug, v)}
                        placeholder={`— Select ${attr.name} —`}
                        options={attr.options.map((o) => ({ value: o.value, label: o.label }))} />
                    </div>
                  );
                }
                if (attr.inputType === 'color') {
                  return (
                    <div key={attr._id}>
                      <label className="input-label">{attr.name}</label>
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((o) => {
                          const active = selected.includes(o.value);
                          return (
                            <button key={o.value} type="button" onClick={() => toggleProductAttr(attr.slug, o.value)}
                              title={o.label}
                              className={`w-7 h-7 rounded-full border-2 transition-all ${active ? 'border-primary scale-110' : 'border-brand-border'}`}
                              style={{ background: o.hex || '#ccc' }} />
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                // chips / multiselect
                return (
                  <div key={attr._id}>
                    <label className="input-label">{attr.name}</label>
                    <div className="flex flex-wrap gap-2">
                      {attr.options.map((o) => {
                        const active = selected.includes(o.value);
                        return (
                          <button key={o.value} type="button" onClick={() => toggleProductAttr(attr.slug, o.value)}
                            className={`text-[11px] px-3 py-1.5 border rounded-full transition-colors ${active ? 'bg-primary text-white border-primary' : 'border-brand-border text-brand-muted hover:border-primary'}`}>
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {form.productType !== 'clothing' && (
                <div>
                  <label className="input-label">Weight (grams)</label>
                  <input type="number" step="0.01" min="0" value={form.weightGrams}
                    onChange={(e) => setForm({ ...form, weightGrams: e.target.value })}
                    className="input-field" placeholder="e.g. 12.5" />
                </div>
              )}
            </div>
          )}

          {/* Images */}
          <div className="card space-y-4">
            <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3">Product Images</h2>
            {form.images.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className="relative aspect-[3/4] bg-brand-bg">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button type="button"
                      onClick={() => removeImage(i, img)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white flex items-center justify-center text-xs">×</button>
                    {i === 0 && <span className="absolute bottom-1 left-1 bg-primary text-white text-[9px] px-1">Main</span>}
                  </div>
                ))}
              </div>
            )}
            <label className={`flex flex-col items-center justify-center border-2 border-dashed border-brand-border py-8 cursor-pointer hover:border-primary transition-colors ${uploading ? 'opacity-60' : ''}`}>
              <Upload size={24} className="text-brand-muted mb-2" />
              <span className="font-body text-sm text-brand-muted">{uploading ? 'Uploading...' : 'Click to upload images'}</span>
              <span className="font-body text-xs text-brand-muted mt-1">JPG, PNG, WebP — max 2MB each, auto-converted to WebP</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>

          {/* Variants */}
          <div className="card space-y-5">
            <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3">Variants & Inventory</h2>

            {/* ── Variant Builder ── */}
            <div className="rounded-xl border border-brand-border bg-brand-bg p-4 space-y-4">
              <p className="text-[11px] font-semibold text-brand-text uppercase tracking-wider">Add Variant Group</p>

              {/* Color picker */}
              {colorAttr && (
                <div>
                  <label className="input-label">
                    {colorAttr.name}
                    {isHex(builderColor) && <span className="ml-2 font-normal text-brand-muted">→ {colorNameFromHex(builderColor)}</span>}
                  </label>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {colorAttr.options.map((o) => (
                      <button key={o.value} type="button" onClick={() => setBuilderColor(builderColor === o.value ? '' : o.value)}
                        title={o.label}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${builderColor === o.value ? 'border-primary scale-110 shadow-md' : 'border-brand-border'}`}
                        style={{ background: o.hex || '#ccc' }} />
                    ))}
                    <span className="w-px h-6 bg-brand-border mx-1" />
                    <input type="color" value={isHex(builderColor) ? builderColor : '#000000'}
                      onChange={(e) => setBuilderColor(e.target.value)}
                      title="Pick a custom colour"
                      className="w-9 h-9 p-0 border border-brand-border rounded cursor-pointer bg-transparent" />
                    <input type="text" value={builderColor}
                      onChange={(e) => setBuilderColor(e.target.value)}
                      placeholder="#RRGGBB or name"
                      className="input-field flex-1 min-w-[120px]" />
                  </div>
                </div>
              )}

              {/* Size + stock multi-picker */}
              {sizeAttr && (
                <div>
                  <label className="input-label">Sizes & Stock</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1">
                    {sizeAttr.options.map((o) => {
                      const checked = o.value in builderSizes;
                      return (
                        <div key={o.value}
                          className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer select-none transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-brand-border bg-white hover:border-primary/40'}`}
                          onClick={() => toggleBuilderSize(o.value)}
                        >
                          <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${checked ? 'bg-primary border-primary' : 'border-brand-border'}`}>
                            {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>
                          <span className="text-[11px] font-medium text-brand-text flex-1">{o.label}</span>
                          {checked && (
                            <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number" min="0" value={builderSizes[o.value].stock}
                                onChange={(e) => { e.stopPropagation(); setBuilderSizeStock(o.value, Number(e.target.value)); }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Qty"
                                className="w-16 text-[11px] border border-brand-border rounded px-1.5 py-0.5 focus:outline-none focus:border-primary"
                              />
                              <input
                                type="text" value={builderSizes[o.value].sku}
                                onChange={(e) => { e.stopPropagation(); setBuilderSizeSku(o.value, e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="SKU"
                                className="w-16 text-[11px] border border-brand-border rounded px-1.5 py-0.5 focus:outline-none focus:border-primary font-mono"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!colorAttr && !sizeAttr && (
                <p className="text-[11px] text-brand-muted">No variant attributes defined for this product type. Add color/size attributes in the Attributes page first.</p>
              )}

              <div className="flex justify-end">
                <button type="button" onClick={addVariantGroup} className="btn-primary text-xs py-2 px-4 gap-1.5">
                  <Plus size={13} /> Add to Variants
                </button>
              </div>
            </div>

            {/* ── Existing Variants Grouped by Color ── */}
            {form.variants.filter((v) => v.sku?.trim()).length > 0 && (() => {
              const groups: Record<string, typeof form.variants[number][]> = {};
              form.variants.forEach((v) => {
                const colorKey = colorAttr ? (v.attributes?.[colorAttr.slug] || '') : '';
                if (!groups[colorKey]) groups[colorKey] = [];
                groups[colorKey].push(v);
              });
              return (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-brand-text uppercase tracking-wider">Added Variants ({form.variants.filter((v) => v.sku?.trim()).length})</p>
                  {Object.entries(groups).map(([colorVal, groupVariants]) => (
                    <div key={colorVal} className="rounded-xl border border-brand-border overflow-hidden">
                      {/* Color header */}
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-bg border-b border-brand-border">
                        {colorVal && (
                          <span className="w-4 h-4 rounded-full border border-white/40 shadow-sm flex-shrink-0"
                            style={{ background: isHex(colorVal) ? colorVal : (colorAttr?.options.find((o) => o.value === colorVal)?.hex || colorVal) }} />
                        )}
                        <span className="text-[11px] font-semibold text-brand-text">
                          {colorVal
                            ? (isHex(colorVal) ? colorNameFromHex(colorVal) : (colorAttr?.options.find((o) => o.value === colorVal)?.label || colorVal))
                            : 'No Color'}
                        </span>
                        <span className="text-[10px] text-brand-muted ml-1">({groupVariants.length} size{groupVariants.length !== 1 ? 's' : ''})</span>
                      </div>
                      {/* Size rows */}
                      {groupVariants.map((v) => {
                        const vi = form.variants.indexOf(v);
                        const sizeVal = sizeAttr ? (v.attributes?.[sizeAttr.slug] || '') : '';
                        const sizeLabel = sizeAttr?.options.find((o) => o.value === sizeVal)?.label || sizeVal || '—';
                        return (
                          <div key={vi} className="grid grid-cols-12 gap-3 items-center px-4 py-2.5 border-b border-brand-border last:border-0 bg-white hover:bg-brand-bg/50 transition-colors">
                            <div className="col-span-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-brand-bg border border-brand-border text-[11px] font-semibold text-brand-text">{sizeLabel}</span>
                            </div>
                            <div className="col-span-2">
                              <label className="input-label text-[9px]">Stock</label>
                              <input type="number" min="0" value={v.stock}
                                onChange={(e) => updateVariant(vi, 'stock', Number(e.target.value))}
                                className="input-field py-1 text-[11px]" />
                            </div>
                            <div className="col-span-6">
                              <label className="input-label text-[9px]">SKU</label>
                              <input value={v.sku}
                                onChange={(e) => updateVariant(vi, 'sku', e.target.value)}
                                className="input-field py-1 text-[11px] font-mono" />
                            </div>
                            <div className="col-span-2 flex justify-end">
                              <button type="button" onClick={() => removeVariant(vi)}
                                className="p-1.5 rounded hover:bg-red-50 text-brand-muted hover:text-red-500 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* SEO */}
          <div className="card space-y-4">
            <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3">SEO</h2>
            <div>
              <label className="input-label">Meta Title</label>
              <input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} className="input-field" placeholder="Optional — defaults to product name" />
            </div>
            <div>
              <label className="input-label">Meta Description</label>
              <textarea value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} rows={2} className="input-field resize-none" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Catalog */}
          <div className="card space-y-4">
            <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3">Catalog</h2>
            <div>
              <label className="input-label">Product Type *</label>
              <Select value={form.productType} onChange={(v) => setForm({ ...form, productType: v })}
                placeholder="— Select type —"
                options={productTypes.map((t) => ({ value: t.slug, label: t.name }))} />
            </div>
            <div>
              <label className="input-label">Category *</label>
              <Select value={form.category} onChange={(v) => setForm({ ...form, category: v })}
                placeholder="— Select category —"
                options={categories.map((c) => ({ value: c._id, label: c.name }))} />
            </div>
            <div>
              <label className="input-label">Size Chart</label>
              <Select
                value={form.sizeChartId}
                onChange={(v) => setForm({ ...form, sizeChartId: v })}
                placeholder="— No size chart —"
                options={[
                  { value: '', label: '— None —' },
                  ...sizeCharts.map((sc) => ({ value: sc._id, label: sc.name })),
                ]}
              />
            </div>
            <div>
              <label className="input-label">Collections</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {collections.map((col) => (
                  <label key={col._id} className="flex items-center gap-2 font-body text-sm cursor-pointer">
                    <input type="checkbox" checked={form.collections.includes(col._id)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        collections: e.target.checked ? [...prev.collections, col._id] : prev.collections.filter((id) => id !== col._id),
                      }))}
                      className="accent-primary" />
                    {col.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="card space-y-3">
            <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3">Visibility</h2>
            {([
              { key: 'isActive', label: 'Active (visible on store)' },
              { key: 'isNewArrival', label: 'New Arrival' },
              { key: 'isFeatured', label: 'Featured' },
              { key: 'isBestSeller', label: 'Best Seller' },
              { key: 'isTrending', label: 'Trending' },
            ] as { key: keyof FormState; label: string }[]).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form[key] as boolean}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="accent-primary w-4 h-4" />
                <span className="font-body text-sm">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
              {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </button>
            <button type="button" onClick={() => navigate('/products')} className="btn-outline w-full justify-center">Cancel</button>
          </div>
        </div>
      </div>
    </form>
  );
}
