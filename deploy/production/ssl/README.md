# SSL-сертификаты (Timeweb Pro + Let's Encrypt)

**Основной домен** — Timeweb Pro (main/)  
**Поддомены** — Let's Encrypt (subdomains/)

## Быстрый старт

```bash
# На сервере: первичная настройка
bash scripts/setup-ssl-production.sh
```

## Структура

```
deploy/production/ssl/
├── main/           # daibilet.ru, www.daibilet.ru (Timeweb Pro)
│   ├── fullchain.pem
│   └── privkey.pem
├── subdomains/     # admin, api, supplier (Let's Encrypt)
│   ├── fullchain.pem
│   └── privkey.pem
└── letsencrypt/    # certbot storage (для renewal)
```

## Автомиграция при deploy

Deploy ищет main cert в: `ssl/`, Docker volume `daibilet_certbot_conf`, `deploy/nginx/certbot/conf/live/`, `deploy/nginx/certbot/www/`  
Subdomains: fallback на main, или `ssl/letsencrypt/live/*/`

## Вручную

- **Timeweb Pro:** скачай CRT+KEY → `main/fullchain.pem`, `main/privkey.pem`
- **Let's Encrypt:** `bash scripts/setup-ssl-production.sh` или см. docs/Runbook-Production-SSL-Deploy.md
