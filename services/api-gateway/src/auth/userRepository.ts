/**
 * Kullanıcı / üyelik repository sözleşmesi.
 *
 * Central şema bugün `tenant_memberships` içerir; `public.users` tablosu henüz
 * 01_schema.sql'de yok. AUTH_PROVIDER=stub geliştirme path'i çalışır.
 * AUTH_PROVIDER=central ile CentralUserRepository iskeleti devreye girer
 * (users tablosu eklendiğinde SQL hazır).
 */

export interface AuthUserRecord {
  userId: string;
  email: string;
  displayName: string;
  tenantId: string;
  tenantSlug: string;
  role?: string;
}

export interface UserRepository {
  /**
   * E-posta + parola metin parola ile giriş.
   * Üretimde password_hash (bcrypt/argon2) doğrulanır — stub dışında TODO.
   */
  authenticate(
    email: string,
    password: string,
  ): Promise<AuthUserRecord | null>;

  /** Refresh / session için kullanıcı + birincil üyelik */
  findById(userId: string): Promise<AuthUserRecord | null>;

  /**
   * Kullanıcının verilen tenant'a aktif üyeliği var mı?
   * Multi-tenant seçimde X-Tenant-ID doğrulaması için.
   */
  hasMembership(userId: string, tenantIdOrSlug: string): Promise<boolean>;
}
