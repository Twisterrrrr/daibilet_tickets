import type { SeedContext } from './_types';
import { FixtureScenario } from './_types';
import { register } from './_helpers';
import { seedCanonicalSubcategories } from './subcategories-canonical.seed';

export async function seedSubcategories(ctx: SeedContext): Promise<void> {
  ctx.log.step('04 subcategories');

  // Используем уже существующий канонический сид подкатегорий (источник истины).
  await seedCanonicalSubcategories(ctx.prisma);

  // Регистрируем ссылки на наиболее нужные в вертикальном срезе подкатегории.
  // Коды — из канонического whitelist (subcategories-canonical.seed / EventSubcategory).
  // Время суток («вечер») остаётся тегами (tag_evening); джаз дублируем: PRIMARY JAZZ + тематический tag_jazz.
  const wanted: Array<{ stableKey: string; code: string; comment: string }> = [
    { stableKey: 'subcat_river_cruises', code: 'RIVER', comment: 'Речные прогулки (PRIMARY EVENT_ONLY).' },
    { stableKey: 'subcat_museum_tickets', code: 'MUSEUM_CLASSIC', comment: 'Музеи (билеты).' },
    { stableKey: 'subcat_concerts', code: 'CONCERT', comment: 'Концерты (PRIMARY EVENT_ONLY).' },
    { stableKey: 'subcat_jazz', code: 'JAZZ', comment: 'Джаз как сегмент мероприятий (PRIMARY EVENT_ONLY).' },
    { stableKey: 'subcat_theater', code: 'THEATER', comment: 'Театр / спектакли.' },
    { stableKey: 'subcat_shows', code: 'SHOW', comment: 'Шоу / представления.' },
    { stableKey: 'subcat_kids_programs', code: 'KIDS', comment: 'Аудитория «с детьми» (UNIVERSAL SECONDARY в каноне).' },
    { stableKey: 'subcat_city_excursions', code: 'WALKING', comment: 'Пешие / городские экскурсии.' },
  ];

  for (const w of wanted) {
    const sub = await ctx.prisma.subcategory.findFirst({ where: { code: w.code } });
    if (!sub) {
      ctx.log.warn(`Subcategory code not found (skip registry): ${w.code}`);
      continue;
    }
    register(ctx, 'Subcategory', sub.id, {
      stableKey: w.stableKey,
      scenario: FixtureScenario.HAPPY,
      comment: w.comment,
    });
  }
}

