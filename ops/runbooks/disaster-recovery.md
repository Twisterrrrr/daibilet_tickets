# Runbook: Disaster Recovery — восстановление из бэкапа

## Симптом

Потеря данных, нерабочая БД, необходимость отката на staging/prod.

## Проверки

1. **Последний бэкап:** `scripts/backup.sh` — когда последний раз запускался?
2. **Архив:** где лежат дампы (локально, S3, Timeweb snapshot)?
3. **Staging:** есть ли отдельный инстанс для проверки restore

## Диагностика

- Размер дампа, дата
- Целевая БД (staging/prod) — чистая или с данными?

## Действия

1. **Запуск restore на staging:**
   ```bash
   ./scripts/restore-to-staging.sh [путь-к-дампу]
   ```
2. **После restore:**
   - `pnpm prisma migrate deploy` (если нужно)
   - Health check: `GET /api/v1/health`
   - Smoke: поиск заказа, каталог
3. **Prod restore:** только по решению ответственного, с downtime

## Monthly restore drill

- [ ] Выполнять раз в месяц на staging
- [ ] Проверить: migrations ok, health ok, search order ok
- [ ] Зафиксировать время восстановления

## Эскалация

- Restore падает с ошибкой
- Данные после restore некорректны
- Нет актуального бэкапа
