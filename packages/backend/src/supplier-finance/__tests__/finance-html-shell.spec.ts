import { describe, expect, it } from 'vitest';

import { injectPrintCss } from '../templates/finance-html-shell';

describe('finance-html-shell', () => {
  it('injects print css before closing head', () => {
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><p>x</p></body></html>';
    const out = injectPrintCss(html);
    expect(out).toContain('id="finance-print-global"');
    expect(out).toContain('@page');
    expect(out.includes('</head>')).toBe(true);
  });
});
