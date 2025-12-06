-- Migration: Remove pdf_logo_url from store_content
-- Description: Removes the global PDF logo URL field as logos are now managed per-template via the asset library

-- Drop the pdf_logo_url column from store_content table
ALTER TABLE store_content
  DROP COLUMN IF EXISTS pdf_logo_url;
