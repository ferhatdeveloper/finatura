-- =============================================================================
-- bank_transactions.match_suggestions — matching agent öneri kolonu
-- Önkoşul: 01_schema.sql
-- =============================================================================

ALTER TABLE public.bank_transactions
    ADD COLUMN IF NOT EXISTS match_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.bank_transactions.match_suggestions IS
    'Matching agent öneri listesi (score, confidence, candidateId, breakdown). '
    'UI onayına kadar match_status unmatched kalır.';

CREATE INDEX IF NOT EXISTS bank_transactions_match_suggestions_gin_idx
    ON public.bank_transactions USING gin (match_suggestions)
    WHERE deleted_at IS NULL;
