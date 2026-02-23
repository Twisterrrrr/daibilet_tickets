# Настройки для сервера с ограниченной RAM (4 ГБ)

> Для MVP до апгрейда тарифа. Рекомендуется перейти на 8 ГБ RAM при росте нагрузки.

## 1. PostgreSQL — shared_buffers 512 МБ

Уже настроено в `docker-compose.prod.yml`:

```yaml
command: postgres -c shared_buffers=512MB -c work_mem=16MB -c maintenance_work_mem=128MB
```

- `shared_buffers=512MB` — буфер для данных в памяти
- `work_mem=16MB` — ограничение на сортировки/хеши
- `maintenance_work_mem=128MB` — для VACUUM, CREATE INDEX

**Если Postgres установлен без Docker** (на хосте):

```bash
# /etc/postgresql/16/main/postgresql.conf
shared_buffers = 512MB
work_mem = 16MB
maintenance_work_mem = 128MB
```

Затем: `sudo systemctl restart postgresql`

---

## 2. Redis — maxmemory 512 МБ

Уже настроено в `docker-compose.prod.yml`:

```yaml
command: >
  redis-server
  --requirepass ${REDIS_PASSWORD:-}
  --maxmemory 512mb
  --maxmemory-policy allkeys-lru
```

- `maxmemory 512mb` — лимит RAM для Redis
- `allkeys-lru` — вытеснение наименее используемых ключей при заполнении

**Если Redis без Docker:**

```bash
# /etc/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
```

Затем: `sudo systemctl restart redis`

---

## 3. Swap 1–2 ГБ на хост-сервере

Swap создаётся на хосте (Ubuntu), не в Docker.

### Вариант A: скрипт (рекомендуется)

```bash
sudo bash docs/deploy/swap-setup.sh
```

### Вариант B: вручную

```bash
# Создать swap 2 ГБ
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Сделать постоянным
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Проверить
swapon --show
free -h
```

### Опционально: swappiness

По умолчанию Linux активно использует swap (swappiness=60). Для снижения:

```bash
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

Тогда swap будет задействован только при нехватке RAM.

---

## Применение изменений Docker

После правок в `docker-compose.prod.yml`:

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

Для swap — запустить `swap-setup.sh` один раз на сервере.
