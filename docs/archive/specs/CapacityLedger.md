# Capacity Ledger Architecture (future design)

Status: planned  
Stage: post-MVP

This document describes the future inventory architecture for event sessions
to support high-concurrency booking and multi-channel sales.

The current implementation uses a simplified capacity model that is sufficient for MVP traffic levels.

---

## Current MVP model

`EventSession`:

- `capacity_total`

Availability is calculated as:

```text
available = capacity_total - sold
```

Where `sold` is derived from paid orders.

This approach is simple and sufficient for MVP traffic levels, but has important limitations:

- race conditions under high load
- no temporary holds
- difficult multi-channel inventory

---

## Target architecture: Virtual Capacity Ledger

In the future, the system will use an append-only ledger of capacity operations.

### Tables

```text
sessions
--------
id
capacity_total

capacity_ledger
---------------
id
session_id
type        (HOLD | RELEASE | SALE)
qty
expires_at
created_at
source      (optional, for channels)
```

### Availability calculation

```sql
available =
  capacity_total
  - SUM(SALE)
  - SUM(HOLD WHERE expires_at > now())
```

In SQL form for a single session:

```sql
SELECT
  s.capacity_total
  - COALESCE((
      SELECT SUM(qty)
      FROM capacity_ledger
      WHERE session_id = $1
        AND type = 'SALE'
    ), 0)
  - COALESCE((
      SELECT SUM(qty)
      FROM capacity_ledger
      WHERE session_id = $1
        AND type = 'HOLD'
        AND expires_at > now()
    ), 0) AS available
FROM sessions s
WHERE s.id = $1;
```

This can be cached per session (e.g. in Redis) and periodically recomputed from the ledger.

### Booking flow

1. **User enters checkout**  
   → create `HOLD`:

   ```sql
   INSERT INTO capacity_ledger (session_id, type, qty, expires_at)
   VALUES ($sessionId, 'HOLD', $qty, now() + interval '10 minutes');
   ```

2. **User pays**  
   → convert hold to sale, either:

   - update the existing row (if allowed), or
   - create a separate `SALE` entry:

   ```sql
   INSERT INTO capacity_ledger (session_id, type, qty)
   VALUES ($sessionId, 'SALE', $qty);
   ```

3. **User abandons / payment fails**  
   → background process removes expired holds:

   ```sql
   DELETE FROM capacity_ledger
   WHERE type = 'HOLD'
     AND expires_at <= now();
   ```

### Advantages

- **Append-only operations**: no in-place updates of session capacity.
- **No row locking on sessions**: all contention happens on the ledger, which can be sharded or batched.
- **Simple recomputation**: if anything goes wrong, availability can be fully rebuilt from the ledger.
- **Audit trail**: every HOLD and SALE is visible and explainable.
- **Supports dynamic pricing and scarcity indicators**:
  - price can increase as `available` decreases,
  - UI can show “only 3 seats left” based on computed availability.

---

## Future extension: split inventory

By adding a `source` (or `channel`) field to the ledger, the same physical capacity can be sold across multiple platforms:

- `DAIBILET`
- `GETYOURGUIDE`
- `PARTNER_API`

Example:

```text
capacity_ledger
---------------
session_id
type
qty
expires_at
source  -- e.g. 'DAIBILET', 'GETYOURGUIDE', ...
```

This enables:

- **multi-channel distribution without overselling**, even when partners sell the same sessions,
- per-channel analytics and throttling,
- the ability to temporarily pause sales for a specific channel.

---

## When to migrate to a ledger

Migration from the simple model to a virtual capacity ledger is recommended when at least one of the following holds:

- sessions experience **concurrent bookings** (multiple orders per second for the same session),
- new **external distribution channels** appear (resellers, OTAs, partners),
- daily booking volume is consistently **> 1k paid orders**,
- race conditions around capacity start to appear in logs/operations.

Until then, the MVP model is acceptable and much simpler to operate.

---

## What to do now (realistic MVP)

For the current stage, the system can stay on a simplified capacity model:

```text
sessions
--------
id
capacity_total

orders
------
id
session_id
status   (PENDING | PAID | ... )
qty
```

Availability:

```text
available = capacity_total - SUM(qty WHERE status = 'PAID')
```

This is enough as long as:

- there are no strong concurrency spikes on single sessions,
- all sales go through a single primary channel,
- consistency requirements are “eventually correct” rather than strictly transactional.

---

## Important things to prepare already now

Even without a full ledger, two building blocks are worth introducing early.

### 1. Basic seat holds

Introduce a lightweight `session_holds` (or similar) table:

```text
session_holds
-------------
session_id
qty
expires_at
created_at
```

Semantics:

- create a row when the user enters checkout,
- keep TTL at 10–15 minutes,
- periodically delete expired holds,
- subtract active holds from availability in the read-model:

```text
available = capacity_total - sold - active_holds
```

This gives you most of the UX benefits (soft reservation) without a full ledger design.

### 2. Webhook-driven order state

Always drive final order state from **payment webhooks**, not from “success” callbacks in the frontend:

- **DO**:
  - `payment provider → webhook → mark order as PAID`,
  - then update derived availability from orders.
- **DO NOT**:
  - immediately decrease capacity on “payment success” client callbacks.

This makes order state idempotent and recoverable, and is fully compatible with a future switch to a ledger.

---

## Summary

- MVP stays on a simple `capacity_total - sold` model.
- Future high-scale architecture will use a **Virtual Capacity Ledger** with HOLD/SALE entries.
- Split inventory by channel becomes possible with a `source` field on ledger rows.
- Early introduction of **seat holds** and **webhook-driven orders** will make migration to the ledger straightforward when traffic justifies it.

