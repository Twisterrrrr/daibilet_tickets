/**
 * Синхронизация зеркала заказов Ticketscloud → external_order_links (агентский учёт).
 *
 * Документация TC: GET /v2/resources/orders
 * https://ticketscloud.readthedocs.io/ru/latest/extra/orders_list.html
 *
 * Требуется: DATABASE_URL, TC_API_TOKEN (и при необходимости TC_API_URL).
 *
 * Примеры:
 *   cd packages/backend && pnpm run sync:tc-orders-mirror -- --dry-run
 *   pnpm run sync:tc-orders-mirror -- --hours 48 --status done,cancelled
 *   pnpm run sync:tc-orders-mirror -- --max-pages 5 --page-size 100 --only-with-customer
 */
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { TcOrdersMirrorSyncService } from '../src/catalog/tc-orders-mirror-sync.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const sync = app.get(TcOrdersMirrorSyncService);
    const params = sync.parseCliArgs(process.argv);
    const result = await sync.syncMirror(params);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
