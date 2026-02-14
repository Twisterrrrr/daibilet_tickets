-- Support ticket system
-- Idempotent: uses IF NOT EXISTS

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketStatus') THEN
    CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketCategory') THEN
    CREATE TYPE "TicketCategory" AS ENUM ('ORDER', 'REFUND', 'VENUE', 'TECHNICAL', 'OTHER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketPriority') THEN
    CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;
END $$;

-- SupportTicket
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
  "shortCode"     TEXT          NOT NULL,
  "name"          TEXT          NOT NULL,
  "email"         TEXT          NOT NULL,
  "phone"         TEXT,
  "category"      "TicketCategory" NOT NULL DEFAULT 'OTHER',
  "priority"      "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "status"        "TicketStatus"   NOT NULL DEFAULT 'OPEN',
  "subject"       TEXT          NOT NULL,
  "message"       TEXT          NOT NULL,
  "orderCode"     TEXT,
  "assignedTo"    UUID,
  "resolvedAt"    TIMESTAMP(3),
  "slaDeadline"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on shortCode
CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_shortCode_key" ON "support_tickets"("shortCode");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_email_idx" ON "support_tickets"("email");
CREATE INDEX IF NOT EXISTS "support_tickets_orderCode_idx" ON "support_tickets"("orderCode");
CREATE INDEX IF NOT EXISTS "support_tickets_category_status_idx" ON "support_tickets"("category", "status");

-- TicketResponse
CREATE TABLE IF NOT EXISTS "ticket_responses" (
  "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
  "ticketId"      UUID          NOT NULL,
  "authorType"    TEXT          NOT NULL DEFAULT 'admin',
  "authorName"    TEXT,
  "message"       TEXT          NOT NULL,
  "isInternal"    BOOLEAN       NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ticket_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ticket_responses_ticketId_idx" ON "ticket_responses"("ticketId");

ALTER TABLE "ticket_responses"
  DROP CONSTRAINT IF EXISTS "ticket_responses_ticketId_fkey";

ALTER TABLE "ticket_responses"
  ADD CONSTRAINT "ticket_responses_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
