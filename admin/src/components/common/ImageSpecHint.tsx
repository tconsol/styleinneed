import { Ratio, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { IMAGE_SPECS, type ImageSpecKey, type RatioCheck } from '../../config/imageSpecs';

/**
 * Shows the recommended dimensions for an upload slot, plus feedback once a
 * file has been measured. Pair with `readImageSize` + `checkRatio`.
 */
export default function ImageSpecHint({ spec, check }: { spec: ImageSpecKey; check?: RatioCheck | null }) {
  const s = IMAGE_SPECS[spec];

  return (
    <div className="mt-1.5 space-y-1">
      <p className="flex items-center gap-1.5 text-[10px] text-brand-muted">
        <Ratio size={11} className="flex-shrink-0" />
        <span>
          Recommended <b className="text-brand-text">{s.width} × {s.height}px</b> ({s.ratio}) — {s.usedFor}
        </span>
      </p>

      {check && (
        check.ok ? (
          <p className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--c-success)' }}>
            <CheckCircle2 size={11} className="flex-shrink-0" />
            {check.width}×{check.height}px — fits perfectly.
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-[10px]" style={{ color: 'var(--c-warning)' }}>
            <AlertTriangle size={11} className="flex-shrink-0 mt-px" />
            <span>{check.message}</span>
          </p>
        )
      )}
    </div>
  );
}
