import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X } from 'lucide-react';
import { useCompareStore } from '../../stores/compareStore';

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

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          className="fixed bottom-4 left-1/2 z-40 w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-brand-border bg-brand-surface p-3 shadow-luxury"
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-body text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              <Scale size={13} className="text-primary" /> Compare
            </span>

            <div className="flex flex-1 gap-2 overflow-x-auto">
              {items.map((p) => (
                <div key={p._id} className="relative flex-shrink-0">
                  <img
                    src={p.images?.[0] || '/placeholder.jpg'}
                    alt={p.name}
                    className="h-14 w-11 rounded object-cover bg-brand-bg"
                  />
                  <button
                    onClick={() => remove(p._id)}
                    aria-label={`Remove ${p.name}`}
                    className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-text text-white"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button onClick={clear} className="font-body text-xs text-brand-muted hover:text-brand-text">
                Clear
              </button>
              <Link
                to="/compare"
                className="rounded-full bg-primary px-4 py-2 font-body text-xs font-semibold uppercase tracking-wide text-white"
              >
                Compare {items.length}
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
