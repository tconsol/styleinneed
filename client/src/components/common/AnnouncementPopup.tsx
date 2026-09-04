import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { announcementApi } from '../../api/misc.api';
import type { Announcement } from '../../types';

const seen = (id: string) => {
  try { return sessionStorage.getItem(`ann-popup-${id}`) === '1'; } catch { return false; }
};
const markSeen = (id: string) => {
  try { sessionStorage.setItem(`ann-popup-${id}`, '1'); } catch { /* private mode */ }
};

// Modal announcement (type === 'popup'). Shows the newest active popup the
// visitor hasn't dismissed this session, after a short delay so it doesn't
// slam the page on first paint.
export default function AnnouncementPopup() {
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    announcementApi.getActive('popup').then(({ data }) => {
      if (cancelled) return;
      const next = (data.data as Announcement[] | undefined)?.find((a) => !seen(a._id));
      if (next) {
        setAnn(next);
        const t = setTimeout(() => setOpen(true), 1000);
        return () => clearTimeout(t);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const close = () => {
    if (ann) markSeen(ann._id);
    setOpen(false);
  };

  const onCta = () => {
    if (ann) announcementApi.trackClick(ann._id).catch(() => {});
  };

  const hasImage = !!ann?.image;

  return createPortal(
    <AnimatePresence>
      {open && ann && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={close}
        >
          <div className="absolute inset-0 bg-brand-text/50 backdrop-blur-md" />

          <motion.div
            className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] bg-brand-surface shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/5"
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute right-3.5 top-3.5 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-brand-text shadow-sm backdrop-blur transition-all hover:scale-105 hover:bg-white"
              aria-label="Close"
            >
              <X size={17} strokeWidth={2.2} />
            </button>

            {/* Header — banner image, or an elegant tinted gradient */}
            {hasImage ? (
              <div className="relative">
                <img src={ann.image} alt="" className="h-52 w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-surface to-transparent" />
              </div>
            ) : (
              <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-brand-surface">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
                <div className="absolute left-1/2 top-8 -translate-x-1/2">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-white shadow-lg">
                    <Sparkles size={24} />
                  </span>
                </div>
              </div>
            )}

            {/* Body */}
            <div className={`px-8 pb-8 text-center ${hasImage ? '-mt-6 relative z-10' : 'pt-2'}`}>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles size={11} /> Special
              </span>
              <h3 className="font-heading text-[26px] font-semibold leading-tight text-brand-text">{ann.title}</h3>
              <p className="mx-auto mt-2.5 max-w-[320px] font-body text-sm leading-relaxed text-brand-muted">{ann.content}</p>

              {ann.ctaText && ann.ctaLink && (
                <a
                  href={ann.ctaLink}
                  onClick={() => { onCta(); close(); }}
                  className="group mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-9 py-3.5 font-body text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
                >
                  {ann.ctaText}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </a>
              )}

              <button
                onClick={close}
                className="mt-4 block w-full font-body text-xs text-brand-muted transition-colors hover:text-brand-text"
              >
                No thanks
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
