import { UserProfile } from '../types';

export interface HydrationRecommendation {
  dailyTargetMl: number;
  dailyTargetLiters: number;
  glasses250Ml: number;
  bottles500Ml: number;
  referenceTotalWaterMl: number;
  exerciseExtraMinMl: number;
  exerciseExtraMaxMl: number;
  shouldConsiderElectrolytes: boolean;
}

const ML_PER_KG = 35;
const MIN_DAILY_TARGET_ML = 1500;
const MAX_DAILY_TARGET_ML = 5000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Produces a practical starting estimate for daily total fluid intake.
 *
 * NICE CG32 suggests 30-35 ml/kg for total fluid in adult nutrition support;
 * this app uses the upper end as a simple starting point and bounds it to
 * avoid implausible outputs. The separate EFSA value is total water from
 * drinks and food, so it must not be added to the personalized target.
 * Exercise range: ACSM Position Stand on Exercise and Fluid Replacement.
 */
export function calculateHydration(profile: UserProfile): HydrationRecommendation {
  const safeWeight = Number.isFinite(profile.weight) && profile.weight > 0
    ? profile.weight
    : 0;
  const estimatedMl = safeWeight * ML_PER_KG;
  const dailyTargetMl = roundTo(
    clamp(estimatedMl || MIN_DAILY_TARGET_ML, MIN_DAILY_TARGET_ML, MAX_DAILY_TARGET_ML),
    50,
  );

  return {
    dailyTargetMl,
    dailyTargetLiters: Number((dailyTargetMl / 1000).toFixed(2)),
    glasses250Ml: Math.ceil(dailyTargetMl / 250),
    bottles500Ml: Math.ceil(dailyTargetMl / 500),
    referenceTotalWaterMl: profile.gender === 'male' ? 2500 : 2000,
    exerciseExtraMinMl: 400,
    exerciseExtraMaxMl: 800,
    shouldConsiderElectrolytes: profile.sport === 'bjj' || profile.sport === 'both',
  };
}
