/*
  Warnings:

  - The `subcategory` column on the `events` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EventSubcategory" AS ENUM ('RIVER', 'WALKING', 'BUS', 'COMBINED', 'QUEST', 'GASTRO', 'ROOFTOP', 'MUSEUM_CLASSIC', 'EXHIBITION', 'GALLERY', 'PALACE', 'PARK', 'CONCERT', 'SHOW', 'STANDUP', 'THEATER', 'SPORT', 'FESTIVAL', 'MASTERCLASS', 'PARTY', 'KIDS_SHOW', 'KIDS_EXCURSION', 'KIDS_MASTER', 'KIDS_MUSEUM', 'KIDS_QUEST', 'KIDS_AMUSEMENT');

-- AlterEnum
ALTER TYPE "EventCategory" ADD VALUE 'KIDS';

-- AlterTable
ALTER TABLE "event_overrides" ADD COLUMN     "subcategory" "EventSubcategory";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "subcategory",
ADD COLUMN     "subcategory" "EventSubcategory";
