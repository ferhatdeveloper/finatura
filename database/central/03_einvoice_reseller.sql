-- =============================================================================
-- Finatura Central — Bayilik / e-fatura entegratör + reseller kataloğu genişlemesi
-- Database: finatura_central
-- Önkoşul: 01_schema.sql, 02_seed_plans.sql
-- =============================================================================
--
-- Model:
--   Finatura, entegratörden (EDM / Uyumsoft / FIT / eLogo / QNB / NES /
--   Nilvera / İzibiz) toplu kontör alır ve müşteri tenant'lara paket olarak
--   satar. Kullanımda (e-fatura gönderimi / OCR) ledger debit düşer. Tenant
--   başına hangi entegratörün aktif olduğu bu tabloda tutulur
--   (credentials uygulama/KMS ile şifreli).
--
-- Not: Kontör bakiyesi hâlâ tek havuz (tenant_kontor_balances). Paket cinsi
-- ayrımı ledger.reference_type ile yapılır (payment_efatura_kontor vb.).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Entegratör kodları
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'einvoice_provider_code' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.einvoice_provider_code AS ENUM (
            'edm',
            'uyumsoft',
            'fit',
            'elogo',
            'qnb',
            'nes',
            'nilvera',
            'izibiz'
        );
    END IF;
END
$$;

COMMENT ON TYPE public.einvoice_provider_code IS
    'Finatura bayilikinde desteklenen e-fatura entegratörleri (8 iskelet: edm, uyumsoft, fit, elogo, qnb, nes, nilvera, izibiz).';

-- -----------------------------------------------------------------------------
-- Tenant → aktif entegratör yapılandırması
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_einvoice_providers (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    provider                public.einvoice_provider_code NOT NULL,
    -- Aynı anda birden fazla kayıt olabilir (geçiş / yedek); gönderimde primary kullanılır
    is_primary              boolean NOT NULL DEFAULT false,
    is_active               boolean NOT NULL DEFAULT true,
    -- Entegratör hesap / şube kodu (düz metin güvenli alanlar)
    merchant_code           text,
    branch_code             text,
    -- API kullanıcı / şifre / token — yalnızca ciphertext
    credentials_ciphertext  text,
    encryption_key_id       text,
    -- Ortam: test | production
    environment             text NOT NULL DEFAULT 'test',
    -- Esnek alanlar: kontör stok uyarı eşiği, sağlayıcı özel alanlar
    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
    activated_at            timestamptz,
    deactivated_at          timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now(),
    deleted_at              timestamptz,

    CONSTRAINT tenant_einvoice_providers_environment CHECK (
        environment IN ('test', 'production')
    ),
    CONSTRAINT tenant_einvoice_providers_credentials_pair CHECK (
        (credentials_ciphertext IS NULL AND encryption_key_id IS NULL)
        OR (credentials_ciphertext IS NOT NULL AND encryption_key_id IS NOT NULL)
    )
);

-- Tenant başına tek birincil aktif sağlayıcı
CREATE UNIQUE INDEX IF NOT EXISTS tenant_einvoice_providers_primary_uidx
    ON public.tenant_einvoice_providers (tenant_id)
    WHERE is_primary = true AND is_active = true AND deleted_at IS NULL;

-- Aynı tenant + provider için tek aktif satır
CREATE UNIQUE INDEX IF NOT EXISTS tenant_einvoice_providers_tenant_provider_uidx
    ON public.tenant_einvoice_providers (tenant_id, provider)
    WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS tenant_einvoice_providers_tenant_id_idx
    ON public.tenant_einvoice_providers (tenant_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS tenant_einvoice_providers_provider_idx
    ON public.tenant_einvoice_providers (provider)
    WHERE deleted_at IS NULL AND is_active = true;

COMMENT ON TABLE public.tenant_einvoice_providers IS
    'Tenant e-fatura entegratör seçimi ve bağlantı meta bilgisi (Finatura bayilik).';
COMMENT ON COLUMN public.tenant_einvoice_providers.credentials_ciphertext IS
    'Entegratör API kimlik bilgileri; düz metin yazılmaz.';
COMMENT ON COLUMN public.tenant_einvoice_providers.is_primary IS
    'Gönderimde kullanılacak varsayılan entegratör.';
COMMENT ON COLUMN public.tenant_einvoice_providers.metadata IS
    'Sağlayıcı özel alanlar (JSON); şema sık değişen özellikler için.';

-- updated_at tetikleyicisi
DROP TRIGGER IF EXISTS tenant_einvoice_providers_set_updated_at
    ON public.tenant_einvoice_providers;

CREATE TRIGGER tenant_einvoice_providers_set_updated_at
    BEFORE UPDATE ON public.tenant_einvoice_providers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Görünüm: aktif birincil entegratör (secret hariç)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_tenant_einvoice_primary AS
SELECT
    t.id            AS tenant_id,
    t.slug,
    t.display_name,
    tep.id          AS config_id,
    tep.provider,
    tep.environment,
    tep.merchant_code,
    tep.branch_code,
    tep.is_active,
    tep.is_primary,
    tep.activated_at,
    tep.metadata
FROM public.tenants t
JOIN public.tenant_einvoice_providers tep
    ON tep.tenant_id = t.id
   AND tep.is_primary = true
   AND tep.is_active = true
   AND tep.deleted_at IS NULL
WHERE t.deleted_at IS NULL;

COMMENT ON VIEW public.v_tenant_einvoice_primary IS
    'Tenant birincil e-fatura entegratörü (credentials yok). Router / billing için.';

-- -----------------------------------------------------------------------------
-- Reseller paket seed notu
-- -----------------------------------------------------------------------------
-- Satın alınabilir paket kataloğu billing-agent içinde tutulur:
--   services/billing-agent/src/payment/packages.ts
-- Türler: topup | plan | efatura_kontor | ocr_kontor | mixed
-- Ödeme sonrası ledger credit reference_type:
--   payment_topup | payment_efatura_kontor | payment_ocr_kontor | payment_mixed_kontor
-- Kullanım debit:
--   efatura_send | ocr_sozlesme | ocr_kimlik | ocr_tapu
