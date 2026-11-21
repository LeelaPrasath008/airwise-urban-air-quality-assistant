import type { ActionCategory, TrackedAction } from '../types.ts';

export interface ImpactProgressSummary {
  totalActions: number;
  weeklyActions: number;
  monthlyActions: number;
  totalEstimatedCo2Kg: number;
  weeklyEstimatedCo2Kg: number;
  monthlyEstimatedCo2Kg: number;
  categoryBreakdown: Record<ActionCategory, { count: number; co2Kg: number }>;
  weeklyBuckets: Array<{ label: string; count: number; co2Kg: number }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    achieved: boolean;
    progressLabel: string;
  }>;
}

const MS_PER_DAY = 86_400_000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function createEmptyCategoryBreakdown(): Record<ActionCategory, { count: number; co2Kg: number }> {
  return {
    public_transit: { count: 0, co2Kg: 0 },
    active_travel: { count: 0, co2Kg: 0 },
    energy_saving: { count: 0, co2Kg: 0 },
    waste_reduction: { count: 0, co2Kg: 0 },
    reusable_swap: { count: 0, co2Kg: 0 },
    clean_indoor_air: { count: 0, co2Kg: 0 },
  };
}

function createWeeklyBuckets(nowStart: number) {
  return [3, 2, 1, 0].map((weeksAgo) => {
    const end = nowStart - weeksAgo * 7 * MS_PER_DAY + MS_PER_DAY;
    const start = end - 7 * MS_PER_DAY;
    const label = weeksAgo === 0 ? 'This week' : weeksAgo === 1 ? 'Last week' : `${weeksAgo}w ago`;
    return { label, start, end, count: 0, co2Kg: 0 };
  });
}

function buildMilestones(params: {
  totalActions: number;
  weeklyActions: number;
  distinctCategories: number;
  totalEstimatedCo2Kg: number;
}): ImpactProgressSummary['milestones'] {
  const { totalActions, weeklyActions, distinctCategories, totalEstimatedCo2Kg } = params;
  return [
    {
      id: 'ms-first',
      title: 'First Clean-Air Action',
      description: 'Log your first sustainable or exposure-reducing habit.',
      achieved: totalActions >= 1,
      progressLabel: `${Math.min(totalActions, 1)} / 1 action`,
    },
    {
      id: 'ms-weekly-5',
      title: 'Consistent Week',
      description: 'Complete 5 sustainable actions within the last 7 days.',
      achieved: weeklyActions >= 5,
      progressLabel: `${Math.min(weeklyActions, 5)} / 5 this week`,
    },
    {
      id: 'ms-diverse',
      title: 'Well-Rounded Household',
      description: 'Log actions across at least 3 sustainability categories.',
      achieved: distinctCategories >= 3,
      progressLabel: `${Math.min(distinctCategories, 3)} / 3 categories`,
    },
    {
      id: 'ms-co2-25',
      title: '25 kg CO2e Estimated Milestone',
      description: 'Accumulate 25 kg of estimated emissions avoided.',
      achieved: totalEstimatedCo2Kg >= 25,
      progressLabel: `${round2(Math.min(totalEstimatedCo2Kg, 25))} / 25 kg CO2e`,
    },
  ];
}

export function computeImpactSummary(
  actions: TrackedAction[],
  now: Date = new Date()
): ImpactProgressSummary {
  const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekCutoff = nowStart - 6 * MS_PER_DAY;
  const monthCutoff = nowStart - 29 * MS_PER_DAY;

  const categoryBreakdown = createEmptyCategoryBreakdown();
  const weeklyBuckets = createWeeklyBuckets(nowStart);

  let weeklyActions = 0;
  let monthlyActions = 0;
  let totalEstimatedCo2Kg = 0;
  let weeklyEstimatedCo2Kg = 0;
  let monthlyEstimatedCo2Kg = 0;

  for (const act of actions) {
    const timestamp = new Date(act.dateIso).getTime();
    const co2 = Number.isFinite(act.estimatedCo2SavedKg) ? Math.max(0, act.estimatedCo2SavedKg) : 0;

    totalEstimatedCo2Kg += co2;
    if (categoryBreakdown[act.category]) {
      categoryBreakdown[act.category].count += 1;
      categoryBreakdown[act.category].co2Kg = round2(categoryBreakdown[act.category].co2Kg + co2);
    }

    if (timestamp >= weekCutoff) {
      weeklyActions += 1;
      weeklyEstimatedCo2Kg += co2;
    }
    if (timestamp >= monthCutoff) {
      monthlyActions += 1;
      monthlyEstimatedCo2Kg += co2;
    }

    for (const bucket of weeklyBuckets) {
      if (timestamp >= bucket.start && timestamp < bucket.end) {
        bucket.count += 1;
        bucket.co2Kg = round2(bucket.co2Kg + co2);
        break;
      }
    }
  }

  const distinctCategories = Object.values(categoryBreakdown).filter((v) => v.count > 0).length;

  return {
    totalActions: actions.length,
    weeklyActions,
    monthlyActions,
    totalEstimatedCo2Kg: round2(totalEstimatedCo2Kg),
    weeklyEstimatedCo2Kg: round2(weeklyEstimatedCo2Kg),
    monthlyEstimatedCo2Kg: round2(monthlyEstimatedCo2Kg),
    categoryBreakdown,
    weeklyBuckets: weeklyBuckets.map(({ label, count, co2Kg }) => ({ label, count, co2Kg })),
    milestones: buildMilestones({
      totalActions: actions.length,
      weeklyActions,
      distinctCategories,
      totalEstimatedCo2Kg,
    }),
  };
}
