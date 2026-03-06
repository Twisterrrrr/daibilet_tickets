-- CreateTable
CREATE TABLE "event_session_stats" (
    "session_id" UUID NOT NULL,
    "sold_last24h" INTEGER NOT NULL DEFAULT 0,
    "total_paid" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_session_stats_pkey" PRIMARY KEY ("session_id")
);

-- AddForeignKey
ALTER TABLE "event_session_stats" ADD CONSTRAINT "event_session_stats_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "event_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
