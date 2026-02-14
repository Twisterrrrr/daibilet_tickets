-- UGC System: ReviewPhoto, ReviewVote, ExternalReview, ReviewRequest + Review updates

-- 1. Обновить enum ReviewStatus: добавить PENDING_EMAIL
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'PENDING_EMAIL' BEFORE 'PENDING';

-- 2. Добавить новые поля в Review
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "verifyToken" TEXT UNIQUE;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "helpfulCount" INTEGER NOT NULL DEFAULT 0;

-- 3. SET DEFAULT для PENDING_EMAIL перенесён в следующую миграцию
-- (PostgreSQL не позволяет использовать новое enum-значение в той же транзакции)

-- 4. ReviewPhoto
CREATE TABLE IF NOT EXISTS "review_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reviewId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "thumbFilename" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "review_photos_reviewId_idx" ON "review_photos"("reviewId");

ALTER TABLE "review_photos"
    ADD CONSTRAINT "review_photos_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "reviews"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. ReviewVote
CREATE TABLE IF NOT EXISTS "review_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reviewId" UUID NOT NULL,
    "ipHash" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_votes_reviewId_ipHash_key" ON "review_votes"("reviewId", "ipHash");
CREATE INDEX IF NOT EXISTS "review_votes_reviewId_idx" ON "review_votes"("reviewId");

ALTER TABLE "review_votes"
    ADD CONSTRAINT "review_votes_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "reviews"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. ExternalReview
CREATE TABLE IF NOT EXISTS "external_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID,
    "operatorId" UUID,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "external_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "external_reviews_eventId_source_idx" ON "external_reviews"("eventId", "source");
CREATE INDEX IF NOT EXISTS "external_reviews_operatorId_idx" ON "external_reviews"("operatorId");

ALTER TABLE "external_reviews"
    ADD CONSTRAINT "external_reviews_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. ReviewRequest
CREATE TABLE IF NOT EXISTS "review_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "eventId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminderSentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "reviewId" UUID,
    CONSTRAINT "review_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "review_requests_token_key" ON "review_requests"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "review_requests_email_eventId_key" ON "review_requests"("email", "eventId");
CREATE INDEX IF NOT EXISTS "review_requests_token_idx" ON "review_requests"("token");

ALTER TABLE "review_requests"
    ADD CONSTRAINT "review_requests_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
