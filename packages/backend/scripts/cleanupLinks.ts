/**
 * Очистка ссылок: нормализация URL в event_offers.deeplink (lowercase host/path, без query/hash).
 * Опционально: relatedLinks у landing_pages (JSON массив { title, href }).
 * Дубликаты event_subcategory_links невозможны по PK; скрипт логирует аномалии GROUP BY.
 *
 * pnpm --filter @daibilet/backend exec npx tsx scripts/cleanupLinks.ts [--apply] [--with-landings]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeExternalUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  try {
    const u = new URL(t.startsWith('http') ? t : `https://${t}`);
    u.hostname = u.hostname.toLowerCase();
    u.username = '';
    u.password = '';
    u.search = '';
    u.hash = '';
    u.pathname = u.pathname
      .split('/')
      .map((seg) => seg.toLowerCase())
      .join('/');
    return u.toString();
  } catch {
    return t.toLowerCase();
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const withLandings = process.argv.includes('--with-landings');

  const offers = await prisma.eventOffer.findMany({
    where: { deeplink: { not: null } },
    select: { id: true, deeplink: true },
  });

  let offerUpdates = 0;
  for (const o of offers) {
    if (!o.deeplink) continue;
    const next = normalizeExternalUrl(o.deeplink);
    if (next !== o.deeplink) {
      if (apply) {
        await prisma.eventOffer.update({
          where: { id: o.id },
          data: { deeplink: next },
        });
      }
      offerUpdates += 1;
    }
  }

  let landingUpdates = 0;
  if (withLandings) {
    const landings = await prisma.landingPage.findMany({
      where: { isDeleted: false },
      select: { id: true, relatedLinks: true },
    });
    for (const L of landings) {
      const raw = L.relatedLinks;
      if (!raw || !Array.isArray(raw)) continue;
      let changed = false;
      const next = raw.map((item: { title?: string; href?: string }) => {
        if (item && typeof item.href === 'string') {
          const h = normalizeExternalUrl(item.href);
          if (h !== item.href) {
            changed = true;
            return { ...item, href: h };
          }
        }
        return item;
      });
      if (changed) {
        if (apply) {
          await prisma.landingPage.update({
            where: { id: L.id },
            data: { relatedLinks: next },
          });
        }
        landingUpdates += 1;
      }
    }
  }

  const dupCheck = await prisma.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*)::bigint AS c FROM (
      SELECT "eventId", "subcategoryId", COUNT(*) AS cnt
      FROM event_subcategory_links
      GROUP BY 1, 2
      HAVING COUNT(*) > 1
    ) t
  `;

  console.log(
    JSON.stringify({
      apply,
      offerDeeplinkChanges: offerUpdates,
      landingBlocksTouched: landingUpdates,
      duplicateSubcategoryLinkRows: Number(dupCheck[0]?.c ?? 0),
    }),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
