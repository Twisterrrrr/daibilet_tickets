import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { EventWizard, type EventWizardDraft, mapDraftToCreatePayload } from '@daibilet/shared-ui';

import { adminApi } from '@/api/client';
import { Button } from '@/components/ui/button';

interface CityOption {
  id: string;
  slug: string;
  name: string;
}

export function EventCreatePage() {
  const navigate = useNavigate();
  const [cities, setCities] = useState<CityOption[]>([]);

  useEffect(() => {
    adminApi
      .get<any>('/admin/cities')
      .then((res: any) => {
        const list = res.items || res;
        setCities(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        console.error('Load cities failed:', e);
      });
  }, []);

  const initialDraft: EventWizardDraft = {
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
  };

  const handleSubmit = async (draft: EventWizardDraft, options?: { action?: 'create' | 'saveDraft' | 'update' }) => {
    if (!draft.basics.title.trim()) {
      toast.error('Введите название события');
      return;
    }

    if (!draft.basics.cityId) {
      toast.error('Выберите город');
      return;
    }

    try {
      const payload = mapDraftToCreatePayload(draft);
      const result = await adminApi.post<{ event: { id: string } }>('/admin/events', payload);
      toast.success(options?.action === 'saveDraft' ? 'Черновик сохранён' : 'Событие создано');
      navigate(`/events/${result.event.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка создания');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="mb-2 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Создать событие</h1>
          <p className="text-sm text-muted-foreground">
            Мастер создания события: контент, расписание, билеты, вместимость и публикация.
          </p>
        </div>
      </div>

      <EventWizard
        initialDraft={initialDraft}
        mode="create"
        onSubmit={handleSubmit}
        citiesOptions={cities.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}

