import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { SectionCard } from '@daibilet/shared-ui';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ProfileRequisites {
  status: string;
  hasPrimaryAccount: boolean;
  issues: string[];
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  INCOMPLETE: 'На проверке',
  VERIFIED: 'Верифицирован',
  REJECTED: 'Отклонён',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  INCOMPLETE: 'bg-amber-50 text-amber-800',
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
};

interface SupplierFinanceWidgetProps {
  profileRequisites: ProfileRequisites;
  onRefresh?: () => void;
}

export function SupplierFinanceWidget({ profileRequisites }: SupplierFinanceWidgetProps) {
  const { status, issues } = profileRequisites;
  const statusLabel = STATUS_LABELS[status] ?? status;
  const statusColor = STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-700';

  return (
    <SectionCard title="Реквизиты для выплат">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Статус профиля:</span>
          <Badge variant="secondary" className={statusColor}>
            {statusLabel}
          </Badge>
        </div>
        {issues.length > 0 && (
          <ul className="space-y-1">
            {issues.map((issue, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {issue}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm">
            <Link to="/requisites">Заполнить реквизиты</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/requisites#accounts">Добавить счёт</Link>
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
