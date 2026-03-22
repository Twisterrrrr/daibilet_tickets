# SSL-сертификаты (Timeweb Pro, Let's Encrypt и др.)

Положи сюда:

- **fullchain.pem** — сертификат + цепочка
- **privkey.pem** — приватный ключ

## Timeweb Pro

Сертификат устанавливается через панель Timeweb. Скачай файлы из панели или скопируй с сервера (если Timeweb положил их в свой каталог) в эту папку.

## Let's Encrypt

```bash
# После certbot — симлинк или копирование
cp /etc/letsencrypt/live/daibilet.ru/fullchain.pem ./
cp /etc/letsencrypt/live/daibilet.ru/privkey.pem ./
```
