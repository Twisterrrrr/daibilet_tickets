# Landings — Reference & Parity Guide

Этот документ объединяет:

- **принципы паритета** (Lovable → Daibilet),
- **набор reference‑страниц** (какие URL считать эталонами),
- **анатомию лендинга** (какие секции и что нельзя ломать).

Связанные документы:

- интеграция shell (header/footer): [`daibilet-shell-integration.md`](daibilet-shell-integration.md)
- дизайн‑система публичных лендингов: [`design-system.md`](design-system.md)
- архитектура домена лендингов: [`Landings-Architecture.md`](Landings-Architecture.md)
- чеклист конкретного гастро‑кейса: [`lovable-dinner-cruise-landing-parity.md`](lovable-dinner-cruise-landing-parity.md)

---

## 1) Lovable parity rules

### Goal

Preserve the UX quality of the Lovable landing family while integrating Daibilet shell and real platform data.

### Anti-pattern: raw catalog after hero

Immediately showing a raw list/grid after the hero is considered a **UX regression**.

Landing must include:

- context
- framing
- curated or structured sections

before exposing raw listings.

### Parity means

Parity does **NOT** mean pixel-perfect HTML duplication.

Parity **DOES** mean preserving:

- page type
- section rhythm
- visual hierarchy
- promotional/editorial feel
- CTA hierarchy
- spacing density
- landing-first experience

### Non-negotiable invariants

- strong landing hero
- non-generic section composition
- editorial / promotional pacing
- clear CTA rhythm
- category/city/event framing
- richer public marketing feel than ordinary catalog pages

### Allowed changes

- Daibilet header/footer
- actual data binding
- content wording
- SEO text updates
- accessibility improvements
- code structure
- reusable components behind the scenes

### What must not happen

Do not:

- genericize the landing
- compress the page into standard catalog rhythm
- replace hero with default title block
- make every section look identical
- turn the page into a utilitarian listing
- over-standardize away the landing personality

### PR review checklist

- [ ] page family identified correctly
- [ ] reference UX preserved
- [ ] shell added without redesign
- [ ] no catalog-template drift
- [ ] no admin/dashboard visual language
- [ ] no compressed spacing regression
- [ ] CTA hierarchy still clear

### Default decision rule

If there is a choice between:

- stricter parity with the reference landing family
- a more standardized generic implementation

**Choose stricter parity.**

---

## 2) Reference routes (Lovable)

These routes are the **UX reference set** for public landing pages.

**Base:**

- `https://night-bridges.lovable.app/`

**Category / vertical:**

- `https://night-bridges.lovable.app/bus-tours`
- `https://night-bridges.lovable.app/bus-tours/{city}`
- `https://night-bridges.lovable.app/river-cruises/`
- `https://night-bridges.lovable.app/river-cruises/{city}`

**Seasonal / campaign:**

- `https://night-bridges.lovable.app/salute-9-may`
- `https://night-bridges.lovable.app/salute-9-may/{city}`

**Event / offer detail style:**

- `https://night-bridges.lovable.app/events/dinner-cruise/moscow`

**Absolute rule:** do not downgrade these pages into standard site templates.

---

## 3) Landing page anatomy

### Global structure

```
<DaibiletHeader />
<LandingPageBody />
<DaibiletFooter />
```

Header/footer are **wrappers**, not replacements for landing body structure.

### LandingPageBody canonical anatomy

1. **Hero** (dominant)
2. **Supporting context block(s)** (framing, why this matters)
3. **Offer / collection / content sections** (grouped, editorial pacing)
4. **Support / trust / practical info blocks** (FAQ, notes, timing)
5. **Closing CTA zone** (clear finish)

### Header integration

- sit above hero
- not visually compete with hero
- not consume excessive vertical attention
- not force breadcrumbs-first layout unless explicitly needed

### Footer integration

- close the page naturally
- not collide with the last CTA block
- preserve generous lower spacing before footer when needed

### Forbidden structure drift

Do not transform the page into:

- tiny title + breadcrumbs + card grid
- generic catalog list with filters on top
- utilitarian index page
- admin/table-like structure

