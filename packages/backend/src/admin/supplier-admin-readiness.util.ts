import type { Prisma } from '@/prisma-client';

/** Готовность поставщика (Operator isSupplier) к операционной работе — эвристика. */
export type SupplierAdminReadinessStatus = 'READY' | 'NEEDS_WORK' | 'BLOCKED';

export type SupplierAdminReadinessDto = {
  status: SupplierAdminReadinessStatus;
  score: number;
  blockers: string[];
  warnings: string[];
  keySignals: string[];
};

export type SupplierAdminReadinessInput = {
  name: string;
  isActive: boolean;
  status: string;
  trustLevel: number;
  /** Прокси качества каталога (0..100), обычно trustCatalogScore */
  listingHealthScore: number;
  eventsCount: number;
  activeEventsCount: number;
  blockedEventsCount: number;
  usersCount: number;
  hasOwner: boolean;
  legalStatus: string | null;
  hasLegalProfile: boolean;
  pendingSettlementsCount: number;
  documentsDraftCount: number;
  commissionRate: number;
};

const trim = (s: string | null | undefined): string | null => {
  if (s === null || s === undefined) return null;
  const x = s.trim();
  return x.length > 0 ? x : null;
};

/** Аппроксимация для фильтра списка (согласована с {@link computeSupplierAdminReadiness}). */
export function supplierReadyWhereApprox(): Prisma.OperatorWhereInput {
  return {
    AND: [
      { isActive: true },
      { status: 'ACTIVE' },
      { supplierUsers: { some: { role: 'OWNER', isActive: true } } },
      {
        legalProfile: {
          is: { status: { not: 'REJECTED' } },
        },
      },
    ],
  };
}

export function supplierReadinessListWhere(status: SupplierAdminReadinessStatus): Prisma.OperatorWhereInput {
  if (status === 'BLOCKED') {
    return {
      OR: [{ isActive: false }, { status: { not: 'ACTIVE' } }],
    };
  }
  const ready = supplierReadyWhereApprox();
  if (status === 'READY') {
    return { isSupplier: true, ...ready };
  }
  return {
    isSupplier: true,
    isActive: true,
    NOT: ready,
  };
}

export function computeSupplierAdminReadiness(input: SupplierAdminReadinessInput): SupplierAdminReadinessDto {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const keySignals: string[] = [];

  if (!trim(input.name)) {
    blockers.push('Нет названия');
    return {
      status: 'BLOCKED',
      score: 0,
      blockers,
      warnings,
      keySignals: ['Нет названия'],
    };
  }

  if (!input.isActive || input.status !== 'ACTIVE') {
    blockers.push(
      input.status === 'SUSPENDED'
        ? 'Поставщик приостановлен (SUSPENDED)'
        : input.status === 'ARCHIVED'
          ? 'Архивный контрагент'
          : 'Поставщик неактивен',
    );
    return {
      status: 'BLOCKED',
      score: 0,
      blockers,
      warnings,
      keySignals: [blockers[0]!],
    };
  }

  let score = 100;

  if (!input.hasOwner) {
    blockers.push('Нет активного владельца (OWNER) в кабинете');
    score -= 35;
    keySignals.push('Нет OWNER');
  }

  if (!input.hasLegalProfile || input.legalStatus === 'REJECTED') {
    blockers.push(
      !input.hasLegalProfile
        ? 'Нет юридического профиля'
        : 'Юридический профиль отклонён',
    );
    score -= 30;
    if (keySignals.length < 3) keySignals.push(!input.hasLegalProfile ? 'Нет юр. профиля' : 'Юр. профиль REJECTED');
  } else if (input.legalStatus === 'DRAFT' || input.legalStatus === 'INCOMPLETE') {
    warnings.push('Юридический профиль не завершён / не верифицирован');
    score -= 15;
    if (keySignals.length < 3) keySignals.push('Юр. профиль не готов');
  }

  if (input.commissionRate <= 0 || Number.isNaN(input.commissionRate)) {
    warnings.push('Проверьте комиссию (commissionRate)');
    score -= 5;
  }

  if (input.usersCount === 0) {
    warnings.push('Нет пользователей кабинета');
    score -= 10;
    if (keySignals.length < 3) keySignals.push('Нет пользователей');
  }

  if (input.listingHealthScore < 50) {
    warnings.push('Низкий индекс качества каталога (trustCatalog / listing)');
    score -= 15;
    if (keySignals.length < 3) keySignals.push('Низкое качество каталога');
  }

  if (input.trustLevel < 1) {
    warnings.push('Trust level: NEW (0)');
    score -= 5;
  }

  if (input.eventsCount === 0) {
    warnings.push('Нет событий у оператора');
    score -= 10;
  } else if (input.blockedEventsCount > 0 && input.blockedEventsCount / Math.max(1, input.eventsCount) > 0.2) {
    warnings.push('Много отклонённых событий (модерация)');
    score -= 10;
    if (keySignals.length < 3) keySignals.push('Много REJECTED событий');
  }

  if (input.pendingSettlementsCount > 3) {
    warnings.push('Много расчётов в работе (DRAFT/CALCULATED)');
    score -= 5;
  }

  if (input.documentsDraftCount > 5) {
    warnings.push('Много черновиков закрывающих документов');
    score -= 5;
  }

  const status: SupplierAdminReadinessStatus =
    blockers.length > 0 ? 'BLOCKED' : score >= 72 && warnings.length <= 2 ? 'READY' : 'NEEDS_WORK';

  return {
    status,
    score: Math.max(0, Math.min(100, score)),
    blockers,
    warnings,
    keySignals: keySignals.slice(0, 3),
  };
}
