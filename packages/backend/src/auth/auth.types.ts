/**
 * Типы пользователей для req.user после прохождения guard'ов.
 * Использовать вместо req: any в контроллерах.
 */
import type { AdminRole } from '@prisma/client';

/** req.user после JwtAuthGuard (Admin) */
export interface AdminJwtUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
}

/** req.user после ApiKeyGuard (Partner B2B API) */
export interface PartnerApiUser {
  operatorId: string;
  operatorName: string;
  apiKeyId: string;
  apiKeyName: string;
  trustLevel: number | null;
  type: 'partner';
}
