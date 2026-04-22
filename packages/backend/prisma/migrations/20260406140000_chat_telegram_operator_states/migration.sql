-- Telegram operator state for support chat (active conversation per Telegram user)

CREATE TABLE IF NOT EXISTS "chat_telegram_operator_states" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "telegramUserId" TEXT NOT NULL,
  "activeConversationId" UUID,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_telegram_operator_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_telegram_operator_states_telegramUserId_key"
  ON "chat_telegram_operator_states"("telegramUserId");

CREATE INDEX IF NOT EXISTS "chat_telegram_operator_states_activeConversationId_idx"
  ON "chat_telegram_operator_states"("activeConversationId");

ALTER TABLE "chat_telegram_operator_states"
  DROP CONSTRAINT IF EXISTS "chat_telegram_operator_states_activeConversationId_fkey";

ALTER TABLE "chat_telegram_operator_states"
  ADD CONSTRAINT "chat_telegram_operator_states_activeConversationId_fkey"
  FOREIGN KEY ("activeConversationId") REFERENCES "chat_conversations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
