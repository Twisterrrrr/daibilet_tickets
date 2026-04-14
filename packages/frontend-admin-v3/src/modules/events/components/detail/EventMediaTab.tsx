import { Badge } from '@/components/ui/badge';
import type { AdminEventDetail } from '@/modules/events/api/detail';

export function EventMediaTab({ detail }: { detail: AdminEventDetail }) {
  const ms = detail.mediaSummary;
  const cover = detail.override?.imageUrl ?? detail.imageUrl ?? null;
  const gallery = Array.isArray(detail.galleryUrls) ? detail.galleryUrls : [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-5">
        <div className="text-sm font-medium">Обложка</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={ms?.hasCover ? 'success' : 'warning'}>
            {ms?.hasCover ? 'есть' : 'нет обложки'}
          </Badge>
        </div>
        {cover ? (
          <div className="mt-4">
            <img src={cover} alt="" className="max-h-56 w-full rounded-md border object-cover" />
          </div>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">Обложка не задана (проверьте override или источник).</div>
        )}
      </div>
      <div className="rounded-lg border bg-card p-5">
        <div className="text-sm font-medium">Галерея</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Изображений: <span className="tabular-nums text-foreground">{gallery.length}</span>
        </div>
        {gallery.length ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.slice(0, 9).map((url) => (
              <img key={url} src={url} alt="" className="h-24 w-full rounded border object-cover" />
            ))}
          </div>
        ) : (
          <div className="mt-4 text-sm text-muted-foreground">Нет изображений в галерее</div>
        )}
      </div>
    </div>
  );
}
