# UI Scope Separation

## Purpose

Prevent conflicts between admin UI system and public landing UX.

---

## Two UI worlds

### 1. Admin / Catalog UI

**Characteristics:**

- structured
- dense
- reusable components
- tables, filters, forms

**Core tools:**

- DataTableShell
- FilterBar
- PageHeader

**Goal:** efficiency and control

---

### 2. Public Landing UI

**Characteristics:**

- editorial
- narrative
- spacious
- promotional

**Core elements:**

- hero
- sections
- storytelling blocks
- CTA flow

**Goal:** discovery, conversion, SEO

---

## Critical rule

These systems **must NOT** be mixed.

---

## Common mistake

Turning landing into:

- filter + grid
- table-like layout
- generic category page

---

## Correct behavior

**Landing:**

- drives narrative
- controls attention
- introduces offers

**Catalog:**

- filters and lists

---

## Decision rule

If the page answers **"what should I choose?"** → **Landing**

If the page answers **"filter and compare options"** → **Catalog**
