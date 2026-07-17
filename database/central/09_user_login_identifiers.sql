-- =============================================================================
-- Finatura Central — çoklu giriş kimlikleri (e-posta / telefon / TCKN / VKN)
-- Önkoşul: 05_auth_accountant.sql (+ 07 is_platform_admin)
--
-- Login sözleşmesi: tek alan `identifier` (veya geriye uyumlu `email` /
-- `username`) + `password`. firmaKodu opsiyonel.
-- =============================================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS phone_digits text,
    ADD COLUMN IF NOT EXISTS tckn text,
    ADD COLUMN IF NOT EXISTS vergi_no text;

COMMENT ON COLUMN public.users.phone IS
    'Kullanıcının görünen telefonu (+90… / 0…). Login eşlemesi phone_digits üzerinden.';
COMMENT ON COLUMN public.users.phone_digits IS
    'Normalize TR cep: yalnızca rakam, 10 hane (5xxxxxxxxx). Login lookup anahtarı.';
COMMENT ON COLUMN public.users.tckn IS
    'TC kimlik no (11 hane). Login identifier olarak kullanılabilir.';
COMMENT ON COLUMN public.users.vergi_no IS
    'Vergi kimlik no / VKN (10 hane). Login identifier olarak kullanılabilir.';

-- Biçim kısıtları (NULL serbest)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_digits_format;
ALTER TABLE public.users
    ADD CONSTRAINT users_phone_digits_format CHECK (
        phone_digits IS NULL OR phone_digits ~ '^[0-9]{10,15}$'
    );

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_tckn_format;
ALTER TABLE public.users
    ADD CONSTRAINT users_tckn_format CHECK (
        tckn IS NULL OR tckn ~ '^[0-9]{11}$'
    );

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_vergi_no_format;
ALTER TABLE public.users
    ADD CONSTRAINT users_vergi_no_format CHECK (
        vergi_no IS NULL OR vergi_no ~ '^[0-9]{10}$'
    );

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_digits_active_uidx
    ON public.users (phone_digits)
    WHERE phone_digits IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_tckn_active_uidx
    ON public.users (tckn)
    WHERE tckn IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_vergi_no_active_uidx
    ON public.users (vergi_no)
    WHERE vergi_no IS NOT NULL AND deleted_at IS NULL;

-- Demo kullanıcı kimlikleri (08_seed_demo.sql sonrası; idempotent)
UPDATE public.users SET
    phone = '+90 555 111 22 33',
    phone_digits = '5551112233',
    tckn = '10000000146',
    vergi_no = '1234567890',
    updated_at = now()
WHERE lower(email) = 'demo@finatura.app'
  AND deleted_at IS NULL
  AND (phone_digits IS DISTINCT FROM '5551112233'
       OR tckn IS DISTINCT FROM '10000000146'
       OR vergi_no IS DISTINCT FROM '1234567890');

UPDATE public.users SET
    phone = '+90 555 222 33 44',
    phone_digits = '5552223344',
    tckn = '10000000154',
    vergi_no = '9876543210',
    updated_at = now()
WHERE lower(email) = 'mm@finatura.app'
  AND deleted_at IS NULL
  AND (phone_digits IS DISTINCT FROM '5552223344'
       OR tckn IS DISTINCT FROM '10000000154'
       OR vergi_no IS DISTINCT FROM '9876543210');

UPDATE public.users SET
    phone = '+90 555 999 88 77',
    phone_digits = '5559998877',
    tckn = '10000000162',
    vergi_no = '1111111111',
    updated_at = now()
WHERE lower(email) = 'admin@finatura.app'
  AND deleted_at IS NULL
  AND (phone_digits IS DISTINCT FROM '5559998877'
       OR tckn IS DISTINCT FROM '10000000162'
       OR vergi_no IS DISTINCT FROM '1111111111');

-- Demo tenant vergi / telefon (bilgi; login users üzerinden)
UPDATE public.tenants SET
    tax_number = coalesce(nullif(tax_number, ''), '1234567890'),
    primary_phone = coalesce(nullif(primary_phone, ''), '+90 555 111 22 33'),
    updated_at = now()
WHERE id = '00000000-0000-4000-8000-0000000000aa'::uuid;
