#!/usr/bin/env npx tsx
/**
 * Check: новые файлы в diff не должны содержать `any`.
 *
 * Запуск:
 *   pnpm check:no-any-new
 *   npx tsx tools/check-no-any-new-files.ts
 *
 * В CI: вызывать перед lint. Использует git diff против BASE_REF (default: origin/main).
 *
 * Allowlist: *.spec.ts, *.test.ts, __mocks__/, prisma/*.ts, scripts/, seed/
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWLIST_PATTERNS = [
  /\.spec\.ts$/,
  /\.test\.ts$/,
  /\.test\.tsx$/,
  /__mocks__\//,
  /prisma\/[^/]+\.ts$/, // prisma/*.ts
  /prisma\/.*\/seed.*\.ts$/,
  /scripts\//,
  /\/seed\//,
  /^tools\//, // tooling scripts
];

const ANY_PATTERNS = [
  { regex: /:\s*any\b/g, name: ': any' },
  { regex: /\bas\s+any\b/g, name: 'as any' },
  { regex: /\bany\[\]/g, name: 'any[]' },
  { regex: /<any>/g, name: '<any>' },
];

function isAllowlisted(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return ALLOWLIST_PATTERNS.some((p) => p.test(normalized));
}

function findAnyViolations(content: string): { name: string; line: number }[] {
  const lines = content.split('\n');
  const violations: { name: string; line: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Пропускаем комментарии и eslint-disable
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const { regex, name } of ANY_PATTERNS) {
      const r = new RegExp(regex.source, regex.flags);
      if (r.test(code)) {
        violations.push({ name, line: i + 1 });
      }
    }
  }
  return violations;
}

function getNewFilesInDiff(baseRef: string): string[] {
  const refs = [baseRef, 'origin/main', 'main'];
  for (const ref of refs) {
    try {
      const output = execSync(
        `git diff --name-only --diff-filter=A ${ref}...HEAD`,
        { encoding: 'utf-8' }
      );
      return output
        .trim()
        .split('\n')
        .filter(Boolean)
        .filter((f) => /\.(ts|tsx)$/.test(f));
    } catch {
      continue;
    }
  }
  return [];
}

function main(): number {
  const baseRef = process.env.BASE_REF || 'origin/main';
  const root = path.resolve(__dirname, '..');

  let newFiles: string[];
  try {
    newFiles = getNewFilesInDiff(baseRef);
  } catch (e) {
    console.error('check-no-any-new: git diff failed', e);
    return 1;
  }

  const toCheck = newFiles.filter((f) => !isAllowlisted(f));
  const errors: { file: string; violations: { name: string; line: number }[] }[] = [];

  for (const file of toCheck) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const violations = findAnyViolations(content);
    if (violations.length > 0) {
      errors.push({ file, violations });
    }
  }

  if (errors.length > 0) {
    console.error('check-no-any-new: новые файлы не должны содержать any.\n');
    for (const { file, violations } of errors) {
      console.error(`  ${file}:`);
      for (const v of violations) {
        console.error(`    line ${v.line}: ${v.name}`);
      }
      console.error('');
    }
    console.error(
      '  Allowlist: *.spec.ts, *.test.ts, __mocks__/, prisma/*.ts, scripts/, seed/\n'
    );
    return 1;
  }

  return 0;
}

process.exit(main());
