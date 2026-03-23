import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EventWizard, type EventWizardDraft, PageHeader } from '@daibilet/shared-ui';

import {
  buildDraftFromSupplierEvent,
  buildTicketsFromOffers,
  buildScheduleFromSessions,
  diffOffers,
  diffSessions,
  mapDraftToSupplierCreatePayload,
  mapDraftTiersToSupplierOffers,
} from '../../adapters/supplier-event-wizard.adapter';
import { api } from '../../lib/api';
import { ImageUploadInput } from '../../components/ImageUploadInput';

export default function EventEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const [_loading, setLoading] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  const [wizardDraft, setWizardDraft] = useState<EventWizardDraft | null>(null);
  const [originalOffers, setOriginalOffers] = useState<any[]>([]);
  const [originalSessions, setOriginalSessions] = useState<any[]>([]);
  const [savingStage, setSavingStage] = useState<'idle' | 'event' | 'offers' | 'sessions' | 'done'>('idle');
  const isSaving = savingStage !== 'idle' && savingStage !== 'done';

  useEffect(() => {
    api
      .get<any>('/cities')
      .then((res) => setCities(res.items ?? res ?? []))
      .catch(() => setCities([]));

    if (id) {
      (async () => {
        try {
          const [event, offers, sessions] = await Promise.all([
            api.get<any>(`/supplier/events/${id}`),
            api.get<any[]>(`/supplier/events/${id}/offers`),
            api.get<any[]>(`/supplier/events/${id}/sessions`),
          ]);

          setOriginalOffers(offers);
          setOriginalSessions(sessions);
          setWizardDraft({
            ...buildDraftFromSupplierEvent(event),
            tickets: buildTicketsFromOffers(offers),
            schedule: buildScheduleFromSessions(sessions),
          });
        } catch (err) {
          console.error(err);
          toast.error('Не удалось загрузить событие');
          navigate('/events');
        }
      })();
    } else {
      // Новый черновик для мастера создания события
      setWizardDraft({
        mode: 'create',
        eventId: null,
        basics: {
          title: '',
          slug: '',
          category: 'EXCURSION',
          cityId: '',
          venueId: null,
          supplierId: null,
          shortDescription: '',
          fullDescription: '',
          coverImageUrl: '',
          gallery: [],
        },
        schedule: {
          mode: 'single',
          timezone: 'Europe/Moscow',
          startsAtList: [],
          recurrenceRule: null,
          exceptions: {
            removedStartsAt: [],
            movedStartsAt: [],
          },
          salesPolicy: {
            stopSalesBeforeMinutes: null,
            salesStartAt: null,
            salesEndAt: null,
          },
        },
        tickets: {
          tiers: [],
          pricingMode: 'fixed',
          serviceFeeMode: 'included',
          currency: 'RUB',
        },
        capacity: {
          eventCapacity: null,
          perSessionCapacityEnabled: false,
          oversellAllowed: false,
          holdTimeoutMinutes: null,
        },
        publishing: {
          status: 'draft',
          visibility: 'hidden',
          moderationNotes: '',
        },
        sourceMeta: {
          sourceType: 'native',
          externalId: null,
          lockedFields: [],
        },
      });
    }
  }, [id, navigate]);

  const handleWizardSubmit = async (
    draft: EventWizardDraft,
    _options?: { action?: 'create' | 'saveDraft' | 'update' },
  ) => {
    if (!draft.basics.title.trim()) {
      toast.error('Введите название события');
      return;
    }
    if (!draft.basics.cityId) {
      toast.error('Выберите город');
      return;
    }
    setLoading(true);

    // Создание нового события
    if (!id) {
      try {
        const createPayload = mapDraftToSupplierCreatePayload(draft);
        const event = await api.post<{ id: string }>('/supplier/events', createPayload);

        const offerPayloads = mapDraftTiersToSupplierOffers(draft);
        for (const offer of offerPayloads) {
          await api.post(`/supplier/events/${event.id}/offers`, offer);
        }

        toast.success('Событие создано!');
        navigate('/events');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Ошибка создания');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Редактирование существующего события
    setSavingStage('event');
    try {
      const basePayload = mapDraftToSupplierCreatePayload(draft);
      // cityId в режиме edit не меняем через ЛК
      const { cityId: _ignore, ...updatePayload } = basePayload;

      await api.put(`/supplier/events/${id}`, updatePayload);

      // Дифф по офферам
      setSavingStage('offers');
      const diff = diffOffers(originalOffers, draft);

      // Порядок: DELETE → UPDATE → CREATE
      for (const offerId of diff.toDelete) {
        await api.del(`/supplier/events/${id}/offers/${offerId}`);
      }

      for (const { id: offerId, payload } of diff.toUpdate) {
        await api.put(`/supplier/events/${id}/offers/${offerId}`, payload);
      }

      for (const payload of diff.toCreate) {
        await api.post(`/supplier/events/${id}/offers`, payload);
      }

      // Синхронизация расписания (Layer 3)
      setSavingStage('sessions');
      const sessionsPayload = diffSessions(originalSessions, draft);
      const updatedSessions = await api.put<any[]>(`/supplier/events/${id}/sessions`, sessionsPayload);
      setOriginalSessions(updatedSessions);

      setSavingStage('done');
      toast.success('Событие сохранено');
      navigate('/events');
    } catch (err: unknown) {
      console.error(err);
      setSavingStage('idle');
      toast.error(err instanceof Error ? err.message : 'Не удалось сохранить изменения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={isNew ? 'Новое событие' : 'Редактирование события'} />

      {wizardDraft && (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-xs text-slate-600">
            Новый мастер создания события. Основные шаги: базовая информация, расписание, билеты, вместимость и
            публикация. Тарифы и продвинутая настройка по‑прежнему доступны через админский интерфейс.
          </p>

          <EventWizard
            initialDraft={wizardDraft}
            mode={isNew ? 'create' : 'edit'}
            onDraftChange={setWizardDraft}
            onSubmit={(d: EventWizardDraft, opts) => handleWizardSubmit(d, opts)}
            citiesOptions={cities.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
            stepOrderOverride={isNew ? undefined : ['basics']}
          />

          <div className="mt-4 space-y-4">
            <ImageUploadInput
              label="Обложка события"
              value={wizardDraft.basics.coverImageUrl}
              onChange={(url) =>
                setWizardDraft({
                  ...wizardDraft,
                  basics: { ...wizardDraft.basics, coverImageUrl: url },
                })
              }
              helperText="Файл будет загружен и URL автоматически подставится в обложку."
            />
            {isSaving && (
              <p className="text-xs text-slate-500">
                {savingStage === 'event' && 'Обновляем карточку события…'}
                {savingStage === 'offers' && 'Синхронизируем билеты…'}
                {savingStage === 'sessions' && 'Синхронизируем расписание…'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
