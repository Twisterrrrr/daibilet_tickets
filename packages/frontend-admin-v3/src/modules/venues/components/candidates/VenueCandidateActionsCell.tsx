import { Button } from '@/components/ui/button';
import type { AdminVenueCandidateRow } from '@/modules/venues/api/candidates';
import { Link } from 'react-router-dom';

type Props = {
  row: AdminVenueCandidateRow;
  onApprove: () => void;
  onMerge: () => void;
  onReject: () => void;
  onDetails: () => void;
};

export function VenueCandidateActionsCell({ row, onApprove, onMerge, onReject, onDetails }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" size="sm" variant="default" onClick={onApprove}>
        Утвердить
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onMerge}>
        Слить
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onReject}>
        Отклонить
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDetails}>
        Детали
      </Button>
      <Button type="button" size="sm" variant="ghost" asChild>
        <Link to={`/admin-v3/venues/${row.id}`}>Карточка</Link>
      </Button>
    </div>
  );
}
