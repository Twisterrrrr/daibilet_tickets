/**
 * Синхронизация статусов заявок на возврат с Ticketscloud (GET /v2/resources/refund_requests).
 *
 * Документация: https://ticketscloud.readthedocs.io/ru/latest/extra/refunds_list.html
 *
 * Обновляет RefundRequest, если есть FulfillmentItem с provider=TC и externalOrderId = поле order в TC.
 *
 * Требуется: DATABASE_URL, TC_API_TOKEN
 *
 * Примеры:
 *   pnpm run sync:tc-refund-requests-mirror -- --dry-run
 *   pnpm run sync:tc-refund-requests-mirror -- --hours 168 --status approved,rejected
 */
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { TcRefundRequestsMirrorSyncService } from '../src/catalog/tc-refund-requests-mirror-sync.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const sync = app.get(TcRefundRequestsMirrorSyncService);
    const params = sync.parseCliArgs(process.argv);
    const result = await sync.syncRefundStatuses(params);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
