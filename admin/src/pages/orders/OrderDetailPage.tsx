import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import {
  ArrowLeft, Printer, Download, MapPin, User, CreditCard,
  Package, Truck, CheckCircle2, XCircle, Clock, Circle,
  ShoppingBag, Phone, Trash2,
} from 'lucide-react';
import { PageSpinner } from '../../components/common/Spinner';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { orderApi } from '../../api';
import type { Order } from '../../types';
import { formatPrice, formatDate, formatDateTime } from '../../utils/format';
import toast from 'react-hot-toast';

const STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'returned', 'cancelled'];

const STATUS_META: Record<string, { bg: string; text: string; dot: string; icon: React.ElementType }> = {
  pending:   { bg: 'var(--c-warning-soft)', text: 'var(--c-warning)', dot: 'var(--c-warning)', icon: Clock },
  confirmed: { bg: 'var(--c-info-soft)', text: 'var(--c-info)', dot: 'var(--c-info)', icon: CheckCircle2 },
  packed:    { bg: 'var(--c-info-soft)', text: 'var(--c-primary-dark)', dot: 'var(--c-info)', icon: Package },
  shipped:   { bg: 'var(--c-purple-soft)', text: 'var(--c-purple)', dot: 'var(--c-purple)', icon: Truck },
  delivered: { bg: 'var(--c-success-soft)', text: 'var(--c-success)', dot: 'var(--c-success)', icon: CheckCircle2 },
  cancelled: { bg: 'var(--c-danger-soft)', text: 'var(--c-danger)', dot: 'var(--c-danger)', icon: XCircle },
  returned:  { bg: 'var(--c-orange-soft)', text: 'var(--c-orange)', dot: 'var(--c-orange)', icon: ArrowLeft },
};

const PAY_META: Record<string, { bg: string; text: string; dot: string }> = {
  paid:     { bg: 'var(--c-success-soft)', text: 'var(--c-success)', dot: 'var(--c-success)' },
  pending:  { bg: 'var(--c-warning-soft)', text: 'var(--c-warning)', dot: 'var(--c-warning)' },
  refunded: { bg: 'var(--c-orange-soft)', text: 'var(--c-orange)', dot: 'var(--c-orange)' },
  failed:   { bg: 'var(--c-danger-soft)', text: 'var(--c-danger)', dot: 'var(--c-danger)' },
};

const TIMELINE_ORDER = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-brand-border last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">{label}</span>
      <span className="text-[11px] font-medium text-brand-text text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [awbCode, setAwbCode] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    orderApi.getById(id).then(({ data }) => {
      setOrder(data.data);
      setNewStatus(data.data.status);
      setAwbCode(data.data.awbCode || '');
      setTrackingUrl(data.data.trackingUrl || '');
    }).catch(() => navigate('/orders')).finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!order) return;
    setSaving(true);
    try {
      await orderApi.updateStatus(order._id, { status: newStatus, awbCode: awbCode || undefined, trackingUrl: trackingUrl || undefined });
      toast.success('Order updated');
      setOrder((prev) => prev ? { ...prev, status: newStatus as Order['status'], awbCode, trackingUrl } : null);
    } catch { toast.error('Update failed'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!order) return;
    const ok = await confirm({
      title: 'Delete Order',
      message: `Permanently delete order #${order.orderId}? Stock is restored for active orders. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await orderApi.delete(order._id);
      toast.success('Order deleted');
      navigate('/orders');
    } catch { toast.error('Delete failed'); }
  };

  const handleDownload = () => {
    if (!order) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const M = 15;
    const cw = W - M * 2;
    let y = 0;

    const rgb = (hex: string): [number, number, number] => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
    const setTxt = (hex: string) => doc.setTextColor(...rgb(hex));
    const setDrw = (hex: string) => { doc.setDrawColor(...rgb(hex)); };
    const setFll = (hex: string) => { doc.setFillColor(...rgb(hex)); };
    const hline = (yy: number, hex = 'var(--c-border)', w = 0.25) => {
      setDrw(hex); doc.setLineWidth(w); doc.line(M, yy, W - M, yy);
    };
    const bold = (sz: number) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(sz); };
    const reg = (sz: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(sz); };

    // ── HEADER ──────────────────────────────────────────────
    y = 18;
    bold(20); setTxt('var(--c-primary)');
    doc.text('STYLE IN NEED FASHIONS', M, y);

    bold(13); setTxt('var(--c-text)');
    doc.text('TAX INVOICE', W - M, y, { align: 'right' });

    y += 6;
    reg(8); setTxt('var(--c-muted)');
    doc.text('Hyderabad, Telangana, India  |  support@styleinneedfashions.com', M, y);
    bold(8); setTxt('var(--c-primary)');
    doc.text(`Order #${order.orderId}`, W - M, y, { align: 'right' });

    y += 4;
    reg(8); setTxt('var(--c-muted)');
    doc.text(`Date: ${formatDate(order.createdAt)}`, W - M, y, { align: 'right' });
    hline(y + 3);
    y += 9;

    // ── AWB BOX ─────────────────────────────────────────────
    if (order.awbCode) {
      setFll('var(--c-primary-soft)'); setDrw('var(--c-primary)'); doc.setLineWidth(0.6);
      doc.roundedRect(M, y, cw, 20, 2, 2, 'FD');
      reg(7); setTxt('var(--c-info)');
      doc.text('AWB / TRACKING NUMBER (COURIER)', M + 4, y + 6);
      bold(15); setTxt('var(--c-primary-dark)');
      doc.text(order.awbCode, M + 4, y + 15);
      if (order.trackingUrl) {
        reg(7); setTxt('var(--c-muted)');
        doc.text(order.trackingUrl, W - M - 4, y + 15, { align: 'right', maxWidth: 90 });
      }
      y += 26;
    }

    // ── 3-COLUMN: addresses + order details ─────────────────
    const c1 = M, c2 = M + 62, c3 = M + 124;
    bold(7); setTxt('var(--c-muted)');
    doc.text('BILL TO / SHIP TO', c1, y);
    doc.text('SHIP FROM', c2, y);
    doc.text('ORDER DETAILS', c3, y);
    y += 5;

    const addr = order.shippingAddress;
    const addrLines = [
      addr?.fullName || '',
      addr?.line1 || '',
      ...(addr?.line2 ? [addr.line2] : []),
      `${addr?.city || ''}, ${addr?.state || ''}`,
      `PIN: ${addr?.pincode || ''}`,
      `Ph: ${addr?.phone || ''}`,
    ].filter(Boolean);

    addrLines.forEach((line, i) => {
      if (i === 0) { bold(8); setTxt('var(--c-text)'); } else { reg(8); setTxt('#374151'); }
      doc.text(line, c1, y + i * 4.5);
    });

    const fromLines = ['Style In Need Fashions', '123 Fashion Street', 'Hyderabad, Telangana', 'PIN: 500001', 'Ph: +91 98765 43210'];
    fromLines.forEach((line, i) => {
      if (i === 0) { bold(8); setTxt('var(--c-text)'); } else { reg(8); setTxt('#374151'); }
      doc.text(line, c2, y + i * 4.5);
    });

    const details: [string, string][] = [
      ['Order ID', `#${order.orderId}`],
      ['Date', formatDate(order.createdAt)],
      ['Payment', (order.paymentMethod || '').replace(/_/g, ' ').toUpperCase()],
      ['Pay Status', (order.paymentStatus || '').toUpperCase()],
    ];
    if (order.razorpayPaymentId) details.push(['Pay ID', order.razorpayPaymentId.slice(-12)]);
    details.forEach(([lbl, val], i) => {
      bold(7); setTxt('var(--c-muted)');
      doc.text(lbl + ':', c3, y + i * 4.8);
      reg(8); setTxt('var(--c-text)');
      doc.text(val, c3 + 22, y + i * 4.8);
    });

    y += Math.max(addrLines.length, fromLines.length) * 4.5 + 6;
    hline(y); y += 6;

    // ── TABLE HEADER ─────────────────────────────────────────
    setFll('var(--c-th-bg)'); doc.setLineWidth(0);
    doc.rect(M, y - 4, cw, 8, 'F');
    bold(7); setTxt('var(--c-muted)');
    const cx = { n: M + 2, prod: M + 9, sku: M + 74, var: M + 106, qty: M + 135, up: M + 150, tot: W - M - 2 };
    doc.text('#', cx.n, y);
    doc.text('PRODUCT', cx.prod, y);
    doc.text('SKU', cx.sku, y);
    doc.text('SIZE / COLOR', cx.var, y);
    doc.text('QTY', cx.qty, y, { align: 'center' });
    doc.text('UNIT PRICE', cx.up, y);
    doc.text('TOTAL', cx.tot, y, { align: 'right' });
    hline(y + 3); y += 8;

    // ── TABLE ROWS ───────────────────────────────────────────
    order.items.forEach((item, i) => {
      if (i % 2 === 1) { setFll('var(--c-th-bg)'); doc.rect(M, y - 5, cw, 8, 'F'); }

      reg(8); setTxt('var(--c-muted)');
      doc.text(String(i + 1), cx.n, y);

      const name = item.product?.name || 'Product';
      bold(8); setTxt('var(--c-text)');
      doc.text(name.length > 27 ? name.slice(0, 27) + '...' : name, cx.prod, y);

      reg(7); setTxt('var(--c-muted)');
      doc.text(item.variant?.sku || '—', cx.sku, y);
      const vt = [item.variant?.attributes?.size, item.variant?.attributes?.color].filter(Boolean).join(' / ') || '—';
      doc.text(vt, cx.var, y);
      doc.text(String(item.quantity), cx.qty, y, { align: 'center' });

      reg(8); setTxt('#374151');
      doc.text(formatPrice(item.price), cx.up, y);
      bold(8); setTxt('var(--c-text)');
      doc.text(formatPrice(item.price * item.quantity), cx.tot, y, { align: 'right' });

      y += 9;
      if (y > 258 && i < order.items.length - 1) { doc.addPage(); y = 20; }
    });

    hline(y + 1); y += 8;

    // ── PRICE BREAKDOWN ──────────────────────────────────────
    const bx = W - M - 58, vx = W - M;
    const prRow = (lbl: string, val: string, big = false) => {
      if (big) { bold(11); setTxt('var(--c-primary)'); } else { reg(8); setTxt('var(--c-muted)'); }
      doc.text(lbl, bx, y, { align: 'right' });
      if (big) { bold(11); setTxt('var(--c-primary)'); } else { reg(8); setTxt('var(--c-text)'); }
      doc.text(val, vx, y, { align: 'right' });
      y += big ? 7 : 5;
    };
    prRow('Subtotal', formatPrice(order.subtotal));
    if (order.discount > 0) prRow('Discount', `-${formatPrice(order.discount)}`);
    prRow('Shipping', order.shippingCharge === 0 ? 'FREE' : formatPrice(order.shippingCharge));
    hline(y, 'var(--c-text)', 0.5); y += 5;
    prRow('TOTAL AMOUNT', formatPrice(order.total), true);

    // ── FOOTER ───────────────────────────────────────────────
    y = 283;
    hline(y);
    y += 5;
    reg(7); setTxt('var(--c-muted)');
    doc.text('Thank you for shopping with Style In Need Fashions!', M, y);
    doc.text('support@styleinneedfashions.com', W - M, y, { align: 'right' });
    y += 4;
    doc.text('Computer-generated invoice — no signature required.', M, y);

    doc.save(`Invoice-${order.orderId}.pdf`);
  };

  const handlePrint = () => {
    if (!order || !invoiceRef.current) return;
    const html = invoiceRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=850,height=1000');
    if (!w) { toast.error('Allow popups to print invoice'); return; }
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Invoice - ${order.orderId}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: var(--c-text); background: white; padding: 32px; }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 2px solid var(--c-border); }
        .inv-brand { font-size: 22px; font-weight: 800; color: var(--c-primary); letter-spacing: -0.5px; }
        .inv-sub { font-size: 11px; color: var(--c-muted); margin-top: 3px; }
        .inv-title { font-size: 13px; font-weight: 700; color: var(--c-text); text-align: right; }
        .inv-id { font-size: 11px; color: var(--c-muted); margin-top: 2px; }
        .inv-cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .inv-section-title { font-size: 9px; font-weight: 700; color: var(--c-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
        .inv-text { font-size: 11px; color: #374151; line-height: 1.6; }
        .inv-text strong { color: var(--c-text); font-weight: 600; }
        .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .inv-table th { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--c-muted); padding: 8px 10px; border-bottom: 2px solid var(--c-border); text-align: left; }
        .inv-table td { font-size: 11px; color: #374151; padding: 10px 10px; border-bottom: 1px solid var(--c-th-bg); }
        .inv-table td.right { text-align: right; font-weight: 600; color: var(--c-text); }
        .inv-totals { margin-left: auto; width: 240px; }
        .inv-total-row { display: flex; justify-content: space-between; font-size: 11px; color: #374151; padding: 4px 0; }
        .inv-total-final { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; color: var(--c-text); padding: 10px 0 4px; border-top: 2px solid var(--c-text); margin-top: 6px; }
        .inv-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--c-border); display: flex; justify-content: space-between; font-size: 10px; color: var(--c-muted); }
        .inv-awb { background: var(--c-th-bg); border: 1px solid var(--c-border); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
        .inv-awb-label { font-size: 9px; font-weight: 700; color: var(--c-muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .inv-awb-val { font-size: 16px; font-weight: 800; color: var(--c-primary); letter-spacing: 2px; margin-top: 2px; font-family: monospace; }
        @media print { body { padding: 16px; } }
      </style>
    </head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 600);
  };

  if (loading) return <PageSpinner />;
  if (!order) return null;

  const ss = STATUS_META[order.status] || STATUS_META.pending;
  const ps = PAY_META[order.paymentStatus] || PAY_META.pending;
  const timelineIdx = TIMELINE_ORDER.indexOf(order.status);

  return (
    <div className="max-w-6xl space-y-5">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-[12px] font-medium text-brand-muted hover:text-primary transition-colors">
          <ArrowLeft size={14} /> Back to Orders
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload}
            className="btn-outline gap-1.5 text-[11px]">
            <Download size={13} /> Download Invoice
          </button>
          <button onClick={handlePrint}
            className="btn-primary gap-1.5 text-[11px]">
            <Printer size={13} /> Print Invoice
          </button>
        </div>
      </div>

      {/* Order Header Card */}
      <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag size={14} style={{ color: 'var(--c-primary)' }} />
              <span className="font-mono text-[13px] font-black" style={{ color: 'var(--c-primary)' }}>#{order.orderId}</span>
            </div>
            <p className="text-[10px] text-brand-muted">Placed on {formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: ps.bg, color: ps.text }}>
              <Circle size={6} fill={ps.dot} style={{ color: ps.dot }} />
              {order.paymentStatus} · {order.paymentMethod?.replace('_', ' ').toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: ss.bg, color: ss.text }}>
              <Circle size={6} fill={ss.dot} style={{ color: ss.dot }} />
              {order.status}
            </span>
          </div>
        </div>

        {/* Timeline */}
        {order.status !== 'cancelled' && order.status !== 'returned' && (
          <div className="mt-5 pt-5 border-t border-brand-border">
            <div className="flex items-center">
              {TIMELINE_ORDER.map((s, i) => {
                const done = timelineIdx >= i;
                const active = timelineIdx === i;
                const sm = STATUS_META[s];
                const Icon = sm.icon;
                return (
                  <div key={s} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && (
                      <div className="absolute left-0 top-4 w-full h-0.5 -translate-y-1/2 z-0"
                        style={{ right: '50%', left: '-50%', background: done ? 'var(--c-primary)' : 'var(--c-border)' }} />
                    )}
                    <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all"
                      style={{ background: done ? 'var(--c-primary)' : 'var(--c-th-bg)', boxShadow: active ? '0 0 0 3px rgba(79,70,229,0.2)' : 'none' }}>
                      <Icon size={14} style={{ color: done ? 'white' : 'var(--c-muted)' }} />
                    </div>
                    <span className="text-[9px] font-semibold capitalize text-center"
                      style={{ color: done ? 'var(--c-primary)' : 'var(--c-muted)' }}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Items + Summary */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order Items */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-brand-text">Order Items</h2>
              <span className="text-[10px] text-brand-muted">{order.items.length} item(s)</span>
            </div>
            <div className="divide-y divide-brand-border">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4">
                  <div className="w-14 h-16 rounded-lg overflow-hidden bg-brand-bg flex-shrink-0">
                    {item.product?.images?.[0]
                      ? <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                      : <Package size={20} className="m-auto mt-3 text-brand-border" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-brand-text line-clamp-2">{item.product?.name || 'Product'}</p>
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {item.variant?.sku && <span className="text-[10px] text-brand-muted">SKU: {item.variant.sku}</span>}
                      {item.variant?.attributes?.size && <span className="text-[10px] text-brand-muted">Size: {item.variant.attributes.size}</span>}
                      {item.variant?.attributes?.color && <span className="text-[10px] text-brand-muted">Color: {item.variant.attributes.color}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded font-medium text-brand-text">Qty: {item.quantity}</span>
                      <span className="text-[10px] text-brand-muted">{formatPrice(item.price)} each</span>
                    </div>
                    {item.product?.provider && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
                        <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-400">Provider</span>
                        <span className="text-[10px] font-semibold text-indigo-700">{item.product.provider.name}</span>
                        {item.product.provider.phone && (
                          <span className="text-[9px] text-indigo-400">· {item.product.provider.phone}</span>
                        )}
                        {item.product.provider.category && (
                          <span className="text-[9px] capitalize px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{item.product.provider.category}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-bold text-brand-text">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="px-5 py-4 border-t border-brand-border" style={{ background: 'var(--c-th-bg)' }}>
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-[11px] text-brand-muted">
                  <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-[11px] text-emerald-600 font-medium">
                    <span>Discount</span><span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px] text-brand-muted">
                  <span>Shipping</span>
                  <span>{order.shippingCharge === 0 ? <span className="text-emerald-600 font-medium">FREE</span> : formatPrice(order.shippingCharge)}</span>
                </div>
                <div className="flex justify-between text-[14px] font-black text-brand-text pt-2 border-t border-brand-border">
                  <span>Total</span><span style={{ color: 'var(--c-primary)' }}>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--c-primary-soft)' }}>
                <MapPin size={14} style={{ color: 'var(--c-primary)' }} />
              </div>
              <h2 className="text-[13px] font-bold text-brand-text">Delivery Address</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <p className="text-[9px] font-bold text-brand-muted uppercase tracking-wider mb-1">Full Name</p>
                <p className="font-semibold text-brand-text">{order.shippingAddress?.fullName}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-brand-muted uppercase tracking-wider mb-1">Phone</p>
                <p className="font-semibold text-brand-text">{order.shippingAddress?.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[9px] font-bold text-brand-muted uppercase tracking-wider mb-1">Address</p>
                <p className="text-brand-text">
                  {order.shippingAddress?.line1}
                  {order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ''}
                </p>
                <p className="text-brand-text">{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
                <p className="text-brand-muted">{order.shippingAddress?.country}</p>
              </div>
            </div>
          </div>

          {/* AWB / Tracking */}
          {(order.awbCode || order.trackingUrl) && (
            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--c-primary-soft)' }}>
                  <Truck size={14} style={{ color: 'var(--c-primary)' }} />
                </div>
                <h2 className="text-[13px] font-bold text-brand-text">Shipment Info</h2>
              </div>
              {order.awbCode && (
                <div className="mb-3">
                  <p className="text-[9px] font-bold text-brand-muted uppercase tracking-wider mb-1">AWB Code</p>
                  <p className="font-mono text-[14px] font-black" style={{ color: 'var(--c-primary)' }}>{order.awbCode}</p>
                </div>
              )}
              {order.trackingUrl && (
                <div>
                  <p className="text-[9px] font-bold text-brand-muted uppercase tracking-wider mb-1">Tracking URL</p>
                  <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] text-indigo-500 hover:underline break-all">{order.trackingUrl}</a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--c-primary-soft)' }}>
                <User size={14} style={{ color: 'var(--c-primary)' }} />
              </div>
              <h2 className="text-[13px] font-bold text-brand-text">Customer</h2>
            </div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                style={{ background: 'var(--c-primary)' }}>
                {order.user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-brand-text">{order.user?.name}</p>
                <p className="text-[10px] text-brand-muted">{order.user?.email}</p>
              </div>
            </div>
            {order.user?.phone && (
              <div className="flex items-center gap-1.5 text-[10px] text-brand-muted">
                <Phone size={11} /> {order.user.phone}
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--c-primary-soft)' }}>
                <CreditCard size={14} style={{ color: 'var(--c-primary)' }} />
              </div>
              <h2 className="text-[13px] font-bold text-brand-text">Payment</h2>
            </div>
            <InfoRow label="Method" value={<span className="capitalize">{order.paymentMethod?.replace(/_/g, ' ')}</span>} />
            <InfoRow label="Status" value={
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold"
                style={{ background: ps.bg, color: ps.text }}>
                <Circle size={5} fill={ps.dot} style={{ color: ps.dot }} />
                {order.paymentStatus}
              </span>
            } />
            {order.razorpayOrderId && <InfoRow label="Razorpay ID" value={<span className="font-mono text-[10px]">{order.razorpayOrderId}</span>} />}
            {order.razorpayPaymentId && <InfoRow label="Payment ID" value={<span className="font-mono text-[10px]">{order.razorpayPaymentId}</span>} />}
            <InfoRow label="Total Paid" value={<span className="text-[12px] font-black" style={{ color: 'var(--c-primary)' }}>{formatPrice(order.total)}</span>} />
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid var(--c-border)' }}>
            <h2 className="text-[13px] font-bold text-brand-text mb-4">Update Order</h2>
            <div className="space-y-3">
              <div>
                <label className="input-label">Status</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {STATUSES.map((s) => {
                    const sm = STATUS_META[s];
                    const isSelected = newStatus === s;
                    return (
                      <button key={s} type="button" onClick={() => setNewStatus(s)}
                        className="px-2 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all text-left flex items-center gap-1"
                        style={isSelected
                          ? { background: sm.bg, color: sm.text, boxShadow: `0 0 0 1.5px ${sm.dot}` }
                          : { background: 'var(--c-bg)', color: 'var(--c-muted)' }}>
                        <Circle size={5} fill={isSelected ? sm.dot : 'var(--c-border)'} style={{ color: isSelected ? sm.dot : 'var(--c-border)' }} />
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="input-label">AWB / Tracking Code</label>
                <input value={awbCode} onChange={(e) => setAwbCode(e.target.value)} className="input-field" placeholder="Courier AWB code" />
              </div>
              <div>
                <label className="input-label">Tracking URL</label>
                <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} className="input-field" placeholder="https://track.shiprocket.in/..." />
              </div>
              <button onClick={handleUpdateStatus} disabled={saving} className="btn-primary w-full justify-center">
                {saving ? 'Saving...' : 'Update Order'}
              </button>
              <button onClick={() => void handleDelete()}
                className="w-full justify-center inline-flex items-center gap-1.5 py-2.5 rounded-lg border border-red-200 text-red-500 text-[12px] font-semibold hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Delete Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PRINTABLE INVOICE (hidden in UI, opened in popup for print) ─── */}
      <div ref={invoiceRef} style={{ display: 'none' }}>
        {/* Invoice Header */}
        <div className="inv-header">
          <div>
            <div className="inv-brand">STYLE IN NEED FASHIONS</div>
            <div className="inv-sub">
              Hyderabad, Telangana, India &nbsp;|&nbsp; support@styleinneedfashions.com
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="inv-title">TAX INVOICE</div>
            <div className="inv-id">#{order.orderId}</div>
            <div className="inv-id">Date: {formatDate(order.createdAt)}</div>
          </div>
        </div>

        {/* AWB Box */}
        {order.awbCode && (
          <div className="inv-awb">
            <div className="inv-awb-label">AWB / Tracking Number (Courier)</div>
            <div className="inv-awb-val">{order.awbCode}</div>
            {order.trackingUrl && <div style={{ fontSize: 10, color: 'var(--c-muted)', marginTop: 4 }}>{order.trackingUrl}</div>}
          </div>
        )}

        {/* Billing / Shipping / Order Info */}
        <div className="inv-cols">
          <div>
            <div className="inv-section-title">Bill To / Ship To</div>
            <div className="inv-text">
              <strong>{order.shippingAddress?.fullName}</strong><br />
              {order.shippingAddress?.line1}<br />
              {order.shippingAddress?.line2 && <>{order.shippingAddress.line2}<br /></>}
              {order.shippingAddress?.city}, {order.shippingAddress?.state}<br />
              PIN: {order.shippingAddress?.pincode}<br />
              Ph: {order.shippingAddress?.phone}
            </div>
          </div>
          <div>
            <div className="inv-section-title">Ship From</div>
            <div className="inv-text">
              <strong>Style In Need Fashions</strong><br />
              123 Fashion Street<br />
              Hyderabad, Telangana<br />
              PIN: 500001<br />
              Ph: +91 98765 43210
            </div>
          </div>
          <div>
            <div className="inv-section-title">Order Details</div>
            <div className="inv-text">
              <strong>Order ID:</strong> #{order.orderId}<br />
              <strong>Date:</strong> {formatDate(order.createdAt)}<br />
              <strong>Payment:</strong> {order.paymentMethod?.replace(/_/g, ' ').toUpperCase()}<br />
              <strong>Status:</strong> {order.paymentStatus?.toUpperCase()}<br />
              {order.razorpayPaymentId && <><strong>Pay ID:</strong> {order.razorpayPaymentId}<br /></>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="inv-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '40%' }}>Product</th>
              <th style={{ width: '15%' }}>SKU</th>
              <th style={{ width: '10%' }}>Size / Color</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Unit Price</th>
              <th style={{ width: '10%', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{item.product?.name || 'Product'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{item.variant?.sku || '—'}</td>
                <td>{[item.variant?.attributes?.size, item.variant?.attributes?.color].filter(Boolean).join(' / ') || '—'}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td className="right">{formatPrice(item.price)}</td>
                <td className="right">{formatPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="inv-totals">
          <div className="inv-total-row"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="inv-total-row" style={{ color: 'var(--c-success)' }}><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
          <div className="inv-total-row"><span>Shipping</span><span>{order.shippingCharge === 0 ? 'FREE' : formatPrice(order.shippingCharge)}</span></div>
          <div className="inv-total-final"><span>TOTAL</span><span>{formatPrice(order.total)}</span></div>
        </div>

        {/* Footer */}
        <div className="inv-footer">
          <div>Thank you for shopping with Style In Need Fashions!<br />For queries: support@styleinneedfashions.com</div>
          <div style={{ textAlign: 'right' }}>
            This is a computer-generated invoice.<br />
            No signature required.
          </div>
        </div>
      </div>
    </div>
  );
}
