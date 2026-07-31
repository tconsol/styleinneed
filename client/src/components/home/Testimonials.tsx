import { Star, Quote } from 'lucide-react';
import SectionHeader from '../common/SectionHeader';
import GalaxyParticles from '../common/GalaxyParticles';
import {
  ThreeDScrollTriggerContainer,
  ThreeDScrollTriggerRow,
} from '../lightswind/ThreeDScrollTrigger';
import type { TestimonialCms, SectionHeaderCms } from '../../hooks/useHomepageCms';

interface Props { data: TestimonialCms[]; header?: SectionHeaderCms; }

function TestimonialCard({ t }: { t: TestimonialCms }) {
  return (
    <div className="relative mx-3 inline-flex w-[300px] flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-md md:mx-4 md:w-[350px]">
      {/* Top accent hairline */}
      <div aria-hidden className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: t.rating || 5 }).map((_, s) => (
            <Star key={s} size={14} className="fill-primary text-primary" />
          ))}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Quote size={16} className="text-primary-light" />
        </div>
      </div>

      <p className="font-body text-sm leading-relaxed text-white/65 line-clamp-4">"{t.text}"</p>

      <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-white">
          {t.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-body text-sm font-semibold text-white">{t.name}</p>
          <p className="truncate font-body text-xs text-white/50">{t.city} · {t.product}</p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials({ data, header }: Props) {
  if (!data.length) return null;

  const reversed = [...data].reverse();

  return (
    <section className="page-section relative overflow-hidden bg-brand-text">
      {/* Nebula orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-[28rem] w-[28rem] rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Galaxy stars */}
      <GalaxyParticles count={90} />

      <div className="relative">
        <div className="container-custom">
          <SectionHeader
            dark
            label={header?.label || 'Love from our Customers'}
            title={header?.title || 'What Our Customers Say'}
            subtitle={header?.subtitle || 'Real stories from real women who chose elegance'}
          />
        </div>

        <ThreeDScrollTriggerContainer className="mt-2 space-y-6">
          <ThreeDScrollTriggerRow baseVelocity={4} direction={1}>
            {data.map((t, i) => <TestimonialCard key={`${t.name}-${i}`} t={t} />)}
          </ThreeDScrollTriggerRow>
          <ThreeDScrollTriggerRow baseVelocity={4} direction={-1}>
            {reversed.map((t, i) => <TestimonialCard key={`${t.name}-${i}`} t={t} />)}
          </ThreeDScrollTriggerRow>
        </ThreeDScrollTriggerContainer>
      </div>
    </section>
  );
}
