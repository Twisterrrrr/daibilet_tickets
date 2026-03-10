# Партиционирование event_sessions

> План по RANGE-партиционированию таблицы `event_sessions` по `startsAt` (месяц).
> Приложение продолжает использовать `event_sessions`; swap — отдельный этап.

## Цель

- Ускорить запросы по `startsAt` (продажи, расписание) за счёт pruning партиций.
- Облегчить администрирование (удаление старых данных по партициям).
- Защитить от разрастания одной большой таблицы.

## Структура

| Таблица | Описание |
|---------|----------|
| `event_sessions` | Текущая таблица (без изменений), используется приложением |
| `event_sessions_partitioned` | Новая партиционированная таблица (scaffolding) |
| `event_sessions_YYYY_MM` | Партиции по месяцам (создаются функцией `create_event_sessions_partition`) |

## Этапы

### 1. Scaffolding (выполнено)

- Миграция `20260312120000_event_sessions_partitioned_scaffold`:
  - Создаёт `event_sessions_partitioned` `PARTITION BY RANGE ("startsAt")`
  - PK `(id, startsAt)`, UNIQUE `(eventId, startsAt)`, UNIQUE `(tcSessionId, startsAt)`
  - Начальные партиции: прошлые 6 мес + текущий + следующие 12 мес
  - Индексы и FK на родительскую таблицу
- Скрипт `scripts/ensure-event-sessions-partitions.ts`:
  - Предсоздание партиций для следующих 3 месяцев
  - Идемпотентный (IF NOT EXISTS)
  - Запуск: `pnpm --filter @daibilet/backend ensure-partitions` или cron 1‑го числа месяца

### 2. Перенос данных (будущее)

1. `INSERT INTO event_sessions_partitioned SELECT * FROM event_sessions` (батчами по месяцам).
2. Проверка целостности (счётчики, уникальность).
3. При необходимости — досинк до момента swap.

### 3. Swap (будущее)

1. Остановить запись новых сессий (краткое окно).
2. `RENAME TABLE event_sessions TO event_sessions_legacy`, `event_sessions_partitioned TO event_sessions`.
3. Обновить `event_session_stats` и `package_items` (FK на `event_sessions`) — если потребуется.
4. Настроить cron для `ensure-event-sessions-partitions.ts`.

### 4. Удаление legacy

После проверки: `DROP TABLE event_sessions_legacy`.

## Функция создания партиций

```sql
SELECT create_event_sessions_partition(
  'event_sessions_partitioned'::regclass,
  '2026-04-01'::date
);
```

Создаёт партицию `event_sessions_2026_04` для `startsAt IN ['2026-04-01', '2026-05-01')`.

## Связанные миграции

- `20260222_f2_partition_event_sessions` — функция `create_event_sessions_partition`
- `20260312120000_event_sessions_partitioned_scaffold` — таблица + начальные партиции
