import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Upload, ImageIcon, X } from 'lucide-react';
import { productApi, providerApi, sizeChartApi } from '../../api';
import { useAuthStore } from '../../stores/authStore';
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
  const isProvider = useAuthStore((s) => s.user?.role) === 'provider';

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

  // Categories + size charts that belong to the selected product type (empty
  // productType on the record = applies to all types).
  const categoriesForType = useMemo(
    () => categories.filter((c) => !(c as { productType?: string }).productType || (c as { productType?: string }).productType === form.productType),
    [categories, form.productType]
  );
  const sizeChartsForType = useMemo(
    () => sizeCharts.filter((sc) => !sc.productTypes?.length || sc.productTypes.includes(form.productType)),
    [sizeCharts, form.productType]
  );

  // When the type changes, drop a selected category / size chart that no longer
  // belongs to it (guarded so it doesn't clear before the lists have loaded).
  useEffect(() => {
    if (categories.length) {
      setForm((prev) => (prev.category && !categoriesForType.some((c) => c._id === prev.category) ? { ...prev, category: '' } : prev));
    }
    if (sizeCharts.length) {
      setForm((prev) => (prev.sizeChartId && !sizeChartsForType.some((sc) => sc._id === prev.sizeChartId) ? { ...prev, sizeChartId: '' } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productType, categories.length, sizeCharts.length]);

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

  // ── Per-colour variant images ──
  // Images live on each variant; a colour group shares one image set, so we
  // apply changes to every variant that shares the group's colour value.
  const [imgGroup, setImgGroup] = useState<string | null>(null); // colour currently uploading
  const inGroup = (v: ProductVariant, colorVal: string) =>
    (colorAttr ? (v.attributes?.[colorAttr.slug] || '') : '') === colorVal;

  const appendGroupImages = (colorVal: string, urls: string[]) =>
    setForm((prev) => ({ ...prev, variants: prev.variants.map((v) => inGroup(v, colorVal) ? { ...v, images: [...(v.images || []), ...urls] } : v) }));
  const removeGroupImage = (colorVal: string, url: string) =>
    setForm((prev) => ({ ...prev, variants: prev.variants.map((v) => inGroup(v, colorVal) ? { ...v, images: (v.images || []).filter((u) => u !== url) } : v) }));

  const uploadGroupImages = async (colorVal: string, files: FileList | null) => {
    if (!files?.length) return;
    setImgGroup(colorVal);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      const { data } = await productApi.uploadImages(fd);
      appendGroupImages(colorVal, data.data.urls);
    } catch { /* interceptor toasts */ } finally { setImgGroup(null); }
  };

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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-24">
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
            {!isProvider && (
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
            )}
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
            <div className="rounded-2xl p-5 space-y-5" style={{ background: 'var(--c-primary-soft)', border: '1px solid var(--c-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--c-surface)', color: 'var(--c-primary)', border: '1px solid var(--c-border)' }}>
                  <Plus size={15} />
                </div>
                <p className="text-[12px] font-bold text-brand-text uppercase tracking-wider">Add Variant Group</p>
              </div>

              {/* Color picker */}
              {colorAttr && (
                <div>
                  <label className="input-label flex items-center gap-2">
                    <span>{colorAttr.name}</span>
                    {builderColor && (
                      <span className="inline-flex items-center gap-1 font-normal text-brand-muted">
                        <span className="w-3.5 h-3.5 rounded-full border border-brand-border" style={{ background: isHex(builderColor) ? builderColor : (colorAttr.options.find((o) => o.value === builderColor)?.hex || builderColor) }} />
                        {isHex(builderColor) ? colorNameFromHex(builderColor) : (colorAttr.options.find((o) => o.value === builderColor)?.label || builderColor)}
                      </span>
                    )}
                  </label>
                  <div className="flex flex-wrap items-center gap-2.5 mt-2">
                    {colorAttr.options.map((o) => {
                      const active = builderColor === o.value;
                      return (
                        <button key={o.value} type="button" onClick={() => setBuilderColor(active ? '' : o.value)} title={o.label}
                          className="w-9 h-9 rounded-full transition-all flex items-center justify-center"
                          style={{ background: o.hex || '#ccc', outline: active ? '2px solid var(--c-primary)' : '1px solid var(--c-border)', outlineOffset: 2, transform: active ? 'scale(1.08)' : 'none' }}>
                          {active && <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </button>
                      );
                    })}
                    <span className="w-px h-7 mx-1" style={{ background: 'var(--c-border)' }} />
                    <div className="flex items-center gap-2 flex-1 min-w-[180px] px-2 py-1.5 rounded-lg" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                      <input type="color" value={isHex(builderColor) ? builderColor : '#000000'} onChange={(e) => setBuilderColor(e.target.value)} title="Pick a custom colour"
                        className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent flex-shrink-0" />
                      <input type="text" value={builderColor} onChange={(e) => setBuilderColor(e.target.value)} placeholder="Custom: #RRGGBB or name"
                        className="flex-1 bg-transparent outline-none text-[12px] text-brand-text placeholder:text-brand-muted/70" />
                    </div>
                  </div>
                </div>
              )}

              {/* Size + stock multi-picker */}
              {sizeAttr && (
                <div>
                  <label className="input-label">Sizes &amp; Stock <span className="font-normal text-brand-muted">— tick a size, then set qty + SKU</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                    {sizeAttr.options.map((o) => {
                      const checked = o.value in builderSizes;
                      return (
                        <div key={o.value} onClick={() => toggleBuilderSize(o.value)}
                          className="rounded-xl p-2.5 cursor-pointer select-none transition-all"
                          style={{ background: 'var(--c-surface)', border: `1.5px solid ${checked ? 'var(--c-primary)' : 'var(--c-border)'}` }}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: checked ? 'var(--c-primary)' : 'transparent', border: `1.5px solid ${checked ? 'var(--c-primary)' : 'var(--c-border)'}` }}>
                              {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                            <span className="text-[12px] font-semibold text-brand-text">{o.label}</span>
                          </div>
                          {checked && (
                            <div className="flex gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                              <input type="number" min="0" value={builderSizes[o.value].stock}
                                onChange={(e) => setBuilderSizeStock(o.value, Number(e.target.value))} placeholder="Qty"
                                className="w-full input-field !py-1 text-[11px]" />
                              <input type="text" value={builderSizes[o.value].sku}
                                onChange={(e) => setBuilderSizeSku(o.value, e.target.value)} placeholder="SKU"
                                className="w-full input-field !py-1 text-[11px] font-mono" />
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

              <button type="button" onClick={addVariantGroup} className="btn-primary w-full justify-center gap-1.5">
                <Plus size={15} /> Add to Variants
              </button>
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
                  {Object.entries(groups).map(([colorVal, groupVariants]) => {
                    const groupImages = groupVariants[0]?.images || [];
                    const colorLabel = colorVal
                      ? (isHex(colorVal) ? colorNameFromHex(colorVal) : (colorAttr?.options.find((o) => o.value === colorVal)?.label || colorVal))
                      : 'No Color';
                    return (
                    <div key={colorVal} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
                      {/* Color header */}
                      <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--c-bg)', borderBottom: '1px solid var(--c-border)' }}>
                        {colorVal && (
                          <span className="w-5 h-5 rounded-full border-2 border-white shadow flex-shrink-0"
                            style={{ background: isHex(colorVal) ? colorVal : (colorAttr?.options.find((o) => o.value === colorVal)?.hex || colorVal) }} />
                        )}
                        <span className="text-[12px] font-bold text-brand-text">{colorLabel}</span>
                        <span className="text-[10px] text-brand-muted ml-1">{groupVariants.length} size{groupVariants.length !== 1 ? 's' : ''} · {groupImages.length} image{groupImages.length !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Per-colour images */}
                      <div className="px-4 py-3 flex flex-wrap items-center gap-2" style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)' }}>
                        {groupImages.map((img) => (
                          <div key={img} className="relative w-14 h-16 rounded-lg overflow-hidden group" style={{ border: '1px solid var(--c-border)' }}>
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeGroupImage(colorVal, img)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={9} />
                            </button>
                          </div>
                        ))}
                        <label className="w-14 h-16 rounded-lg flex flex-col items-center justify-center cursor-pointer text-brand-muted hover:text-primary transition-colors"
                          style={{ border: '1.5px dashed var(--c-border)' }}>
                          <input type="file" accept="image/*" multiple className="hidden"
                            onChange={(e) => { uploadGroupImages(colorVal, e.target.files); e.currentTarget.value = ''; }} />
                          {imgGroup === colorVal
                            ? <span className="w-4 h-4 border-2 border-brand-border border-t-primary rounded-full animate-spin" />
                            : <><ImageIcon size={15} /><span className="text-[8px] mt-0.5">Add</span></>}
                        </label>
                        <span className="text-[10px] text-brand-muted ml-1">Images for <b>{colorLabel}</b> — shown when this colour is selected</span>
                      </div>

                      {/* Size rows */}
                      {groupVariants.map((v) => {
                        const vi = form.variants.indexOf(v);
                        const sizeVal = sizeAttr ? (v.attributes?.[sizeAttr.slug] || '') : '';
                        const sizeLabel = sizeAttr?.options.find((o) => o.value === sizeVal)?.label || sizeVal || '—';
                        return (
                          <div key={vi} className="grid grid-cols-12 gap-3 items-center px-4 py-2.5 last:border-0 hover:bg-brand-bg/50 transition-colors" style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface)' }}>
                            <div className="col-span-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-brand-text" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>{sizeLabel}</span>
                            </div>
                            <div className="col-span-3">
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
                            <div className="col-span-1 flex justify-end">
                              <button type="button" onClick={() => removeVariant(vi)}
                                className="p-1.5 rounded hover:bg-red-50 text-brand-muted hover:text-red-500 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    );
                  })}
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
                placeholder={categoriesForType.length ? '— Select category —' : 'No categories for this type'}
                options={categoriesForType.map((c) => ({ value: c._id, label: c.name }))} />
            </div>
            <div>
              <label className="input-label">Size Chart</label>
              <Select
                value={form.sizeChartId}
                onChange={(v) => setForm({ ...form, sizeChartId: v })}
                placeholder="— No size chart —"
                options={[
                  { value: '', label: '— None —' },
                  ...sizeChartsForType.map((sc) => ({ value: sc._id, label: sc.name })),
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

        </div>
      </div>

      {/* Floating action buttons — bottom-right, no full-width bar */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full p-1.5"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', boxShadow: '0 8px 28px rgba(0,0,0,0.16)' }}>
        <button type="button" onClick={() => navigate('/products')} className="btn-outline !rounded-full">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary !rounded-full min-w-[150px] justify-center">
          {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}
