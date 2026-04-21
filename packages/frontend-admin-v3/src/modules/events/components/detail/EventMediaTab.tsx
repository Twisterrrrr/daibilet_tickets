import { adminApi, uploadAdminImage } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AdminEventDetail } from '@/modules/events/api/detail';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import * as React from 'react';

export function EventMediaTab({
  eventId,
  detail,
}: {
  eventId: string;
  detail: AdminEventDetail;
}) {
  const qc = useQueryClient();
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);

  const ms = detail.mediaSummary;
  const cover = detail.override?.imageUrl ?? detail.imageUrl ?? null;
  const gallery = Array.isArray(detail.galleryUrls) ? detail.galleryUrls : [];

  const patchM = useMutation({
    mutationFn: (body: { imageUrl?: string; galleryUrls?: string[] }) =>
      adminApi.patch<{ ok: boolean }>(`/admin/events/${eventId}/media`, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-event', eventId] });
      await qc.invalidateQueries({ queryKey: ['admin-event-summary', eventId] });
      await qc.invalidateQueries({ queryKey: ['admin-events'] });
    },
  });

  const [uploadKind, setUploadKind] = React.useState<'cover' | 'gallery' | null>(null);

  const onPickCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadKind('cover');
    try {
      const { url } = await uploadAdminImage(file);
      await patchM.mutateAsync({ imageUrl: url });
    } finally {
      setUploadKind(null);
    }
  };

  const onPickGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files?.length) return;
    setUploadKind('gallery');
    try {
      const urls: string[] = [...gallery];
      for (const file of Array.from(files)) {
        const { url } = await uploadAdminImage(file);
        if (!urls.includes(url)) urls.push(url);
      }
      await patchM.mutateAsync({ galleryUrls: urls });
    } finally {
      setUploadKind(null);
    }
  };

  const removeGalleryUrl = async (url: string) => {
    await patchM.mutateAsync({ galleryUrls: gallery.filter((u) => u !== url) });
  };

  const clearCover = async () => {
    if (!confirm('Сбросить обложку редактора? Будет показана обложка из источника (если есть).')) return;
    await patchM.mutateAsync({ imageUrl: '' });
  };

  const busy = uploadKind !== null || patchM.isPending;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">Обложка</div>
          <Badge variant={ms?.hasCover ? 'success' : 'warning'}>{ms?.hasCover ? 'есть' : 'нет обложки'}</Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Загрузка сохраняет файл в хранилище и записывает URL в слой редактора (override).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickCover} />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => coverInputRef.current?.click()}
          >
            {uploadKind === 'cover' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            Загрузить обложку
          </Button>
          {detail.override?.imageUrl ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void clearCover()}>
              Сбросить override
            </Button>
          ) : null}
        </div>
        {patchM.isError ? (
          <div className="mt-2 text-sm text-destructive">
            {patchM.error instanceof Error ? patchM.error.message : 'Ошибка сохранения'}
          </div>
        ) : null}
        {cover ? (
          <div className="mt-4">
            <img src={cover} alt="" className="max-h-56 w-full rounded-md border object-cover" />
          </div>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">Обложка не задана (проверьте override или источник).</div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">Галерея</div>
          <span className="text-sm text-muted-foreground">
            Изображений: <span className="tabular-nums text-foreground">{gallery.length}</span>
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Можно выбрать несколько файлов за раз. URL хранятся в событии (галерея витрины).
        </p>
        <div className="mt-3">
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={onPickGallery}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => galleryInputRef.current?.click()}
          >
            {uploadKind === 'gallery' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            Добавить в галерею
          </Button>
        </div>
        {gallery.length ? (
          <ul className="mt-4 space-y-2">
            {gallery.map((url) => (
              <li
                key={url}
                className="flex items-start gap-3 rounded-md border bg-muted/20 p-2"
              >
                <img src={url} alt="" className="h-16 w-20 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="break-all font-mono text-[0.65rem] text-muted-foreground">{url}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-8 px-2 text-destructive"
                    disabled={busy}
                    onClick={() => void removeGalleryUrl(url)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Убрать
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">Нет изображений в галерее</div>
        )}
      </div>
    </div>
  );
}
