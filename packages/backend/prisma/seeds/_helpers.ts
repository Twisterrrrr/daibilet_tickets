import type { Prisma, PrismaClient } from '../../src/prisma-client';
import type { FixtureMeta, SeedContext } from './_types';

export const FIXTURE_IMAGES = {
  hero1: 'https://images.unsplash.com/photo-1545989250-0d0a39a9ed30?auto=format&fit=crop&w=1400&q=80',
  hero2: 'https://images.unsplash.com/photo-1518998053901-5348d0561edb?auto=format&fit=crop&w=1400&q=80',
} as const;

export function createSeedLogger(prefix = 'seed') {
  return {
    step: (name: string) => console.log(`[${prefix}] ▶ ${name}`),
    info: (msg: string) => console.log(`[${prefix}]   ${msg}`),
    warn: (msg: string) => console.warn(`[${prefix}] ⚠ ${msg}`),
  };
}

export function asKopecks(rub: number): number {
  return Math.round(rub * 100);
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function atHour(base: Date, dayOffset: number, h: number, m = 0): Date {
  const d = addDays(base, dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

export function ensureArrayUnique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

export function getRequiredRef(ctx: SeedContext, stableKey: string) {
  return ctx.registry.getRequired(stableKey);
}

export function optionalRef(ctx: SeedContext, stableKey: string) {
  return ctx.registry.getOptional(stableKey);
}

export async function upsertCity(
  prisma: PrismaClient,
  input: Prisma.CityUpsertArgs['create'] & Pick<Prisma.CityUpsertArgs, 'where'>['where'],
) {
  return prisma.city.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      description: input.description,
      lat: input.lat,
      lng: input.lng,
      timezone: input.timezone,
      metaTitle: input.metaTitle ?? undefined,
      metaDescription: input.metaDescription ?? undefined,
      isFeatured: input.isFeatured ?? false,
      isActive: input.isActive ?? true,
    },
    create: input,
  });
}

export function register(ctx: SeedContext, model: string, id: string, meta: FixtureMeta) {
  ctx.registry.register({
    stableKey: meta.stableKey,
    id,
    model,
    meta,
  });
}

