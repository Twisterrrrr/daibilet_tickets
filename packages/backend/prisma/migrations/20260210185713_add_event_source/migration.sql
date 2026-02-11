-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('TC', 'TEPLOHOD');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "source" "EventSource" NOT NULL DEFAULT 'TC';
