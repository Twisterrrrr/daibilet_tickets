/**
 * Optional safe backfill: set Venue.districtId / metroStationId from legacy strings
 * when there is an exact match against District/MetroStation in the same city
 * (case-insensitive name match OR slug match against slugify(legacy)).
 *
 * Default is dry-run. Use --apply to write.
 *
 * Usage:
 *   npx tsx scripts/geo-backfill-venue-fk.ts --citySlug=saint-petersburg
 *   npx tsx scripts/geo-backfill-venue-fk.ts --apply
 */
import type { Prisma } from '../src/generated/prisma/client';
import { PrismaClient } from '../src/generated/prisma/client';

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p?.split('=')[1]?.trim() || undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function slugifyRu(input: string) {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  const lower = input.trim().toLowerCase();
  let out = '';
  for (const ch of lower) {
    if (map[ch]) out += map[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else if (/[\s\-_/.,()]/.test(ch)) out += '-';
    else out += '-';
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function normName(s: string) {
  return s.trim().toLowerCase();
}

type DictRow = { id: string; name: string; slug: string };

function buildLookup(rows: DictRow[]) {
  const byName = new Map<string, DictRow[]>();
  const bySlug = new Map<string, DictRow[]>();
  for (const r of rows) {
    const n = normName(r.name);
    byName.set(n, [...(byName.get(n) ?? []), r]);
    bySlug.set(r.slug, [...(bySlug.get(r.slug) ?? []), r]);
    const s2 = slugifyRu(r.name);
    if (s2 && s2 !== r.slug) {
      bySlug.set(s2, [...(bySlug.get(s2) ?? []), r]);
    }
  }
  return { byName, bySlug };
}

function pickUnique(list: DictRow[] | undefined): DictRow | null {
  if (!list || list.length === 0) return null;
  const uniq = new Map<string, DictRow>();
  for (const r of list) uniq.set(r.id, r);
  if (uniq.size !== 1) return null;
  return [...uniq.values()][0]!;
}

function resolveLegacyToId(
  legacyRaw: string,
  lu: ReturnType<typeof buildLookup>,
): { status: 'match'; id: string } | { status: 'none' } | { status: 'ambiguous' } {
  const legacy = legacyRaw.trim();
  const byNameHit = lu.byName.get(normName(legacy));
  const slug = slugifyRu(legacy);
  const bySlugHit = lu.bySlug.get(slug);

  const namePick = pickUnique(byNameHit);
  const slugPick = pickUnique(bySlugHit);

  if (namePick && slugPick && namePick.id !== slugPick.id) {
    return { status: 'ambiguous' };
  }
  const picked = namePick ?? slugPick;
  if (!picked) return { status: 'none' };
  return { status: 'match', id: picked.id };
}

async function main() {
  const citySlug = arg('citySlug');
  const apply = hasFlag('apply');
  const prisma = new PrismaClient();
  try {
    const whereVenue: Prisma.VenueWhereInput = { isDeleted: false };
    if (citySlug) {
      whereVenue.city = { slug: citySlug };
    }

    const venues = await prisma.venue.findMany({
      where: whereVenue,
      select: {
        id: true,
        cityId: true,
        district: true,
        metro: true,
        districtId: true,
        metroStationId: true,
      },
      take: 100_000,
    });

    const cityIds = [...new Set(venues.map((v) => v.cityId))];

    const districts = await prisma.district.findMany({
      where: { cityId: { in: cityIds } },
      select: { id: true, cityId: true, name: true, slug: true },
    });
    const metros = await prisma.metroStation.findMany({
      where: { cityId: { in: cityIds } },
      select: { id: true, cityId: true, name: true, slug: true },
    });

    const distByCity = new Map<string, DictRow[]>();
    for (const d of districts) {
      const arr = distByCity.get(d.cityId) ?? [];
      arr.push({ id: d.id, name: d.name, slug: d.slug });
      distByCity.set(d.cityId, arr);
    }
    const metroByCity = new Map<string, DictRow[]>();
    for (const m of metros) {
      const arr = metroByCity.get(m.cityId) ?? [];
      arr.push({ id: m.id, name: m.name, slug: m.slug });
      metroByCity.set(m.cityId, arr);
    }

    let districtCandidates = 0;
    let districtMatched = 0;
    let districtAmbiguous = 0;
    let districtNoMatch = 0;
    let metroCandidates = 0;
    let metroMatched = 0;
    let metroAmbiguous = 0;
    let metroNoMatch = 0;

    const updates: Array<{ id: string; districtId?: string; metroStationId?: string }> = [];

    const distLuCache = new Map<string, ReturnType<typeof buildLookup>>();
    const metroLuCache = new Map<string, ReturnType<typeof buildLookup>>();
    for (const id of cityIds) {
      distLuCache.set(id, buildLookup(distByCity.get(id) ?? []));
      metroLuCache.set(id, buildLookup(metroByCity.get(id) ?? []));
    }

    for (const v of venues) {
      let nextDistrictId: string | undefined;
      let nextMetroId: string | undefined;

      if (!v.districtId && v.district?.trim()) {
        districtCandidates++;
        const res = resolveLegacyToId(v.district, distLuCache.get(v.cityId)!);
        if (res.status === 'ambiguous') districtAmbiguous++;
        else if (res.status === 'none') districtNoMatch++;
        else {
          districtMatched++;
          nextDistrictId = res.id;
        }
      }

      if (!v.metroStationId && v.metro?.trim()) {
        metroCandidates++;
        const res = resolveLegacyToId(v.metro, metroLuCache.get(v.cityId)!);
        if (res.status === 'ambiguous') metroAmbiguous++;
        else if (res.status === 'none') metroNoMatch++;
        else {
          metroMatched++;
          nextMetroId = res.id;
        }
      }

      if (nextDistrictId || nextMetroId) {
        updates.push({
          id: v.id,
          ...(nextDistrictId ? { districtId: nextDistrictId } : {}),
          ...(nextMetroId ? { metroStationId: nextMetroId } : {}),
        });
      }
    }

    if (apply) {
      for (const u of updates) {
        await prisma.venue.update({
          where: { id: u.id },
          data: {
            ...(u.districtId ? { districtId: u.districtId } : {}),
            ...(u.metroStationId ? { metroStationId: u.metroStationId } : {}),
          },
        });
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      citySlug: citySlug ?? null,
      apply,
      totals: {
        venuesScanned: venues.length,
        districtCandidates,
        districtMatched,
        districtAmbiguous,
        districtNoMatch,
        metroCandidates,
        metroMatched,
        metroAmbiguous,
        metroNoMatch,
        rowsToUpdate: updates.length,
      },
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
