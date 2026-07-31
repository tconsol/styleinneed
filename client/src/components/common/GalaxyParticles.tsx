import { useMemo } from 'react';
import type { CSSProperties } from 'react';

interface GalaxyParticlesProps {
  count?: number;
  className?: string;
}

// Deterministic pseudo-random from an index so particles never shift on re-render.
const seeded = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const RANGE = (i: number, span: number) => (seeded(i) - 0.5) * span;

export default function GalaxyParticles({ count = 80, className = '' }: GalaxyParticlesProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        left: `${(seeded(i) * 100).toFixed(2)}%`,
        top: `${(seeded(i + 100) * 100).toFixed(2)}%`,
        size: 1 + seeded(i + 200) * 2.2,
        delay: `${(seeded(i + 300) * 6).toFixed(2)}s`,
        duration: `${(3 + seeded(i + 400) * 5).toFixed(2)}s`,
        opacity: 0.35 + seeded(i + 500) * 0.55,
        tint: seeded(i + 600) > 0.75,
        glow: seeded(i + 700) > 0.88,
        drift: {
          x1: RANGE(i + 800, 80),
          y1: RANGE(i + 900, 80),
          x2: RANGE(i + 1000, 140),
          y2: RANGE(i + 1100, 140),
          x3: RANGE(i + 1200, 60),
          y3: RANGE(i + 1300, 60),
          dur: 12 + seeded(i + 1400) * 16,
        },
      })),
    [count],
  );

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {stars.map((s, i) => (
        <span
          key={i}
          className="galaxy-particle"
          style={
            {
              left: s.left,
              top: s.top,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.opacity,
              background: s.tint ? 'rgb(var(--color-primary-light))' : '#ffffff',
              animationDelay: s.delay,
              animationDuration: s.duration,
              '--drift-x1': `${s.drift.x1.toFixed(1)}px`,
              '--drift-y1': `${s.drift.y1.toFixed(1)}px`,
              '--drift-x2': `${s.drift.x2.toFixed(1)}px`,
              '--drift-y2': `${s.drift.y2.toFixed(1)}px`,
              '--drift-x3': `${s.drift.x3.toFixed(1)}px`,
              '--drift-y3': `${s.drift.y3.toFixed(1)}px`,
              '--drift-dur': `${s.drift.dur.toFixed(1)}s`,
              boxShadow: s.glow
                ? `0 0 ${(s.size * 3).toFixed(1)}px 1px rgb(var(--color-primary) / 0.7)`
                : undefined,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
