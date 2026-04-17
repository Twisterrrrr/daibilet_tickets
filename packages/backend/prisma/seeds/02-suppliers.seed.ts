import { FixtureScenario, type SeedContext } from './_types';
import { register } from './_helpers';

export async function seedSuppliers(ctx: SeedContext): Promise<void> {
  ctx.log.step('02 suppliers/operators');

  const main = await ctx.prisma.operator.upsert({
    where: { slug: 'supplier-active-main' },
    update: { name: 'Supplier Active Main', isSupplier: true, isActive: true, status: 'ACTIVE', website: 'https://example.com' },
    create: { slug: 'supplier-active-main', name: 'Supplier Active Main', isSupplier: true, isActive: true, status: 'ACTIVE', website: 'https://example.com' },
  });
  register(ctx, 'Operator', main.id, {
    stableKey: 'supplier_active_main',
    scenario: FixtureScenario.HAPPY,
    comment: 'Основной активный supplier для большинства тестовых сущностей.',
  });

  const small = await ctx.prisma.operator.upsert({
    where: { slug: 'supplier-active-small' },
    update: { name: 'Supplier Active Small', isSupplier: true, isActive: true, status: 'ACTIVE', website: 'https://example.com' },
    create: { slug: 'supplier-active-small', name: 'Supplier Active Small', isSupplier: true, isActive: true, status: 'ACTIVE', website: 'https://example.com' },
  });
  register(ctx, 'Operator', small.id, {
    stableKey: 'supplier_active_small',
    scenario: FixtureScenario.HAPPY,
    comment: 'Небольшой supplier (1–2 сущности) для smoke.',
  });

  const inactive = await ctx.prisma.operator.upsert({
    where: { slug: 'supplier-inactive' },
    update: { name: 'Supplier Inactive', isSupplier: true, isActive: false, status: 'SUSPENDED', website: 'https://example.com' },
    create: { slug: 'supplier-inactive', name: 'Supplier Inactive', isSupplier: true, isActive: false, status: 'SUSPENDED', website: 'https://example.com' },
  });
  register(ctx, 'Operator', inactive.id, {
    stableKey: 'supplier_inactive',
    scenario: FixtureScenario.INACTIVE,
    comment: 'Неактивный supplier для проверки soft-disable и фильтров.',
  });
}

