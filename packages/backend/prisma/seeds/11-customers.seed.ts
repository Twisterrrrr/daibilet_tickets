import * as bcrypt from 'bcrypt';

import { FixtureScenario, type SeedContext } from './_types';
import { register } from './_helpers';

export async function seedCustomers(ctx: SeedContext): Promise<void> {
  ctx.log.step('11 customers (site users)');

  const pwHash = await bcrypt.hash('TestUser123!', 10);

  const users: Array<{
    stableKey: string;
    email: string;
    name: string;
    scenario: FixtureScenario;
    comment: string;
  }> = [
    { stableKey: 'user_power_buyer', email: 'power.buyer@daibilet.ru', name: 'Power Buyer', scenario: FixtureScenario.HAPPY, comment: 'Покупатель с заказами/рефандами.' },
    { stableKey: 'user_new_no_orders', email: 'new.user@daibilet.ru', name: 'New User', scenario: FixtureScenario.THIN, comment: 'Новый пользователь без заказов.' },
    { stableKey: 'user_with_favorites', email: 'favorites.user@daibilet.ru', name: 'Favorites User', scenario: FixtureScenario.HAPPY, comment: 'Пользователь с избранным (legacy/mixed).' },
    { stableKey: 'user_with_refunds', email: 'refunds.user@daibilet.ru', name: 'Refunds User', scenario: FixtureScenario.HAPPY, comment: 'Пользователь с возвратами.' },
    { stableKey: 'user_light', email: 'light.user@daibilet.ru', name: 'Light User', scenario: FixtureScenario.HAPPY, comment: 'Лёгкий пользователь для smoke.' },
  ];

  for (const u of users) {
    const row = await ctx.prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, isActive: true },
      create: { email: u.email, name: u.name, passwordHash: pwHash, isActive: true },
    });
    register(ctx, 'User', row.id, {
      stableKey: u.stableKey,
      scenario: u.scenario,
      comment: u.comment,
    });
  }
}

