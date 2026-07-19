-- =============================================================================
-- Finatura Central — demo tenant + kullanıcılar (Dokploy / yerel ilk init)
-- Önkoşul: 01–07 SQL
-- Parola: bcrypt (CentralUserRepository). Düz metin: demo1234 / mali1234 / admin1234
-- =============================================================================

-- Demo tenant (yoksa ekle)
INSERT INTO public.tenants (
    id, slug, display_name, legal_name, sector_id, status,
    primary_email, mali_musavir_kodu, provisioned_at
)
SELECT
    '00000000-0000-4000-8000-0000000000aa'::uuid,
    'ornek-galeri',
    'Örnek Oto Galeri Ltd.',
    'Örnek Oto Galeri Limited Şirketi',
    s.id,
    'active'::public.tenant_status,
    'demo@finatura.app',
    'DEMO-GALERI',
    now()
FROM public.sectors s
WHERE s.code = 'oto_galeri'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = '00000000-0000-4000-8000-0000000000aa'::uuid
       OR (t.slug = 'ornek-galeri' AND t.deleted_at IS NULL)
  );

-- Kullanıcılar (e-posta yoksa) — bcrypt cost 10
INSERT INTO public.users (id, email, password_hash, full_name, is_active, is_platform_admin)
SELECT v.id, v.email, v.password_hash, v.full_name, true, v.is_platform_admin
FROM (VALUES
    (
      '00000000-0000-4000-8000-000000000001'::uuid,
      'demo@finatura.app',
      '$2b$10$yp14k1owEv8znhrp2RU.N.WwwMGti4ZgXjwIB4Q1F0s.VFw5njTRm',
      'Finatura Demo',
      false
    ),
    (
      '00000000-0000-4000-8000-000000000002'::uuid,
      'mm@finatura.app',
      '$2b$10$wXKZqaEdiNaCl5dC6jWELeRsITmZcUCVG7KBVyAWWliwbqh3eroYK',
      'Ayşe Yılmaz, SMMM',
      false
    ),
    (
      '00000000-0000-4000-8000-000000000003'::uuid,
      'admin@finatura.app',
      '$2b$10$ViSSJ.NvELU8H3Sa66VptOmisH.3g.I4.OZTlGNmdZVvJMNs45T7e',
      'Finatura Superadmin',
      true
    )
) AS v(id, email, password_hash, full_name, is_platform_admin)
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE lower(u.email) = lower(v.email) AND u.deleted_at IS NULL
);

-- Mevcut volume: eski dev: hash → bcrypt (yalnızca demo kullanıcılar)
UPDATE public.users u
SET password_hash = v.password_hash,
    updated_at = now()
FROM (VALUES
    ('demo@finatura.app', '$2b$10$yp14k1owEv8znhrp2RU.N.WwwMGti4ZgXjwIB4Q1F0s.VFw5njTRm'),
    ('mm@finatura.app', '$2b$10$wXKZqaEdiNaCl5dC6jWELeRsITmZcUCVG7KBVyAWWliwbqh3eroYK'),
    ('admin@finatura.app', '$2b$10$ViSSJ.NvELU8H3Sa66VptOmisH.3g.I4.OZTlGNmdZVvJMNs45T7e')
) AS v(email, password_hash)
WHERE lower(u.email) = lower(v.email)
  AND u.deleted_at IS NULL
  AND u.password_hash LIKE 'dev:%';

-- Üyelikler
INSERT INTO public.tenant_memberships (tenant_id, user_id, role, is_active, joined_at)
SELECT
    '00000000-0000-4000-8000-0000000000aa'::uuid,
    u.id,
    v.role::public.membership_role,
    true,
    now()
FROM (VALUES
    ('demo@finatura.app', 'owner'),
    ('mm@finatura.app', 'accountant'),
    ('admin@finatura.app', 'admin')
) AS v(email, role)
INNER JOIN public.users u
  ON lower(u.email) = lower(v.email) AND u.deleted_at IS NULL
WHERE EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = '00000000-0000-4000-8000-0000000000aa'::uuid
)
AND NOT EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = '00000000-0000-4000-8000-0000000000aa'::uuid
      AND m.user_id = u.id
      AND m.deleted_at IS NULL
);

-- Başlangıç kontör
INSERT INTO public.tenant_kontor_balances (tenant_id, balance, reserved)
SELECT '00000000-0000-4000-8000-0000000000aa'::uuid, 100, 0
WHERE EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = '00000000-0000-4000-8000-0000000000aa'::uuid
)
AND NOT EXISTS (
    SELECT 1 FROM public.tenant_kontor_balances b
    WHERE b.tenant_id = '00000000-0000-4000-8000-0000000000aa'::uuid
);

-- Mali müşavir kodu
INSERT INTO public.accountant_codes (tenant_id, code, label, is_active)
SELECT
    '00000000-0000-4000-8000-0000000000aa'::uuid,
    'MM-DEMO',
    'Demo mali müşavir kodu',
    true
WHERE EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = '00000000-0000-4000-8000-0000000000aa'::uuid
)
AND NOT EXISTS (
    SELECT 1 FROM public.accountant_codes ac
    WHERE upper(ac.code) = 'MM-DEMO' AND ac.revoked_at IS NULL
);
