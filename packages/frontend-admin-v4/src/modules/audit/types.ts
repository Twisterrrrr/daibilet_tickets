export type AuditLogRowDto = {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
};

export type Paginated<T> = { items: T[]; total: number; page: number; pages: number };

export type AuditModule = {};

