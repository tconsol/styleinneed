import { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import Modal from '../../components/common/Modal';
import Select from '../../components/common/Select';
import { productApi } from '../../api';
import { useProductTypes } from '../../hooks/useCatalog';
import toast from 'react-hot-toast';

interface Result { created: number; failed: { row: number; name: string; error: string }[] }

export default function BulkUploadModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const types = (useProductTypes().data || []).filter((t) => t.isActive);
  const [type, setType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeType = type || types[0]?.slug || 'clothing';

  const download = async () => {
    setDownloading(true);
    try {
      const res = await productApi.bulkTemplate(activeType);
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = `product-template-${activeType}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch { toast.error('Download failed'); } finally { setDownloading(false); }
  };

  const upload = async () => {
    if (!file) { toast.error('Choose a file first'); return; }
    setUploading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', activeType);
      const { data } = await productApi.bulkUpload(fd);
      setResult(data.data);
      if (data.data.created > 0) { toast.success(`Imported ${data.data.created} product(s)`); onDone(); }
      if (data.data.created === 0) toast.error('No products imported');
    } catch { toast.error('Upload failed'); } finally { setUploading(false); }
  };

  const reset = () => { setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <Modal open={open} onClose={onClose} title="Bulk Import Products" size="lg">
      <div className="space-y-5">
        {/* Step 1 — product type */}
        <div>
          <label className="input-label">1. Product Type</label>
          <Select value={activeType} onChange={(v) => { setType(v); reset(); }}
            options={types.map((t) => ({ value: t.slug, label: t.name }))} placeholder="Select type" />
          <p className="text-[10px] text-brand-muted mt-1">Columns differ per type — pick the type, then download its template.</p>
        </div>

        {/* Step 2 — download template */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#DCFCE7', color: '#166534' }}>
              <FileSpreadsheet size={16} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-brand-text">2. Download Template</p>
              <p className="text-[10px] text-brand-muted">Excel with the right columns + an example + instructions</p>
            </div>
          </div>
          <button onClick={download} disabled={downloading} className="btn-outline whitespace-nowrap disabled:opacity-60">
            <Download size={14} /> {downloading ? '…' : 'Template'}
          </button>
        </div>

        {/* Step 3 — upload */}
        <div>
          <label className="input-label">3. Upload Filled File</label>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} />
          <div className="flex items-center gap-2">
            <button onClick={() => inputRef.current?.click()} className="btn-outline flex-1 justify-center">
              <Upload size={14} /> {file ? file.name : 'Choose Excel file'}
            </button>
            {file && <button onClick={reset} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}><X size={14} /></button>}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: '#166534' }}>
              <CheckCircle2 size={15} /> {result.created} product(s) imported
            </div>
            {result.failed.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-[12px] font-semibold mb-1" style={{ color: '#B45309' }}>
                  <AlertTriangle size={15} /> {result.failed.length} row(s) skipped
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.failed.map((f, i) => (
                    <p key={i} className="text-[10px] text-brand-muted">
                      Row {f.row} — <span className="font-medium text-brand-text">{f.name}</span>: {f.error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn-outline flex-1 justify-center">Close</button>
          <button onClick={upload} disabled={uploading || !file} className="btn-primary flex-1 justify-center disabled:opacity-50">
            <Upload size={14} /> {uploading ? 'Importing…' : 'Import Products'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
