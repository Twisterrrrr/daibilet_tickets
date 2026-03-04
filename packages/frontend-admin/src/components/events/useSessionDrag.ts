import { useCallback, useState } from 'react';

export type ScheduleGridConfig = {
  slotMinutes: number;
  slotPx: number;
  dayStartHour: number;
  dayEndHourExclusive: number;
};

export type SessionInterval = {
  sessionId: string;
  startMs: number;
  endMs: number;
  isCancelled: boolean;
  isLocked: boolean;
};

export type DragInvalidReason = 'NOT_DRAGGABLE' | 'OUT_OF_RANGE' | 'CONFLICT';

export type DragProposed = {
  startIso: string;
  endIso?: string;
  topPx: number;
  heightPx: number;
  leftPx: number;
  widthPx: number;
};

export type DragState =
  | { phase: 'idle' }
  | {
      phase: 'dragging';
      sessionId: string;
      pointerId: number;
      pointerStartY: number;
      originStartIso: string;
      originEndIso?: string;
      originTopPx: number;
      originLeftPx: number;
      widthPx: number;
      heightPx: number;
      proposed: DragProposed;
      isValid: boolean;
      invalidReason?: DragInvalidReason;
    };

export type UseSessionDragArgs = {
  config: ScheduleGridConfig;
  intervalsForDay: SessionInterval[];
  canDragSession: (sessionId: string) => boolean;
  getSessionById: (sessionId: string) => {
    startIso: string;
    endIso?: string;
    topPx: number;
    leftPx: number;
    widthPx: number;
    heightPx: number;
    dayDate: string;
  } | null;
  onDropValid: (sessionId: string, prefillStartIso: string) => void;
};

export type UseSessionDragResult = {
  drag: DragState;
  onSessionPointerDown: (e: React.PointerEvent, sessionId: string) => void;
  cancelDrag: () => void;
};

function roundToSlot(deltaPx: number, slotPx: number) {
  return Math.round(deltaPx / slotPx) * slotPx;
}

function pxToMinutes(deltaPx: number, slotPx: number, slotMinutes: number) {
  const slots = Math.round(deltaPx / slotPx);
  return slots * slotMinutes;
}

export function useSessionDrag(args: UseSessionDragArgs): UseSessionDragResult {
  const { config, intervalsForDay, canDragSession, getSessionById, onDropValid } = args;
  const [drag, setDrag] = useState<DragState>({ phase: 'idle' });

  const cancelDrag = useCallback(() => {
    setDrag({ phase: 'idle' });
  }, []);

  const onSessionPointerDown = useCallback(
    (e: React.PointerEvent, sessionId: string) => {
      if (!canDragSession(sessionId)) return;

      const session = getSessionById(sessionId);
      if (!session) return;

      const pointerId = (e as any).pointerId ?? 1;
      const originTopPx = session.topPx;
      const originLeftPx = session.leftPx;

      const d = new Date(session.startIso);
      const baseDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const baseMs = baseDay.getTime();

      const onMove = (ev: PointerEvent) => {
        setDrag((prev) => {
          if (prev.phase !== 'dragging' || prev.pointerId !== pointerId) return prev;

          const deltaPx = ev.clientY - prev.pointerStartY;
          const snappedDeltaPx = roundToSlot(deltaPx, config.slotPx);
          const deltaMinutes = pxToMinutes(snappedDeltaPx, config.slotPx, config.slotMinutes);

          const originDate = new Date(prev.originStartIso);
          const proposedStart = new Date(originDate.getTime() + deltaMinutes * 60_000);

          const hour = proposedStart.getHours();
          const minute = proposedStart.getMinutes();

          let isValid = true;
          let invalidReason: DragInvalidReason | undefined;

          if (
            hour < config.dayStartHour ||
            hour >= config.dayEndHourExclusive ||
            proposedStart.getDate() !== originDate.getDate()
          ) {
            isValid = false;
            invalidReason = 'OUT_OF_RANGE';
          } else {
            const proposedEnd = prev.originEndIso
              ? new Date(new Date(prev.originEndIso).getTime() + deltaMinutes * 60_000)
              : new Date(proposedStart.getTime() + config.slotMinutes * 60_000);

            const startMs = proposedStart.getTime();
            const endMs = proposedEnd.getTime();

            for (const interval of intervalsForDay) {
              if (interval.sessionId === prev.sessionId) continue;
              if (interval.isCancelled) continue;
              if (endMs <= interval.startMs || startMs >= interval.endMs) continue;
              isValid = false;
              invalidReason = 'CONFLICT';
              break;
            }
          }

          const proposed: DragProposed = {
            startIso: proposedStart.toISOString(),
            endIso: prev.originEndIso,
            topPx: originTopPx + snappedDeltaPx,
            heightPx: prev.heightPx,
            leftPx: originLeftPx,
            widthPx: prev.widthPx,
          };

          return {
            ...prev,
            proposed,
            isValid,
            invalidReason,
          };
        });
      };

      const onUp = (ev: PointerEvent) => {
        setDrag((prev) => {
          if (prev.phase !== 'dragging' || prev.pointerId !== pointerId) return prev;
          if (prev.isValid) {
            onDropValid(prev.sessionId, prev.proposed.startIso);
          }
          return { phase: 'idle' };
        });

        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);

      setDrag({
        phase: 'dragging',
        sessionId,
        pointerId,
        pointerStartY: e.clientY,
        originStartIso: session.startIso,
        originEndIso: session.endIso,
        originTopPx,
        originLeftPx,
        widthPx: session.widthPx,
        heightPx: session.heightPx,
        proposed: {
          startIso: session.startIso,
          endIso: session.endIso,
          topPx: originTopPx,
          heightPx: session.heightPx,
          leftPx: originLeftPx,
          widthPx: session.widthPx,
        },
        isValid: true,
      });
    },
    [canDragSession, getSessionById, config.slotPx, config.slotMinutes, config.dayStartHour, config.dayEndHourExclusive, intervalsForDay, onDropValid],
  );

  return { drag, onSessionPointerDown, cancelDrag };
}

