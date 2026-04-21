# Lovable Parity Rules for Daibilet Landings

## Goal

Preserve the UX quality of the Lovable landing family while integrating Daibilet shell and real platform data.

---

## Anti-pattern: raw catalog after hero

Immediately showing a raw list/grid after the hero is considered a **UX regression**.

Landing must include:

- context
- framing
- curated or structured sections

before exposing raw listings.

---

## 1. Parity means

Parity does **NOT** mean pixel-perfect HTML duplication.

Parity **DOES** mean preserving:

- page type
- section rhythm
- visual hierarchy
- promotional/editorial feel
- CTA hierarchy
- spacing density
- landing-first experience

---

## 2. What must remain invariant

Non-negotiable invariants:

- strong landing hero
- non-generic section composition
- editorial / promotional pacing
- clear CTA rhythm
- category/city/event framing
- richer public marketing feel than ordinary catalog pages

---

## 3. What may change

Allowed changes:

- Daibilet header/footer
- actual data binding
- content wording
- SEO text updates
- accessibility improvements
- code structure
- reusable components behind the scenes

---

## 4. What must not happen

Do not:

- genericize the landing
- compress the page into standard catalog rhythm
- replace hero with default title block
- make every section look identical
- turn the page into a utilitarian listing
- over-standardize away the landing personality

---

## 5. Implementation test

A page passes parity if:

1. it still feels like a landing, not an index
2. Daibilet shell feels added, not imposed
3. hero remains dominant
4. section sequence still makes sense narratively
5. the page still supports SEO/discovery/persuasion, not only navigation

---

## 6. PR review checklist

Before merge, verify:

- [ ] page family identified correctly
- [ ] reference UX preserved
- [ ] shell added without redesign
- [ ] no catalog-template drift
- [ ] no admin/dashboard visual language
- [ ] no compressed spacing regression
- [ ] CTA hierarchy still clear

---

## 7. Default decision rule

If there is a choice between:

- stricter parity with the reference landing family
- a more standardized generic implementation

**Choose stricter parity.**
