-- C2-C4: cancellationPolicyId on EventOffer, cancellationPolicySnapshotJson on CheckoutPackage

ALTER TABLE "event_offers" ADD COLUMN IF NOT EXISTS "cancellationPolicyId" UUID REFERENCES "cancellation_policy_templates"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "event_offers_cancellationPolicyId_idx" ON "event_offers"("cancellationPolicyId");

ALTER TABLE "checkout_packages" ADD COLUMN IF NOT EXISTS "cancellationPolicySnapshotJson" JSONB;
