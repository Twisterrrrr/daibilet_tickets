# Event Catalog Index & Card Cache (future design)

Status: planned  
Stage: post-MVP

This document describes future catalog architectures for event listing and SEO pages
that support tens of thousands of events and high read traffic with minimal database load.

The current implementation uses direct queries against normalized tables, which is acceptable
for MVP scale.

---

## 1. Current MVP catalog model

Typical catalog query today (conceptually) looks like:

- `events`
- joined with `sessions` (for availability/next_session),
- joined with `cities`,
- joined with `offers` / prices,
- joined with ratings / reviews,
- joined with overrides (admin edits).

At small scale (hundreds or a few thousands of events), this is fine if the right indexes exist.
However, as we approach **50k+ events** and many SEO pages, these joins become expensive:

- multiple joins per request,
- complex WHERE conditions,
- high CPU and I/O load on PostgreSQL.

---

## 2. Target architecture A: Precomputed Event Card Cache

### Idea

Instead of building catalog cards on the fly from many tables, we maintain a **materialized catalog**
of **precomputed event cards** in a dedicated table.

### Schema

Example table:

```text
event_card_cache
----------------
id              -- surrogate PK
event_id        -- FK to Event
city_slug
title
slug
image
price_from
rating
reviews_count
next_session
sessions_count
is_active
category
tags            -- denormalized, e.g. string[] or JSON
smart_score     -- optional ranking score
updated_at
```

This is a **ready-to-render card** for the public catalog and SEO pages.

### Catalog query with cache

Instead of complex joins, the catalog can query:

```sql
SELECT *
FROM event_card_cache
WHERE city_slug = 'saint-petersburg'
  AND category = 'EXCURSION'
ORDER BY next_session
LIMIT 20 OFFSET 0;
```

Benefits:

- very fast (no heavy joins),
- straightforward filtering and pagination,
- predictable performance even with tens of thousands of rows.

### Updating the cache

The cache is updated whenever underlying event data changes, e.g.:

- event updated (title, category, tags, etc.),
- sessions added/removed/cancelled (affecting `next_session` / `sessions_count`),
- price changes,
- rating / reviews updated,
- override applied/removed.

There are two primary strategies:

1. **Event-driven (synchronous or via queue)**  
   On specific events (e.g. `event.updated`, `session.changed`, `price.changed`), enqueue a
   `rebuildEventCard(eventId)` job.

2. **Worker / batch-based**  
   A periodic worker scans for recently changed events (by `updatedAt`) and rebuilds cards in batches.

### Example rebuild function

```ts
async function rebuildEventCard(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      city: { select: { slug: true, name: true } },
      sessions: true,
      // ratings / reviews / overrides as needed
    },
  });
  if (!event) return;

  const nextSession = findNearestSession(event.sessions);

  await prisma.eventCardCache.upsert({
    where: { eventId },
    update: {
      title: event.title,
      slug: event.slug,
      citySlug: event.city.slug,
      image: event.imageUrl,
      priceFrom: event.priceFrom,
      nextSession,
      sessionsCount: event.sessions.length,
      rating: event.rating,
      reviewsCount: event.reviewCount,
      isActive: event.isActive,
      updatedAt: new Date(),
    },
    create: {
      eventId: event.id,
      title: event.title,
      slug: event.slug,
      citySlug: event.city.slug,
      image: event.imageUrl,
      priceFrom: event.priceFrom,
      nextSession,
      sessionsCount: event.sessions.length,
      rating: event.rating,
      reviewsCount: event.reviewCount,
      isActive: event.isActive,
      updatedAt: new Date(),
    },
  });
}
```

### What this gives us

1. **Very fast catalog** — queries are simple `SELECT` on a denormalized table.  
2. **Simple filtering** — price, rating, city, category, tags all live in a single row.  
3. **No heavy JOINs** — the DB workload is predictable and easy to scale.

### SEO benefits

SEO pages like:

- `/cities/spb/excursions`,
- `/cities/spb/night-excursions`,
- `/cities/spb/excursions-for-kids`,
- `/cities/spb/museums`,

can be rendered quickly because they only read `event_card_cache` with simple filters.
This keeps **TTFB low** and makes the catalog **indexable and fast** at scale.

### When to introduce the card cache

Not needed at very early stages. Recommended thresholds:

- **> 10k events** in the database, or
- **> 100 RPS** on catalog endpoints, or
- signs of catalog queries dominating DB CPU / I/O.

---

## 3. Target architecture B: Static Index + Query Filter

### Idea

For SEO-heavy catalogs with many combinations (cities × categories × tags), we can precompute a
**global event index** and serve SEO pages from that index instead of hitting the database at all.

### Problem with traditional approach

SEO pages like:

- `/cities/spb/excursions`,
- `/cities/spb/night-excursions`,
- `/cities/spb/excursions-for-kids`,
- `/cities/spb/museums-for-kids`,

all run similar SQL filters:

```sql
SELECT *
FROM events
WHERE city = 'spb'
  AND category = 'EXCURSIONS'
  AND 'night' = ANY(tags);
```

With thousands of such combinations and many crawlers/users, the database becomes the bottleneck.

### Global event index

We introduce a **static index** of event cards, for example:

```json
[
  {
    "id": "e1",
    "city": "spb",
    "category": "EXCURSION",
    "tags": ["night", "boat"],
    "price": 1500,
    "rating": 4.7,
    "nextSession": "2026-06-01T20:00:00Z"
  },
  {
    "id": "e2",
    "city": "msk",
    "category": "MUSEUM",
    "tags": ["kids"],
    "price": 900,
    "rating": 4.5,
    "nextSession": "2026-05-20T12:00:00Z"
  }
]
```

This index can be:

- stored as `events_index.json` on a **CDN**,
- cached in **Redis**,
- or preloaded into **process memory** in the Next.js app.

### How SEO pages use the index

Example: `/cities/spb/night-excursions`

Page flow:

1. Load the index (or a city-specific shard of it).
2. Filter in memory:

   ```ts
   const events = index.filter(
     (e) =>
       e.city === 'spb' &&
       e.category === 'EXCURSION' &&
       e.tags.includes('night'),
   );
   ```

3. Render the page (SSR/SSG) based on this filtered list.

For **10k events** an in-memory filter is on the order of 1–2 ms in Node.js.

### Updating the index

The index is rebuilt when:

- events are created/updated,
- sessions change in ways that affect `nextSession` or availability,
- prices change,
- ratings change.

Pipeline:

```text
events (and related tables)
      ↓
  worker service
      ↓
 build event index (JSON or per-city shards)
      ↓
  upload to CDN / cache
      ↓
  invalidate old index
```

In a Next.js context this can be served via:

- `fetch('/static/events_index.json')`, or
- `import eventsIndex from '@/data/events_index.json'` at build time for SSG.

### Scale example

With:

- 300 cities,
- 20 categories,
- 15 “intents” (e.g. kids, at night, with dinner),

we can reach **300 × 20 × 15 = 90,000 SEO pages**.  
Using a static index ensures these pages remain fast without hammering the database.

### Extra uses of the index

- **Instant search** — client-side search without extra round-trips.
- **Smart sorting / ranking** — custom ranking logic entirely in memory.
- **SEO generation** — automatic creation of long-tail pages based on index facets.

---

## 4. DTO preparation: EventCard

The key preparation for both architectures (card cache and static index) is to **standardize the
Event Card DTO** used by the frontend.

Example:

```ts
type EventCard = {
  id: string;
  slug: string;
  city: string;
  category: string;
  price: number | null;
  rating: number | null;
  reviewsCount: number;
  durationMinutes: number | null;
  nextSession: string | null; // ISO
  imageUrl: string | null;
  tags: string[];
};
```

Today:

- **Source**: DB queries (through NestJS services) → map to `EventCard`.

Tomorrow:

- **Source**: `event_card_cache` or `events_index` JSON → map to the **same** `EventCard`.

This keeps the public frontend mostly agnostic to whether the data comes directly from the database
or from precomputed/materialized sources.

---

## 5. When to implement which layer

### Short term (MVP / Gate 2.5)

- Keep direct DB queries for catalogs.
- Start consolidating card shape around a shared `EventCard` DTO in backend + frontend.

### Medium term (10k+ events, 100+ RPS)

- Introduce **Event Card Cache** table (materialized catalog).
- Route public catalog and admin listings to use this cache where possible.

### Long term (many SEO pages, 50k–100k+ events)

- Introduce global **Static Index + Query Filter** for SEO pages.
- Use the index for:
  - large SEO trees (cities × tags × categories),
  - instant search,
  - smart ranking.

