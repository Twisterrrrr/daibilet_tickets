/**
 * Read-only report: frequency tables for legacy Venue.district / Venue.metro strings.
 *
 * Usage:
 *   npx tsx scripts/geo-normalize-report.ts --citySlug=saint-petersburg
 *   npx tsx scripts/geo-normalize-report.ts
 */
import { PrismaClient } from '../src/generated/prisma/client';

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`));
  return p?.split('=')[1]?.trim() || undefined;
}

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

async function main() {
  const citySlug = arg('citySlug');
  const prisma = new PrismaClient();
  try {
    const where = {
      isDeleted: false,
      ...(citySlug ? { city: { slug: citySlug } } : {}),
    };

    const rows = await prisma.venue.findMany({
      where,
      select: { id: true, cityId: true, district: true, metro: true, districtId: true, metroStationId: true },
      take: 50_000,
    });

    const districtCounts = new Map<string, number>();
    const metroCounts = new Map<string, number>();
    let withDistrictString = 0;
    let withMetroString = 0;
    let withDistrictFk = 0;
    let withMetroFk = 0;

    for (const r of rows) {
      if (r.district?.trim()) {
        withDistrictString++;
        const k = r.district.trim();
        districtCounts.set(k, (districtCounts.get(k) ?? 0) + 1);
      }
      if (r.metro?.trim()) {
        withMetroString++;
        const k = r.metro.trim();
        metroCounts.set(k, (metroCounts.get(k) ?? 0) + 1);
      }
      if (r.districtId) withDistrictFk++;
      if (r.metroStationId) withMetroFk++;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      citySlug: citySlug ?? null,
      totals: {
        venuesScanned: rows.length,
        withDistrictString,
        withMetroString,
        withDistrictFk,
        withMetroFk,
      },
      topDistrictStrings: topN(districtCounts, 50).map(([value, count]) => ({ value, count })),
      topMetroStrings: topN(metroCounts, 50).map(([value, count]) => ({ value, count })),
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
