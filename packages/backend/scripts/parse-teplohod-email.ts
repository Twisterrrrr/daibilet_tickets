/**
 * CLI: разбор текста/.eml письма Teplohod → JSON (без записи в БД).
 *
 *   cd packages/backend && pnpm run parse:teplohod-email -- path/to/letter.txt
 *
 * Автоматическая выгрузка с ящика info@… — отдельно (IMAP / inbound webhook).
 */
import { readFileSync } from 'fs';

import { parseTeplohodIncomingEmail } from '../src/integrations/providers/teplohod/teplohod-email.parser';

function main() {
  const path = process.argv[2];
  if (!path) {
    console.error('Usage: pnpm run parse:teplohod-email -- <path-to.txt-or.eml>');
    process.exit(1);
  }
  const raw = readFileSync(path, 'utf-8');
  const parsed = parseTeplohodIncomingEmail(raw);
  console.log(JSON.stringify(parsed, null, 2));
}

main();
