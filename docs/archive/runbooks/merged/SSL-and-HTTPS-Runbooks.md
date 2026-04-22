# SSL / HTTPS runbooks (archive merged)

Назначение: собрать в одном месте исторические runbook’и по HTTPS для **staging** и SSL/deploy для **production**.

Важное: это архивные материалы. Актуальная эксплуатационная политика должна быть в `docs/runbooks/infra.md` (а эти документы — как reference).

---

## Состав (источники)

1) Staging HTTPS: `docs/archive/Runbook-Staging-HTTPS.md`  
2) Production SSL + deploy: `docs/archive/legacy-root/runbooks_old/Runbook-Production-SSL-Deploy.md`

---

## Когда какой документ читать

- **Нужно поднять/починить HTTPS на staging (certbot + nginx)** → `Runbook-Staging-HTTPS.md`
- **Прод падает из-за отсутствующих сертификатов / надо bootstrap + deploy + renewal** → `Runbook-Production-SSL-Deploy.md`

---

## Ссылки на источники

- `docs/archive/Runbook-Staging-HTTPS.md`
- `docs/archive/legacy-root/runbooks_old/Runbook-Production-SSL-Deploy.md`

