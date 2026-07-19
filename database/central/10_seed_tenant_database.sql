-- =============================================================================
-- Finatura Central — demo tenant → finatura_tenant_pg bağlantı kaydı
-- Önkoşul: 01_schema + 08_seed_demo (tenant ornek-galeri)
--
-- Parola biçimi: plain:<şifre> + encryption_key_id=dev-plain
-- (tenant-router StubPasswordDecryptor)
--
-- Host: finatura_tenant_pg (docker-compose.tenant-pg.yml, berqenas_net)
-- =============================================================================

INSERT INTO public.tenant_databases (
    tenant_id,
    db_host,
    db_port,
    db_name,
    db_user,
    password_ciphertext,
    encryption_key_id,
    ssl_mode,
    is_primary,
    is_healthy,
    schema_version,
    notes
)
SELECT
    '00000000-0000-4000-8000-0000000000aa'::uuid,
    'finatura_tenant_pg',
    5432,
    'tenant_ornek',
    'finatura',
    'plain:finatura_change_me_in_dokploy',
    'dev-plain',
    'disable',
    true,
    true,
    '1.0.0',
    'Demo tenant DB — docker-compose.tenant-pg.yml'
WHERE EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = '00000000-0000-4000-8000-0000000000aa'::uuid
      AND t.deleted_at IS NULL
)
AND NOT EXISTS (
    SELECT 1 FROM public.tenant_databases td
    WHERE td.tenant_id = '00000000-0000-4000-8000-0000000000aa'::uuid
      AND td.is_primary = true
      AND td.deleted_at IS NULL
);

-- Tenant aktif + provisioned işaretle (yoksa)
UPDATE public.tenants
SET status = 'active'::public.tenant_status,
    provisioned_at = coalesce(provisioned_at, now()),
    updated_at = now()
WHERE id = '00000000-0000-4000-8000-0000000000aa'::uuid
  AND deleted_at IS NULL
  AND status <> 'active'::public.tenant_status;
