import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback<ConfirmFn>((opts = {}) => {
    return new Promise<boolean>((resolve) => setState({ opts, resolve }));
  }, []);

  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };

  const o = state?.opts;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => close(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: 'var(--c-surface, #fff)', border: '1px solid var(--c-border)' }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${o?.danger !== false ? 'bg-red-100' : 'bg-indigo-100'}`}>
                  <AlertTriangle size={18} className={o?.danger !== false ? 'text-red-600' : 'text-indigo-600'} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold text-brand-text">{o?.title || 'Are you sure?'}</h3>
                  <p className="text-[12px] text-brand-muted mt-1">{o?.message || 'This action cannot be undone.'}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => close(false)} className="btn-outline flex-1 justify-center text-[12px]">
                  {o?.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={() => close(true)}
                  className={`flex-1 justify-center text-[12px] inline-flex items-center rounded-lg px-4 font-medium text-white transition-colors ${o?.danger !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-dark'}`}
                  style={{ minHeight: 38 }}
                >
                  {o?.confirmText || 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
