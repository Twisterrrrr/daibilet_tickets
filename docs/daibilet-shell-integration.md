# Daibilet Shell Integration for Lovable-Style Landings

## Goal

Integrate Daibilet brand shell into the landing family **without** destroying reference UX.

**Shell elements:**

- global header
- global footer

---

## 1. Header rule

Header is global navigation, **not** the hero.

Therefore:

- keep header visually lighter than hero
- avoid stacking too many bars above hero
- avoid large promo banners above hero by default
- do not add heavy breadcrumb rows before hero unless explicitly required

---

## 2. Footer rule

Footer should complete the site experience, **not** interrupt the landing CTA sequence.

Therefore:

- preserve spacing between final landing section and footer
- ensure last CTA still feels intentional
- footer must not look attached too tightly to the last card block

---

## 3. Brand rule

Daibilet shell may add brand recognition and trust, but must not erase the landing's own atmosphere.

---

## 4. Layout integration patterns

### Good

- header above hero
- landing body unchanged
- footer below landing body

### Bad

- wrap landing in generic page layout that changes spacing
- inject standard category title block above hero
- insert dense breadcrumbs + controls before hero
- replace landing CTA strategy with generic site controls

---

## 5. Technical implementation preference

**Preferred approach:**

- shared site shell layout
- landing-specific main content component
- minimal page-level overrides only where necessary

**Avoid:**

- cloning separate layout systems for each landing type
- forcing landing pages into templates built for admin/catalog lists

---

## 6. QA checklist

- [ ] header feels global but not dominant
- [ ] hero still owns first impression
- [ ] footer closes the page cleanly
- [ ] spacing before and after shell elements feels intentional
- [ ] landing still feels like the reference family
