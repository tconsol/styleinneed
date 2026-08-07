import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';

interface OrderAlert {
  id: string;
  orderId: string;
  orderNumber: string;
  total?: number;
  customerName?: string;
}

interface Props {
  alert: OrderAlert | null;
  onClose: () => void;
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const chime = (freq: number, start: number, dur: number, gain: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };

    chime(880, now,        0.6, 0.3);
    chime(1100, now + 0.15, 0.5, 0.25);
    chime(1320, now + 0.30, 0.7, 0.3);
    chime(880, now + 0.60, 0.4, 0.15);
    chime(1100, now + 0.75, 0.5, 0.2);
    chime(1760, now + 0.90, 0.9, 0.35);
  } catch {}
}

export default function NewOrderIsland({ alert, onClose }: Props) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [remaining, setRemaining] = useState(30);

  useEffect(() => {
    if (!alert) { setRemaining(30); return; }

    playNotificationSound();
    setRemaining(30);

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [alert?.id]);

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ y: -120, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -120, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            position: 'fixed',
            top: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            width: 'max-content',
            maxWidth: '420px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
              borderRadius: '28px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
              color: 'white',
              minWidth: '300px',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--c-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 0 0 3px rgba(129,140,248,0.3)',
            }}>
              <ShoppingBag size={18} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2, fontWeight: 600, letterSpacing: '0.06em' }}>
                NEW ORDER
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                #{alert.orderNumber}
                {alert.customerName ? ` · ${alert.customerName}` : ''}
              </p>
              {alert.total != null && (
                <p style={{ fontSize: 11, color: 'var(--c-primary)', marginTop: 2 }}>
                  ₹{alert.total.toLocaleString('en-IN')}
                </p>
              )}
            </div>

            {/* Timer ring + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <svg width="32" height="32" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
                <circle
                  cx="16" cy="16" r="13" fill="none"
                  stroke="var(--c-primary)" strokeWidth="2.5"
                  strokeDasharray={`${2 * Math.PI * 13}`}
                  strokeDashoffset={`${2 * Math.PI * 13 * (1 - remaining / 30)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <text x="16" y="21" textAnchor="middle" fill="white"
                  fontSize="9" fontWeight="700"
                  style={{ transform: 'rotate(90deg)', transformOrigin: '16px 16px' }}>
                  {remaining}
                </text>
              </svg>
              <button
                onClick={onClose}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 3, background: 'rgba(255,255,255,0.1)',
            borderRadius: '0 0 4px 4px', marginTop: 2, overflow: 'hidden',
          }}>
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${(remaining / 30) * 100}%` }}
              transition={{ duration: 1, ease: 'linear' }}
              style={{ height: '100%', background: 'linear-gradient(90deg, var(--c-primary), var(--c-primary))' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
