import type { AppAuthUser } from '../auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AppAuthUser;
    }
  }
}

export {};
