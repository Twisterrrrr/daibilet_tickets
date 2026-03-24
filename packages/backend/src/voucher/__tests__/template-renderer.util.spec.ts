import { describe, expect, it } from 'vitest';

import { renderHtmlTemplate } from '../utils/template-renderer.util';

describe('renderHtmlTemplate', () => {
  it('replaces placeholders with escaped values', () => {
    const html = renderHtmlTemplate('<h1>{{title}}</h1>', { title: '<script>alert(1)</script>' });
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('returns empty string for missing/null values', () => {
    const html = renderHtmlTemplate('{{a}}|{{b}}|{{c}}', {
      a: 'ok',
      b: null,
    });
    expect(html).toBe('ok||');
  });
});

