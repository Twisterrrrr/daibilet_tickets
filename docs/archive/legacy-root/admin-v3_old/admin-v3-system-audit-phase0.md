# Moved

Этот документ объединён в [`Implementation-Guide.md`](Implementation-Guide.md).

Легенда:
- READY — рабочий UI + полноценный backend read/CRUD.
- PARTIAL — часть функционала есть, но есть критичные пробелы (связи/валидация/backfill/экраны).
- NEEDS_FOUNDATION — stub/thin wrapper или фундаментально не готово.

| Блок | Admin V3 UI | Backend endpoints | Prisma models | Legacy/слабые связи | UI | Backend | Public/SEO | Итог |
|------|------------|------------------|--------------|---------------------|----|--------|----------|------|
| Events | /events, /events/:id | admin/events + public catalog | Event, EventSession, EventTag, EventSubcategoryLink | supplier/operator semantics | READY | READY | READY | READY |
| Venues | /venues, /venues/:id, /venues/* | admin/venues + public venues | Venue, VenueSubcategoryLink | — | PARTIAL→READY | READY | PARTIAL | PARTIAL |
| Cities | /cities, /cities/:id | admin/cities + public cities | City, Region* | — | PARTIAL | READY | PARTIAL (sitemap) | PARTIAL |
| Suppliers | /suppliers, /suppliers/:id | admin/suppliers | Operator + Supplier* | supplier/operator duality | PARTIAL | READY | n/a | PARTIAL |
| Articles | /articles, /articles/:id | admin/articles + public articles | Article + ArticleLandingLink/ArticleCollectionLink | legacy string[] in UI | PARTIAL | READY | READY | PARTIAL |
| Collections | /collections, /:id | admin/collections + public collections | Collection + CollectionTagFilter | legacy filterTags slug[] | PARTIAL | READY | READY | PARTIAL |
| Landings | /landings, /:id | admin/landings + public landings | LandingPage (+filterTagId) | legacy filterTag slug | PARTIAL | READY | READY | PARTIAL |
| Promo Blocks | /promo-blocks | admin/promo-blocks + public promo-blocks | PromoBlock + PromoCollection* | — | NEEDS_FOUNDATION | READY | READY | NEEDS_FOUNDATION |
| Orders | /orders, /orders/:id | admin/checkout + admin/orders | CheckoutSession, OrderRequest | snapshots ok | PARTIAL | READY | n/a | PARTIAL |
| Refunds | /refunds | admin/refunds | RefundRequest | — | READY(MVP) | READY(MVP) | n/a | READY |
| Customers | /customers | admin/site-users | User | favorites legacy | READY(MVP) | READY(MVP) | n/a | READY |
| Staff Users | /staff-users | admin/users | AdminUser | create disabled | PARTIAL | PARTIAL | n/a | PARTIAL |
| SEO Audit | /seo-audit | admin/seo-audit | computed | — | READY(MVP) | READY(MVP) | feeds Phase D | READY |
| Tags | /tags | admin/tags + public tags | Tag + link tables | legacy slug filters | NEEDS_FOUNDATION | READY | READY | NEEDS_FOUNDATION |
| Subcategories | /subcategories/* | admin/subcategories | Subcategory* links | — | PARTIAL | READY | PARTIAL | PARTIAL |
| Dashboard | /dashboard | admin/dashboard | computed | — | READY(MVP) | READY(MVP) | n/a | READY |
| Settings | /settings | admin/settings | AppSetting + domain | — | NEEDS_FOUNDATION | READY | n/a | NEEDS_FOUNDATION |

---

## 2) Ordered backlog (high level)

### Foundation/Critical (Phase C)
1) C1: backfill + dual-read/dual-write для Article↔Landing/Collection (link-таблицы как SoT) + обновить admin DTO/UI.
2) C2: backfill LandingPage.filterTagId и CollectionTagFilter, переключить чтение на FK-first.
3) C3: нормализовать семантику supplier/operator в коде и read-models.
4) C4: backfill favorites eventId, eventId-first read-path.
5) C6: тесты целостности (backfill, dual-read/write, запрет битых manual links).

### Phase B
- RelatedContentService: deterministic + explainable + AUTO/MANUAL/SUPPRESS merge.

### Phase D
- Реализовать sitemap-cities-catalog + thin-pages/noindex/canonical policy.

### Phase A
- UI overrides (pin/reorder/suppress) поверх автоматики + broken-links diagnostics.
