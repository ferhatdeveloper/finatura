-- =============================================================================
-- Finatura Central — membership_role (tek kaynak) + mali müşavir bağlama
-- Database: finatura_central
-- Dosya: 05b (05_auth_accountant.sql ile çakışmayı için ayrı numaralandırma)
-- Önkoşul: 01_schema.sql; tercihen ardından 05_auth_accountant.sql (users)
-- =============================================================================
--
-- Tek kaynak rol: public.membership_role
--   owner | admin | member | viewer | accountant
--
-- Login (05_auth): users, tenants.mali_musavir_kodu, accountant_codes (firmaKodu)
-- Bu dosya: rol enum + mali_musavir_baglantilari (davet → üyelik bağlama)
-- 06_*: dönem onayları (accountant_approval_status) — ayrı konu
--
-- Akış:
--   1) Tenant owner/admin → POST .../accountant/invite → pending + kod
--   2) Muhasebeci → POST /v1/accountant/link → approved + membership(accountant)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- membership_role — tek kaynak (01 text CHECK / 05 CHECK yerine)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'membership_role' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.membership_role AS ENUM (
            'owner',
            'admin',
            'member',
            'viewer',
            'accountant'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
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

COMMENT ON TYPE public.membership_role IS
    'tenant_memberships.role tek kaynağı: owner | admin | member | viewer | accountant';

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
            ALTER COLUMN role DROP DEFAULT;

        ALTER TABLE public.tenant_memberships
            ALTER COLUMN role TYPE public.membership_role
            USING role::public.membership_role;

        ALTER TABLE public.tenant_memberships
            ALTER COLUMN role SET DEFAULT 'member'::public.membership_role;
    END IF;
END
$$;

COMMENT ON COLUMN public.tenant_memberships.role IS
    'Üyelik rolü (public.membership_role). Mali müşavir = accountant.';

-- -----------------------------------------------------------------------------
-- Bağlantı durumu (06 accountant_approval_status dönem onayları içindir)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'accountant_link_status' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.accountant_link_status AS ENUM (
            'pending',
            'approved',
            'revoked'
        );
    END IF;
END
$$;

COMMENT ON TYPE public.accountant_link_status IS
    'Mali müşavir üyelik bağlantısı: pending | approved | revoked';

-- -----------------------------------------------------------------------------
-- mali_musavir_baglantilari
-- accountant_user_id users FK opsiyonel (05_auth uygulandıysa eklenir)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mali_musavir_baglantilari (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
    accountant_user_id  uuid,
    invited_by_user_id  uuid NOT NULL,
    kod                 text NOT NULL,
    status              public.accountant_link_status NOT NULL DEFAULT 'pending',
    expires_at          timestamptz,
    approved_at         timestamptz,
    revoked_at          timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT mali_musavir_kod_format CHECK (kod ~ '^[A-Z0-9]{6,16}$')
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'mali_musavir_baglantilari'
          AND constraint_name = 'mali_musavir_accountant_user_fk'
    ) THEN
        ALTER TABLE public.mali_musavir_baglantilari
            ADD CONSTRAINT mali_musavir_accountant_user_fk
            FOREIGN KEY (accountant_user_id)
            REFERENCES public.users (id);
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS mali_musavir_kod_pending_uidx
    ON public.mali_musavir_baglantilari (kod)
    WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS mali_musavir_tenant_accountant_approved_uidx
    ON public.mali_musavir_baglantilari (tenant_id, accountant_user_id)
    WHERE status = 'approved' AND accountant_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mali_musavir_tenant_id_idx
    ON public.mali_musavir_baglantilari (tenant_id);

CREATE INDEX IF NOT EXISTS mali_musavir_accountant_user_id_idx
    ON public.mali_musavir_baglantilari (accountant_user_id)
    WHERE accountant_user_id IS NOT NULL;

COMMENT ON TABLE public.mali_musavir_baglantilari IS
    'Tenant ↔ mali müşavir davet kodu ve bağlantı durumu (üyelik bağlama).';
COMMENT ON COLUMN public.mali_musavir_baglantilari.kod IS
    'Pending davet kodu; bağlanınca status=approved.';
COMMENT ON COLUMN public.mali_musavir_baglantilari.accountant_user_id IS
    'Bağlanan mali müşavir (users.id); pending iken NULL.';

DROP TRIGGER IF EXISTS mali_musavir_baglantilari_set_updated_at
    ON public.mali_musavir_baglantilari;

CREATE TRIGGER mali_musavir_baglantilari_set_updated_at
    BEFORE UPDATE ON public.mali_musavir_baglantilari
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
