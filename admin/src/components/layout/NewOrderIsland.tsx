import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, ArrowRight } from 'lucide-react';

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

const AUTO_DISMISS = 30;

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
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [remaining, setRemaining] = useState(AUTO_DISMISS);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!alert) { setRemaining(AUTO_DISMISS); return; }

    playNotificationSound();
    setRemaining(AUTO_DISMISS);

    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [alert?.id]);

  const openOrder = () => {
    if (!alert) return;
    navigate(`/orders/${alert.orderId}`);
    onClose();
  };

  const R = 13;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  return (
    <AnimatePresence>
      {alert && (
        // Full-width fixed rail doing the centering with flexbox. The card
        // itself must not rely on `translateX(-50%)`: framer-motion writes the
        // `transform` property for its own animation and would overwrite it.
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '18px',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <motion.div
            initial={{ y: -140, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -140, opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            role="button"
            tabIndex={0}
            onClick={openOrder}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openOrder(); } }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            title="Open this order"
            style={{
              pointerEvents: 'auto',
              cursor: 'pointer',
              outline: 'none',
              width: 'max-content',
              maxWidth: 'min(460px, calc(100vw - 32px))',
              background: 'linear-gradient(135deg, #17153A 0%, #2C2A63 55%, #1B1A3C 100%)',
              borderRadius: '18px',
              padding: '12px 12px 12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '13px',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: hover
                ? '0 18px 44px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.14)'
                : '0 12px 34px rgba(0,0,0,0.42)',
              // No `transform` here — framer-motion owns that property for the
              // entry animation and any static value would be overwritten.
              transition: 'box-shadow 200ms ease',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 38, height: 38, borderRadius: '13px',
              background: 'var(--c-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
            }}>
              <ShoppingBag size={17} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 9, color: 'rgba(255,255,255,0.45)', marginBottom: 3,
                fontWeight: 700, letterSpacing: '0.14em',
              }}>
                NEW ORDER
              </p>
              <p style={{
                fontSize: 13.5, fontWeight: 700, color: '#fff', lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                #{alert.orderNumber}
              </p>
              <p style={{
                fontSize: 10.5, color: 'rgba(255,255,255,0.5)', marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {alert.customerName || 'Customer'}
                <span style={{
                  color: 'var(--c-primary)', fontWeight: 700,
                  opacity: hover ? 1 : 0,
                  transition: 'opacity 180ms ease',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  · View <ArrowRight size={10} />
                </span>
              </p>
            </div>

            {/* Amount */}
            {alert.total != null && (
              <div style={{
                flexShrink: 0,
                padding: '6px 11px',
                borderRadius: '11px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>
                  ₹{alert.total.toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {/* Countdown + dismiss */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <svg width="30" height="30" style={{ transform: 'rotate(-90deg)' }} aria-hidden>
                <circle cx="15" cy="15" r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
                <circle
                  cx="15" cy="15" r={R} fill="none"
                  stroke="var(--c-primary)" strokeWidth="2"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - remaining / AUTO_DISMISS)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <text x="15" y="19" textAnchor="middle" fill="rgba(255,255,255,0.75)"
                  fontSize="9" fontWeight="700"
                  style={{ transform: 'rotate(90deg)', transformOrigin: '15px 15px' }}>
                  {remaining}
                </text>
              </svg>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                aria-label="Dismiss"
                style={{
                  width: 26, height: 26, borderRadius: '9px',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
