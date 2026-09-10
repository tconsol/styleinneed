import { useRef, useState } from 'react';
import { Video, FileText, Image as ImageIcon, UploadCloud, Trash2, Loader2, Link2 } from 'lucide-react';
import { whatsappApi } from '../../api';
import toast from 'react-hot-toast';

export type HeaderKind = 'none' | 'image' | 'video' | 'document';

export interface MediaValue {
  url: string;
  filename?: string;
  headerKind: HeaderKind;
}

interface Props {
  value: MediaValue;
  onChange: (next: MediaValue) => void;
  /** Restrict the picker when the template already declares its header type. */
  expectedKind?: HeaderKind;
  label?: string;
  hint?: string;
}

const ACCEPT: Record<HeaderKind, string> = {
  none: 'image/jpeg,image/png,video/mp4,.pdf,.doc,.docx',
  image: 'image/jpeg,image/png',
  video: 'video/mp4',
  document: '.pdf,.doc,.docx',
};

const HINT: Record<HeaderKind, string> = {
  none: 'Image (JPG/PNG), video (MP4) or document (PDF/DOC) — up to 16 MB',
  image: 'JPG or PNG — up to 16 MB',
  video: 'MP4 — an animated GIF must be saved as MP4',
  document: 'PDF or DOC — up to 16 MB',
};

/**
 * Upload header media and hand back a public URL.
 *
 * WhatsApp fetches template header media from a URL, so the file has to be
 * hosted before a send can reference it. Uploading here beats asking an admin
 * to find a URL for their own banner.
 *
 * Pasting a URL is still allowed — media already hosted elsewhere should not
 * have to be re-uploaded just to be used.
 */
export default function MediaUploadField({
  value, onChange, expectedKind = 'none', label = 'Header media', hint,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pasting, setPasting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const kind = value.headerKind !== 'none' ? value.headerKind : expectedKind;

  const upload = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error('File must be under 16 MB'); return; }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await whatsappApi.uploadMedia(form);
      // Trust what the server says the file actually was, not the picker.
      onChange({
        url: data.data.url,
        filename: data.data.filename,
        headerKind: data.data.headerKind as HeaderKind,
      });
      toast.success('Uploaded');
    } catch { /* interceptor toasts */ } finally { setUploading(false); }
  };

  const clear = () => onChange({ url: '', filename: '', headerKind: expectedKind });

  return (
    <div>
      <label className="input-label flex items-center justify-between">
        <span>{label} <span className="font-normal text-brand-muted">(optional)</span></span>
        {!value.url && (
          <button type="button" onClick={() => setPasting((p) => !p)}
            className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--c-primary)' }}>
            <Link2 size={10} /> {pasting ? 'Upload instead' : 'Paste a URL'}
          </button>
        )}
      </label>

      {value.url ? (
        <div className="flex items-center gap-2 rounded-xl p-2.5" style={{ background: 'var(--c-input)' }}>
          {kind === 'image' ? (
            <img src={value.url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              style={{ border: '1px solid var(--c-border)' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
          ) : (
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              {kind === 'video' ? <Video size={18} className="text-brand-muted" />
                : kind === 'document' ? <FileText size={18} className="text-brand-muted" />
                  : <ImageIcon size={18} className="text-brand-muted" />}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-brand-text truncate">
              {value.filename || value.url.split('/').pop()}
            </p>
            <p className="text-[9px] text-brand-muted truncate">{value.url}</p>
          </div>
          <button type="button" onClick={clear} title="Remove"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-red-500 flex-shrink-0">
            <Trash2 size={13} />
          </button>
        </div>
      ) : pasting ? (
        <input
          autoFocus
          placeholder="https://…/banner.jpg"
          className="input-field text-[11px]"
          onBlur={(e) => {
            const url = e.target.value.trim();
            if (url) onChange({ url, filename: url.split('/').pop(), headerKind: expectedKind === 'none' ? 'image' : expectedKind });
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files?.[0]); }}
          className="rounded-xl px-4 py-6 text-center cursor-pointer transition-all"
          style={{
            border: `1.5px dashed ${dragging ? 'var(--c-primary)' : 'var(--c-border)'}`,
            background: dragging ? 'var(--c-primary-soft)' : 'transparent',
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={22} className="mx-auto mb-1 animate-spin text-brand-muted" />
              <p className="text-[11px] text-brand-muted">Uploading…</p>
            </>
          ) : (
            <>
              <UploadCloud size={22} className="mx-auto mb-1 text-brand-border" />
              <p className="text-[11px] font-semibold text-brand-text">Drop a file, or click to browse</p>
              <p className="text-[9px] text-brand-muted mt-0.5">{hint || HINT[kind]}</p>
            </>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" hidden accept={ACCEPT[kind]}
        onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
  );
}
