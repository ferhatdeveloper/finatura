-- =============================================================================
-- Finatura Central — Auth kullanıcıları + firma kodu (login resolve)
-- Database: finatura_central
-- Önkoşul: 01_schema.sql
-- Sonrası (opsiyonel): 05b_membership_accountant.sql (enum + mali_musavir_baglantilari)
-- =============================================================================
--
-- Web / istemci sözleşme alanı: firmaKodu
--   Login'de opsiyonel; sırayla:
--     tenants.mali_musavir_kodu → accountant_codes.code → slug → id
--     (+ 05b varsa mali_musavir_baglantilari.kod)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Merkezi kullanıcılar (SaaS girişi)
-- password_hash: geliştirmede `dev:<plaintext>`; üretimde bcrypt/argon2
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text NOT NULL,
    password_hash   text NOT NULL,
    full_name       text NOT NULL,
    is_active       boolean NOT NULL DEFAULT true,
    last_login_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,

    CONSTRAINT users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_uidx
    ON public.users (lower(email))
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS users_is_active_idx
    ON public.users (is_active)
    WHERE deleted_at IS NULL AND is_active = true;

COMMENT ON TABLE public.users IS
    'Merkezi SaaS kullanıcıları. Parola yalnızca hash olarak saklanır.';
COMMENT ON COLUMN public.users.password_hash IS
    'Geliştirme: dev:<plaintext>. Üretim: bcrypt/argon2 hash. Düz metin yazılmaz.';
COMMENT ON COLUMN public.users.full_name IS
    'Görünen ad (API cevabında displayName).';

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- tenant_memberships.role → accountant
-- text+CHECK ise genişlet; membership_role enum varsa (05b) accountant ekle
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tenant_memberships'
          AND column_name = 'role'
          AND udt_name = 'text'
    ) THEN
        ALTER TABLE public.tenant_memberships
            DROP CONSTRAINT IF EXISTS tenant_memberships_role;

        ALTER TABLE public.tenant_memberships
            ADD CONSTRAINT tenant_memberships_role CHECK (
                role IN ('owner', 'admin', 'member', 'viewer', 'accountant')
            );
    ELSIF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'membership_role' AND n.nspname = 'public'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE n.nspname = 'public'
          AND t.typname = 'membership_role'
          AND e.enumlabel = 'accountant'
    ) THEN
        ALTER TYPE public.membership_role ADD VALUE 'accountant';
    END IF;
END
$$;

COMMENT ON COLUMN public.tenant_memberships.role IS
    'owner | admin | member | viewer | accountant (mali müşavir). '
    '05b sonrası tip: public.membership_role.';

-- -----------------------------------------------------------------------------
-- Firma kodu (tenant üzerinde benzersiz) — login body: firmaKodu
-- -----------------------------------------------------------------------------

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS mali_musavir_kodu text;

COMMENT ON COLUMN public.tenants.mali_musavir_kodu IS
    'Kalıcı firma / mali müşavir kodu (unique). Web form firmaKodu ile resolve.';

CREATE UNIQUE INDEX IF NOT EXISTS tenants_mali_musavir_kodu_uidx
    ON public.tenants (upper(mali_musavir_kodu))
    WHERE mali_musavir_kodu IS NOT NULL
      AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Ek / rotasyonel davet kodları (login resolve)
-- Not: Tek kullanımlık davet akışı 05b → mali_musavir_baglantilari
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.accountant_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    code            text NOT NULL,
    label           text,
    is_active       boolean NOT NULL DEFAULT true,
    expires_at      timestamptz,
    created_by      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    revoked_at      timestamptz,

    CONSTRAINT accountant_codes_code_len CHECK (char_length(code) BETWEEN 4 AND 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS accountant_codes_code_active_uidx
    ON public.accountant_codes (upper(code))
    WHERE is_active = true AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS accountant_codes_tenant_id_idx
    ON public.accountant_codes (tenant_id)
    WHERE is_active = true AND revoked_at IS NULL;

COMMENT ON TABLE public.accountant_codes IS
    'Tenant başına ek firma kodları (login firmaKodu). Davet akışı: mali_musavir_baglantilari.';
COMMENT ON COLUMN public.accountant_codes.code IS
    'Büyük/küçük harf duyarsız unique (aktif kodlar).';

DROP TRIGGER IF EXISTS accountant_codes_set_updated_at ON public.accountant_codes;
CREATE TRIGGER accountant_codes_set_updated_at
    BEFORE UPDATE ON public.accountant_codes
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
