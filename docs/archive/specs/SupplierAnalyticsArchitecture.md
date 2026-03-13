# Supplier Analytics Architecture (Phase 5)

> PaymentIntent (PAID) = source of truth для выручки. ReportsService уже есть.

## Goal
Supplier и Admin — отчёты: выручка, заказы, топ-события, тренды, export CSV.

## Existing
- supplier/reports/sales, reports/sales/export
- ReportsService: getSalesByOperatorDay, getSalesByEvent, getSessionOccupancy
- ReportsRepository
- streamCsv

## Source of Truth
PaymentIntent status=PAID, paidAt. OrderRequest — для заявок (count).

## Pre-Aggregation
MVP: on-read. LATER: supplier_daily_metrics (operatorId, date, ordersCount, grossKopecks) — cron daily.

## API (extend)
GET /supplier/reports/sales — есть
GET /supplier/reports/sales/export — есть
Extend: grouping by eventId, cityId; trends (week-over-week).

## Backend
Расширить ReportsRepository, ReportsService. Без новых таблиц в MVP.

## Frontend
Supplier: Analytics page (charts, export). Admin: reports by operator/city/category.

## Definition of Done
- Supplier строит отчёты, export CSV
- Admin сводная аналитика
- Trends (optional)
