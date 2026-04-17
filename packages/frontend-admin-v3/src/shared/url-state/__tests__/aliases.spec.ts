import { describe, expect, it } from 'vitest';
import { getParamWithAliases } from '../parse';
import { createListBaseConfig } from '../listContracts';

describe('url-state aliases', () => {
  it('getParamWithAliases: reads legacy names', () => {
    const sp = new URLSearchParams('p=3&perPage=50&search=hello');
    expect(getParamWithAliases(sp, 'page')).toBe('3');
    expect(getParamWithAliases(sp, 'pageSize')).toBe('50');
    expect(getParamWithAliases(sp, 'q')).toBe('hello');
  });

  it('createListBaseConfig: parses legacy names but serializes new', () => {
    const cfg = createListBaseConfig({ defaultPageSize: 25, allowedSort: ['updatedAt', 'title'] });
    const parsed = cfg.parse(new URLSearchParams('p=2&perPage=50&search=hi&sort=title:asc'));
    expect(parsed).toEqual({ q: 'hi', page: 2, pageSize: 50, sort: 'title', order: 'asc' });
    const out = cfg.serialize(parsed, new URLSearchParams());
    expect(out.toString()).toContain('q=hi');
    expect(out.toString()).toContain('page=2');
    expect(out.toString()).toContain('pageSize=50');
    expect(out.toString()).toContain('sort=title');
    expect(out.toString()).toContain('order=asc');
    expect(out.toString()).not.toContain('p=');
    expect(out.toString()).not.toContain('perPage=');
    expect(out.toString()).not.toContain('search=');
  });
});

