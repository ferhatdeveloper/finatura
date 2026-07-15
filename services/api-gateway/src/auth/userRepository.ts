/**
 * Kullanıcı / üyelik repository sözleşmesi.
 *
 * Central: `public.users` + `tenant_memberships` + firma kodu resolve
 * (`tenants.mali_musavir_kodu` / `accountant_codes` / slug / id).
 * AUTH_PROVIDER=stub → env demo kullanıcı; central → PostgreSQL.
 */

/** Login body'den gelen opsiyonel tenant seçimi */
export interface LoginTenantHint {
  /** Web form sözleşmesi — mali müşavir / firma davet kodu */
  firmaKodu?: string;
  tenantSlug?: string;
  tenantId?: string;
}

export interface AuthUserRecord {
  userId: string;
  email: string;
  displayName: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
}

export interface UserRepository {
  /**
   * E-posta + düz metin parola ile giriş.
   * Opsiyonel hint ile tenant resolve (firmaKodu / slug / id).
   * Üretimde password_hash (bcrypt/argon2) doğrulanır — stub dışında TODO.
   */
  authenticate(
    email: string,
    password: string,
    tenantHint?: LoginTenantHint,
  ): Promise<AuthUserRecord | null>;

  /** Refresh / session için kullanıcı + birincil üyelik */
  findById(
    userId: string,
    tenantHint?: LoginTenantHint,
  ): Promise<AuthUserRecord | null>;

  /**
   * Kullanıcının verilen tenant'a aktif üyeliği var mı?
   * Multi-tenant seçimde X-Tenant-ID doğrulaması için.
   */
  hasMembership(userId: string, tenantIdOrSlug: string): Promise<boolean>;
}
