import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { PrismaClient, StructuralTagGroup, TagKind } from '@prisma/client';

dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

async function getTagColumns(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags'
  `;
  return new Set(rows.map((r) => r.column_name));
}

const THEME_CODES = new Set([
  'history',
  'art',
  'architecture',
  'museums',
  'sightseeing',
  'culture',
  'boat_theme',
  'nightlife',
  'gastronomy',
  'nature',
  'photography',
  'romantic',
  'military',
  'religion',
  'literature',
  'industrial',
  'kids_edutainment',
]);

const AUDIENCE_CODES = new Set([
  'adults',
  'kids',
  'family',
  'couples',
  'groups',
  'solo',
  'tourists_ru',
  'tourists_foreign',
  'students',
  'corporate',
  'vip',
]);

const FORMAT_CODES = new Set([
  'walking',
  'bus',
  'boat',
  'individual',
  'group',
  'guided',
  'audio',
  'immersive',
  'theatrical',
  'scheduled',
  'private',
  'open_date',
  'combo',
  'transfer',
  'skip_the_line',
]);

const POPULAR_CODES = new Set([
  'salyut',
  'bridge_opening',
  'white_nights',
  'new_year',
  'navy_day',
  'sunset',
  'neva',
  'roofs',
  'date_idea',
  'kids_free',
  'may_9',
  'night_city',
]);

function detectStructuralGroup(code: string | null): StructuralTagGroup | null {
  const key = (code ?? '').trim().toLowerCase();
  if (!key) return null;
  if (THEME_CODES.has(key)) return 'THEME';
  if (AUDIENCE_CODES.has(key)) return 'AUDIENCE';
  if (FORMAT_CODES.has(key)) return 'FORMAT';
  return null;
}

function detectTagKind(code: string | null): { tagKind: TagKind; structuralGroup: StructuralTagGroup | null; deactivate: boolean } {
  const key = (code ?? '').trim().toLowerCase();
  const structuralGroup = detectStructuralGroup(key);
  if (structuralGroup) return { tagKind: 'STRUCTURAL', structuralGroup, deactivate: false };
  if (POPULAR_CODES.has(key)) return { tagKind: 'POPULAR', structuralGroup: null, deactivate: false };
  return { tagKind: 'POPULAR', structuralGroup: null, deactivate: true };
}

async function main() {
  const columns = await getTagColumns();
  const required = ['tagKind', 'structuralGroup', 'isActive', 'code'] as const;
  const missing = required.filter((c) => !columns.has(c));
  if (missing.length > 0) {
    console.error(
      `migrateLegacyTags: missing required columns in tags: ${missing.join(', ')}. Apply Prisma migrations first.`,
    );
    process.exit(1);
  }

  const legacyRows = await prisma.tag.findMany({
    where: {
      OR: [{ tagKind: null }, { tagKind: 'STRUCTURAL', structuralGroup: null }],
    },
    select: {
      id: true,
      code: true,
      tagKind: true,
      structuralGroup: true,
      isActive: true,
    },
  });

  let updatedCount = 0;
  let deactivatedCount = 0;

  for (const row of legacyRows) {
    const patch: {
      tagKind?: TagKind;
      structuralGroup?: StructuralTagGroup | null;
      isActive?: boolean;
    } = {};

    if (row.tagKind == null) {
      const next = detectTagKind(row.code);
      patch.tagKind = next.tagKind;
      patch.structuralGroup = next.structuralGroup;
      if (next.deactivate && row.isActive) {
        patch.isActive = false;
        deactivatedCount += 1;
      }
    } else if (row.tagKind === 'STRUCTURAL' && row.structuralGroup == null) {
      const group = detectStructuralGroup(row.code);
      if (group) {
        patch.structuralGroup = group;
      } else if (row.isActive) {
        patch.isActive = false;
        deactivatedCount += 1;
      }
    }

    if (Object.keys(patch).length > 0) {
      await prisma.tag.update({
        where: { id: row.id },
        data: patch,
      });
      updatedCount += 1;
    }
  }

  console.log('=== migrateLegacyTags ===');
  console.log(`Legacy candidates: ${legacyRows.length}`);
  console.log(`Updated tags: ${updatedCount}`);
  console.log(`Deactivated tags: ${deactivatedCount}`);
}

main()
  .catch((e) => {
    console.error('migrateLegacyTags error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

