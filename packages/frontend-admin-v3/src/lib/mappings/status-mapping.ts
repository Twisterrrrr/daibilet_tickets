import { unifiedStatuses, type UnifiedStatus, type UnifiedStatusView } from '@/config/statuses';

export function mapUnifiedStatus(status: UnifiedStatus): UnifiedStatusView {
  return unifiedStatuses[status];
}

