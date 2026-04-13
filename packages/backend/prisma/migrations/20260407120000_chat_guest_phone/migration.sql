-- Опциональный телефон гостя в чате поддержки

ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "guestPhone" TEXT;
