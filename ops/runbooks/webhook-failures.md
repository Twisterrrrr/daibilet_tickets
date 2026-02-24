# Runbook: Сбои webhook (YooKassa, TC, Partner)

## Симптом

Webhook не обрабатывается, приходят повторные уведомления, провайдер сообщает об ошибках доставки.

## Проверки

1. **Admin → Reconciliation → Webhooks:** статистика (received, duplicates, errors)
2. **Логи:** `[provider=YOOKASSA]`, `YooKassa webhook rejected`, `invalid payload`
3. **IP whitelist:** YooKassa IP в разрешённых? (PaymentService.YOOKASSA_IPS)
4. **ProcessedWebhookEvent:** дубликаты пропускаются (идемпотентность)

## Диагностика

- **403 / Rejected:** неверный IP, неверная подпись
- **500:** ошибка в handler — смотреть stack, Failed jobs
- **Дубликаты:** нормально, возвращаем 200 и не обрабатываем повторно

## Действия в админке

1. **Проверить IP:** добавить актуальные диапазоны YooKassa в whitelist
2. **Retry от провайдера:** YooKassa повторяет webhook; при 200 больше не шлёт
3. **Failed job:** Admin → Jobs → Retry для `yookassa-webhook` (если job создался, но упал)
4. **Ручной markPaid:** если webhook не дойдёт — через admin endpoint (если есть)

## Эскалация

- Webhook постоянно отклоняется (подпись, формат)
- Нужно менять URL webhook у провайдера
- Массовый сбой доставки
