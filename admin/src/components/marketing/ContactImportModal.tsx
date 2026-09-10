import { useRef, useState } from 'react';
import {
  FileSpreadsheet, Download, UploadCloud, CheckCircle2, AlertTriangle,
  X, Loader2, ListChecks,
} from 'lucide-react';
import Modal from '../common/Modal';
import { downloadBlob } from '../../utils/download';
import toast from 'react-hot-toast';

export interface ImportResult {
  read: number;
  imported: number;
  duplicates: number;
  invalid: number;
  errors: { row: number; value: string; reason: string }[];
  listName: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 'email' or 'phone' — only changes the wording and the sample file. */
  kind: 'email' | 'phone';
  downloadTemplate: () => Promise<{ data: Blob }>;
  upload: (form: FormData) => Promise<{ data: { message?: string; data: ImportResult } }>;
  onImported: () => void;
}

export default function ContactImportModal({
  open, onClose, kind, downloadTemplate, upload, onImported,
}: Props) {
  const isEmail = kind === 'email';
  const noun = isEmail ? 'email addresses' : 'phone numbers';

  const [file, setFile] = useState<File | null>(null);
  const [listName, setListName] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setListName(''); setResult(null); };

  const close = () => { reset(); onClose(); };

  const getTemplate = async () => {
    try {
      const { data } = await downloadTemplate();
      downloadBlob(data, isEmail ? 'email-contacts-template.xlsx' : 'whatsapp-numbers-template.xlsx');
      toast.success('Template downloaded');
    } catch { /* interceptor */ }
  };

  const pick = (f: File | null | undefined) => {
    if (!f) return;
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { toast.error('Use an .xlsx, .xls or .csv file'); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error('File must be under 8 MB'); return; }
    setFile(f);
    setResult(null);
  };

  const submit = async () => {
    if (!file) { toast.error('Choose a file first'); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (listName.trim()) form.append('listName', listName.trim());
      const { data } = await upload(form);
      setResult(data.data);
      onImported();
      if (data.data.imported > 0) toast.success(data.message || 'Imported');
    } catch { /* interceptor */ } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={close} title={`Import ${noun}`} size="md">
      <div className="space-y-4">
        {/* Step 1 — the sample file */}
        <div className="rounded-xl p-3 flex items-start gap-3" style={{ background: 'var(--c-input)' }}>
          <FileSpreadsheet size={18} style={{ color: 'var(--c-primary)' }} className="flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-brand-text">Not sure of the format?</p>
            <p className="text-[10px] text-brand-muted mt-0.5">
              Download the sample sheet — it has the right columns, worked examples and an
              instructions tab.
            </p>
          </div>
          <button onClick={getTemplate} className="btn-outline !py-1 !text-[10px] flex-shrink-0">
            <Download size={12} /> Template
          </button>
        </div>

        {/* Step 2 — the file */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl px-4 py-7 text-center cursor-pointer transition-all"
          style={{
            border: `1.5px dashed ${dragging ? 'var(--c-primary)' : 'var(--c-border)'}`,
            background: dragging ? 'var(--c-primary-soft)' : 'transparent',
          }}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden
            onChange={(e) => pick(e.target.files?.[0])} />

          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileSpreadsheet size={16} style={{ color: 'var(--c-success)' }} />
              <span className="text-[12px] font-semibold text-brand-text">{file.name}</span>
              <span className="text-[10px] text-brand-muted">({(file.size / 1024).toFixed(0)} KB)</span>
              <button onClick={(e) => { e.stopPropagation(); reset(); }}
                className="w-5 h-5 rounded flex items-center justify-center text-brand-muted hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud size={26} className="mx-auto mb-1.5 text-brand-border" />
              <p className="text-[12px] font-semibold text-brand-text">
                Drop your file here, or click to browse
              </p>
              <p className="text-[10px] text-brand-muted mt-0.5">.xlsx, .xls or .csv — up to 8 MB</p>
            </>
          )}
        </div>

        <div>
          <label className="input-label">List name <span className="font-normal text-brand-muted">(optional)</span></label>
          <input value={listName} onChange={(e) => setListName(e.target.value)}
            className="input-field text-[11px]" placeholder="e.g. Exhibition leads — March" />
          <p className="text-[9px] text-brand-muted mt-1">
            Groups this upload so you can remove the whole batch later in one go.
          </p>
        </div>

        {/* Step 3 — what happened */}
        {result && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
            <div className="grid grid-cols-4 divide-x" style={{ borderColor: 'var(--c-border)' }}>
              {[
                { label: 'Read', value: result.read, color: 'var(--c-muted)' },
                { label: 'Imported', value: result.imported, color: 'var(--c-success)' },
                { label: 'Already had', value: result.duplicates, color: 'var(--c-warning)' },
                { label: 'Invalid', value: result.invalid, color: 'var(--c-danger)' },
              ].map((s) => (
                <div key={s.label} className="p-2.5 text-center">
                  <p className="text-[18px] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-brand-muted mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {result.imported > 0 && (
              <p className="flex items-center gap-1.5 text-[10px] px-3 py-2"
                style={{ background: 'var(--c-success-soft)', color: 'var(--c-success)', borderTop: '1px solid var(--c-border)' }}>
                <CheckCircle2 size={12} />
                Added to the audience under &ldquo;{result.listName}&rdquo;. Duplicates were merged automatically.
              </p>
            )}

            {result.errors.length > 0 && (
              <div style={{ borderTop: '1px solid var(--c-border)' }}>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-2"
                  style={{ background: 'var(--c-danger-soft)', color: 'var(--c-danger)' }}>
                  <AlertTriangle size={12} /> {result.invalid} row(s) skipped — everything else still imported
                </p>
                <div style={{ maxHeight: 130, overflowY: 'auto' }}>
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[10px]"
                      style={{ borderTop: '1px solid var(--c-border)' }}>
                      <span className="font-mono text-brand-muted flex-shrink-0">Row {e.row}</span>
                      <span className="font-mono text-brand-text truncate flex-1">{e.value || '(blank)'}</span>
                      <span className="text-brand-muted flex-shrink-0">{e.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {result ? (
            <>
              <button onClick={reset} className="btn-outline flex-1 justify-center">
                <ListChecks size={14} /> Import another
              </button>
              <button onClick={close} className="btn-primary flex-1 justify-center">Done</button>
            </>
          ) : (
            <button onClick={submit} disabled={busy || !file} className="btn-primary w-full justify-center">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <><UploadCloud size={14} /> Import {noun}</>}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
