import { useEffect, useState, useCallback } from 'react';
import {
  Mails, Users, ShoppingCart, Mail, Search, Send, Download,
  Upload, ImageIcon, X, Info,
} from 'lucide-react';
import Select from '../../components/common/Select';
import { useConfirm } from '../../components/common/ConfirmDialog';
import ImageSpecHint from '../../components/common/ImageSpecHint';
import { IMAGE_SPECS, checkRatio, readImageSize, type RatioCheck } from '../../config/imageSpecs';
import { emailMarketingApi, ctaLinkApi, cmsApi } from '../../api';
import { downloadBlob, stampedName } from '../../utils/download';
import toast from 'react-hot-toast';

type Source = 'registrations' | 'orders' | 'newsletter';

interface Contact { email: string; sources: Source[] }
interface Stats {
  registrations: number; orders: number; newsletter: number;
  total: number; inMultipleSources: number; unsubscribed: number;
}
interface CtaLink { _id: string; label: string; url: string; group: string }

const SOURCE_META: Record<Source, { label: string; icon: typeof Users; hint: string }> = {
  registrations: { label: 'Registrations', icon: Users, hint: 'Signed-up accounts' },
  orders: { label: 'Orders', icon: ShoppingCart, hint: 'Addresses used at checkout' },
  newsletter: { label: 'Newsletter', icon: Mail, hint: 'Active subscribers' },
};

const EMPTY_CAMPAIGN = {
  subject: '', title: '', description: '', bannerImage: '',
  badgeText: '', ctaUrl: '/products', ctaText: 'Shop Now',
};

export default function EmailMarketingPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<Source[]>(['registrations', 'orders', 'newsletter']);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [campaign, setCampaign] = useState(EMPTY_CAMPAIGN);
  const [ctaLinks, setCtaLinks] = useState<CtaLink[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgCheck, setImgCheck] = useState<RatioCheck | null>(null);
  const [exporting, setExporting] = useState(false);
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    emailMarketingApi.getAudience({ sources: sources.join(',') })
      .then(({ data }) => {
        setStats(data.data.stats);
        setContacts(data.data.contacts || []);
        setTruncated(!!data.data.truncated);
        // A source change invalidates any hand-picked selection.
        setPicked(new Set());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sources]);

  useEffect(load, [load]);
  useEffect(() => {
    ctaLinkApi.getAll().then(({ data }) => setCtaLinks(data.data || [])).catch(() => {});
  }, []);

  const toggleSource = (s: Source) =>
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const filtered = contacts.filter((c) => c.email.includes(search.toLowerCase().trim()));
  // No hand-picked selection means "everyone in the chosen sources".
  const recipientCount = picked.size || contacts.length;

  const uploadBanner = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const size = await readImageSize(files[0]);
    setImgCheck(checkRatio(IMAGE_SPECS.banner, size.width, size.height));
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('image', files[0]);
      const { data } = await cmsApi.uploadImage(fd);
      setCampaign((c) => ({ ...c, bannerImage: data.data.url }));
    } catch { /* interceptor */ } finally { setUploading(false); }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data } = await emailMarketingApi.exportAudience();
      downloadBlob(data as Blob, stampedName('email-audience'));
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const send = async () => {
    if (!campaign.title.trim()) { toast.error('Add a campaign heading'); return; }
    if (recipientCount === 0) { toast.error('No recipients selected'); return; }
    if (!(await confirm({
      title: `Send to ${recipientCount} recipient(s)?`,
      message: 'This sends immediately and cannot be recalled. Anyone who has unsubscribed is skipped automatically.',
      confirmText: 'Send campaign',
    }))) return;

    setSending(true);
    try {
      const { data } = await emailMarketingApi.send({
        subject: campaign.subject || undefined,
        sources: picked.size ? undefined : sources,
        emails: picked.size ? [...picked] : undefined,
        campaign: {
          title: campaign.title,
          description: campaign.description || undefined,
          bannerImage: campaign.bannerImage || undefined,
          badgeText: campaign.badgeText || undefined,
          ctaUrl: campaign.ctaUrl,
          ctaText: campaign.ctaText,
        },
      });
      toast.success(data.message || `Sent to ${data.data?.sent} recipient(s)`);
    } catch { /* interceptor */ } finally { setSending(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-brand-text">Email Marketing</h1>
          <p className="text-[10px] text-brand-muted mt-0.5">
            One audience built from registrations, orders and newsletter sign-ups — deduplicated
          </p>
        </div>
        <button onClick={exportCsv} disabled={exporting} className="btn-outline disabled:opacity-50">
          {exporting
            ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Exporting…</>
            : <><Download size={14} /> Export CSV</>}
        </button>
      </div>

      {/* Source counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(SOURCE_META) as Source[]).map((s) => {
          const meta = SOURCE_META[s];
          const Icon = meta.icon;
          const on = sources.includes(s);
          return (
            <button key={s} onClick={() => toggleSource(s)}
              className="card p-4 text-left transition-all"
              style={{ borderColor: on ? 'var(--c-primary)' : 'var(--c-border)', opacity: on ? 1 : 0.55 }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  <Icon size={12} /> {meta.label}
                </span>
                <input type="checkbox" readOnly checked={on} className="w-3.5 h-3.5 accent-primary pointer-events-none" />
              </div>
              <p className="text-[22px] font-black text-brand-text mt-1.5 leading-none">
                {loading ? '—' : stats?.[s] ?? 0}
              </p>
              <p className="text-[10px] text-brand-muted mt-1">{meta.hint}</p>
            </button>
          );
        })}

        <div className="card p-4" style={{ background: 'var(--c-primary-soft)', borderColor: 'var(--c-primary)' }}>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-primary)' }}>
            <Mails size={12} /> Unique emails
          </span>
          <p className="text-[22px] font-black mt-1.5 leading-none" style={{ color: 'var(--c-primary-dark)' }}>
            {loading ? '—' : stats?.total ?? 0}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--c-primary)' }}>
            After removing duplicates
          </p>
        </div>
      </div>

      {stats && !loading && (
        <p className="flex items-start gap-1.5 text-[11px] text-brand-muted">
          <Info size={13} className="flex-shrink-0 mt-px" />
          <span>
            {stats.registrations + stats.orders + stats.newsletter} entries across the three sources collapse to{' '}
            <b className="text-brand-text">{stats.total} unique addresses</b>
            {stats.inMultipleSources > 0 && <> — {stats.inMultipleSources} appear in more than one</>}.
            {stats.unsubscribed > 0 && <> {stats.unsubscribed} unsubscribed address(es) are excluded from every send.</>}
          </span>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Recipients */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base font-semibold">Recipients</h2>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--c-primary)' }}>
              {picked.size ? `${picked.size} picked` : `All ${contacts.length}`}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search emails…" className="input-field pl-8 text-[11px]" />
            </div>
            {picked.size > 0 && (
              <button onClick={() => setPicked(new Set())} className="text-[11px] font-semibold text-brand-muted hover:text-brand-text">
                Clear
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto rounded-lg" style={{ border: '1px solid var(--c-border)' }}>
            {loading ? (
              <p className="px-3 py-6 text-center text-[11px] text-brand-muted">Building audience…</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-[11px] text-brand-muted">
                {sources.length === 0 ? 'Pick at least one source above.' : 'No matching addresses.'}
              </p>
            ) : filtered.map((c) => {
              const on = picked.has(c.email);
              return (
                <button key={c.email} type="button"
                  onClick={() => setPicked((prev) => {
                    const n = new Set(prev); n.has(c.email) ? n.delete(c.email) : n.add(c.email); return n;
                  })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-brand-bg"
                  style={{ background: on ? 'var(--c-primary-soft)' : 'transparent' }}>
                  <input type="checkbox" readOnly checked={on} className="w-3.5 h-3.5 accent-primary pointer-events-none" />
                  <span className="flex-1 truncate text-[12px] text-brand-text">{c.email}</span>
                  <span className="flex gap-1">
                    {c.sources.map((s) => (
                      <span key={s} title={SOURCE_META[s].label}
                        className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
                        style={{ background: 'var(--c-bg)', color: 'var(--c-muted)' }}>
                        {s.slice(0, 3)}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          {truncated && (
            <p className="text-[10px] text-brand-muted mt-1.5">
              Showing the first 5,000 for selection — sending without picking anyone reaches all {stats?.total}.
            </p>
          )}
        </div>

        {/* Composer */}
        <div className="card space-y-4">
          <h2 className="font-heading text-base font-semibold border-b border-brand-border pb-3">Campaign</h2>

          <div>
            <label className="input-label">Subject line</label>
            <input value={campaign.subject} onChange={(e) => setCampaign({ ...campaign, subject: e.target.value })}
              className="input-field" placeholder="Defaults to the heading below" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Heading *</label>
              <input value={campaign.title} onChange={(e) => setCampaign({ ...campaign, title: e.target.value })}
                className="input-field" placeholder="Festive Sale is live" required />
            </div>
            <div>
              <label className="input-label">Badge</label>
              <input value={campaign.badgeText} onChange={(e) => setCampaign({ ...campaign, badgeText: e.target.value })}
                className="input-field" placeholder="e.g. NEW" />
            </div>
          </div>

          <div>
            <label className="input-label">Message</label>
            <textarea value={campaign.description} onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
              rows={3} className="input-field resize-none" placeholder="What you want them to know" />
          </div>

          <div>
            <label className="input-label">Banner Image</label>
            <div className="flex items-center gap-3">
              <div className="w-28 h-16 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                {campaign.bannerImage ? <img src={campaign.bannerImage} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-brand-border" />}
              </div>
              <label className="btn-outline text-[12px] cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { uploadBanner(e.target.files); e.currentTarget.value = ''; }} />
                {uploading ? 'Uploading…' : <><Upload size={13} /> {campaign.bannerImage ? 'Replace' : 'Upload'}</>}
              </label>
              {campaign.bannerImage && (
                <button type="button" onClick={() => { setCampaign({ ...campaign, bannerImage: '' }); setImgCheck(null); }}
                  className="text-brand-muted hover:text-red-500"><X size={16} /></button>
              )}
            </div>
            <ImageSpecHint spec="banner" check={imgCheck} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Button destination</label>
              <Select
                value={ctaLinks.some((l) => l.url === campaign.ctaUrl) ? campaign.ctaUrl : ''}
                onChange={(url) => {
                  const l = ctaLinks.find((x) => x.url === url);
                  setCampaign((c) => ({ ...c, ctaUrl: url, ctaText: c.ctaText || (l ? l.label : '') }));
                }}
                placeholder="Choose a link…"
                options={ctaLinks.map((l) => ({ value: l.url, label: `${l.group} · ${l.label}` }))}
              />
            </div>
            <div>
              <label className="input-label">Button text</label>
              <input value={campaign.ctaText} onChange={(e) => setCampaign({ ...campaign, ctaText: e.target.value })}
                className="input-field" placeholder="Shop Now" />
            </div>
          </div>

          <button onClick={send} disabled={sending || recipientCount === 0}
            className="btn-primary w-full justify-center disabled:opacity-50">
            {sending
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
              : <><Send size={15} /> Send to {recipientCount} recipient(s)</>}
          </button>
          <p className="text-[10px] text-brand-muted">
            Colours follow the store&rsquo;s active theme, and every email carries an unsubscribe link. Anyone who has
            opted out is skipped, whichever source they came from.
          </p>
        </div>
      </div>
    </div>
  );
}
