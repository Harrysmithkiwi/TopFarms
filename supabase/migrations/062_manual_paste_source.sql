-- 062: allow the 'manual_paste' lead source (Leads v2 screenshot / manual drop-in).
-- A screenshot or pasted listing found off-Facebook (Seek, TradeMe, a website)
-- shouldn't be mislabelled fb_manual_capture, so it gets its own source. The
-- lead-intake ALLOWED_SOURCES allowlist + SOURCE_LABELS gained it in the same PR.

ALTER TABLE public.lead_staging DROP CONSTRAINT IF EXISTS lead_staging_source_check;
ALTER TABLE public.lead_staging ADD CONSTRAINT lead_staging_source_check
  CHECK (source = ANY (ARRAY['seek','trademe','fb_own_group','fb_manual_capture','manual_paste','nzfarmingjobs']));

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check
  CHECK (source = ANY (ARRAY['seek','trademe','fb_own_group','fb_manual_capture','manual_paste','nzfarmingjobs']));
