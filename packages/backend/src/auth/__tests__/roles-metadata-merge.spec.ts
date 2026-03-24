import 'reflect-metadata';

import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';

import { ROLES_KEY } from '../roles.guard';

describe('Admin @Roles metadata (Reflector.merge)', () => {
  it('method metadata overrides class for getAllAndOverride', () => {
    class AdminCtrl {}
    const classOnly = AdminCtrl;
    const handler = function patchOnly() {};
    Reflect.defineMetadata(ROLES_KEY, ['ADMIN', 'EDITOR', 'VIEWER'], classOnly);
    Reflect.defineMetadata(ROLES_KEY, ['ADMIN'], handler);
    const ref = new Reflector();
    expect(ref.getAllAndOverride<string[]>(ROLES_KEY, [handler, classOnly])).toEqual(['ADMIN']);
  });
});
