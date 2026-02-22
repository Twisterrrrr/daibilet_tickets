import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AppAuthUser } from './auth.types';

export const AuthUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AppAuthUser | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
