import { useEffect, useState, useCallback } from 'react';
import {
  MessageCircle, Users, ShoppingCart, Layers, Search, Send, Download,
  AlertTriangle, Plus, Trash2, X, Check, Ban, Globe, Loader2, RefreshCw, ChevronRight,
  LayoutTemplate, Copy, Pencil, CheckSquare, Square, Sparkles, UploadCloud, FileSpreadsheet,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import ContactImportModal from '../../components/marketing/ContactImportModal';
import MediaUploadField, { type HeaderKind } from '../../components/marketing/MediaUploadField';
import WhatsAppTemplateEditor, {
  TemplatePreview, EMPTY_TEMPLATE, type WaTemplate,
} from './WhatsAppTemplateEditor';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { whatsappApi } from '../../api';
import { downloadBlob, stampedName } from '../../utils/download';
import { formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

interface Entry {
  phone: string;
  display: string;
  name?: string;
  sources: string[];
  orders: number;
}

interface Stats {
  registrations: number;
  orders: number;
  total: number;
  inMultipleSources: number;
  imported: number;
  optedOut: number;
  international: number;
}

interface Campaign {
  _id: string;
  name: string;
  templateName: string;
  status: 'sending' | 'completed' | 'partial' | 'failed';
  total: number;
  sent: number;
  failed: number;
  error?: string;
  sentBy?: { name: string };
  createdAt: string;
  recipients?: { phone: string; display?: string; name?: string; ok: boolean; error?: string }[];
}

interface OptOut {
  _id: string;
  phone: string;
  display: string;
  reason?: string;
  source: string;
  createdAt: string;
}

const SOURCES = [
  { key: 'registrations', label: 'Registered customers', icon: Users },
  { key: 'orders', label: 'Order addresses', icon: ShoppingCart },
  { key: 'imported', label: 'Imported', icon: FileSpreadsheet },
];

const TABS = [
  { key: 'compose', label: 'Compose' },
  { key: 'templates', label: 'Templates' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'optouts', label: 'Opt-outs' },
];

export default function WhatsAppMarketingPage() {
  const [tab, setTab] = useState('compose');
  const confirm = useConfirm();

  /* ── Audience ── */
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [activeSources, setActiveSources] = useState<string[]>(['registrations', 'orders', 'imported']);
  // Empty = "everyone in the current selection". Only populated when the admin
  // hand-picks rows, so the default send is not silently limited to one page.
  const [picked, setPicked] = useState<string[]>([]);

  /* ── Composer ── */
  const [form, setForm] = useState({
    name: '', templateName: '', languageCode: 'en_US',
    mediaUrl: '', mediaFilename: '', headerKind: 'none' as HeaderKind,
  });
  const [params, setParams] = useState<string[]>(['']);
  const [sending, setSending] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  /* ── Templates ── */
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [tplCategories, setTplCategories] = useState<string[]>([]);
  const [tplCategory, setTplCategory] = useState('all');
  const [tplSearch, setTplSearch] = useState('');
  const [editor, setEditor] = useState<WaTemplate | null>(null);
  // The preset driving the composer, so a send can reference it by id.
  const [activeTemplate, setActiveTemplate] = useState<WaTemplate | null>(null);

  /* ── Campaigns ── */
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [detail, setDetail] = useState<Campaign | null>(null);

  /* ── Opt-outs ── */
  const [optOuts, setOptOuts] = useState<OptOut[]>([]);
  const [optChecked, setOptChecked] = useState<string[]>([]);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockInput, setBlockInput] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const sourcesParam = activeSources.join(',');

  const loadAudience = useCallback(() => {
    setLoading(true);
    whatsappApi.getAudience({ sources: sourcesParam, search: search || undefined, page, limit: 25 })
      .then(({ data }) => {
        setEntries(data.data.entries || []);
        setStats(data.data.stats || null);
        setSelectedCount(data.data.selected || 0);
        setConfigured(data.data.configured !== false);
        setPages(data.pagination?.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sourcesParam, search, page]);

  const loadTemplates = useCallback(() => {
    whatsappApi.listTemplates({ category: tplCategory, search: tplSearch || undefined })
      .then(({ data }) => {
        setTemplates(data.data.templates || []);
        setTplCategories(data.data.categories || []);
      }).catch(() => {});
  }, [tplCategory, tplSearch]);

  const loadCampaigns = useCallback(() => {
    whatsappApi.listCampaigns({ limit: 30 })
      .then(({ data }) => setCampaigns(data.data || [])).catch(() => {});
  }, []);

  const loadOptOuts = useCallback(() => {
    whatsappApi.listOptOuts({ limit: 100 })
      .then(({ data }) => setOptOuts(data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { loadAudience(); }, [loadAudience]);
  useEffect(() => { if (tab === 'templates' || tab === 'compose') loadTemplates(); }, [tab, loadTemplates]);
  useEffect(() => { if (tab === 'campaigns') loadCampaigns(); }, [tab, loadCampaigns]);
  useEffect(() => { if (tab === 'optouts') loadOptOuts(); }, [tab, loadOptOuts]);

  // A campaign that is still sending updates its counters server-side; poll
  // while any run is in flight so the numbers move without a manual refresh.
  useEffect(() => {
    if (tab !== 'campaigns' || !campaigns.some((c) => c.status === 'sending')) return;
    const t = setInterval(loadCampaigns, 4000);
    return () => clearInterval(t);
  }, [tab, campaigns, loadCampaigns]);

  const toggleSource = (key: string) => {
    setActiveSources((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
    setPage(1); setPicked([]);
  };

  const togglePick = (phone: string) =>
    setPicked((prev) => prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]);

  const pageAllPicked = entries.length > 0 && entries.every((e) => picked.includes(e.phone));
  const togglePage = () => setPicked((prev) => pageAllPicked
    ? prev.filter((p) => !entries.some((e) => e.phone === p))
    : [...new Set([...prev, ...entries.map((e) => e.phone)])]);

  /**
   * Select every number in the current filter, not just the visible page.
   * Fetches the full selection so `picked` genuinely covers all of them —
   * ticking one page and calling it "all" would silently under-send.
   */
  const selectAll = async () => {
    try {
      const { data } = await whatsappApi.getAudience({
        sources: sourcesParam, search: search || undefined, page: 1, limit: 100000,
      });
      setPicked((data.data.entries || []).map((e: Entry) => e.phone));
      toast.success(`Selected all ${data.data.selected} number(s)`);
    } catch { /* interceptor */ }
  };

  const reach = picked.length || selectedCount;

  const exportCsv = async () => {
    try {
      const { data } = await whatsappApi.exportAudience({ sources: sourcesParam });
      downloadBlob(data, stampedName('whatsapp-audience'));
    } catch { /* interceptor */ }
  };

  const sendTest = async () => {
    if (!form.templateName.trim()) { toast.error('Pick a template first'); return; }
    if (!testPhone.trim()) { toast.error('Enter a number'); return; }
    setTesting(true);
    try {
      const { data } = await whatsappApi.sendTest({
        phone: testPhone.trim(),
        templateId: activeTemplate?._id,
        templateName: form.templateName.trim(),
        languageCode: form.languageCode || undefined,
        templateParams: params,
        mediaUrl: form.mediaUrl || undefined,
        headerType: form.mediaUrl ? form.headerKind : activeTemplate?.headerType,
        mediaFilename: form.mediaUrl ? form.mediaFilename : activeTemplate?.mediaFilename,
        buttons: activeTemplate?.buttons,
      });
      toast.success(data.message || 'Test sent');
      setTestOpen(false);
    } catch { /* interceptor */ } finally { setTesting(false); }
  };

  const send = async () => {
    if (!form.templateName.trim()) { toast.error('Pick an approved WhatsApp template'); return; }
    if (reach === 0) { toast.error('No recipients in this selection'); return; }

    if (!(await confirm({
      title: `Send to ${reach} number(s)?`,
      message: 'WhatsApp messages cannot be recalled once sent. Send a test to yourself first if you have not already.',
      confirmText: `Send to ${reach}`,
      danger: true,
    }))) return;

    setSending(true);
    try {
      const { data } = await whatsappApi.send({
        name: form.name.trim() || undefined,
        templateId: activeTemplate?._id,
        templateName: form.templateName.trim(),
        languageCode: form.languageCode || undefined,
        templateParams: params,
        mediaUrl: form.mediaUrl || undefined,
        headerType: form.mediaUrl ? form.headerKind : activeTemplate?.headerType,
        mediaFilename: form.mediaUrl ? form.mediaFilename : activeTemplate?.mediaFilename,
        buttons: activeTemplate?.buttons,
        sources: sourcesParam,
        phones: picked.length ? picked : undefined,
      });
      toast.success(data.message || 'Sending started');
      setPicked([]);
      setTab('campaigns');
      loadCampaigns();
    } catch { /* interceptor */ } finally { setSending(false); }
  };

  const blockNumbers = async () => {
    const list = blockInput.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) { toast.error('Enter at least one number'); return; }
    try {
      const { data } = await whatsappApi.addOptOuts({ phones: list, reason: 'Added by admin' });
      toast.success(data.message || 'Blocked');
      setBlockOpen(false); setBlockInput('');
      loadOptOuts(); loadAudience();
    } catch { /* interceptor */ }
  };

  const unblock = async () => {
    if (optChecked.length === 0) return;
    if (!(await confirm({
      title: `Allow ${optChecked.length} number(s) again?`,
      message: 'They will start receiving marketing messages from the next campaign.',
      confirmText: 'Allow', danger: true,
    }))) return;
    try {
      const { data } = await whatsappApi.removeOptOuts(optChecked);
      toast.success(data.message || 'Removed');
      setOptChecked([]); loadOptOuts(); loadAudience();
    } catch { /* interceptor */ }
  };

  /** Load a preset into the composer and jump there. */
  const useTemplate = (t: WaTemplate) => {
    setActiveTemplate(t);
    setForm({
      name: t.name,
      templateName: t.templateName,
      languageCode: t.languageCode || 'en_US',
      mediaUrl: t.mediaUrl || '',
      mediaFilename: t.mediaFilename || '',
      headerKind: (t.headerType as HeaderKind) || 'none',
    });
    setParams(t.params.length ? [...t.params] : ['']);
    setTab('compose');
    toast.success(`"${t.name}" loaded`);
  };

  const duplicateTemplate = async (t: WaTemplate) => {
    try {
      await whatsappApi.duplicateTemplate(t._id!);
      toast.success('Duplicated');
      loadTemplates();
    } catch { /* interceptor */ }
  };

  const deleteTemplate = async (t: WaTemplate) => {
    if (!(await confirm({
      title: `Delete "${t.name}"?`,
      message: 'The preset is removed from this console. Campaigns already sent are unaffected.',
      confirmText: 'Delete', danger: true,
    }))) return;
    try {
      await whatsappApi.deleteTemplate(t._id!);
      toast.success('Deleted');
      if (activeTemplate?._id === t._id) setActiveTemplate(null);
      loadTemplates();
    } catch { /* interceptor */ }
  };

  const removeCampaign = async (c: Campaign) => {
    if (!(await confirm({
      title: `Delete "${c.name}" from history?`,
      message: 'Only the record is removed — messages already delivered are unaffected.',
      confirmText: 'Delete', danger: true,
    }))) return;
    try {
      await whatsappApi.deleteCampaign(c._id);
      toast.success('Removed from history');
      setDetail(null);
      loadCampaigns();
    } catch { /* interceptor */ }
  };

  const clearHistory = async () => {
    if (!(await confirm({
      title: 'Clear the whole campaign history?',
      message: 'Every finished campaign record is deleted. Runs still sending are kept.',
      confirmText: 'Clear all', danger: true,
    }))) return;
    try {
      const { data } = await whatsappApi.deleteCampaigns({ all: true });
      toast.success(data.message || 'History cleared');
      loadCampaigns();
    } catch { /* interceptor */ }
  };

  const openDetail = async (c: Campaign) => {
    try {
      const { data } = await whatsappApi.getCampaign(c._id);
      setDetail(data.data);
    } catch { /* interceptor */ }
  };

  const statCards = [
    { label: 'Registered', value: stats?.registrations, icon: Users, color: 'var(--c-info)' },
    { label: 'From orders', value: stats?.orders, icon: ShoppingCart, color: 'var(--c-primary)' },
    { label: 'Imported', value: stats?.imported, icon: FileSpreadsheet, color: 'var(--c-info)' },
    { label: 'Unique numbers', value: stats?.total, icon: Layers, color: 'var(--c-success)', big: true },
    { label: 'In both', value: stats?.inMultipleSources, icon: RefreshCw, color: 'var(--c-warning)' },
    { label: 'International', value: stats?.international, icon: Globe, color: 'var(--c-muted)' },
    { label: 'Opted out', value: stats?.optedOut, icon: Ban, color: 'var(--c-danger)' },
  ];

  return (
    <>
      <div className="space-y-5 pb-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-[15px] font-bold text-brand-text flex items-center gap-2">
              <MessageCircle size={16} style={{ color: '#25D366' }} /> WhatsApp Marketing
            </h1>
            <p className="text-[10px] text-brand-muted mt-0.5">
              Broadcast Meta-approved templates to every number the store holds
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setImportOpen(true)} className="btn-outline">
              <UploadCloud size={14} /> Import numbers
            </button>
            <button onClick={exportCsv} className="btn-outline"><Download size={14} /> Export</button>
          </div>
        </div>

        {!configured && (
          <div className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: 'var(--c-warning-soft)', border: '1px solid var(--c-warning)' }}>
            <AlertTriangle size={16} style={{ color: 'var(--c-warning)' }} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-brand-text">WhatsApp is not connected</p>
              <p className="text-[10px] text-brand-muted mt-0.5">
                Set <code className="font-mono">WHATSAPP_ACCESS_TOKEN</code> and{' '}
                <code className="font-mono">WHATSAPP_PHONE_NUMBER_ID</code> in the server environment. The audience
                below is still accurate — nothing can be sent until they are present.
              </p>
            </div>
          </div>
        )}

        {/* Audience numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-4">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                  <Icon size={12} style={{ color: s.color }} /> {s.label}
                </span>
                <p className={`${s.big ? 'text-[24px]' : 'text-[20px]'} font-black mt-1.5 leading-none`}
                  style={{ color: s.big ? s.color : 'var(--c-text)' }}>
                  {s.value ?? '—'}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-brand-muted -mt-2">
          Registered + order numbers are merged and normalised, so one person with several
          number formats counts once. Opted-out numbers are excluded from every send.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 border-b" style={{ borderColor: 'var(--c-border)' }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-4 py-2 text-[12px] font-semibold transition-colors relative"
              style={{ color: tab === t.key ? 'var(--c-primary)' : 'var(--c-muted)' }}>
              {t.label}
              {tab === t.key && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded" style={{ background: 'var(--c-primary)' }} />
              )}
            </button>
          ))}
        </div>

        {/* ── COMPOSE ── */}
        {tab === 'compose' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Audience picker */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {SOURCES.map((s) => {
                  const on = activeSources.includes(s.key);
                  const Icon = s.icon;
                  return (
                    <button key={s.key} onClick={() => toggleSource(s.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={on
                        ? { background: 'var(--c-primary-soft)', color: 'var(--c-primary-dark)', border: '1px solid var(--c-primary)' }
                        : { background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                      {on ? <Check size={12} /> : <Icon size={12} />} {s.label}
                    </button>
                  );
                })}
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search name or number…" className="input-field pl-8 text-[11px]" />
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 flex-wrap"
                  style={{ background: 'var(--c-th-bg)', borderBottom: '1px solid var(--c-border)' }}>
                  <div className="flex items-center gap-3">
                    <button onClick={togglePage} title="Select the numbers on this page"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-text">
                      {pageAllPicked ? <CheckSquare size={14} style={{ color: 'var(--c-primary)' }} /> : <Square size={14} className="text-brand-muted" />}
                      This page
                    </button>
                    <button onClick={selectAll}
                      className="text-[11px] font-semibold" style={{ color: 'var(--c-primary)' }}>
                      Select all {selectedCount}
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] text-brand-muted">
                      {picked.length > 0
                        ? `${picked.length} selected`
                        : `${selectedCount} in this filter`}
                    </p>
                    {picked.length > 0 && (
                      <button onClick={() => setPicked([])} className="text-[10px] font-semibold" style={{ color: 'var(--c-danger)' }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <table className="w-full">
                  <tbody>
                    {loading ? (
                      <tr><td className="text-center py-12"><span className="w-6 h-6 border-2 border-brand-border border-t-primary rounded-full animate-spin inline-block" /></td></tr>
                    ) : entries.length === 0 ? (
                      <tr><td className="text-center py-14">
                        <MessageCircle size={30} className="mx-auto mb-2 text-brand-border" />
                        <p className="text-[11px] text-brand-muted">No numbers match</p>
                      </td></tr>
                    ) : entries.map((e) => {
                      const on = picked.includes(e.phone);
                      return (
                        <tr key={e.phone} style={{ borderBottom: '1px solid var(--c-border)' }}
                          className="cursor-pointer" onClick={() => togglePick(e.phone)}>
                          <td className="pl-4 py-2.5" style={{ width: '34px' }}>
                            <span className="w-4 h-4 rounded flex items-center justify-center"
                              style={on ? { background: 'var(--c-primary)' } : { border: '1.5px solid var(--c-border)' }}>
                              {on && <Check size={10} color="#fff" />}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <p className="text-[11px] font-semibold text-brand-text">{e.name || 'Unnamed'}</p>
                            <p className="text-[10px] font-mono text-brand-muted">{e.display}</p>
                          </td>
                          <td className="py-2.5 text-right pr-4">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {e.sources.map((s) => (
                                <span key={s} className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide"
                                  style={{ background: 'var(--c-input)', color: 'var(--c-muted)' }}>
                                  {s === 'registrations' ? 'Registered' : 'Order'}
                                </span>
                              ))}
                              {e.orders > 0 && (
                                <span className="text-[9px] text-brand-muted">{e.orders} order(s)</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5"
                    style={{ background: 'var(--c-th-bg)', borderTop: '1px solid var(--c-border)' }}>
                    <p className="text-[10px] text-brand-muted">Page {page} of {pages}</p>
                    <div className="flex gap-1">
                      <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-outline !py-1 !text-[10px] disabled:opacity-40">Prev</button>
                      <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-outline !py-1 !text-[10px] disabled:opacity-40">Next</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Composer */}
            <div className="card space-y-4 h-max lg:sticky lg:top-4">
              <div>
                <h2 className="text-[13px] font-bold text-brand-text">Message</h2>
                <p className="text-[10px] text-brand-muted mt-0.5">
                  WhatsApp only allows pre-approved templates for marketing. Create the API
                  template in Meta Business Manager first, then pick it here.
                </p>
              </div>

              {activeTemplate ? (
                <div className="rounded-xl p-2.5 flex items-center gap-2"
                  style={{ background: 'var(--c-primary-soft)', border: '1px solid var(--c-primary)' }}>
                  <Sparkles size={13} style={{ color: 'var(--c-primary-dark)' }} className="flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold truncate" style={{ color: 'var(--c-primary-dark)' }}>{activeTemplate.name}</p>
                    <p className="text-[9px] text-brand-muted">Template loaded — edits here apply to this send only</p>
                  </div>
                  <button onClick={() => setActiveTemplate(null)} title="Detach"
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ color: 'var(--c-primary-dark)' }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setTab('templates')}
                  className="w-full rounded-xl py-2 text-[11px] font-semibold flex items-center justify-center gap-1.5"
                  style={{ border: '1px dashed var(--c-border)', color: 'var(--c-muted)' }}>
                  <LayoutTemplate size={13} /> Start from a template
                </button>
              )}

              <div>
                <label className="input-label">Approved template *</label>
                <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                  <input value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })}
                    className="input-field font-mono" placeholder="diwali_sale_2026" />
                  <input value={form.languageCode} onChange={(e) => setForm({ ...form, languageCode: e.target.value })}
                    className="input-field font-mono" placeholder="en_US" />
                </div>
                <p className="text-[9px] text-brand-muted mt-1">
                  Name and language must match the template Meta approved. Start from a saved template to pick from a list.
                </p>
              </div>

              <div>
                <label className="input-label">Internal label</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field" placeholder="Diwali blast — all customers" />
              </div>

              <div>
                <label className="input-label flex items-center justify-between">
                  <span>Template values</span>
                  <button type="button" onClick={() => setParams((p) => [...p, ''])}
                    className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: 'var(--c-primary)' }}>
                    <Plus size={11} /> Add
                  </button>
                </label>
                <div className="space-y-1.5">
                  {params.map((v, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-brand-muted w-8 flex-shrink-0">{`{{${i + 1}}}`}</span>
                      <input value={v}
                        onChange={(e) => setParams((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                        className="input-field text-[11px]"
                        placeholder={i === 0 ? "Leave blank to use the contact's name" : `Value ${i + 1}`} />
                      {params.length > 1 && (
                        <button type="button" onClick={() => setParams((p) => p.filter((_, j) => j !== i))}
                          className="w-6 h-6 rounded flex items-center justify-center text-brand-muted hover:text-red-500 flex-shrink-0">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <MediaUploadField
                label="Header media"
                value={{ url: form.mediaUrl, filename: form.mediaFilename, headerKind: form.headerKind }}
                // A loaded template already declares its header type, so the
                // picker is narrowed to files Meta will accept for it.
                expectedKind={(activeTemplate?.headerType as HeaderKind) || 'none'}
                onChange={(m) => setForm({
                  ...form, mediaUrl: m.url, mediaFilename: m.filename || '', headerKind: m.headerKind,
                })}
              />

              <div className="rounded-xl p-3" style={{ background: 'var(--c-input)' }}>
                <p className="text-[11px] font-semibold text-brand-text">
                  Will reach {reach} number{reach === 1 ? '' : 's'}
                </p>
                <p className="text-[10px] text-brand-muted mt-0.5">
                  {picked.length > 0 ? 'Your hand-picked selection.' : 'Everyone in the current source filter, minus opt-outs.'}
                </p>
              </div>

              {activeTemplate && (
                <div>
                  <p className="input-label">Preview</p>
                  <TemplatePreview t={{ ...activeTemplate, params }} />
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setTestOpen(true)} disabled={!configured} className="btn-outline flex-1 justify-center">
                  Send test
                </button>
                <button onClick={send} disabled={sending || !configured || reach === 0}
                  className="btn-primary flex-1 justify-center">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TEMPLATES ── */}
        {tab === 'templates' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setTplCategory('all')}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={tplCategory === 'all'
                  ? { background: 'var(--c-primary-soft)', color: 'var(--c-primary-dark)', border: '1px solid var(--c-primary)' }
                  : { background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                All
              </button>
              {tplCategories.map((c) => (
                <button key={c} onClick={() => setTplCategory(c)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={tplCategory === c
                    ? { background: 'var(--c-primary-soft)', color: 'var(--c-primary-dark)', border: '1px solid var(--c-primary)' }
                    : { background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                  {c}
                </button>
              ))}
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input value={tplSearch} onChange={(e) => setTplSearch(e.target.value)}
                  placeholder="Search templates…" className="input-field pl-8 text-[11px]" />
              </div>
              <button onClick={() => setEditor({ ...EMPTY_TEMPLATE })} className="btn-primary">
                <Plus size={14} /> New template
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="card text-center py-16">
                <LayoutTemplate size={32} className="mx-auto mb-2 text-brand-border" />
                <p className="text-[11px] text-brand-muted">No templates yet</p>
                <p className="text-[10px] text-brand-muted mt-1">
                  Run <code className="font-mono">npm run seed:whatsapp</code> for the ready-made set.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {templates.map((t) => (
                  <div key={t._id} className="card p-0 overflow-hidden flex flex-col">
                    <div className="p-3.5 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-brand-text truncate">{t.name}</p>
                          <p className="text-[9px] font-mono text-brand-muted truncate">{t.templateName}</p>
                        </div>
                        {t.isPreset && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide flex-shrink-0"
                            style={{ background: 'var(--c-info-soft, var(--c-input))', color: 'var(--c-info, var(--c-muted))' }}>
                            Preset
                          </span>
                        )}
                      </div>

                      {t.description && (
                        <p className="text-[10px] text-brand-muted line-clamp-2 mb-2">{t.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-1 mb-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                          style={{ background: 'var(--c-input)', color: 'var(--c-muted)' }}>
                          {t.category}
                        </span>
                        {t.headerType !== 'none' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold capitalize"
                            style={{ background: 'var(--c-input)', color: 'var(--c-muted)' }}>
                            {t.headerType}
                          </span>
                        )}
                        {t.buttons.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                            style={{ background: 'var(--c-input)', color: 'var(--c-muted)' }}>
                            {t.buttons.length} button{t.buttons.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(t.useCount ?? 0) > 0 && (
                          <span className="text-[9px] text-brand-muted">used {t.useCount}x</span>
                        )}
                      </div>

                      <div style={{ transform: 'scale(0.86)', transformOrigin: 'top left', width: '116%' }}>
                        <TemplatePreview t={t} />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-2" style={{ borderTop: '1px solid var(--c-border)' }}>
                      <button onClick={() => useTemplate(t)} className="btn-primary !py-1 !text-[10px] flex-1 justify-center">
                        Use
                      </button>
                      <button onClick={() => setEditor(t)} title="Edit"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-primary">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => duplicateTemplate(t)} title="Duplicate"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-primary">
                        <Copy size={13} />
                      </button>
                      <button onClick={() => deleteTemplate(t)} title="Delete"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CAMPAIGNS ── */}
        {tab === 'campaigns' && (
          <>
          {campaigns.length > 0 && (
            <div className="flex justify-end">
              <button onClick={clearHistory} className="btn-outline" style={{ color: 'var(--c-danger)' }}>
                <Trash2 size={13} /> Clear history
              </button>
            </div>
          )}
          <div className="bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
                  <th className="th text-left pl-5">Campaign</th>
                  <th className="th text-center" style={{ width: '110px' }}>Status</th>
                  <th className="th text-center" style={{ width: '150px' }}>Delivered</th>
                  <th className="th text-left" style={{ width: '140px' }}>Sent</th>
                  <th className="th" style={{ width: '40px' }} />
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16">
                    <Send size={30} className="mx-auto mb-2 text-brand-border" />
                    <p className="text-[11px] text-brand-muted">No campaigns sent yet</p>
                  </td></tr>
                ) : campaigns.map((c) => {
                  const pct = c.total ? Math.round((c.sent / c.total) * 100) : 0;
                  return (
                    <tr key={c._id} onClick={() => openDetail(c)} className="cursor-pointer"
                      style={{ borderBottom: '1px solid var(--c-border)' }}>
                      <td className="pl-5 py-3">
                        <p className="text-[11px] font-semibold text-brand-text">{c.name}</p>
                        <p className="text-[10px] font-mono text-brand-muted">{c.templateName}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide"
                          style={c.status === 'completed'
                            ? { background: 'var(--c-success-soft)', color: 'var(--c-success)' }
                            : c.status === 'failed'
                              ? { background: 'var(--c-danger-soft)', color: 'var(--c-danger)' }
                              : { background: 'var(--c-warning-soft)', color: 'var(--c-warning)' }}>
                          {c.status === 'partial' ? 'partly sent' : c.status}
                        </span>
                        {c.error && c.status !== 'sending' && (
                          <p className="text-[9px] mt-1 line-clamp-2" style={{ color: 'var(--c-danger)' }}>
                            {c.error}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--c-input)' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--c-success)' }} />
                            <div style={{ width: `${c.total ? (c.failed / c.total) * 100 : 0}%`, height: '100%', background: 'var(--c-danger)' }} />
                          </div>
                          <span className="text-[10px] text-brand-muted whitespace-nowrap">
                            {c.sent}/{c.total}
                            {c.failed > 0 && <span style={{ color: 'var(--c-danger)' }}> · {c.failed} failed</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[10px] text-brand-muted">
                        {formatDate(c.createdAt)}
                        {c.sentBy?.name && <span className="block">by {c.sentBy.name}</span>}
                      </td>
                      <td className="pr-4 text-right whitespace-nowrap">
                        {c.status !== 'sending' && (
                          <button onClick={(e) => { e.stopPropagation(); removeCampaign(c); }} title="Delete from history"
                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-brand-muted hover:bg-red-50 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        )}
                        <ChevronRight size={14} className="text-brand-muted inline ml-1" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* ── OPT-OUTS ── */}
        {tab === 'optouts' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-brand-muted">
                These numbers are removed from every campaign, whichever source they appear in.
              </p>
              <div className="flex gap-2">
                {optChecked.length > 0 && (
                  <button onClick={unblock} className="btn-outline" style={{ color: 'var(--c-danger)' }}>
                    <Trash2 size={13} /> Allow {optChecked.length} again
                  </button>
                )}
                <button onClick={() => setBlockOpen(true)} className="btn-primary"><Plus size={14} /> Block numbers</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden"
              style={{ border: '1px solid var(--c-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--c-th-bg)', borderBottom: '2px solid var(--c-border)' }}>
                    <th className="th" style={{ width: '40px' }} />
                    <th className="th text-left">Number</th>
                    <th className="th text-left">Reason</th>
                    <th className="th text-left" style={{ width: '110px' }}>Source</th>
                    <th className="th text-left" style={{ width: '120px' }}>Blocked</th>
                  </tr>
                </thead>
                <tbody>
                  {optOuts.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-16">
                      <Ban size={30} className="mx-auto mb-2 text-brand-border" />
                      <p className="text-[11px] text-brand-muted">Nobody has opted out</p>
                    </td></tr>
                  ) : optOuts.map((o) => (
                    <tr key={o._id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                      <td className="pl-4 py-2.5">
                        <input type="checkbox" checked={optChecked.includes(o._id)}
                          onChange={() => setOptChecked((p) => p.includes(o._id) ? p.filter((x) => x !== o._id) : [...p, o._id])} />
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-brand-text">{o.display}</td>
                      <td className="py-2.5 text-[10px] text-brand-muted">{o.reason || '—'}</td>
                      <td className="py-2.5 text-[10px] text-brand-muted capitalize">{o.source}</td>
                      <td className="py-2.5 text-[10px] text-brand-muted">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Test send */}
      <Modal open={testOpen} onClose={() => setTestOpen(false)} title="Send a test message" size="sm">
        <div className="space-y-4">
          <p className="text-[11px] text-brand-muted">
            Goes to one number using the same template and values as the campaign.
          </p>
          <div>
            <label className="input-label">Phone number</label>
            <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)}
              className="input-field font-mono" placeholder="+91 98765 43210" />
          </div>
          <button onClick={sendTest} disabled={testing} className="btn-primary w-full justify-center">
            {testing ? 'Sending…' : 'Send test'}
          </button>
        </div>
      </Modal>

      {/* Block numbers */}
      <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title="Block numbers" size="sm">
        <div className="space-y-4">
          <p className="text-[11px] text-brand-muted">
            One per line, or separated by commas. Any format works — they are normalised before saving.
          </p>
          <textarea value={blockInput} onChange={(e) => setBlockInput(e.target.value)} rows={6}
            className="input-field resize-none font-mono text-[11px]"
            placeholder={'+91 98765 43210\n9876543211'} />
          <button onClick={blockNumbers} className="btn-primary w-full justify-center">
            <Ban size={14} /> Block these numbers
          </button>
        </div>
      </Modal>

      <ContactImportModal
        open={importOpen} onClose={() => setImportOpen(false)} kind="phone"
        downloadTemplate={whatsappApi.importTemplate}
        upload={whatsappApi.importContacts}
        onImported={loadAudience}
      />

      {/* Template editor */}
      <Modal open={!!editor} onClose={() => setEditor(null)}
        title={editor?._id ? `Edit — ${editor.name}` : 'New campaign template'} size="xl">
        {editor && (
          <WhatsAppTemplateEditor
            value={editor}
            onChange={setEditor}
            onSaved={(saved) => { setEditor(null); loadTemplates(); if (activeTemplate?._id === saved._id) setActiveTemplate(saved); }}
          />
        )}
      </Modal>

      {/* Campaign detail */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || 'Campaign'} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total', value: detail.total, color: 'var(--c-text)' },
                { label: 'Delivered', value: detail.sent, color: 'var(--c-success)' },
                { label: 'Failed', value: detail.failed, color: 'var(--c-danger)' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--c-input)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">{s.label}</p>
                  <p className="text-[20px] font-black leading-none mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {detail.error && (
              <p className="text-[11px] px-3 py-2 rounded-lg"
                style={{ background: 'var(--c-danger-soft)', color: 'var(--c-danger)' }}>
                {detail.error}
              </p>
            )}

            {detail.status !== 'sending' && (
              <button onClick={() => removeCampaign(detail)} className="btn-outline" style={{ color: 'var(--c-danger)' }}>
                <Trash2 size={13} /> Delete this campaign from history
              </button>
            )}

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)', maxHeight: '340px', overflowY: 'auto' }}>
              <table className="w-full">
                <thead className="sticky top-0" style={{ background: 'var(--c-th-bg)' }}>
                  <tr style={{ borderBottom: '1px solid var(--c-border)' }}>
                    <th className="th text-left pl-4">Number</th>
                    <th className="th text-left">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.recipients || []).length === 0 ? (
                    <tr><td colSpan={2} className="text-center py-8 text-[11px] text-brand-muted">
                      {detail.status === 'sending' ? 'Still sending — the log appears when it finishes.' : 'No delivery log'}
                    </td></tr>
                  ) : detail.recipients!.map((r, i) => (
                    <tr key={`${r.phone}-${i}`} style={{ borderBottom: '1px solid var(--c-border)' }}>
                      <td className="pl-4 py-2">
                        <p className="text-[11px] font-mono text-brand-text">{r.display || r.phone}</p>
                        {r.name && <p className="text-[9px] text-brand-muted">{r.name}</p>}
                      </td>
                      <td className="py-2">
                        {r.ok ? (
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--c-success)' }}>Accepted by WhatsApp</span>
                        ) : (
                          <span className="text-[10px]" style={{ color: 'var(--c-danger)' }}>{r.error || 'Failed'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
