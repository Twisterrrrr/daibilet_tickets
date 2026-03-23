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
  const hasTagKind = columns.has('tagKind');
  const hasStructuralGroup = columns.has('structuralGroup');
  const hasCode = columns.has('code');
  const hasIsActive = columns.has('isActive');

  const totalRow = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "tags"`;
  const total = Number(totalRow[0]?.count ?? 0n);

  const tagKindNullCount = hasTagKind
    ? Number(
        (
          await prisma.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*)::bigint AS count FROM "tags" WHERE "tagKind" IS NULL
          `
        )[0]?.count ?? 0n,
      )
    : total;

  const structuralWithoutGroupCount =
    hasTagKind && hasStructuralGroup
      ? Number(
          (
            await prisma.$queryRaw<Array<{ count: bigint }>>`
              SELECT COUNT(*)::bigint AS count
              FROM "tags"
              WHERE "tagKind" = 'STRUCTURAL' AND "structuralGroup" IS NULL
            `
          )[0]?.count ?? 0n,
        )
      : 0;

  const problematicTags = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      code: string | null;
      name: string;
      tagKind: string | null;
      structuralGroup: string | null;
      isActive: boolean | null;
    }>
  >(
    `
      SELECT
        t."id"::text AS "id",
        ${hasCode ? 't."code"::text' : 'NULL::text'} AS "code",
        t."name"::text AS "name",
        ${hasTagKind ? 't."tagKind"::text' : 'NULL::text'} AS "tagKind",
        ${hasStructuralGroup ? 't."structuralGroup"::text' : 'NULL::text'} AS "structuralGroup",
        ${hasIsActive ? 't."isActive"' : 'NULL::boolean'} AS "isActive"
      FROM "tags" t
      WHERE ${
        hasTagKind && hasStructuralGroup
          ? '(t."tagKind" IS NULL OR (t."tagKind" = \'STRUCTURAL\' AND t."structuralGroup" IS NULL))'
          : hasTagKind
            ? 't."tagKind" IS NULL'
            : 'TRUE'
      }
      ORDER BY t."createdAt" ASC
    `,
  );

  console.log('=== TAG AUDIT ===');
  console.log(`Total tags: ${total}`);
  console.log(`tagKind IS NULL: ${tagKindNullCount}`);
  console.log(`STRUCTURAL + structuralGroup IS NULL: ${structuralWithoutGroupCount}`);
  console.log(`Problematic tags: ${problematicTags.length}`);

  for (const t of problematicTags) {
    console.log(
      `- id=${t.id} code=${t.code ?? 'null'} name=${t.name} kind=${t.tagKind ?? 'null'} group=${t.structuralGroup ?? 'null'} active=${t.isActive ?? 'null'}`,
    );
  }
}

main()
  .catch((e) => {
    console.error('auditTags error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

