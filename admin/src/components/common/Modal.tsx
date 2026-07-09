import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.18 }}
            className={`relative w-full ${widths[size]} rounded-xl shadow-2xl overflow-hidden`}
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid var(--c-border)' }}>
              <h2 className="font-body text-[13px] font-semibold" style={{ color: 'var(--c-text)' }}>{title}</h2>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
                style={{ color: 'var(--c-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--c-bg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(85vh - 56px)' }}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
