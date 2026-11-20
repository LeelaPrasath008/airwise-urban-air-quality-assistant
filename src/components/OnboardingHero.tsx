import { ArrowRight, MapPin } from 'lucide-react';
import { ResilientImage } from './BrandMark.tsx';
import type { NavSection } from '../shared/types.ts';

interface OnboardingHeroProps {
  onNavigate: (section: NavSection) => void;
  onOpenLocationModal: () => void;
  onDismiss: () => void;
}

export function OnboardingHero({
  onNavigate,
  onOpenLocationModal,
  onDismiss,
}: OnboardingHeroProps) {
  return (
    <section
      aria-label="Welcome to AIRWISE"
      className="rounded-xl bg-[#11382B] text-white overflow-hidden border border-[#174C3A] grid grid-cols-1 lg:grid-cols-12 items-stretch"
    >
      <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
        <div className="space-y-3">
          <p className="text-xs font-medium text-[#A7F3D0]">
            AIRWISE · Breathe Smarter. Live Greener.
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Turn live urban air quality into practical daily family decisions.
          </h1>
          <p className="text-sm text-[#D1FAE5] leading-relaxed max-w-xl">
            Monitor local PM2.5 and AQI, generate an AI-personalized low-emission daily routine,
            optimize indoor air safely, and track your household&rsquo;s estimated emissions avoided.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#0B261D] bg-[#6EE7B7] rounded-lg hover:bg-[#A7F3D0] transition-colors whitespace-nowrap"
          >
            Build my daily routine
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white border border-white/25 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Change city
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-2 text-xs font-medium text-[#A7F3D0] hover:text-white underline-offset-4 hover:underline"
          >
            Hide intro
          </button>
        </div>
      </div>

      <div className="lg:col-span-5 relative min-h-[200px] lg:min-h-full">
        <ResilientImage
          src="/src/assets/images/hero_clean_urban_morning_1795173802794.jpg"
          alt="Tree-lined urban residential street at clear winter dawn"
          fallbackTitle="Cleaner urban mornings with AIRWISE"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0B261D]/60 via-transparent to-transparent pointer-events-none"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
