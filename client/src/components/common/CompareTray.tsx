import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X, ArrowRight, Plus } from 'lucide-react';
import { useCompareStore, COMPARE_MAX } from '../../stores/compareStore';
import { thumb } from '../../utils/image';

/**
 * Floating tray showing what's queued for comparison. Hidden on the compare
 * page itself, and on checkout where it would only be a distraction.
 */
export default function CompareTray() {
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const { pathname } = useLocation();

  const hidden = pathname === '/compare' || pathname.startsWith('/checkout');
  const show = items.length > 0 && !hidden;
  const emptySlots = Math.max(0, COMPARE_MAX - items.length);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="fixed bottom-4 left-1/2 z-40 w-[min(94vw,600px)] -translate-x-1/2"
          // framer-motion writes `transform`, which would overwrite a static
          // -translate-x-1/2, so the centering is done by the margin instead.
          style={{ x: '-50%' }}
        >
          <div className="electric-border">
          <div className="overflow-hidden rounded-[calc(1rem-1.5px)] bg-brand-surface/95 backdrop-blur-xl">
            {/* Progress: how many slots are used, without needing a sentence */}
            <div className="h-0.5 w-full bg-brand-border/60">
              <motion.div
                className="h-full bg-primary"
                initial={false}
                animate={{ width: `${(items.length / COMPARE_MAX) * 100}%` }}
                transition={{ type: 'spring', damping: 30, stiffness: 220 }}
              />
            </div>

            <div className="flex items-center gap-3 p-2.5 sm:p-3">
              <span className="hidden flex-shrink-0 items-center gap-1.5 sm:flex">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10">
                  <Scale size={14} className="text-primary" />
                </span>
                <span className="font-body text-[10px] font-bold uppercase tracking-[0.14em] text-brand-muted">
                  Compare
                  <span className="ml-1 text-primary">{items.length}/{COMPARE_MAX}</span>
                </span>
              </span>

              <div className="flex flex-1 items-center justify-center gap-2 px-1 pt-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  {items.map((p) => (
                    <motion.div
                      key={p._id}
                      layout
                      initial={{ opacity: 0, scale: 0.6, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6, y: 8 }}
                      transition={{ type: 'spring', damping: 24, stiffness: 400 }}
                      className="group relative flex-shrink-0"
                    >
                      <Link to={`/products/${p.slug}`} title={p.name}>
                        <img
                          src={thumb(p.images?.[0], 80)}
                          alt={p.name}
                          width={36}
                          height={46}
                          decoding="async"
                          className="h-[46px] w-9 rounded-lg bg-brand-bg object-cover ring-1 ring-brand-border transition-transform group-hover:scale-105"
                        />
                      </Link>
                      <button
                        onClick={() => remove(p._id)}
                        aria-label={`Remove ${p.name}`}
                        title={`Remove ${p.name}`}
                        className="absolute -right-1.5 -top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-brand-surface text-brand-muted shadow-md ring-1 ring-brand-border transition-all hover:bg-red-500 hover:text-white hover:ring-red-500"
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Remaining slots, so the limit is obvious before you hit it */}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <div
                    key={`slot-${i}`}
                    className="grid h-[46px] w-9 flex-shrink-0 place-items-center rounded-lg border border-dashed border-brand-border text-brand-border"
                  >
                    <Plus size={12} />
                  </div>
                ))}
              </div>

              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  onClick={clear}
                  className="rounded-lg px-2 py-1.5 font-body text-[11px] font-medium text-brand-muted transition-colors hover:text-brand-text"
                >
                  Clear
                </button>
                <Link
                  to="/compare"
                  className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 font-body text-[11px] font-bold uppercase tracking-wide text-white transition-all hover:brightness-110 sm:px-4"
                >
                  Compare
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
