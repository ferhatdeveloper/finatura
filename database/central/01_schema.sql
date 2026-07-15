-- =============================================================================
-- Finatura Central Database Schema
-- Database: finatura_central
-- Purpose: Multi-tenant SaaS membership, sektors, kontör/subscriptions,
--          and secure references to isolated tenant PostgreSQL databases.
-- Phase: 1.1
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.sector_code AS ENUM (
    'oto_galeri',
    'kuyumculuk',
    'emlak'
);

CREATE TYPE public.tenant_status AS ENUM (
    'pending',      -- kayıt alındı, DB henüz provision edilmedi
    'provisioning', -- tenant DB oluşturuluyor
    'active',
    'suspended',    -- ödeme / kontör / idari neden
    'cancelled'
);

CREATE TYPE public.subscription_status AS ENUM (
    'trial',
    'active',
    'past_due',
    'cancelled',
    'expired'
);

CREATE TYPE public.kontor_ledger_type AS ENUM (
    'credit',   -- yükleme / hediye
    'debit',    -- kullanım düşümü
    'adjust',   -- manuel düzeltme
    'refund'
);

-- -----------------------------------------------------------------------------
-- Sectors (referans / katalog)
-- -----------------------------------------------------------------------------

CREATE TABLE public.sectors (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code        public.sector_code NOT NULL UNIQUE,
    name_tr     text NOT NULL,
    description text,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sectors IS 'Finatura sektör kataloğu (Oto Galeri, Kuyumculuk, Emlak).';
COMMENT ON COLUMN public.sectors.code IS 'Uygulama katmanında kullanılan sabit sektör kodu.';

INSERT INTO public.sectors (code, name_tr, description) VALUES
    ('oto_galeri',  'Oto Galeri',  'İkinci el / galeri araç alım-satım ve stok yönetimi'),
    ('kuyumculuk',  'Kuyumculuk',  'Altın ve döviz veresiye, kuyumcu cari işlemleri'),
    ('emlak',       'Emlak',       'Gayrimenkul portföy ve emlakçı cari yönetimi');

-- -----------------------------------------------------------------------------
-- Tenants (üye firmalar)
-- -----------------------------------------------------------------------------

CREATE TABLE public.tenants (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            text NOT NULL,
    display_name    text NOT NULL,
    legal_name      text,
    tax_office      text,
    tax_number      text,           -- VKN / TCKN
    sector_id       uuid NOT NULL REFERENCES public.sectors (id),
    status          public.tenant_status NOT NULL DEFAULT 'pending',
    primary_email   text,
    primary_phone   text,
    timezone        text NOT NULL DEFAULT 'Europe/Istanbul',
    locale          text NOT NULL DEFAULT 'tr-TR',
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    provisioned_at  timestamptz,
    suspended_at    timestamptz,
    cancelled_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,

    CONSTRAINT tenants_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    CONSTRAINT tenants_slug_len CHECK (char_length(slug) BETWEEN 2 AND 63)
);

CREATE UNIQUE INDEX tenants_slug_active_uidx
    ON public.tenants (slug)
    WHERE deleted_at IS NULL;

CREATE INDEX tenants_sector_id_idx ON public.tenants (sector_id);
CREATE INDEX tenants_status_idx ON public.tenants (status) WHERE deleted_at IS NULL;
CREATE INDEX tenants_tax_number_idx ON public.tenants (tax_number) WHERE tax_number IS NOT NULL;

COMMENT ON TABLE public.tenants IS 'Üye firmalar (kiracılar). Her aktif tenant için ayrı PostgreSQL veritabanı vardır.';
COMMENT ON COLUMN public.tenants.slug IS 'URL / subdomain güvenli kimlik (benzersiz, soft-delete sonrası tekrar kullanılabilir).';
COMMENT ON COLUMN public.tenants.metadata IS 'Esnek ek alanlar (JSON); şema sık değişen özellikler için.';

-- -----------------------------------------------------------------------------
-- Tenant database connection info
-- Connection secrets should be encrypted at rest by the app / KMS.
-- Store ciphertext + key reference here; never log plaintext.
-- -----------------------------------------------------------------------------

CREATE TABLE public.tenant_databases (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    db_host             text NOT NULL,
    db_port             integer NOT NULL DEFAULT 5432,
    db_name             text NOT NULL,
    db_user             text NOT NULL,
    -- Uygulama tarafında şifrelenmiş parola / connection secret (ciphertext)
    password_ciphertext text NOT NULL,
    encryption_key_id   text NOT NULL,  -- KMS / envelope key referansı
    ssl_mode            text NOT NULL DEFAULT 'require',
    is_primary          boolean NOT NULL DEFAULT true,
    is_healthy          boolean NOT NULL DEFAULT true,
    last_health_check_at timestamptz,
    schema_version      text,           -- uygulanan tenant_template sürümü
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,

    CONSTRAINT tenant_databases_port_range CHECK (db_port > 0 AND db_port <= 65535),
    CONSTRAINT tenant_databases_ssl_mode CHECK (
        ssl_mode IN ('disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full')
    )
);

CREATE UNIQUE INDEX tenant_databases_primary_uidx
    ON public.tenant_databases (tenant_id)
    WHERE is_primary = true AND deleted_at IS NULL;

CREATE INDEX tenant_databases_tenant_id_idx
    ON public.tenant_databases (tenant_id)
    WHERE deleted_at IS NULL;

COMMENT ON TABLE public.tenant_databases IS 'İzole kiracı PostgreSQL bağlantı bilgileri. Parola yalnızca şifreli saklanır.';
COMMENT ON COLUMN public.tenant_databases.password_ciphertext IS 'Uygulama / KMS ile şifrelenmiş DB parolası; düz metin yazılmaz.';
COMMENT ON COLUMN public.tenant_databases.encryption_key_id IS 'Şifre çözmede kullanılacak anahtar kimliği.';
COMMENT ON COLUMN public.tenant_databases.schema_version IS 'tenant_template migrasyon sürümü (örn. 1.0.0).';

-- -----------------------------------------------------------------------------
-- Subscriptions & kontör (bakiye)
-- -----------------------------------------------------------------------------

CREATE TABLE public.subscription_plans (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code            text NOT NULL UNIQUE,
    name_tr         text NOT NULL,
    description     text,
    included_kontor integer NOT NULL DEFAULT 0,
    price_amount    numeric(12, 2),
    currency_code   char(3) NOT NULL DEFAULT 'TRY',
    billing_period  text NOT NULL DEFAULT 'monthly', -- monthly | yearly
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT subscription_plans_kontor_nonneg CHECK (included_kontor >= 0),
    CONSTRAINT subscription_plans_billing_period CHECK (billing_period IN ('monthly', 'yearly', 'one_time'))
);

COMMENT ON TABLE public.subscription_plans IS 'Abonelik plan tanımları (kontör kotası dahil).';

CREATE TABLE public.tenant_subscriptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    plan_id         uuid NOT NULL REFERENCES public.subscription_plans (id),
    status          public.subscription_status NOT NULL DEFAULT 'trial',
    starts_at       timestamptz NOT NULL DEFAULT now(),
    ends_at         timestamptz,
    trial_ends_at   timestamptz,
    cancelled_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_subscriptions_tenant_id_idx ON public.tenant_subscriptions (tenant_id);
CREATE INDEX tenant_subscriptions_status_idx ON public.tenant_subscriptions (status);

COMMENT ON TABLE public.tenant_subscriptions IS 'Tenant abonelik dönemleri.';

-- Anlık kontör bakiyesi (özet); hareketler ledger''da
CREATE TABLE public.tenant_kontor_balances (
    tenant_id       uuid PRIMARY KEY REFERENCES public.tenants (id) ON DELETE CASCADE,
    balance         numeric(14, 2) NOT NULL DEFAULT 0,
    reserved        numeric(14, 2) NOT NULL DEFAULT 0, -- rezerv (işlem orta)
    updated_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT tenant_kontor_balances_nonneg CHECK (balance >= 0),
    CONSTRAINT tenant_kontor_reserved_nonneg CHECK (reserved >= 0),
    CONSTRAINT tenant_kontor_reserved_lte_balance CHECK (reserved <= balance)
);

COMMENT ON TABLE public.tenant_kontor_balances IS 'Tenant kontör anlık bakiyesi. Mutasyonlar ledger üzerinden yapılmalıdır.';

CREATE TABLE public.kontor_ledger (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    entry_type      public.kontor_ledger_type NOT NULL,
    amount          numeric(14, 2) NOT NULL,
    balance_after   numeric(14, 2) NOT NULL,
    reference_type  text,           -- örn. invoice_send, efatura, topup
    reference_id    uuid,
    description     text,
    created_by      uuid,           -- auth user (uygulama)
    created_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT kontor_ledger_amount_nonzero CHECK (amount <> 0)
);

CREATE INDEX kontor_ledger_tenant_created_idx
    ON public.kontor_ledger (tenant_id, created_at DESC);

CREATE INDEX kontor_ledger_reference_idx
    ON public.kontor_ledger (reference_type, reference_id)
    WHERE reference_id IS NOT NULL;

COMMENT ON TABLE public.kontor_ledger IS 'Kontör yükleme / düşüm / düzeltme hareket defteri (append-only tercih edilir).';
COMMENT ON COLUMN public.kontor_ledger.amount IS 'credit/refund pozitif; debit negatif olabilir veya entry_type ile ayrılır — uygulama tutarlılığı gerekir.';

-- -----------------------------------------------------------------------------
-- Opsiyonel: merkezi kullanıcı–tenant üyelik eşlemesi
-- (Auth sağlayıcı ayrı olabilir; bu tablo yetki / rotalama için)
-- -----------------------------------------------------------------------------

CREATE TABLE public.tenant_memberships (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    user_id         uuid NOT NULL,  -- auth provider subject / users tablosu
    role            text NOT NULL DEFAULT 'member', -- owner | admin | member | viewer
    is_active       boolean NOT NULL DEFAULT true,
    invited_at      timestamptz,
    joined_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,

    CONSTRAINT tenant_memberships_role CHECK (
        role IN ('owner', 'admin', 'member', 'viewer')
    )
);

CREATE UNIQUE INDEX tenant_memberships_active_uidx
    ON public.tenant_memberships (tenant_id, user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX tenant_memberships_user_id_idx
    ON public.tenant_memberships (user_id)
    WHERE deleted_at IS NULL AND is_active = true;

COMMENT ON TABLE public.tenant_memberships IS 'Kullanıcıların tenant üyelikleri ve rolleri (merkezi yetkilendirme).';

-- -----------------------------------------------------------------------------
-- updated_at tetikleyicisi
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER sectors_set_updated_at
    BEFORE UPDATE ON public.sectors
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tenants_set_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tenant_databases_set_updated_at
    BEFORE UPDATE ON public.tenant_databases
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscription_plans_set_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tenant_subscriptions_set_updated_at
    BEFORE UPDATE ON public.tenant_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tenant_memberships_set_updated_at
    BEFORE UPDATE ON public.tenant_memberships
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tenant_kontor_balances_set_updated_at
    BEFORE UPDATE ON public.tenant_kontor_balances
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Yardımcı görünüm: aktif tenant + birincil DB (secret hariç)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.v_active_tenant_connections AS
SELECT
    t.id            AS tenant_id,
    t.slug,
    t.display_name,
    t.status        AS tenant_status,
    s.code          AS sector_code,
    td.id           AS tenant_database_id,
    td.db_host,
    td.db_port,
    td.db_name,
    td.db_user,
    td.ssl_mode,
    td.schema_version,
    td.is_healthy,
    kb.balance      AS kontor_balance
FROM public.tenants t
JOIN public.sectors s ON s.id = t.sector_id
LEFT JOIN public.tenant_databases td
    ON td.tenant_id = t.id
   AND td.is_primary = true
   AND td.deleted_at IS NULL
LEFT JOIN public.tenant_kontor_balances kb ON kb.tenant_id = t.id
WHERE t.deleted_at IS NULL
  AND t.status = 'active';

COMMENT ON VIEW public.v_active_tenant_connections IS
    'Aktif tenant özeti + birincil DB meta (parola yok). Router katmanı için.';
