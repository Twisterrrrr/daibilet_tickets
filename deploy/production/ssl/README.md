# SSL-сертификаты (Timeweb Pro, Let's Encrypt и др.)

Используются **два набора сертификатов**:

> **Автомиграция при деплое:** deploy ищет сертификаты в `ssl/`, `deploy/nginx/certbot/conf/live/daibilet.ru/`, `deploy/nginx/certbot/www/` и копирует в `ssl/main/`.

1. **main/** — daibilet.ru, www.daibilet.ru  
2. **subdomains/** — admin.daibilet.ru, api.daibilet.ru, supplier.daibilet.ru  

## Структура

```
deploy/production/ssl/
├── main/
│   ├── fullchain.pem   # сертификат + цепочка
│   └── privkey.pem     # приватный ключ
└── subdomains/
    ├── fullchain.pem
    └── privkey.pem
```

## Получение сертификатов

### Timeweb Pro

1. В панели Timeweb создай **два** сертификата:
   - Один для daibilet.ru + www.daibilet.ru
   - Второй для admin.daibilet.ru, api.daibilet.ru, supplier.daibilet.ru (SAN или wildcard *.daibilet.ru)

2. Скачай CRT и Private KEY для каждого.

3. Разложи по папкам:
   - Сертификат основного сайта → `main/`
   - Сертификат поддоменов → `subdomains/`

### Let's Encrypt (certbot)

```bash
# Основной домен
certbot certonly --webroot -w /var/www/certbot -d daibilet.ru -d www.daibilet.ru
cp /etc/letsencrypt/live/daibilet.ru/fullchain.pem deploy/production/ssl/main/
cp /etc/letsencrypt/live/daibilet.ru/privkey.pem deploy/production/ssl/main/

# Поддомены (admin, api, supplier)
certbot certonly --webroot -w /var/www/certbot \
  -d admin.daibilet.ru -d api.daibilet.ru -d supplier.daibilet.ru
cp /etc/letsencrypt/live/admin.daibilet.ru/fullchain.pem deploy/production/ssl/subdomains/
cp /etc/letsencrypt/live/admin.daibilet.ru/privkey.pem deploy/production/ssl/subdomains/
```

Файл CRT от Timeweb уже содержит цепочку — сохраняй как `fullchain.pem`.
