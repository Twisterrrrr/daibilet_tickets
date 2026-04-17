import { describe, expect, it } from 'vitest';
import { setBool01, setCsv, setOrDelete } from '../serialize';

describe('url-state/serialize', () => {
  it('setOrDelete: deletes on empty', () => {
    const sp = new URLSearchParams('q=x');
    setOrDelete(sp, 'q', '');
    expect(sp.get('q')).toBeNull();
  });

  it('setBool01: omits default', () => {
    const sp = new URLSearchParams();
    setBool01(sp, 'archived', false, false);
    expect(sp.get('archived')).toBeNull();
    setBool01(sp, 'archived', true, false);
    expect(sp.get('archived')).toBe('1');
  });

  it('setCsv: joins', () => {
    const sp = new URLSearchParams();
    setCsv(sp, 'status', ['A', 'B']);
    expect(sp.get('status')).toBe('A,B');
  });
});

