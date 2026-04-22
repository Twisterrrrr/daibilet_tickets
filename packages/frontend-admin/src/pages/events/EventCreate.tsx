import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  EventWizard,
  PageHeader,
  type EventWizardDraft,
  type EventWizardLocationOption,
  mapDraftToCreatePayload,
} from '@daibilet/shared-ui';

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
  const [locationsForCity, setLocationsForCity] = useState<EventWizardLocationOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const lastLoadedCityIdRef = useRef<string>('');

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

  const loadLocationsForCity = useCallback((cityId: string) => {
    if (!cityId) {
      setLocationsForCity([]);
      setLocationsLoading(false);
      return;
    }
    const requested = cityId;
    setLocationsLoading(true);
    adminApi
      .get<{ items?: EventWizardLocationOption[] }>(
        `/admin/locations?cityId=${encodeURIComponent(cityId)}`,
      )
      .then((res) => {
        if (lastLoadedCityIdRef.current !== requested) return;
        const list = res.items;
        setLocationsForCity(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (lastLoadedCityIdRef.current === requested) {
          setLocationsForCity([]);
        }
      })
      .finally(() => {
        if (lastLoadedCityIdRef.current === requested) {
          setLocationsLoading(false);
        }
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
      locationChoice: 'existing',
      startLocationId: '',
      locationProposalTitle: '',
      locationProposalAddress: '',
      locationProposalType: '',
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
      <PageHeader
        title="Создать событие"
        subtitle="Мастер создания события: контент, расписание, билеты, вместимость и публикация."
        actions={
          <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <EventWizard
        initialDraft={initialDraft}
        mode="create"
        onSubmit={handleSubmit}
        citiesOptions={cities.map((c) => ({ id: c.id, name: c.name }))}
        locationsForCity={locationsForCity}
        locationsLoading={locationsLoading}
        onDraftChange={(d) => {
          const cid = d.basics.cityId;
          if (cid !== lastLoadedCityIdRef.current) {
            lastLoadedCityIdRef.current = cid;
            loadLocationsForCity(cid);
          }
        }}
      />
    </div>
  );
}

