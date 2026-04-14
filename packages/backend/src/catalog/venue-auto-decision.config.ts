/**
 * Пороги и флаги авто-модерации площадок — из env (без хардкода в правилах).
 * См. документацию Stage 5 / rollout.
 */

import type { VenueModerationTrustLevel } from '@prisma/client';

export type VenueAutoDecisionThresholds = {
  mergeMinConfidence: number;
  mergeTitleMinStrength: 'MEDIUM' | 'HIGH';
  mergeAddressMinStrength: 'MEDIUM' | 'HIGH';
  approveMaxConfidence: number;
  approveMaxRejectRate: number;
  maxActionsPerRun: number;
  maxConsecutiveMerges: number;
};

export type VenueAutoModerationEnvFlags = {
  autoModerationEnabled: boolean;
  autoApproveEnabled: boolean;
  autoMergeEnabled: boolean;
};

const TRUST_ORDER: VenueModerationTrustLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'FULL_AUTO'];

export function trustLevelMeetsMinimum(actual: VenueModerationTrustLevel, min: VenueModerationTrustLevel): boolean {
  return TRUST_ORDER.indexOf(actual) >= TRUST_ORDER.indexOf(min);
}

function parseTrustLevel(key: string, fallback: VenueModerationTrustLevel): VenueModerationTrustLevel {
  const v = (process.env[key] ?? '').toUpperCase();
  if (v === 'LOW' || v === 'MEDIUM' || v === 'HIGH' || v === 'FULL_AUTO') return v;
  return fallback;
}

/** Минимальный trust для AUTO_MERGE (по умолчанию MEDIUM). */
export function getVenueAutoMergeMinTrustLevel(): VenueModerationTrustLevel {
  return parseTrustLevel('VENUE_AUTO_MERGE_MIN_TRUST', 'MEDIUM');
}

/** Минимальный trust для AUTO_APPROVE (по умолчанию MEDIUM). */
export function getVenueAutoApproveMinTrustLevel(): VenueModerationTrustLevel {
  return parseTrustLevel('VENUE_AUTO_APPROVE_MIN_TRUST', 'MEDIUM');
}

export function getVenueAutoOnlyHighConfidenceMin(): number {
  return envFloat('VENUE_AUTO_ONLY_HIGH_CONFIDENCE_MIN', 0.85);
}

export function isVenueAutoShadowMode(): boolean {
  return envBool('VENUE_AUTO_SHADOW_MODE');
}

/** JSON для metadata решения модерации (аудит авто-действий). */
export function buildAutoModerationDecisionExtra(args: {
  autoDecisionType: 'AUTO_MERGE' | 'AUTO_APPROVE';
  autoDecisionReasons: string[];
  confidenceScore: number | null;
  thresholdsSnapshot: VenueAutoDecisionThresholds;
}): Record<string, unknown> {
  return {
    isAuto: true,
    autoDecisionType: args.autoDecisionType,
    autoDecisionReasons: args.autoDecisionReasons,
    confidenceScore: args.confidenceScore,
    thresholdsSnapshot: args.thresholdsSnapshot,
    actorLabel: 'SYSTEM',
  };
}

function envFloat(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(key: string): boolean {
  return (process.env[key] ?? '').toLowerCase() === 'true';
}

/** Снимок порогов для записи в metadata moderation decision. */
export function getVenueAutoDecisionThresholdsSnapshot(): VenueAutoDecisionThresholds {
  return {
    mergeMinConfidence: envFloat('VENUE_AUTO_MERGE_MIN_CONFIDENCE', 0.92),
    mergeTitleMinStrength: (process.env.VENUE_AUTO_MERGE_TITLE_MIN_STRENGTH === 'HIGH' ? 'HIGH' : 'MEDIUM') as
      | 'MEDIUM'
      | 'HIGH',
    mergeAddressMinStrength: (process.env.VENUE_AUTO_MERGE_ADDRESS_MIN_STRENGTH === 'HIGH' ? 'HIGH' : 'MEDIUM') as
      | 'MEDIUM'
      | 'HIGH',
    /** APPROVE_AS_NEW: верхняя граница confidence для авто-approve (по умолчанию как в спецификации Stage 5). */
    approveMaxConfidence: envFloat('VENUE_AUTO_APPROVE_CONFIDENCE_MAX', 0.5),
    approveMaxRejectRate: envFloat('VENUE_AUTO_APPROVE_MAX_SOURCE_REJECT_RATE', 0.2),
    maxActionsPerRun: envInt('VENUE_AUTO_MAX_ACTIONS_PER_RUN', 50),
    maxConsecutiveMerges: envInt('VENUE_AUTO_MAX_CONSECUTIVE_MERGES', 5),
  };
}

export function getVenueAutoModerationEnvFlags(): VenueAutoModerationEnvFlags {
  return {
    autoModerationEnabled: envBool('AUTO_MODERATION_ENABLED'),
    autoApproveEnabled: envBool('AUTO_APPROVE_ENABLED'),
    autoMergeEnabled: envBool('AUTO_MERGE_ENABLED'),
  };
}
