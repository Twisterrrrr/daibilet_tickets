# Mini-audit — remaining legacy-first paths (2026-04-15)

Цель: быстро отметить места, где чтение/запись ещё может быть **legacy-first** или **legacy-only** по критичным полям Phase C (до UI).

Паттерны поиска: `relatedLandingIds`, `relatedCollectionIds`, `filterTag`, `filterTags`, `eventSlug`, `supplierId`.

Статусы:
- **OK (normalized-first)**
- **TRANSITIONAL (safe)** — dual-read/write есть, но ещё есть legacy рядом
- **NEEDS_DUAL_READ** — найдено legacy-first/legacy-only чтение
- **NEEDS_DUAL_WRITE** — запись не нормализует/не валидирует

---

## Findings (high-signal)

- **Landing resolved events (admin)**: `LandingService.resolveAdminResolvedEvents` переведён на `filterTagId` first, fallback на `filterTag` slug. **OK (normalized-first)**.
- **Collection public read**: `CollectionService` уже использует `tagFilters` first, fallback на legacy `filterTags`. **OK (normalized-first)**.
- **Favorites read**: `UserFavoritesService.getSlugs` читает `event.slug` через FK first, fallback на legacy `eventSlug`. **OK (normalized-first)**.
- **Admin Articles**: `GET /admin/articles/:id` отдаёт legacy arrays из link-tables при наличии. **TRANSITIONAL (safe)**.

---

## Raw search notes

Ниже — список файлов, где встречаются ключевые legacy-поля; по ним стоит делать следующий targeted-pass, когда появится непустая БД для dry-run.


### Pattern: relatedLandingIds

- F:\coding\SPBBOATS\packages\backend\src\admin\admin-articles.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-article.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\blog\blog.service.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\class.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespace.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespaceBrowser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Article.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\LandingPage.ts

### Pattern: relatedCollectionIds

- F:\coding\SPBBOATS\packages\backend\src\admin\admin-articles.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-landings.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-article.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-landing.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\hub-readiness\hub-readiness-snapshot.util.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\hub-readiness\__tests__\hub-readiness-snapshot.util.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\blog\blog.service.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\class.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespace.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespaceBrowser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Article.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\LandingPage.ts

### Pattern: filterTagId

- F:\coding\SPBBOATS\packages\backend\src\admin\admin-content-write-validation.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-landings.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-landing.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\class.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespace.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespaceBrowser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\LandingPage.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Tag.ts
- F:\coding\SPBBOATS\packages\backend\src\landing\landing.service.ts

### Pattern: filterTag

- F:\coding\SPBBOATS\packages\backend\src\admin\admin-collections.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-content-write-validation.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-landings.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-collection.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-landing.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog-consistency.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\collection-selection.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\__tests__\catalog-eligibility.integration.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\__tests__\collection-selection.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection-materializer.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection-merchandising.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection-suggestion.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\__tests__\collection.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\class.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespace.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespaceBrowser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Collection.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\LandingPage.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Tag.ts
- F:\coding\SPBBOATS\packages\backend\src\landing\landing-materializer.service.ts
- F:\coding\SPBBOATS\packages\backend\src\landing\landing.service.ts
- F:\coding\SPBBOATS\packages\backend\src\landing\topic-definition.config.ts

### Pattern: filterTags

- F:\coding\SPBBOATS\packages\backend\src\admin\admin-collections.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-content-write-validation.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-collection.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog-consistency.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\collection-selection.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\__tests__\catalog-eligibility.integration.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\__tests__\collection-selection.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection-materializer.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection-merchandising.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection-suggestion.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\__tests__\collection.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\class.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespace.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespaceBrowser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Collection.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Tag.ts
- F:\coding\SPBBOATS\packages\backend\src\landing\topic-definition.config.ts

### Pattern: eventSlug

- F:\coding\SPBBOATS\packages\backend\src\account\account.service.ts
- F:\coding\SPBBOATS\packages\backend\src\account\dto\account.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\account\__tests__\account.e2e.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-events.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-event.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\review.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\cart-partitioning.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\checkout.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\dto\checkout.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\checkout-e2e.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\checkout.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\payment-e2e.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\payment-invariants.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\payment.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\class.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespace.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespaceBrowser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\UserFavorite.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\user\user-favorites.service.ts
- F:\coding\SPBBOATS\packages\backend\src\widgets\widget-checkout.service.ts
- F:\coding\SPBBOATS\packages\backend\src\widgets\widgets-api.service.ts

### Pattern: eventId

- F:\coding\SPBBOATS\packages\backend\src\account\account.service.ts
- F:\coding\SPBBOATS\packages\backend\src\account\dto\account.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\account\__tests__\account.e2e.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-availability.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-checkout.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-collections.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-dashboard.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-events.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-external-reviews.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-promo-codes.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-promo-collections.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-promo-placement-blocks.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-reports.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-reviews.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\analytics.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\city-admin-metrics.util.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\event-admin-summary.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\event-override.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\json-schemas.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\venue-admin-readiness.util.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\venue-admin-summary.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-collection.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-combo.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-event.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-promo-code.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-promo-collection.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-promo-placement-block.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\seo-audit\seo-audit-rules.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\seo-audit\seo-audit.service.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\seo-audit\seo-audit.types.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\seo-audit\__tests__\seo-audit-unified.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\__tests__\admin-collections.items.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\__tests__\event-admin-list-health.util.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\blog\blog.service.ts
- F:\coding\SPBBOATS\packages\backend\src\cache\cache-invalidation.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog-audit.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog-consistency.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog-guard.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\collection-selection.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\event-quality.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\event-tag-lifecycle.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\listing-health.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\location-normalizer.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\offer-normalizer.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\postedit-queue.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\publish-gate.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\review.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\tc-api.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\tc-sync.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\tep-api.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\tep-sync.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\venue-lifecycle.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\dto\create-review.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\__tests__\event-tag-lifecycle.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\booking-provider.interface.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\cart-partitioning.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\checkout.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\checkout.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\fulfillment-refund-request.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\fulfillment.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\webhook-idempotency.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\dto\checkout.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\providers\tc-booking.provider.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\checkout-e2e.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\checkout-state-machine.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\checkout.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\payment-e2e.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\payment-invariants.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\payment.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection-materializer.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection-merchandising.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection-suggestion.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\collection.service.ts
- F:\coding\SPBBOATS\packages\backend\src\collection\__tests__\collection.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\combo\combo.service.ts
- F:\coding\SPBBOATS\packages\backend\src\common\guards\operator-scope.guard.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\class.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespace.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespaceBrowser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\ArticleEvent.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Collection.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\CollectionItem.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\DailyEventStats.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Event.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\EventOffer.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\EventOverride.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\EventProviderLink.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\EventSession.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\EventSubcategoryLink.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\EventTag.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\ExternalReview.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\OrderRequest.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\PackageItem.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\ProcessedWebhookEvent.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\PromoBlockEvent.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\PromoCode.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\PromoCollectionItem.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\PromoPlacementBlock.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Review.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\ReviewRequest.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\UserFavorite.ts
- F:\coding\SPBBOATS\packages\backend\src\integrations\admin-integrations-read.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\integrations\event-provider-link.service.ts
- F:\coding\SPBBOATS\packages\backend\src\integrations\contracts\provider-errors.ts
- F:\coding\SPBBOATS\packages\backend\src\integrations\dto\unified-event.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\integrations\routing\provider-routing.service.ts
- F:\coding\SPBBOATS\packages\backend\src\integrations\__tests__\event-provider-link.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\landing\landing.service.ts
- F:\coding\SPBBOATS\packages\backend\src\partner\partner.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\planner\planner.service.ts
- F:\coding\SPBBOATS\packages\backend\src\planner\dto\customize-plan.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\pricing\promo-code.service.ts
- F:\coding\SPBBOATS\packages\backend\src\promo\promo-collection-resolver.service.ts
- F:\coding\SPBBOATS\packages\backend\src\queue\fulfillment.processor.ts
- F:\coding\SPBBOATS\packages\backend\src\reports\reports.repository.ts
- F:\coding\SPBBOATS\packages\backend\src\reports\reports.service.ts
- F:\coding\SPBBOATS\packages\backend\src\scheduler\review-scheduler.service.ts
- F:\coding\SPBBOATS\packages\backend\src\scheduler\tag-assignment.service.ts
- F:\coding\SPBBOATS\packages\backend\src\scheduler\__tests__\tag-assignment.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\subcategories\subcategory-assignment.service.ts
- F:\coding\SPBBOATS\packages\backend\src\subcategories\__tests__\subcategory-assignment.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-reviews.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\user\user-favorites.service.ts
- F:\coding\SPBBOATS\packages\backend\src\venue\venue.service.ts
- F:\coding\SPBBOATS\packages\backend\src\widgets\widget-checkout.service.ts
- F:\coding\SPBBOATS\packages\backend\src\widgets\widgets-api.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\widgets\widgets-api.service.ts
- F:\coding\SPBBOATS\packages\backend\src\widgets\dto\widget-checkout.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\widgets\teplohod\teplohod-widgets.service.ts

### Pattern: supplierId

- F:\coding\SPBBOATS\packages\backend\src\admin\admin-events.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-reconciliation.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-suppliers.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\review.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\cart-partitioning.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\checkout.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\fulfillment.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\payment.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\checkout-e2e.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\payment-e2e.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\payment-invariants.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\__tests__\payment.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\class.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespace.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespaceBrowser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Event.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\PaymentIntent.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Review.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\ReviewDispute.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\ReviewSupplierResponse.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierTrustOverride.ts
- F:\coding\SPBBOATS\packages\backend\src\partner\partner.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\review\review-capability.service.ts
- F:\coding\SPBBOATS\packages\backend\src\review\__tests__\review-capability.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-daily-stat.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-notifications.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-reviews.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-trust.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier.controller.ts

### Pattern: operatorId

- F:\coding\SPBBOATS\packages\backend\src\admin\admin-availability.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-events.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-finance-documents-demo.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-finance-settlements.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-finance.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-listing-health.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-moderation.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-payouts.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-promo-codes.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-reports.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-supplier-edo.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-suppliers.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\admin-venues.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\supplier-admin-metrics.util.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-event.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-promo-code.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin-venue.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\dto\admin.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\admin\__tests__\event-admin-list-health.util.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\auth\admin-auth.types.ts
- F:\coding\SPBBOATS\packages\backend\src\auth\auth.types.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\catalog.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\listing-health.service.ts
- F:\coding\SPBBOATS\packages\backend\src\catalog\review.service.ts
- F:\coding\SPBBOATS\packages\backend\src\checkout\payment.service.ts
- F:\coding\SPBBOATS\packages\backend\src\common\decorators\current-supplier-user.decorator.ts
- F:\coding\SPBBOATS\packages\backend\src\common\guards\operator-scope.guard.ts
- F:\coding\SPBBOATS\packages\backend\src\edo\domain\edo.errors.ts
- F:\coding\SPBBOATS\packages\backend\src\edo\domain\edo.types.ts
- F:\coding\SPBBOATS\packages\backend\src\edo\services\edo-delivery.service.ts
- F:\coding\SPBBOATS\packages\backend\src\edo\services\edo-profile.service.ts
- F:\coding\SPBBOATS\packages\backend\src\edo\__tests__\edo-delivery.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\edo\__tests__\edo-profile.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\edo\__tests__\noop-edo.provider.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\class.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespace.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\internal\prismaNamespaceBrowser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\ApiKey.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\DocumentSequence.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Event.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\EventOffer.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\ExternalReview.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\PromoCode.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Review.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierDailyStat.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierDispute.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierDocument.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierEdoProfile.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierInvitation.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierLedgerEntry.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierLegalProfile.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierPayoutRequest.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierReport.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierSettlement.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\SupplierUser.ts
- F:\coding\SPBBOATS\packages\backend\src\generated\prisma\models\Venue.ts
- F:\coding\SPBBOATS\packages\backend\src\ledger\supplier-ledger.service.ts
- F:\coding\SPBBOATS\packages\backend\src\partner\partner-auth.guard.ts
- F:\coding\SPBBOATS\packages\backend\src\partner\partner-webhook.processor.ts
- F:\coding\SPBBOATS\packages\backend\src\partner\partner-webhook.service.ts
- F:\coding\SPBBOATS\packages\backend\src\partner\partner.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\partner\__tests__\partner-auth.guard.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\pricing\promo-code.service.ts
- F:\coding\SPBBOATS\packages\backend\src\reports\reports.repository.ts
- F:\coding\SPBBOATS\packages\backend\src\reports\reports.service.ts
- F:\coding\SPBBOATS\packages\backend\src\reports\dto\report-query.dto.ts
- F:\coding\SPBBOATS\packages\backend\src\review\review-capability.service.ts
- F:\coding\SPBBOATS\packages\backend\src\review\__tests__\review-capability.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-auth.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-daily-stat.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-integrations.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-invitation.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-jwt.strategy.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-notifications.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-rbac.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-reviews.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier-trust.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\supplier.controller.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\__tests__\supplier-invitation.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\__tests__\supplier-legal-profile.e2e.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier\__tests__\supplier-rbac.service.spec.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\document-number.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\finance-document-payload.builder.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\finance-document-render.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\finance-document-storage.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\supplier-dispute.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\supplier-document-issue.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\supplier-document.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\supplier-finance-summary.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\supplier-reconciliation.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\supplier-report-calculation.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\supplier-settlement.service.ts
- F:\coding\SPBBOATS\packages\backend\src\supplier-finance\__tests__\document-number.service.spec.ts
