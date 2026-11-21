/**
 * Backward-compatible barrel re-exporting AIRWISE sustainability domain modules.
 * Individual domain modules live under src/shared/sustainability/.
 */
export { ACTION_ESTIMATE_FACTORS, type ActionEstimateFactor } from './sustainability/factors.ts';
export { SUSTAINABLE_ALTERNATIVES } from './sustainability/alternatives.ts';
export { COMMUNITY_INITIATIVES } from './sustainability/community.ts';
export {
  generateIndoorRecommendations,
  type IndoorAirPlan,
  type VentilationStatus,
  type VentilationWindowInfo,
} from './sustainability/indoor.ts';
export { computeImpactSummary, type ImpactProgressSummary } from './sustainability/impact.ts';
