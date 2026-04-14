import type { AdminVenueCandidateRow } from '@/modules/venues/api/candidates';
import { VenueCandidateActionsCell } from '@/modules/venues/components/candidates/VenueCandidateActionsCell';
import { VenueCandidateIdentityCell } from '@/modules/venues/components/candidates/VenueCandidateIdentityCell';
import { VenueCandidateMatchCell } from '@/modules/venues/components/candidates/VenueCandidateMatchCell';
import { VenueCandidateUsageCell } from '@/modules/venues/components/candidates/VenueCandidateUsageCell';
import * as React from 'react';

type SelectionProps = {
  eligibleIds: Set<string>;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
};

type Props = {
  items: AdminVenueCandidateRow[];
  duplicateFlags: (boolean | undefined)[];
  onApprove: (row: AdminVenueCandidateRow) => void;
  onMerge: (row: AdminVenueCandidateRow) => void;
  onReject: (row: AdminVenueCandidateRow) => void;
  onDetails: (row: AdminVenueCandidateRow) => void;
  selection?: SelectionProps;
};

export function VenueCandidatesTable(props: Props) {
  const { items, duplicateFlags, onApprove, onMerge, onReject, onDetails, selection } = props;

  const headerCheckboxRef = React.useRef<HTMLInputElement>(null);
  const eligibleOnPage = React.useMemo(
    () => items.filter((r) => selection?.eligibleIds.has(r.id) ?? false),
    [items, selection?.eligibleIds],
  );
  const allSelected =
    eligibleOnPage.length > 0 && eligibleOnPage.every((r) => selection?.selectedIds.has(r.id));
  const someSelected =
    eligibleOnPage.some((r) => selection?.selectedIds.has(r.id)) && !allSelected;

  React.useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) {
      el.indeterminate = someSelected;
    }
  }, [someSelected]);

  const colSpan = selection ? 5 : 4;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs font-medium uppercase text-muted-foreground">
          <tr>
            {selection ? (
              <th className="w-10 px-2 py-3">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  className="h-4 w-4 rounded border"
                  checked={allSelected}
                  disabled={eligibleOnPage.length === 0}
                  onChange={() => selection.onToggleAll()}
                  aria-label="Выбрать все на странице"
                />
              </th>
            ) : null}
            <th className="px-4 py-3">Площадка</th>
            <th className="px-4 py-3">Совпадение</th>
            <th className="px-4 py-3">Использование</th>
            <th className="w-44 px-4 py-3">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center text-muted-foreground">
                Нет кандидатов по фильтру
              </td>
            </tr>
          ) : (
            items.map((row, i) => {
              const canSelect = selection ? selection.eligibleIds.has(row.id) : false;
              const isSelected = selection ? selection.selectedIds.has(row.id) : false;
              return (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                  {selection ? (
                    <td className="px-2 py-3 align-top">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border"
                        checked={isSelected}
                        disabled={!canSelect}
                        onChange={() => selection.onToggleRow(row.id)}
                        aria-label={`Выбрать ${row.title}`}
                      />
                    </td>
                  ) : null}
                  <td className="align-top px-4 py-3">
                    <VenueCandidateIdentityCell row={row} />
                  </td>
                  <td className="align-top px-4 py-3">
                    <VenueCandidateMatchCell row={row} hasDuplicates={duplicateFlags[i]} />
                  </td>
                  <td className="align-top px-4 py-3">
                    <VenueCandidateUsageCell row={row} />
                  </td>
                  <td className="align-top px-4 py-3">
                    <VenueCandidateActionsCell
                      row={row}
                      onApprove={() => onApprove(row)}
                      onMerge={() => onMerge(row)}
                      onReject={() => onReject(row)}
                      onDetails={() => onDetails(row)}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
