import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('next.config redirects (SEO aliases)', () => {
  it('contains 301 aliases to canonical event/venue URLs', () => {
    const p = path.join(process.cwd(), 'next.config.ts');
    const txt = fs.readFileSync(p, 'utf8');
    expect(txt).toContain("source: '/event/:slug'");
    expect(txt).toContain("destination: '/events/:slug'");
    expect(txt).toContain("source: '/place/:slug'");
    expect(txt).toContain("destination: '/venues/:slug'");
    expect(txt).toContain('permanent: true');
  });
});
