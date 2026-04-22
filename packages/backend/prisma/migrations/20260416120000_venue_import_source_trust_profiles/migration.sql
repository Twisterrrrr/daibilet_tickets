-- Stage 5: trust levels + per-source auto-moderation profile

CREATE TYPE "VenueModerationTrustLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'FULL_AUTO');

CREATE TABLE "import_source_moderation_profiles" (
    "import_source" "VenueImportSource" NOT NULL,
    "trust_level" "VenueModerationTrustLevel" NOT NULL DEFAULT 'LOW',
    "auto_approve_enabled" BOOLEAN NOT NULL DEFAULT false,
    "auto_merge_enabled" BOOLEAN NOT NULL DEFAULT false,
    "max_auto_actions_per_day" INTEGER NOT NULL DEFAULT 20,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_source_moderation_profiles_pkey" PRIMARY KEY ("import_source")
);

INSERT INTO "import_source_moderation_profiles" ("import_source", "trust_level", "auto_approve_enabled", "auto_merge_enabled", "max_auto_actions_per_day", "disabled", "updated_at")
VALUES
  ('TICKETSCLOUD', 'LOW', false, false, 20, false, CURRENT_TIMESTAMP),
  ('TEPLOHOD', 'LOW', false, false, 20, false, CURRENT_TIMESTAMP)
ON CONFLICT ("import_source") DO NOTHING;
