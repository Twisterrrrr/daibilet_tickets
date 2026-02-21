-- AlterTable: add paymentIntentId for tracing webhooks to PaymentIntents
ALTER TABLE "processed_webhook_events" ADD COLUMN "paymentIntentId" UUID;

-- CreateIndex: быстрый поиск по paymentIntentId
CREATE INDEX "processed_webhook_events_paymentIntentId_idx" ON "processed_webhook_events"("paymentIntentId");
