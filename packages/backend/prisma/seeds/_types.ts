import type { PrismaClient } from '../../src/prisma-client';

export const FixtureScenario = {
  HAPPY: 'HAPPY',
  LEGACY_ONLY: 'LEGACY_ONLY',
  NORMALIZED_ONLY: 'NORMALIZED_ONLY',
  MIXED: 'MIXED',
  BROKEN: 'BROKEN',
  INACTIVE: 'INACTIVE',
  THIN: 'THIN',
  ORPHANED: 'ORPHANED',
} as const;

export type FixtureScenario = (typeof FixtureScenario)[keyof typeof FixtureScenario];

export type FixtureMeta = {
  stableKey: string;
  scenario: FixtureScenario;
  comment: string;
};

export type FixtureRef<T extends string = string> = {
  stableKey: T;
  id: string;
  model: string;
  meta: FixtureMeta;
};

export type SeedRegistry = {
  refs: Map<string, FixtureRef>;
  register: (ref: FixtureRef) => void;
  getRequired: <T extends string = string>(stableKey: T) => FixtureRef<T>;
  getOptional: <T extends string = string>(stableKey: T) => FixtureRef<T> | null;
};

export type SeedLogger = {
  step: (name: string) => void;
  info: (msg: string) => void;
  warn: (msg: string) => void;
};

export type SeedContext = {
  prisma: PrismaClient;
  registry: SeedRegistry;
  log: SeedLogger;
  now: Date;
};

