/**
 * Инвалидация кэша Redis (cities, events, tags и т.д.).
 * Запуск: npx tsx prisma/invalidate-cache.ts
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import Redis from 'ioredis';

// Load .env from backend or project root
const envPaths = [resolve(__dirname, '../../.env'), resolve(__dirname, '../../../.env')];
const envPath = envPaths.find(existsSync);
if (envPath) {
  const env = readFileSync(envPath, 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

async function main() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(url);
  const patterns = ['cities:*', 'events:*', 'tags:*', 'landings:*', 'combos:*', 'search:*'];
  let total = 0;
  for (const p of patterns) {
    const stream = redis.scanStream({ match: p, count: 100 });
    for await (const keys of stream) {
      if (keys.length > 0) {
        await redis.del(...keys);
        total += keys.length;
      }
    }
  }
  console.log(`Удалено ключей кэша: ${total}`);
  await redis.quit();
}

main().catch((e) => { console.error(e); process.exit(1); });
