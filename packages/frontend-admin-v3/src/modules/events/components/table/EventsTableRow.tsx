import type { EventRowItem } from './types';
import { EventActionsCell } from './cells/EventActionsCell';
import { EventIssuesCell } from './cells/EventIssuesCell';
import { EventLifecycleCell } from './cells/EventLifecycleCell';
import { EventLocationCell } from './cells/EventLocationCell';
import { EventMainCell } from './cells/EventMainCell';
import { EventNextSessionCell } from './cells/EventNextSessionCell';
import { EventOverrideCell } from './cells/EventOverrideCell';
import { EventPriceCell } from './cells/EventPriceCell';
import { EventQualityCell } from './cells/EventQualityCell';
import { EventSessionsCell } from './cells/EventSessionsCell';
import { EventSourceCell } from './cells/EventSourceCell';

export function EventsTableRow({
  item,
  onToggleArchive,
  selected,
  onToggleSelect,
  visibleCols,
}: {
  item: EventRowItem;
  onToggleArchive: (id: string, nextArchived: boolean) => Promise<void>;
  selected: boolean;
  onToggleSelect: (id: string, nextSelected: boolean) => void;
  visibleCols: string[];
}) {
  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="w-[44px] px-3 py-3 text-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelect(item.id, e.target.checked)}
          aria-label={`Выбрать: ${item.title}`}
        />
      </td>
      {visibleCols.includes('main') ? (
        <td className="px-4 py-3">
          <EventMainCell item={item} />
        </td>
      ) : null}
      {visibleCols.includes('source') ? (
        <td className="px-4 py-3 text-center">
          <EventSourceCell source={item.supplierSource} supplierName={item.supplierName} />
        </td>
      ) : null}
      {visibleCols.includes('location') ? (
        <td className="px-4 py-3 text-center">
          <EventLocationCell cityName={item.cityName} venueName={item.venueName} />
        </td>
      ) : null}
      {visibleCols.includes('next') ? (
        <td className="px-4 py-3 text-center">
          <EventNextSessionCell nextDate={item.nextDate} hasFutureSlots={item.hasFutureSlots} />
        </td>
      ) : null}
      {visibleCols.includes('sessions') ? (
        <td className="px-4 py-3 text-center">
          <EventSessionsCell count={item.sessionsCount} />
        </td>
      ) : null}
      {visibleCols.includes('price') ? (
        <td className="px-4 py-3 text-center">
          <EventPriceCell priceFrom={item.priceFrom} />
        </td>
      ) : null}
      {visibleCols.includes('status') ? (
        <td className="px-4 py-3 text-center">
          <EventLifecycleCell
            publishStatus={item.publishStatus}
            isPast={item.isPast}
            isArchived={item.isArchived}
            isActive={item.isActive}
          />
        </td>
      ) : null}
      {visibleCols.includes('quality') ? (
        <td className="px-4 py-3 text-center">
          <EventQualityCell score={item.readinessScore} />
        </td>
      ) : null}
      {visibleCols.includes('issues') ? (
        <td className="px-4 py-3 text-center">
          <EventIssuesCell
            issueCount={item.issueCount}
            warningCount={item.warningCount}
            readinessStatus={item.readinessStatus}
            issues={item.issues}
          />
        </td>
      ) : null}
      {visibleCols.includes('override') ? (
        <td className="px-4 py-3 text-center">
          <EventOverrideCell hasOverride={item.hasOverride} />
        </td>
      ) : null}
      <td className="px-4 py-3 text-center">
        <EventActionsCell item={item} onToggleArchive={onToggleArchive} />
      </td>
    </tr>
  );
}

