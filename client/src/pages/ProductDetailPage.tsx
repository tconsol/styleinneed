import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Truck, RotateCcw, Shield, Star, ChevronLeft, ChevronRight, ZoomIn, Minus, Plus, Ruler, X } from 'lucide-react';
import Breadcrumb from '../components/common/Breadcrumb';
import ProductRow from '../components/home/ProductRow';
import Spinner from '../components/common/Spinner';
import { productApi } from '../api/product.api';
import { reviewApi } from '../api/misc.api';
import type { Product, ProductVariant, Review, Attribute, SizeChart } from '../types';
import { formatDate } from '../utils/format';
import { useMoney } from '../hooks/useMoney';
import { useRegion } from '../hooks/useRegion';
import { colorLabel } from '../utils/colorName';
import { socket, SOCKET_EVENTS } from '../lib/socket';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { useWishlistStore } from '../stores/wishlistStore';
import { useCurrencyStore } from '../stores/currencyStore';
import { usePromotionStore, promoFor } from '../stores/promotionStore';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'description' | 'reviews' | 'shipping'>('description');
  const [zoom, setZoom] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const { addItem, updateItem, removeItem, openCart, items: cartItems, isLoading: cartLoading } = useCartStore();
  const { toggle, isWishlisted } = useWishlistStore();
  const activePromos = usePromotionStore((s) => s.active);
  const { format } = useMoney();
  const { isUSA } = useRegion();
  const freeShipThreshold = useCurrencyStore((s) => s.freeShipThreshold);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      productApi.getProductBySlug(slug),
      productApi.getRelatedProducts(slug),
    ]).then(([pd, rel]) => {
      const p: Product = pd.data.data;
      setProduct(p);
      setRelated(rel.data.data || []);
      setSelectedVariant(p.variants[0] || null);
      setSelection({ ...(p.variants[0]?.attributes || {}) });
    }).catch(() => navigate('/products')).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    // Fetch ALL attributes (not only filterable) so every product spec name resolves.
    productApi.getAttributes(false).then(({ data }) => setAttributes(data.data || [])).catch(() => {});
  }, []);

  // Reset the gallery to the first image whenever the selected variant (colour) changes.
  useEffect(() => { setImgIdx(0); }, [selectedVariant?.sku]);

  // Re-fetch product (preserving selected variant) on real-time changes
  const reload = useCallback(() => {
    if (!slug) return;
    productApi.getProductBySlug(slug, true).then(({ data }) => {
      const p: Product = data.data;
      setProduct(p);
      setSelectedVariant((prev) => p.variants.find((v) => v.sku === prev?.sku) || p.variants[0] || null);
    }).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!product?._id) return;
    const onStock = (pl: { productId: string }) => { if (pl.productId === product._id) reload(); };
    const onUpd = (pl: { slug: string }) => { if (pl.slug === product.slug) reload(); };
    socket.on(SOCKET_EVENTS.stockUpdated, onStock);
    socket.on(SOCKET_EVENTS.productUpdated, onUpd);
    return () => {
      socket.off(SOCKET_EVENTS.stockUpdated, onStock);
      socket.off(SOCKET_EVENTS.productUpdated, onUpd);
    };
  }, [product?._id, product?.slug, reload]);

  useEffect(() => {
    if (product?._id) {
      reviewApi.getProductReviews(product._id).then(({ data }) => setReviews(data.data || [])).catch(() => {});
    }
  }, [product?._id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!product) return null;

  const promo = promoFor(product, activePromos); // active sale for this product, if any
  const sizeChart = product.sizeChartId && typeof product.sizeChartId === 'object' ? (product.sizeChartId as SizeChart) : null;
  const images = selectedVariant?.images?.length ? selectedVariant.images : product.images;
  const hasStock = selectedVariant ? selectedVariant.stock > 0 : false;
  const wishlisted = isWishlisted(product._id);
  const returnDays = product.returnDays ?? 7;
  const cartItem = selectedVariant
    ? cartItems.find((i) => i.product?._id === product._id && i.variantSku === selectedVariant.sku)
    : undefined;

  // Dynamic variant attributes — derived from the product's own variants
  const attrBySlug: Record<string, Attribute> = Object.fromEntries(attributes.map((a) => [a.slug, a]));
  const variantSlugs = Array.from(new Set(product.variants.flatMap((v) => Object.keys(v.attributes || {}))))
    .sort((a, b) => (attrBySlug[a]?.sortOrder ?? 99) - (attrBySlug[b]?.sortOrder ?? 99));
  const colorSlugs = variantSlugs.filter((s) => attrBySlug[s]?.inputType === 'color' || /colou?r/i.test(s));
  const valuesFor = (slug: string) =>
    Array.from(new Set(product.variants.map((v) => v.attributes?.[slug]).filter(Boolean))) as string[];
  // Stock for a given attribute value, filtered by currently selected color(s)
  const stockForVal = (slug: string, val: string) =>
    product.variants
      .filter((v) => v.attributes?.[slug] === val &&
        colorSlugs.every((cs) => cs === slug || !selection[cs] || v.attributes?.[cs] === selection[cs]))
      .reduce((sum, v) => sum + v.stock, 0);

  const chooseAttr = (slug: string, value: string) => {
    const next = { ...selection, [slug]: value };
    setSelection(next);
    const match = product.variants.find((v) => Object.entries(next).every(([s, val]) => v.attributes?.[s] === val))
      || product.variants.find((v) => v.attributes?.[slug] === value);
    if (match) setSelectedVariant(match);
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/auth/login'); return; }
    if (!selectedVariant) { toast.error('Please select a variant'); return; }
    await addItem(product._id, selectedVariant.sku, qty);
  };

  const inCartQty = cartItem?.quantity ?? 0;

  const handleStep = (delta: number) => {
    if (!selectedVariant || !cartItem) return;
    const next = inCartQty + delta;
    if (next <= 0) removeItem(product._id, selectedVariant.sku);
    else updateItem(product._id, selectedVariant.sku, next);
  };

  return (
    <div className="min-h-screen bg-brand-bg pb-[calc(var(--bottomnav-height)+env(safe-area-inset-bottom))] lg:pb-0" style={{ paddingTop: "var(--topbar-height)" }}>
      <div className="container-custom py-8">
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/' },
          { label: product.category?.name || 'Products', href: `/products?category=${product.category?.slug}` },
          { label: product.name },
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-8">
          {/* Gallery */}
          <div className="flex gap-3">
            {/* Thumbnails */}
            <div className="hidden md:flex flex-col gap-2 w-20 flex-shrink-0">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`aspect-[3/4] overflow-hidden border-2 transition-colors ${
                    i === imgIdx ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>

            {/* Main image */}
            <div className="flex-1 relative">
              <div
                className="relative aspect-[3/4] overflow-hidden bg-brand-surface cursor-zoom-in"
                onClick={() => setZoom(true)}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={imgIdx}
                    src={images[imgIdx]}
                    alt={product.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>
                <button className="absolute top-3 right-3 w-8 h-8 bg-white/80 flex items-center justify-center hover:bg-white">
                  <ZoomIn size={16} />
                </button>
                {product.discountPercentage > 0 && (
                  <div className="absolute top-3 left-3 bg-primary text-white font-body text-xs px-2 py-1 tracking-widest uppercase">
                    -{product.discountPercentage}%
                  </div>
                )}
              </div>

              {/* Mobile nav */}
              {images.length > 1 && (
                <div className="md:hidden absolute inset-y-0 flex items-center justify-between px-2 pointer-events-none w-full">
                  <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)} className="pointer-events-auto w-8 h-8 bg-white/80 flex items-center justify-center">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setImgIdx((i) => (i + 1) % images.length)} className="pointer-events-auto w-8 h-8 bg-white/80 flex items-center justify-center">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="lg:py-4">
            <p className="font-body text-sm text-brand-muted mb-2">{product.category?.name}</p>
            <h1 className="heading-sm text-brand-text mb-3">{product.name}</h1>

            {/* Rating */}
            {product.ratings.count > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={14} className={s <= Math.round(product.ratings.average) ? 'text-primary fill-primary' : 'text-brand-border'} />
                  ))}
                </div>
                <span className="font-body text-sm text-brand-muted">{product.ratings.average} ({product.ratings.count} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center flex-wrap gap-3 mb-6 pb-6 border-b border-brand-border">
              {promo ? (
                <>
                  <span className="font-heading text-3xl font-bold text-secondary">{format(promo.price)}</span>
                  <span className="font-body text-lg text-brand-muted line-through">{format(product.salePrice, product.usdSalePrice)}</span>
                  <span className="font-body text-xs text-white px-2 py-1 rounded font-semibold animate-pulse" style={{ background: 'rgb(var(--color-secondary))' }}>
                    {promo.promo.badgeText || `${promo.promo.name}`} · {promo.off}% off
                  </span>
                </>
              ) : (
                <>
                  <span className="font-heading text-3xl font-bold text-brand-text">{format(product.salePrice, product.usdSalePrice)}</span>
                  {product.mrp > product.salePrice && (
                    <>
                      <span className="font-body text-lg text-brand-muted line-through">{format(product.mrp, product.usdMrp)}</span>
                      <span className="font-body text-sm bg-green-100 text-green-700 px-2 py-0.5 font-medium">
                        {product.discountPercentage}% off
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Size chart — shown only when the product has one assigned */}
            {sizeChart && (
              <button onClick={() => setShowSizeChart(true)}
                className="inline-flex items-center gap-1.5 mb-4 font-body text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                <Ruler size={15} /> Size Chart
              </button>
            )}

            {/* Dynamic variant attribute selectors (Size, Colour, etc.) */}
            {variantSlugs.map((slug) => {
              const attr = attrBySlug[slug];
              const isColor = attr?.inputType === 'color';
              const opts = valuesFor(slug);
              if (!opts.length) return null;
              return (
                <div className="mb-5" key={slug}>
                  <p className="input-label">
                    {attr?.name || slug}: <span className="text-brand-muted font-normal">{isColor ? colorLabel(selection[slug]) : selection[slug]}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {opts.map((val) => {
                      const active = selection[slug] === val;
                      const oos = stockForVal(slug, val) === 0;
                      if (isColor) {
                        const hex = attr?.options.find((o) => o.value === val)?.hex
                          || (/^#[0-9a-fA-F]{6}$/.test(val) ? val : undefined);
                        return (
                          <button key={val} onClick={() => chooseAttr(slug, val)} title={val}
                            className={`w-9 h-9 rounded-full border-2 transition-all ${active ? 'border-primary scale-110' : 'border-brand-border hover:border-primary/50'} ${oos ? 'opacity-40' : ''}`}
                            style={{ background: hex || '#ccc' }} />
                        );
                      }
                      return (
                        <button key={val} onClick={() => chooseAttr(slug, val)}
                          className={`px-4 py-2 font-body text-sm border-2 transition-colors ${active ? 'border-primary bg-primary/5 text-primary' : 'border-brand-border hover:border-primary/50'} ${oos ? 'opacity-40 line-through' : ''}`}>
                          {val}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Stock status */}
            {selectedVariant && (
              <div className="mb-4">
                {selectedVariant.stock <= 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-red-600">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Out of stock
                  </span>
                ) : selectedVariant.stock < 10 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200"
                  >
                    <motion.span
                      className="w-2 h-2 rounded-full bg-orange-500"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="font-body text-sm font-semibold text-orange-700">
                      Hurry! Only {selectedVariant.stock} left in stock
                    </span>
                  </motion.div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> In stock
                    <span className="text-brand-muted font-normal">({selectedVariant.stock} available)</span>
                  </span>
                )}
              </div>
            )}

            {/* Qty + CTA — desktop only; mobile uses the sticky bottom bar below */}
            <div className="hidden lg:flex gap-3 mb-4">
              <div className="flex items-center border border-brand-border">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-11 flex items-center justify-center hover:bg-brand-surface transition-colors" aria-label="Decrease"><Minus size={15} /></button>
                <span className="w-12 text-center font-body text-sm font-medium">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(selectedVariant?.stock || 10, q + 1))} className="w-11 h-11 flex items-center justify-center hover:bg-brand-surface transition-colors" aria-label="Increase"><Plus size={15} /></button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!hasStock || cartLoading}
                className="flex-1 btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ShoppingBag size={18} />
                {hasStock ? 'Add to Bag' : 'Out of Stock'}
              </button>
              <button
                onClick={() => { if (!isAuthenticated) { navigate('/auth/login'); return; } toggle(product._id); }}
                className={`w-11 h-11 border-2 flex items-center justify-center transition-all ${
                  wishlisted ? 'border-primary bg-primary/5 text-primary' : 'border-brand-border hover:border-primary hover:text-primary'
                }`}
                aria-label="Wishlist"
              >
                <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Info chips */}
            <div className="grid grid-cols-3 gap-3 mt-6 py-5 border-y border-brand-border">
              {[
                isUSA
                  ? { icon: Truck, label: 'Delivery', sub: 'Calculated at checkout' }
                  : { icon: Truck, label: 'Free Delivery', sub: `On orders ₹${freeShipThreshold.toLocaleString('en-IN')}+` },
                returnDays > 0
                  ? { icon: RotateCcw, label: 'Easy Returns', sub: `${returnDays}-day returns` }
                  : { icon: RotateCcw, label: 'Returns', sub: 'Non-returnable' },
                { icon: Shield, label: 'Secure Payment', sub: '100% safe' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1">
                  <Icon size={20} className="text-primary" />
                  <span className="font-body text-xs font-medium text-brand-text">{label}</span>
                  <span className="font-body text-xs text-brand-muted">{sub}</span>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="mt-8">
              <div className="flex border-b border-brand-border">
                {(['description', 'reviews', 'shipping'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-5 py-3 font-body text-sm capitalize border-b-2 -mb-px transition-colors ${
                      tab === t ? 'border-primary text-primary' : 'border-transparent text-brand-muted hover:text-brand-text'
                    }`}
                  >
                    {t} {t === 'reviews' && reviews.length > 0 ? `(${reviews.length})` : ''}
                  </button>
                ))}
              </div>
              <div className="pt-5">
                {tab === 'description' && (
                  <div className="font-body text-sm text-brand-muted leading-relaxed space-y-5">
                    {product.shortDescription && <p className="text-brand-text font-medium">{product.shortDescription}</p>}
                    <p className="whitespace-pre-line">{product.description}</p>

                    {/* Full specifications table */}
                    {(() => {
                      const specs: [string, string][] = [];
                      if (product.category?.name) specs.push(['Category', product.category.name]);
                      if (product.subcategory) specs.push(['Subcategory', product.subcategory]);
                      if (product.productType) specs.push(['Type', product.productType]);
                      Object.entries(product.attributes || {}).forEach(([slug, vals]) => {
                        if (vals?.length) specs.push([attrBySlug[slug]?.name || slug, (vals as string[]).join(', ')]);
                      });
                      if (product.weightGrams != null) specs.push(['Weight', `${product.weightGrams} g`]);
                      if (product.tags?.length) specs.push(['Tags', product.tags.join(', ')]);
                      specs.push(['Return Policy', returnDays > 0 ? `${returnDays}-day returns` : 'Non-returnable']);
                      if (!specs.length) return null;
                      return (
                        <div>
                          <h3 className="font-heading text-base font-semibold text-brand-text mb-3">Specifications</h3>
                          <div className="rounded-xl overflow-hidden border border-brand-border">
                            {specs.map(([k, v], i) => (
                              <div key={k} className={`grid grid-cols-3 gap-2 px-4 py-2.5 text-sm ${i % 2 ? 'bg-brand-surface' : 'bg-brand-bg'}`}>
                                <span className="font-medium text-brand-text capitalize">{k}</span>
                                <span className="col-span-2 text-brand-muted capitalize">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {tab === 'reviews' && (
                  <div className="space-y-5">
                    {reviews.length === 0 ? (
                      <p className="font-body text-sm text-brand-muted">No reviews yet. Be the first to review!</p>
                    ) : reviews.map((r) => (
                      <div key={r._id} className="pb-5 border-b border-brand-border last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-body text-xs font-bold text-primary">
                            {r.user.name[0]}
                          </div>
                          <div>
                            <p className="font-body text-sm font-medium">{r.user.name}</p>
                            <p className="font-body text-xs text-brand-muted">{formatDate(r.createdAt)}</p>
                          </div>
                          {r.isVerifiedPurchase && (
                            <span className="ml-auto font-body text-xs text-green-600 bg-green-50 px-2 py-0.5">{'✓'} Verified</span>
                          )}
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {[1,2,3,4,5].map((s) => <Star key={s} size={12} className={s <= r.rating ? 'text-primary fill-primary' : 'text-brand-border'} />)}
                        </div>
                        {r.title && <p className="font-body text-sm font-medium mb-1">{r.title}</p>}
                        <p className="font-body text-sm text-brand-muted">{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
                {tab === 'shipping' && (
                  <div className="font-body text-sm text-brand-muted leading-relaxed space-y-3">
                    {isUSA ? (
                      <>
                        <p>• Delivery charges calculated by state at checkout</p>
                        <p>• Standard delivery: 7–14 business days</p>
                        <p>• Secure international card payment</p>
                      </>
                    ) : (
                      <>
                        <p>• Free shipping on orders above ₹{freeShipThreshold.toLocaleString('en-IN')}</p>
                        <p>• Standard delivery: 4–7 business days</p>
                        <p>• Cash on Delivery available across India</p>
                      </>
                    )}
                    {returnDays > 0
                      ? <p>• Easy returns within {returnDays} days of delivery</p>
                      : <p>• This item is not eligible for returns</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky cart bar */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-brand-border flex items-center gap-3 px-4"
        style={{ minHeight: 'calc(var(--bottomnav-height) + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={() => { if (!isAuthenticated) { navigate('/auth/login'); return; } toggle(product._id); }}
          className={`w-11 h-11 flex-shrink-0 border-2 flex items-center justify-center transition-all ${
            wishlisted ? 'border-primary bg-primary/5 text-primary' : 'border-brand-border text-brand-muted'
          }`}
          aria-label="Wishlist"
        >
          <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>

        {cartItem ? (
          <>
            <div className="flex items-center border border-brand-border flex-shrink-0">
              <button onClick={() => handleStep(-1)} className="w-11 h-11 flex items-center justify-center" aria-label="Decrease"><Minus size={15} /></button>
              <span className="w-10 text-center font-body text-sm font-medium">{inCartQty}</span>
              <button onClick={() => handleStep(1)} disabled={inCartQty >= (selectedVariant?.stock || 0)} className="w-11 h-11 flex items-center justify-center disabled:opacity-40" aria-label="Increase"><Plus size={15} /></button>
            </div>
            <button onClick={openCart} className="flex-1 btn-primary justify-center">
              <ShoppingBag size={18} /> Go to Bag
            </button>
          </>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={!hasStock || cartLoading}
            className="flex-1 btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ShoppingBag size={18} />
            {hasStock ? 'Add to Bag' : 'Out of Stock'}
          </button>
        )}
      </div>

      {/* Zoom modal */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/90 z-[90] flex items-center justify-center p-4"
            onClick={() => setZoom(false)}
          >
            <img src={images[imgIdx]} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Size chart modal */}
      <AnimatePresence>
        {showSizeChart && sizeChart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/60 z-[95] flex items-center justify-center p-4"
            onClick={() => setShowSizeChart(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-brand-bg rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
                <div className="flex items-center gap-2">
                  <Ruler size={17} className="text-primary" />
                  <h3 className="font-heading text-base font-semibold text-brand-text">{sizeChart.name}</h3>
                  <span className="font-body text-xs text-brand-muted">({sizeChart.unit})</span>
                </div>
                <button onClick={() => setShowSizeChart(false)} className="text-brand-muted hover:text-brand-text"><X size={18} /></button>
              </div>
              <div className="overflow-auto p-5">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left font-body font-semibold text-brand-text px-3 py-2 border-b border-brand-border">Size</th>
                      {sizeChart.columns.map((c) => (
                        <th key={c} className="text-left font-body font-semibold text-brand-text px-3 py-2 border-b border-brand-border whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeChart.rows.map((r, i) => (
                      <tr key={r.size} className={i % 2 ? 'bg-brand-surface' : ''}>
                        <td className="px-3 py-2 font-body font-medium text-brand-text whitespace-nowrap">{r.size}</td>
                        {r.values.map((v, j) => (
                          <td key={j} className="px-3 py-2 font-body text-brand-muted whitespace-nowrap">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Related */}
      {related.length > 0 && (
        <ProductRow
          label="You May Also Like"
          title="Related Products"
          products={related}
          viewAllHref={`/products?category=${product.category?.slug}`}
        />
      )}
    </div>
  );
}
