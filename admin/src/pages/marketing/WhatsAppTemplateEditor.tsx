import { useState, useEffect } from 'react';
import {
  Image as ImageIcon, Video, FileText, Ban, Plus, X, Link2,
  MessageSquare, Save, Loader2, RefreshCw, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import Select from '../../components/common/Select';
import MediaUploadField from '../../components/marketing/MediaUploadField';
import { whatsappApi } from '../../api';
import toast from 'react-hot-toast';

export type HeaderType = 'none' | 'image' | 'video' | 'document';

/** A template as Meta reports it. */
export interface MetaTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  bodyParams: number;
  bodyText?: string;
  headerKind: string;
  footerText?: string;
  buttons: { type: string; text: string }[];
}

export interface TemplateButton {
  index: number;
  type: 'url' | 'quick_reply';
  text: string;
  urlSuffix?: string;
}

export interface WaTemplate {
  _id?: string;
  name: string;
  description?: string;
  category: string;
  templateName: string;
  languageCode: string;
  headerType: HeaderType;
  mediaUrl?: string;
  mediaFilename?: string;
  bodyPreview?: string;
  footerPreview?: string;
  params: string[];
  buttons: TemplateButton[];
  tags: string[];
  isPreset?: boolean;
  useCount?: number;
}

export const EMPTY_TEMPLATE: WaTemplate = {
  name: '', description: '', category: 'Promotions', templateName: '', languageCode: 'en_US',
  headerType: 'none', mediaUrl: '', mediaFilename: '',
  bodyPreview: '', footerPreview: '', params: [''], buttons: [], tags: [],
};

const HEADER_TYPES: { value: HeaderType; label: string; icon: typeof ImageIcon; hint: string }[] = [
  { value: 'none', label: 'No header', icon: Ban, hint: 'Text only' },
  { value: 'image', label: 'Image', icon: ImageIcon, hint: 'JPG or PNG' },
  { value: 'video', label: 'Video / GIF', icon: Video, hint: 'MP4 — a GIF must be an MP4' },
  { value: 'document', label: 'Document', icon: FileText, hint: 'PDF, DOCX…' },
];

const CATEGORIES = ['Promotions', 'Recovery', 'Catalogue', 'Transactional', 'General']
  .map((c) => ({ value: c, label: c }));

/** Substitute {{1}}, {{2}} … with the entered values for the preview. */
export const renderBody = (body: string, params: string[]): string =>
  (body || '').replace(/\{\{(\d+)\}\}/g, (whole, n) => {
    const v = params[Number(n) - 1];
    return v && v.trim() ? v : whole;
  });

/** WhatsApp renders *bold*, _italic_ and ~strike~ — mirror that in the preview. */
const formatWa = (text: string): string =>
  text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/~([^~\n]+)~/g, '<s>$1</s>')
    .replace(/\n/g, '<br />');

/** A phone-accurate preview so copy can be judged before it is sent. */
export function TemplatePreview({ t }: { t: WaTemplate }) {
  const body = renderBody(t.bodyPreview || '', t.params);

  return (
    <div className="rounded-2xl p-4" style={{ background: '#ECE5DD' }}>
      <div className="mx-auto" style={{ maxWidth: 300 }}>
        <div className="rounded-lg overflow-hidden shadow-sm" style={{ background: '#fff' }}>
          {t.headerType !== 'none' && (
            <div className="relative" style={{ background: '#D9D2CB' }}>
              {t.headerType === 'image' && t.mediaUrl ? (
                <img src={t.mediaUrl} alt="" style={{ width: '100%', display: 'block', maxHeight: 170, objectFit: 'cover' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1" style={{ height: 110 }}>
                  {t.headerType === 'video' && <Video size={26} color="#7A736C" />}
                  {t.headerType === 'document' && <FileText size={26} color="#7A736C" />}
                  {t.headerType === 'image' && <ImageIcon size={26} color="#7A736C" />}
                  <span className="text-[10px]" style={{ color: '#7A736C' }}>
                    {t.headerType === 'document'
                      ? (t.mediaFilename || 'document.pdf')
                      : `${t.headerType} header`}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="px-2.5 py-2">
            <p className="text-[12px] leading-[1.45]" style={{ color: '#111B21', whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: formatWa(body) || '<span style="opacity:.4">Message body…</span>' }} />
            {t.footerPreview && (
              <p className="text-[10px] mt-1.5" style={{ color: '#8696A0' }}>{t.footerPreview}</p>
            )}
            <p className="text-[9px] text-right mt-0.5" style={{ color: '#8696A0' }}>
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {t.buttons.length > 0 && (
            <div style={{ borderTop: '1px solid #E9EDEF' }}>
              {t.buttons.map((b, i) => (
                <div key={i} className="flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium"
                  style={{ color: '#00A5F4', borderTop: i > 0 ? '1px solid #E9EDEF' : undefined }}>
                  {b.type === 'url' && <Link2 size={12} />}
                  {b.text || 'Button'}
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-[9px] text-center mt-2" style={{ color: '#667781' }}>
          Approximate preview — the approved template in Meta is what actually sends.
        </p>
      </div>
    </div>
  );
}

interface Props {
  value: WaTemplate;
  onChange: (t: WaTemplate) => void;
  onSaved: (t: WaTemplate) => void;
}

export default function WhatsAppTemplateEditor({ value: t, onChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState('');

  useEffect(() => { setTagInput(''); }, [t._id]);

  /** Pull the approved templates so the name never has to be typed by hand. */
  const loadMetaTemplates = async () => {
    setLoadingMeta(true);
    setMetaError('');
    try {
      const { data } = await whatsappApi.metaTemplates();
      if (data.data.configured === false) {
        setMetaError(data.data.hint || 'Template listing is not configured');
        setMetaTemplates([]);
      } else {
        setMetaTemplates(data.data.templates || []);
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setMetaError(msg || 'Could not reach Meta — enter the template name manually');
    } finally { setLoadingMeta(false); }
  };

  useEffect(() => { void loadMetaTemplates(); }, []);

  const selectedMeta = metaTemplates.find(
    (m) => m.name === t.templateName && m.language === t.languageCode
  );

  const set = (patch: Partial<WaTemplate>) => onChange({ ...t, ...patch });

  // Keep the param list long enough for every placeholder used in the body.
  useEffect(() => {
    const highest = Math.max(0, ...[...(t.bodyPreview || '').matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])));
    if (highest > t.params.length) {
      onChange({ ...t, params: [...t.params, ...Array(highest - t.params.length).fill('')] });
    }
  }, [t.bodyPreview]);

  const addButton = () => {
    if (t.buttons.length >= 3) { toast.error('WhatsApp allows at most 3 buttons'); return; }
    set({ buttons: [...t.buttons, { index: t.buttons.length, type: 'url', text: '', urlSuffix: '' }] });
  };

  const save = async () => {
    if (!t.name.trim()) { toast.error('Give the template a name'); return; }
    if (!t.templateName.trim()) { toast.error('Choose an approved WhatsApp template'); return; }
    if (t.headerType !== 'none' && !t.mediaUrl?.trim()) {
      toast.error(`A ${t.headerType} header needs a media URL`); return;
    }
    setSaving(true);
    try {
      const payload = { ...t, templateParams: undefined };
      const { data } = t._id
        ? await whatsappApi.updateTemplate(t._id, payload)
        : await whatsappApi.createTemplate(payload);
      toast.success(data.message || 'Saved');
      onSaved(data.data);
    } catch { /* interceptor */ } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Template name *</label>
            <input value={t.name} onChange={(e) => set({ name: e.target.value })}
              className="input-field" placeholder="Festive Sale Announcement" />
          </div>
          <div>
            <label className="input-label">Category</label>
            <Select value={t.category} onChange={(v) => set({ category: v })} options={CATEGORIES} />
          </div>
        </div>

        <div>
          <label className="input-label flex items-center justify-between">
            <span>Approved WhatsApp template *</span>
            <button type="button" onClick={loadMetaTemplates} disabled={loadingMeta}
              className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--c-primary)' }}>
              <RefreshCw size={10} className={loadingMeta ? 'animate-spin' : ''} /> Refresh from Meta
            </button>
          </label>

          {metaTemplates.length > 0 ? (
            <Select
              value={`${t.templateName}::${t.languageCode}`}
              onChange={(v) => {
                const picked = metaTemplates.find((m) => `${m.name}::${m.language}` === v);
                if (!picked) return;
                set({
                  templateName: picked.name,
                  languageCode: picked.language,
                  headerType: picked.headerKind as HeaderType,
                  bodyPreview: picked.bodyText || t.bodyPreview,
                  footerPreview: picked.footerText || t.footerPreview,
                  // Meta tells us exactly how many values it wants; a mismatch
                  // is rejected with error 132000.
                  params: Array.from({ length: picked.bodyParams }, (_, i) => t.params[i] ?? ''),
                });
              }}
              options={metaTemplates.map((m) => ({
                value: `${m.name}::${m.language}`,
                label: `${m.name} (${m.language})${m.status !== 'APPROVED' ? ` — ${m.status}` : ''}`,
              }))}
              placeholder="Choose one of your approved templates…"
            />
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2">
              <input value={t.templateName} onChange={(e) => set({ templateName: e.target.value })}
                className="input-field font-mono" placeholder="festive_sale" />
              <input value={t.languageCode} onChange={(e) => set({ languageCode: e.target.value })}
                className="input-field font-mono" placeholder="en_US" />
            </div>
          )}

          {metaError && (
            <p className="flex items-start gap-1 text-[9px] mt-1" style={{ color: 'var(--c-warning)' }}>
              <AlertTriangle size={10} className="flex-shrink-0 mt-px" /> {metaError}
            </p>
          )}
          {selectedMeta && (
            <p className="flex items-center gap-1 text-[9px] mt-1"
              style={{ color: selectedMeta.status === 'APPROVED' ? 'var(--c-success)' : 'var(--c-warning)' }}>
              <CheckCircle2 size={10} />
              {selectedMeta.status} · {selectedMeta.bodyParams} value(s) · {selectedMeta.headerKind} header
            </p>
          )}
          <p className="text-[9px] text-brand-muted mt-1">
            Templates are created and approved in Meta Business Manager, not here.
          </p>
        </div>

        <div>
          <label className="input-label">Internal note</label>
          <input value={t.description || ''} onChange={(e) => set({ description: e.target.value })}
            className="input-field" placeholder="What this campaign is for" />
        </div>

        {/* Header media */}
        <div>
          <label className="input-label">Header</label>
          <div className="grid grid-cols-4 gap-2">
            {HEADER_TYPES.map((h) => {
              const Icon = h.icon;
              const on = t.headerType === h.value;
              return (
                <button key={h.value} type="button" onClick={() => set({ headerType: h.value })}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                  style={on
                    ? { background: 'var(--c-primary-soft)', border: '1.5px solid var(--c-primary)', color: 'var(--c-primary-dark)' }
                    : { background: 'var(--c-surface)', border: '1.5px solid var(--c-border)', color: 'var(--c-muted)' }}>
                  <Icon size={15} />
                  <span className="text-[10px] font-semibold">{h.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-brand-muted mt-1">
            {HEADER_TYPES.find((h) => h.value === t.headerType)?.hint}
          </p>
        </div>

        {t.headerType !== 'none' && (
          <MediaUploadField
            label="Header file"
            expectedKind={t.headerType}
            value={{ url: t.mediaUrl || '', filename: t.mediaFilename, headerKind: t.headerType }}
            onChange={(m) => set({
              mediaUrl: m.url,
              mediaFilename: m.filename,
              // The server reports what the file really is; keep the template
              // in step so the send declares the right header component.
              headerType: (m.url ? m.headerKind : t.headerType) as HeaderType,
            })}
          />
        )}

        {/* Body */}
        <div>
          <label className="input-label">Message body</label>
          <textarea value={t.bodyPreview || ''} onChange={(e) => set({ bodyPreview: e.target.value })} rows={5}
            className="input-field resize-none text-[12px]"
            placeholder={'Hi {{1}}! Our sale is live — up to {{2}}% off.\n\nUse *bold*, _italic_, ~strike~.'} />
          <p className="text-[9px] text-brand-muted mt-1">
            Must match the approved Meta template. Type <code className="font-mono">{'{{1}}'}</code> for a value slot.
          </p>
        </div>

        <div>
          <label className="input-label">Footer</label>
          <input value={t.footerPreview || ''} onChange={(e) => set({ footerPreview: e.target.value })}
            className="input-field text-[11px]" placeholder="Style In Need Fashions" />
        </div>

        {/* Params */}
        <div>
          <label className="input-label flex items-center justify-between">
            <span>Values</span>
            <button type="button" onClick={() => set({ params: [...t.params, ''] })}
              className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: 'var(--c-primary)' }}>
              <Plus size={11} /> Add
            </button>
          </label>
          <div className="space-y-1.5">
            {t.params.map((v, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-brand-muted w-8 flex-shrink-0">{`{{${i + 1}}}`}</span>
                <input value={v}
                  onChange={(e) => set({ params: t.params.map((x, j) => (j === i ? e.target.value : x)) })}
                  className="input-field text-[11px]"
                  placeholder={i === 0 ? "Blank = the contact's name" : `Value ${i + 1}`} />
                <button type="button" onClick={() => set({ params: t.params.filter((_, j) => j !== i) })}
                  className="w-6 h-6 rounded flex items-center justify-center text-brand-muted hover:text-red-500 flex-shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div>
          <label className="input-label flex items-center justify-between">
            <span>Buttons <span className="font-normal text-brand-muted">(max 3)</span></span>
            <button type="button" onClick={addButton}
              className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: 'var(--c-primary)' }}>
              <Plus size={11} /> Add button
            </button>
          </label>

          {t.buttons.length === 0 ? (
            <p className="text-[10px] text-brand-muted py-2">No buttons.</p>
          ) : (
            <div className="space-y-2">
              {t.buttons.map((b, i) => (
                <div key={i} className="rounded-xl p-2.5 space-y-2" style={{ background: 'var(--c-input)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-32 flex-shrink-0">
                      <Select value={b.type}
                        onChange={(v) => set({ buttons: t.buttons.map((x, j) => (j === i ? { ...x, type: v as 'url' | 'quick_reply' } : x)) })}
                        options={[{ value: 'url', label: 'Link button' }, { value: 'quick_reply', label: 'Quick reply' }]} />
                    </div>
                    <input value={b.text}
                      onChange={(e) => set({ buttons: t.buttons.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                      className="input-field text-[11px]" placeholder="Button label — e.g. Shop Now" maxLength={25} />
                    <button type="button" onClick={() => set({ buttons: t.buttons.filter((_, j) => j !== i).map((x, j) => ({ ...x, index: j })) })}
                      className="w-6 h-6 rounded flex items-center justify-center text-brand-muted hover:text-red-500 flex-shrink-0">
                      <X size={12} />
                    </button>
                  </div>
                  {b.type === 'url' && (
                    <div className="flex items-center gap-1.5">
                      <Link2 size={12} className="text-brand-muted flex-shrink-0" />
                      <input value={b.urlSuffix || ''}
                        onChange={(e) => set({ buttons: t.buttons.map((x, j) => (j === i ? { ...x, urlSuffix: e.target.value } : x)) })}
                        className="input-field text-[11px] font-mono" placeholder="products?sale=1" />
                    </div>
                  )}
                </div>
              ))}
              <p className="text-[9px] text-brand-muted">
                Meta holds the base URL in the approved template; only this suffix is sent per message.
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="input-label">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {t.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium"
                style={{ background: 'var(--c-primary-soft)', color: 'var(--c-primary-dark)' }}>
                {tag}
                <button type="button" onClick={() => set({ tags: t.tags.filter((x) => x !== tag) })}><X size={10} /></button>
              </span>
            ))}
          </div>
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                e.preventDefault();
                if (!t.tags.includes(tagInput.trim())) set({ tags: [...t.tags, tagInput.trim()] });
                setTagInput('');
              }
            }}
            className="input-field text-[11px]" placeholder="Type a tag and press Enter" />
        </div>

        <button onClick={save} disabled={saving} className="btn-primary w-full justify-center">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> {t._id ? 'Update template' : 'Save template'}</>}
        </button>
      </div>

      {/* Live preview */}
      <div className="h-max lg:sticky lg:top-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-brand-text mb-2">
          <MessageSquare size={13} style={{ color: '#25D366' }} /> Preview
        </p>
        <TemplatePreview t={t} />
      </div>
    </div>
  );
}
