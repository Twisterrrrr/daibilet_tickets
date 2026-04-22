import type { VenueModerationReasonCode } from '@/modules/venues/api/candidates';
import {
  venueRejectReasonLabel,
  VENUE_REJECT_REASON_OPTIONS,
} from '@/modules/venues/utils/venue-reject-reason-labels';

type Props = {
  reasonCode: VenueModerationReasonCode | '';
  onReasonCodeChange: (v: VenueModerationReasonCode | '') => void;
  reasonText: string;
  onReasonTextChange: (v: string) => void;
  idPrefix?: string;
};

export function VenueRejectReasonFields({
  reasonCode,
  onReasonCodeChange,
  reasonText,
  onReasonTextChange,
  idPrefix = 'venue-reject',
}: Props) {
  const selId = `${idPrefix}-code`;
  const taId = `${idPrefix}-text`;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Причина</span>
        <select
          id={selId}
          className="rounded-md border bg-background px-2 py-1.5 text-sm"
          value={reasonCode}
          onChange={(e) => onReasonCodeChange((e.target.value || '') as VenueModerationReasonCode | '')}
        >
          <option value="">Не указана</option>
          {VENUE_REJECT_REASON_OPTIONS.map((code) => (
            <option key={code} value={code}>
              {venueRejectReasonLabel(code)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Комментарий (необязательно)</span>
        <textarea
          id={taId}
          className="min-h-[72px] rounded-md border bg-background px-2 py-1.5 text-sm"
          value={reasonText}
          onChange={(e) => onReasonTextChange(e.target.value)}
          placeholder="Уточнение, особенно если выбрано «Другое»"
        />
      </label>
    </div>
  );
}
