import type { AdminRole } from '@prisma/client';
import type { SupplierRole } from '@prisma/client';

/** Admin user (JwtStrategy default) */
export interface AdminAuthUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  type: 'admin';
}

/** Supplier user (jwt-supplier) */
export interface SupplierAuthUser {
  id: string;
  email: string;
  name: string | null;
  role: SupplierRole;
  operatorId: string;
  operatorName: string;
  trustLevel: string;
  type: 'supplier';
}

/** Public user (jwt-user) */
export interface UserAuthUser {
  id: string;
  email: string;
  name: string | null;
  type: 'user';
}

/** Partner API (ApiKeyGuard) */
export interface PartnerAuthUser {
  operatorId: string;
  operatorName: string;
  apiKeyId: string;
  apiKeyName: string;
  trustLevel: string;
  type: 'partner';
}

/** Union of all auth user types */
export type AppAuthUser = AdminAuthUser | SupplierAuthUser | UserAuthUser | PartnerAuthUser;

/** Request with specific user type (overrides passport's User) */
export type RequestWithUser<T extends AppAuthUser> = Omit<import('express').Request, 'user'> & { user: T };
