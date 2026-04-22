# -*- coding: utf-8 -*-
"""Собирает schema.prisma после catalog foundation reset (одноразовый скрипт)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
# Исходник для нарезки — зафиксированный бэкап до reset (не текущий schema.prisma)
SRC = ROOT / "schema.prisma.pre-catalog-foundation-bak"
OUT = ROOT / "schema.prisma"

if not SRC.exists():
    raise SystemExit(f"Missing {SRC.name} — сохраните бэкап старой схемы под этим именем.")

L = SRC.read_text(encoding="utf-8").splitlines(True)


def seg(a: int, b: int) -> str:
    """1-based inclusive line numbers."""
    return "".join(L[a - 1 : b])


# Новые enums (замена строк 15–335) + сохранённые служебные
ENUMS = r'''// ========================
// Enums
// ========================

enum AdminRole {
  ADMIN
  EDITOR
  VIEWER
}

enum SupplierRole {
  OWNER
  MANAGER
  CONTENT
  ACCOUNTANT
}

enum OperatorStatus {
  ACTIVE
  ARCHIVED
  SUSPENDED
}

enum CheckoutStatus {
  STARTED
  VALIDATED
  REDIRECTED
  PENDING_CONFIRMATION
  CONFIRMED
  AWAITING_PAYMENT
  COMPLETED
  EXPIRED
  CANCELLED
}

// --- Catalog foundation (sellable core) ---

enum PublishStatus {
  DRAFT
  REVIEW
  PUBLISHED
  ARCHIVED
}

enum SourceType {
  MANUAL
  TICKETSCLOUD
  TEPLOHOD
  EXTERNAL_API
}

enum SessionOwnerKind {
  EVENT
  ADMISSION
}

enum OfferOwnerKind {
  EVENT
  ADMISSION
}

enum ProviderEntityKind {
  EVENT
  ADMISSION
  SESSION
  OFFER
  LOCATION
}

enum EventFormat {
  EXCURSION
  CRUISE
  CONCERT
  PERFORMANCE
  EXHIBITION_EVENT
  TOUR
  MASTER_CLASS
  FESTIVAL
  LECTURE
  OTHER
}

enum EventDateMode {
  ONE_TIME
  SCHEDULED
  OPEN_DATE
}

enum AdmissionType {
  MUSEUM_ENTRY
  EXHIBITION_ENTRY
  OBSERVATION_ENTRY
  PARK_ENTRY
  ATTRACTION_ENTRY
  COMPLEX_ENTRY
  OTHER
}

enum LocationKind {
  MUSEUM
  VENUE
  LANDMARK
  PIER
  PARK
  DISTRICT
  ROUTE_OBJECT
  OTHER
}

'''

CITY = r'''model City {
  id              String   @id @default(uuid()) @db.Uuid
  slug            String   @unique
  name            String
  description     String?  @db.Text
  heroImage       String?
  lat             Decimal? @db.Decimal(10, 7)
  lng             Decimal? @db.Decimal(10, 7)
  timezone        String   @default("Europe/Moscow")
  metaTitle       String?
  metaDescription String?  @db.Text
  isFeatured      Boolean  @default(false)
  isActive        Boolean  @default(true)
  version         Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  locations          Location[]
  events             Event[]
  admissionProducts AdmissionProduct[]

  hubForRegions Region[]     @relation("RegionHub")
  regionLinks   RegionCity[]

  @@map("cities")
}

'''

# Operator без legacy events/venues/offers/reviews/promoCodes; + каталог foundation
OPERATOR = r'''model Operator {
  id            String         @id @default(uuid()) @db.Uuid
  name          String
  slug          String         @unique
  logo          String?
  website       String?
  isActive      Boolean        @default(true)
  status        OperatorStatus @default(ACTIVE)
  archivedAt    DateTime?
  archiveReason String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  isSupplier               Boolean   @default(false)
  trustLevel               Int       @default(0)
  trustScore               Int       @default(0)
  trustProfileScore        Int       @default(0)
  trustCatalogScore        Int       @default(0)
  trustOperationsScore     Int       @default(0)
  trustReputationScore     Int       @default(0)
  trustStabilityScore      Int       @default(0)
  trustPenaltyScore        Int       @default(0)
  trustLastCalculatedAt    DateTime?
  trustManualOverrideLevel Int?
  trustManualOverrideScore Int?
  trustManualReason        String?   @db.Text
  trustManualExpiresAt     DateTime?
  commissionRate           Decimal   @default(0.25) @db.Decimal(5, 4)
  promoRate                Decimal?  @db.Decimal(5, 4)
  promoUntil               DateTime?
  yookassaAccountId        String?
  companyName              String?
  inn                      String?
  contactEmail             String?
  contactPhone             String?
  verifiedAt               DateTime?
  successfulSales          Int       @default(0)
  refundRate               Decimal   @default(0) @db.Decimal(5, 4)
  settlementMode           String?   @default("DIRECT")

  webhookUrl    String?
  webhookSecret String?

  defaultRefundPolicyText      String?   @db.Text
  defaultRefundPolicyUpdatedAt DateTime?

  paymentMode        PaymentMode @default(SINGLE_MERCHANT)
  agentSchemeEnabled Boolean     @default(false)
  splitEnabled       Boolean     @default(false)
  pspFeeMode         PspFeeMode  @default(PLATFORM_PAYS)

  locations          Location[]
  events             Event[]
  admissionProducts AdmissionProduct[]

  supplierUsers           SupplierUser[]
  apiKeys                 ApiKey[]
  supplierPayoutRequests  SupplierPayoutRequest[]

  supplierReports     SupplierReport[]
  supplierSettlements SupplierSettlement[]
  supplierDocuments   SupplierDocument[]
  supplierDisputes    SupplierDispute[]
  supplierDailyStats  SupplierDailyStat[]

  legalProfile SupplierLegalProfile?
  edoProfile   SupplierEdoProfile?

  supplierInvitations SupplierInvitation[]

  supplierTrustOverride SupplierTrustOverride?

  @@map("operators")
}

'''

import re

_frag = (ROOT / "catalog-foundation.schema.fragment.prisma").read_text(encoding="utf-8")
# Только модели (без enum — они задаются выше один раз)
_m = re.search(
    r"(/// Хаб / площадка[\s\S]+?@@map\(\"provider_links\"\)\s*\})",
    _frag,
)
if not _m:
    _m = re.search(
        r"(model Location \{[\s\S]+?@@map\(\"provider_links\"\)\s*\})",
        _frag,
    )
if not _m:
    raise SystemExit("Could not extract foundation models from fragment")
FOUNDATION_CORE = _m.group(1).strip() + "\n"

PRICING_BLOCK = seg(1399, 1447)

# CheckoutSession: убрать orderRequests и externalOrderLinks
checkout_raw = seg(2276, 2315)
checkout_raw = checkout_raw.replace(
    "  orderRequests                  OrderRequest[]\n", ""
).replace(
    "  externalOrderLinks             ExternalOrderLink[]\n", ""
)

out: list[str] = []
out.append(seg(1, 14))  # header
out.append(ENUMS)
out.append(seg(337, 409))  # Admin User Audit
out.append("\n")
out.append(CITY)
out.append(seg(449, 480))  # Region + RegionCity
out.append("\n")
out.append("// Ticket provider / B2B integrations\n")
out.append(seg(483, 564))
out.append("\n")
out.append(seg(844, 877))  # ProviderWebhookLog + ProviderAccountConfig
out.append("\n")
out.append(OPERATOR)
out.append("\n")
out.append(FOUNDATION_CORE)
out.append("\n")
out.append(PRICING_BLOCK)
out.append("\n")
out.append(seg(1872, 2005))  # SupplierTrustOverride .. SupplierInvitation
out.append("\n")
out.append(checkout_raw)
out.append(seg(2317, 2351))  # LastCustomer + GiftCertificate
out.append("\n")
out.append(seg(2386, 2829))  # PaymentIntent .. Support (до source category)
out.append("\n")
out.append(seg(2862, 3335))  # SupplierLedger .. Notification

text = "".join(out)
OUT.write_text(text, encoding="utf-8")
print("Wrote", OUT, "lines:", len(text.splitlines()))
