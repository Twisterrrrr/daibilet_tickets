import type { ImportedSalesDashboardDto } from '@/modules/imported-sales/types';

// TODO(phase-2): заменить на реальный backend контракт, если/когда будет.
// Ожидаемый endpoint: GET /api/v1/admin/imported-sales/dashboard (или эквивалентный read-model).
export async function getImportedSalesDashboard(): Promise<ImportedSalesDashboardDto> {
  // Данные намеренно "плоские" и безопасные: без бизнес-логики в UI.
  return {
    catalogReadiness: {
      readyToPublish: 12,
      missingImage: 5,
      missingCategory: 8,
      missingVenue: 3,
      missingPurchaseLink: 6,
    },
    importHealth: {
      sourcesOk: 1,
      sourcesWarning: 1,
      sourcesError: 0,
      openIssues: 3,
    },
    mappingInbox: {
      unknownCategories: 9,
    },
    externalOrdersFeed: {
      recentCount: 25,
      pendingConfirmation: 2,
      confirmed: 20,
      cancelled: 3,
    },
  };
}

