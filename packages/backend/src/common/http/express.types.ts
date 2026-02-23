import type { Request } from 'express';

import type { AdminAuthUser } from '../../auth/admin-auth.types';

export type ExpressRequest = Request & { user?: AdminAuthUser };
