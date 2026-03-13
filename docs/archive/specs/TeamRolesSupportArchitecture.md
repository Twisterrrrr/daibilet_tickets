# Team / Roles / Support Architecture (Phase 9)

> SupplierUser, SupplierRole существуют. Extend: invitations, RBAC, support link, audit.

## Goal
Мультипользователь, приглашения, роли. Support связь. Backward compatible с одним owner.

## SupplierInvitation Model
- email, operatorId, role, token, expiresAt
- acceptedAt?, acceptedBy?

## API
- POST /supplier/invitations { email, role }
- GET /supplier/invitations
- POST /supplier/invitations/:token/accept

## RBAC Permissions
| Role     | Events | Orders | Reports | Settings | Invitations |
|----------|--------|--------|---------|----------|-------------|
| OWNER    | CRUD   | CRUD   | R       | CRUD     | CRUD        |
| MANAGER  | CRUD   | CRUD   | R       | R        | —           |
| CONTENT  | CRUD   | R      | R       | —        | —           |
| ACCOUNTANT| R     | R      | R       | —        | —           |

## Support
SupportTicket.orderCode — связь с CheckoutSession. Admin видит ticket↔order. Supplier: список своих тикетов (по operatorId через order/session).

## Audit
AuditLog или SupplierActionLog: entity, entityId, actorType=SupplierUser, action, createdAt.

## Definition of Done
- SupplierInvitation CRUD
- Invite flow (email → token → accept)
- RBAC проверки по всем endpoints
- Support link order↔ticket
