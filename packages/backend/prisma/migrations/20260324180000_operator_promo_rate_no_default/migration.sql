-- Убрать дефолт 10% у promoRate: новая модель — только договорная commissionRate.
ALTER TABLE "operators" ALTER COLUMN "promoRate" DROP DEFAULT;
