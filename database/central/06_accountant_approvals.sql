-- =============================================================================
-- Finatura Central — Mali müşavir onayları (opsiyonel iskelet)
-- Phase: 5.x accountant-bridge
-- Not: accountant-bridge varsayılan olarak JSON/bellek stub kullanır.
--      Bu şema ileride production persist için hazırdır.
-- =============================================================================

CREATE TYPE public.accountant_approval_status AS ENUM (
    'pending',
    'approved',
    'revoked'
);

CREATE TABLE IF NOT EXISTS public.accountant_access_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    code_hash       text NOT NULL,
    accountant_name text NOT NULL,
    is_active       boolean NOT NULL DEFAULT true,
    expires_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, code_hash)
);

COMMENT ON TABLE public.accountant_access_codes IS
    'Mali müşavir erişim kodları (hash). Uygulama stub kodları JSON store ile başlar.';

CREATE TABLE IF NOT EXISTS public.accountant_period_approvals (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    period           char(7) NOT NULL, -- YYYY-MM
    status           public.accountant_approval_status NOT NULL DEFAULT 'approved',
    include_invoices boolean NOT NULL DEFAULT true,
    include_bank     boolean NOT NULL DEFAULT true,
    invoice_ids      jsonb NOT NULL DEFAULT '[]'::jsonb,
    bank_ids         jsonb NOT NULL DEFAULT '[]'::jsonb,
    approved_by      text,
    approved_at      timestamptz NOT NULL DEFAULT now(),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, period)
);

COMMENT ON TABLE public.accountant_period_approvals IS
    'Dönem bazlı mali müşavir onayı; Luca XML dışa aktarım önkoşulu.';

CREATE INDEX IF NOT EXISTS idx_accountant_approvals_tenant_period
    ON public.accountant_period_approvals (tenant_id, period);

CREATE TABLE IF NOT EXISTS public.accountant_export_jobs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    approval_id  uuid REFERENCES public.accountant_period_approvals (id) ON DELETE SET NULL,
    period       char(7) NOT NULL,
    filename     text NOT NULL,
    fis_adedi    integer NOT NULL DEFAULT 0,
    dengeli      boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.accountant_export_jobs IS
    'Luca XML dışa aktarım denetim kaydı (opsiyonel).';
