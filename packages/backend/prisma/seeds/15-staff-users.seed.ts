import * as bcrypt from 'bcrypt';

import type { SeedContext } from './_types';
import { FixtureScenario } from './_types';
import { register } from './_helpers';

export async function seedStaffUsers(ctx: SeedContext): Promise<void> {
  ctx.log.step('15 staff/admin users');

  const pwHash = await bcrypt.hash('Admin123!', 10);

  const staff: Array<{
    stableKey: string;
    email: string;
    name: string;
    role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    scenario: FixtureScenario;
    comment: string;
  }> = [
    { stableKey: 'staff_owner', email: 'staff.owner@daibilet.ru', name: 'Staff Owner', role: 'OWNER', scenario: FixtureScenario.HAPPY, comment: 'OWNER для проверки RBAC.' },
    { stableKey: 'staff_content_manager', email: 'staff.content@daibilet.ru', name: 'Staff Content', role: 'EDITOR', scenario: FixtureScenario.HAPPY, comment: 'EDITOR/контент-роль.' },
    { stableKey: 'staff_support_ops', email: 'staff.support@daibilet.ru', name: 'Staff Support', role: 'VIEWER', scenario: FixtureScenario.HAPPY, comment: 'VIEWER для safe-read.' },
  ];

  for (const s of staff) {
    const row = await ctx.prisma.adminUser.upsert({
      where: { email: s.email },
      update: { name: s.name, role: s.role, isActive: true },
      create: { email: s.email, name: s.name, passwordHash: pwHash, role: s.role, isActive: true },
    });
    register(ctx, 'AdminUser', row.id, {
      stableKey: s.stableKey,
      scenario: s.scenario,
      comment: s.comment,
    });
  }
}

