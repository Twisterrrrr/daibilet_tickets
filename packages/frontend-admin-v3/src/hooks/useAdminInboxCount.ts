import { adminApi } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

export type AdminInboxCount = {
  chatNeedsReply: number;
  openTickets: number;
  total: number;
};

export function useAdminInboxCount() {
  return useQuery({
    queryKey: ['admin-support-inbox-count'],
    queryFn: () => adminApi.get<AdminInboxCount>('/admin/support/inbox-count'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
