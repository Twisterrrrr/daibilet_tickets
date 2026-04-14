import { describe, expect, it } from 'vitest';

import { renderSafeMarkdownToHtml } from './renderSafeMarkdown';

describe('renderSafeMarkdownToHtml', () => {
  it('escapes raw HTML (no script execution)', () => {
    const html = renderSafeMarkdownToHtml('Hello <script>alert(1)</script> world');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });

  it('strips inline event handlers if any slipped through', () => {
    const html = renderSafeMarkdownToHtml('X <img src=x onerror="alert(1)" /> Y');
    // raw HTML is escaped first; so we must not get a real <img> tag in output
    expect(html.toLowerCase()).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('onerror=&quot;alert(1)&quot;');
  });

  it('removes javascript: links but keeps visible text', () => {
    const html = renderSafeMarkdownToHtml('[click](javascript:alert(1))');
    expect(html).not.toContain('href=');
    expect(html).toContain('click');
  });

  it('allows https links', () => {
    const html = renderSafeMarkdownToHtml('[go](https://example.com)');
    expect(html).toContain('href="https://example.com"');
  });

  it('rejects protocol-relative URLs', () => {
    const html = renderSafeMarkdownToHtml('[x](//evil.example)');
    expect(html).not.toContain('href=');
    expect(html).toContain('x');
  });
});

