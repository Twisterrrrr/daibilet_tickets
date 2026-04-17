import type { SeedContext } from './_types';

export async function seedCoreReference(ctx: SeedContext): Promise<void> {
  ctx.log.step('00 core reference');
  // Ничего не пишем в БД: только фиксируем старт и единые константы в ctx.
  ctx.log.info('core reference ready');
}

