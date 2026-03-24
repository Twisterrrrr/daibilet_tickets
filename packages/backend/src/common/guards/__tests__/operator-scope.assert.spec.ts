import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { assertOperatorScope } from '../operator-scope.guard';

describe('assertOperatorScope', () => {
  it('throws when target operator is null', () => {
    expect(() => assertOperatorScope(null, 'op-a')).toThrow(ForbiddenException);
  });

  it('throws when operators differ', () => {
    expect(() => assertOperatorScope('op-b', 'op-a')).toThrow(ForbiddenException);
  });

  it('passes when equal', () => {
    expect(() => assertOperatorScope('op-a', 'op-a')).not.toThrow();
  });
});
