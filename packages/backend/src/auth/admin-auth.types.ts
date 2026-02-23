import type { AdminRole } from '@prisma/client';

export interface AdminAuthUser {
  id: string;
  role: AdminRole;
  operatorId?: string | null;
  email?: string;
  name?: string;
}
