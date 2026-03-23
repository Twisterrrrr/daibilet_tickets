import { config as dotenvConfig } from 'dotenv';
import path from 'path';

import { PrismaClient } from '@prisma/client';

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

async function main() {
  const columns = await getTagColumns();
  const required = ['tagKind', 'structuralGroup'] as const;
  const missing = required.filter((c) => !columns.has(c));
  if (missing.length > 0) {
    console.error(
      `postMigrationVerifyTags: missing required columns in tags: ${missing.join(', ')}. Apply migrations first.`,
    );
    process.exit(1);
  }

  const [kindNullRow, structuralWithoutGroupRow, popularWithGroupRow] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "tags"
      WHERE "tagKind" IS NULL
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "tags"
      WHERE "tagKind" = 'STRUCTURAL' AND "structuralGroup" IS NULL
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "tags"
      WHERE "tagKind" = 'POPULAR' AND "structuralGroup" IS NOT NULL
    `,
  ]);

  const kindNull = Number(kindNullRow[0]?.count ?? 0n);
  const structuralWithoutGroup = Number(structuralWithoutGroupRow[0]?.count ?? 0n);
  const popularWithGroup = Number(popularWithGroupRow[0]?.count ?? 0n);

  console.log('=== postMigrationVerifyTags ===');
  console.log(`tagKind IS NULL: ${kindNull}`);
  console.log(`STRUCTURAL + structuralGroup IS NULL: ${structuralWithoutGroup}`);
  console.log(`POPULAR + structuralGroup IS NOT NULL: ${popularWithGroup}`);

  const inconsistent = kindNull + structuralWithoutGroup + popularWithGroup;
  if (inconsistent > 0) {
    console.error('Verification failed: legacy/inconsistent tags still exist. Run migrateLegacyTags and re-check.');
    process.exit(1);
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE "tags" VALIDATE CONSTRAINT tag_kind_group_check`);

  const validatedRows = await prisma.$queryRaw<Array<{ convalidated: boolean }>>`
    SELECT convalidated
    FROM pg_constraint
    WHERE conname = 'tag_kind_group_check'
    LIMIT 1
  `;
  const validated = Boolean(validatedRows[0]?.convalidated);
  console.log(`Constraint tag_kind_group_check validated: ${validated}`);

  if (!validated) {
    console.error('Constraint exists but is not validated.');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('postMigrationVerifyTags error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

