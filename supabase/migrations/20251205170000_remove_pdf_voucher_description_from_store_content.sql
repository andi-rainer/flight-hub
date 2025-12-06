-- Remove pdf_voucher_description fields from store_content
-- These fields are no longer used in CMS as voucher name/description/features
-- now come directly from voucher_types/ticket_types

ALTER TABLE store_content
  DROP COLUMN IF EXISTS pdf_voucher_description,
  DROP COLUMN IF EXISTS pdf_voucher_description_de;
