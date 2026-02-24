# Деплой и инфраструктура

> Объединённый документ: staging/prod, low-memory, technical debt.

---

## 1. Staging и Production на одном VDS

**Структура:** `deploy/README.md` — отдельные prod/staging compose, изолированные сети.

| Окружение | Домены | БД / Redis | Платежи |
|-----------|--------|------------|---------|
| **Production** | daibilet.ru, admin.daibilet.ru | postgres_data, redis_data | YOOKASSA |
| **Staging** | staging.daibilet.ru, admin-staging.daibilet.ru | postgres_data_staging, redis_data_staging | STUB |

### DNS

A-записи: `staging.daibilet.ru`, `admin-staging.daibilet.ru` → IP сервера.

### SSL (Let's Encrypt)

```bash
sudo docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d daibilet.ru -d www.daibilet.ru -d admin.daibilet.ru \
  -d staging.daibilet.ru -d admin-staging.daibilet.ru \
  --email admin@daibilet.ru --agree-tos --non-interactive --expand
```

### Запуск

```bash
# Prod
docker compose -f docker-compose.prod.yml up -d --build

# Staging
docker compose -f docker-compose.staging.yml -p daibilet-staging up -d --build
```

---

## 2. Низкая RAM (4 ГБ)

### PostgreSQL

```yaml
command: postgres -c shared_buffers=512MB -c work_mem=16MB -c maintenance_work_mem=128MB
```

### Redis

```yaml
command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Swap на хосте

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. Технические долги (приоритеты)

| Файл | TODO | Приоритет |
|------|------|-----------|
| checkout.service.ts | Package + YooKassa (Trip Planner) | Критический |
| checkout.service.ts | Webhook: IP + подпись, payment.succeeded | Критический |
| Типизация | ~31 файл с `any` — type guards | Низкий |

### Миграции после коммита

```bash
cd packages/backend
npx prisma migrate deploy
npx prisma generate
```
