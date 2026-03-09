-- Manual sync: remove phantom migration records (no corresponding files in project)
DELETE FROM "_prisma_migrations"
WHERE "migration_name" IN (
  '20260222200000_add_supplier_event_fields',
  '20260222210000_supplier_enums_review_notes',
  '20260225000000_grouping_normalized_denylist',
  '20260226000000_add_grouping_indexes',
  '20260301120000_normalize_event_override_snake_case',
  '20260301200802_normalize_event_override_snake_case',
  '20260301210000_restore_query_filters_seo_templates',
  '20260301220000_event_overrides_back_to_camelcase',
  '20260212_audience'
);
