# E3 — PgBouncer (опционально)

Ограничение соединений к Postgres при высокой нагрузке (SSR + админка + workers).

## Параметры пула

- **pool_mode**: transaction
- **max_client_conn**: 200
- **default_pool_size**: 20
- **min_pool_size**: 5

## Включение

1. Добавить в `docker-compose.prod.yml` сервис pgbouncer (см. `infra/pgbouncer/`).
2. Backend: `DATABASE_URL=postgresql://user:pass@pgbouncer:6432/daibilet`
3. Backend depends_on: pgbouncer вместо postgres (для healthcheck).

## Конфиг

`infra/pgbouncer/pgbouncer.ini` — базовая конфигурация.

## Healthcheck

PgBouncer: `psql -h localhost -p 6432 -U daibilet -d daibilet -c 'SELECT 1'`
