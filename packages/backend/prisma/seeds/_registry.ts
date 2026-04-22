import type { FixtureRef, SeedRegistry } from './_types';

export function createSeedRegistry(): SeedRegistry {
  const refs = new Map<string, FixtureRef>();

  const register = (ref: FixtureRef) => {
    refs.set(ref.stableKey, ref);
  };

  const getRequired = <T extends string = string>(stableKey: T): FixtureRef<T> => {
    const ref = refs.get(stableKey);
    if (!ref) {
      throw new Error(`Seed fixture not found in registry: ${stableKey}`);
    }
    return ref as FixtureRef<T>;
  };

  const getOptional = <T extends string = string>(stableKey: T): FixtureRef<T> | null => {
    return (refs.get(stableKey) as FixtureRef<T> | undefined) ?? null;
  };

  return { refs, register, getRequired, getOptional };
}

