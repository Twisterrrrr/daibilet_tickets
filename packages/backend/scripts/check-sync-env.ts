/**
 * DevOps: проверка env для full sync (TC, TEP)
 * Запуск: npx tsx scripts/check-sync-env.ts
 */
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const rootEnv = resolve(process.cwd(), '..', '..', '.env');
const localEnv = resolve(process.cwd(), '.env');
const loaded = existsSync(rootEnv) ? rootEnv : existsSync(localEnv) ? localEnv : null;
if (loaded) {
  config({ path: loaded });
  console.log(`[check-sync-env] Loaded: ${loaded}`);
} else {
  console.warn('[check-sync-env] No .env found at root or backend');
}

const TC_TOKEN = process.env.TC_API_TOKEN;
const TEP_URL = process.env.TEP_API_URL || 'https://api.teplohod.info/v1';
const TC_URL = process.env.TC_API_URL || 'https://ticketscloud.com/v2';

console.log('\n--- Sync env check ---');
console.log(`TC_API_TOKEN: ${TC_TOKEN ? `set (${TC_TOKEN.length} chars)` : 'NOT SET'}`);
console.log(`TC_API_URL:   ${TC_URL}`);
console.log(`TEP_API_URL:  ${TEP_URL}`);

if (!TC_TOKEN) {
  console.warn('\n[!] TC_API_TOKEN not set — TicketsCloud sync will fail');
}

async function probe(url: string, name: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    console.log(`[${name}] ${res.status} ${url} ${res.ok ? '(OK)' : '(reachable)'}`);
    return true; // любой ответ = сеть доступна
  } catch (e) {
    console.warn(`[${name}] fetch failed: ${(e as Error).message}`);
    return false;
  }
}

(async () => {
  const tepOk = await probe(TEP_URL, 'TEP');
  const tcOk = await probe(TC_URL, 'TC');
  console.log(tepOk && (TC_TOKEN ? tcOk : true) ? '\nOK' : '\n[!] Connectivity issues — check network/proxy');
  process.exit(tepOk ? 0 : 1);
})();
