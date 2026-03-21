import { describe, expect, it } from 'vitest';

import {
  dedupeSpecsByKey,
  filterContentJsonSpecs,
  type TemplateFieldSpec,
} from '@daibilet/shared';

describe('content-blocks.helpers (shared)', () => {
  const mixed: TemplateFieldSpec[] = [
    {
      key: 'col',
      label: 'Column',
      storage: 'COLUMN',
      required: false,
      inputType: 'text',
    },
    {
      key: 'json1',
      label: 'JSON 1',
      storage: 'CONTENT_JSON',
      required: false,
      inputType: 'textarea',
    },
    {
      key: 'json1',
      label: 'JSON duplicate',
      storage: 'CONTENT_JSON',
      required: false,
      inputType: 'textarea',
    },
  ];

  it('filterContentJsonSpecs keeps only CONTENT_JSON', () => {
    const f = filterContentJsonSpecs(mixed);
    expect(f.map((x) => x.key)).toEqual(['json1', 'json1']);
  });

  it('dedupeSpecsByKey keeps first occurrence', () => {
    const jsonOnly = filterContentJsonSpecs(mixed);
    const d = dedupeSpecsByKey(jsonOnly);
    expect(d).toHaveLength(1);
    expect(d[0]?.label).toBe('JSON 1');
  });
});
