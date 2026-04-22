/** Значения slugStatus из batch approve preview (сервер). */
export function venueApprovePreviewSlugStatusLabel(slugStatus: string): string {
  const map: Record<string, string> = {
    FREE: 'slug свободен',
    COLLISION_WITH_ACTIVE: 'коллизия с активной площадкой',
    COLLISION_WITH_REJECTED: 'коллизия с отклонённой',
    COLLISION_WITH_MERGED: 'коллизия с объединённой',
    COLLISION_WITH_DRAFT: 'коллизия с другим черновиком',
    UNKNOWN: 'неизвестно',
  };
  return map[slugStatus] ?? slugStatus;
}

export function venueApprovePreviewItemStatusLabel(status: 'OK' | 'WARNING' | 'ERROR'): string {
  switch (status) {
    case 'OK':
      return 'Ок';
    case 'WARNING':
      return 'Предупреждение';
    case 'ERROR':
      return 'Ошибка';
    default:
      return status;
  }
}
