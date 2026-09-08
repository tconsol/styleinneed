import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, ExternalLink, Package } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import type { Product } from '../../types';
import { formatPrice, formatDate } from '../../utils/format';

/** Read-only "everything about this product" panel, opened from the list. */
export default function ProductDetailsModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [hero, setHero] = useState(0);
  if (!product) return null;

  const p = product;
  const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
  const cost = p.purchasePrice;
  const profit = cost != null ? p.salePrice - cost : null;
  const marginPct = profit != null && p.salePrice > 0 ? Math.round((profit / p.salePrice) * 100) : null;
  const providerName = typeof p.provider === 'object' && p.provider ? p.provider.name : null;
  const chartName = typeof p.sizeChartId === 'object' && p.sizeChartId ? p.sizeChartId.name : null;
  const clientUrl = import.meta.env.VITE_CLIENT_URL || 'http://localhost:3000';

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4 py-1.5" style={{ borderBottom: '1px solid var(--c-border)' }}>
      <span className="text-[11px] text-brand-muted flex-shrink-0">{label}</span>
      <span className="text-[11px] font-medium text-brand-text text-right">{value ?? '—'}</span>
    </div>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted mb-1.5 mt-4 first:mt-0">{children}</p>
  );

  return (
    <Modal open={!!product} onClose={onClose} title={p.name} size="lg">
      <div className="space-y-4">
        {/* Gallery + headline facts */}
        <div className="grid grid-cols-[168px_1fr] gap-4">
          <div>
            <div className="w-full h-[200px] rounded-xl overflow-hidden" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
              {p.images?.length ? (
                <img src={p.images[hero]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package size={26} className="text-brand-border" /></div>
              )}
            </div>
            {p.images?.length > 1 && (
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {p.images.slice(0, 6).map((src, i) => (
                  <button key={src} type="button" onClick={() => setHero(i)}
                    className="w-9 h-11 rounded-md overflow-hidden flex-shrink-0"
                    style={{ border: i === hero ? '2px solid var(--c-primary)' : '1px solid var(--c-border)' }}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge value={p.isActive ? 'active' : 'inactive'} />
              {p.isFeatured && <Badge value="featured" />}
              {p.isNewArrival && <Badge value="new" />}
              {p.isBestSeller && <Badge value="bestseller" />}
              {p.isTrending && <Badge value="trending" />}
            </div>
            <p className="text-[11px] text-brand-muted leading-relaxed mb-3">{p.shortDescription}</p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sale Price', value: formatPrice(p.salePrice), tone: 'var(--c-primary)' },
                { label: 'MRP', value: formatPrice(p.mrp) },
                { label: 'Stock', value: String(totalStock), tone: totalStock <= 5 ? 'var(--c-danger)' : undefined },
              ].map((s) => (
                <div key={s.label} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                  <p className="text-[9px] uppercase tracking-wide text-brand-muted">{s.label}</p>
                  <p className="text-[13px] font-bold mt-0.5" style={{ color: s.tone || 'var(--c-text)' }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Internal margin — admin-only data */}
            <div className="rounded-lg px-3 py-2 mt-2" style={{ background: 'var(--c-primary-soft)', border: '1px solid var(--c-primary)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--c-primary)' }}>Purchase Cost</span>
                <span className="text-[12px] font-bold text-brand-text">{cost != null ? formatPrice(cost) : 'Not set'}</span>
              </div>
              {profit != null && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--c-primary)' }}>Profit / Margin</span>
                  <span className="text-[12px] font-bold" style={{ color: profit >= 0 ? 'var(--c-success)' : 'var(--c-danger)' }}>
                    {formatPrice(profit)} ({marginPct}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5">
          <div>
            <SectionTitle>Catalogue</SectionTitle>
            <Row label="Slug" value={p.slug} />
            <Row label="Type" value={p.productType} />
            <Row label="Category" value={p.category?.name} />
            <Row label="Collections" value={p.collections?.map((c) => c.name).join(', ') || '—'} />
            <Row label="Provider" value={providerName} />
            <Row label="Size Chart" value={chartName} />
            <Row label="Weight" value={p.weightGrams ? `${p.weightGrams} g` : null} />

            <SectionTitle>Pricing</SectionTitle>
            <Row label="Discount" value={`${p.discountPercentage}%`} />
            <Row label="MRP ($)" value={p.usdMrp != null ? `$${p.usdMrp}` : null} />
            <Row label="Sale ($)" value={p.usdSalePrice != null ? `$${p.usdSalePrice}` : null} />
          </div>

          <div>
            <SectionTitle>Performance</SectionTitle>
            <Row label="Rating" value={p.ratings?.count ? `${p.ratings.average}★ (${p.ratings.count})` : 'No reviews'} />
            <Row label="Added" value={formatDate(p.createdAt)} />
            <Row label="Tags" value={p.tags?.join(', ') || '—'} />

            {p.attributes && Object.keys(p.attributes).length > 0 && (
              <>
                <SectionTitle>Attributes</SectionTitle>
                {Object.entries(p.attributes).map(([k, v]) => (
                  <Row key={k} label={k} value={Array.isArray(v) ? v.join(', ') : String(v)} />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Variants */}
        <div>
          <SectionTitle>Variants ({p.variants.length})</SectionTitle>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--c-th-bg)' }}>
                  <th className="th text-left pl-3">SKU</th>
                  <th className="th text-left">Attributes</th>
                  <th className="th text-center" style={{ width: '70px' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {p.variants.map((v) => (
                  <tr key={v.sku} style={{ borderTop: '1px solid var(--c-border)' }}>
                    <td className="pl-3 py-2 text-[11px] font-mono text-brand-text">{v.sku}</td>
                    <td className="px-2 py-2 text-[11px] text-brand-muted">
                      {v.attributes ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ') : '—'}
                    </td>
                    <td className="px-2 py-2 text-center text-[11px] font-semibold" style={{ color: v.stock <= 5 ? 'var(--c-danger)' : 'var(--c-text)' }}>{v.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description */}
        <div>
          <SectionTitle>Description</SectionTitle>
          <p className="text-[11px] text-brand-muted leading-relaxed whitespace-pre-wrap">{p.description}</p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Link to={`/products/${p._id}/edit`} onClick={onClose} className="btn-primary flex-1 justify-center">
            <Edit size={14} /> Edit Product
          </Link>
          <a href={`${clientUrl}/products/${p.slug}`} target="_blank" rel="noopener noreferrer" className="btn-outline flex-1 justify-center">
            <ExternalLink size={14} /> View on Store
          </a>
        </div>
      </div>
    </Modal>
  );
}
