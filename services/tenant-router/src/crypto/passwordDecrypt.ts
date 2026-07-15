/**
 * Tenant DB parola şifre çözme sözleşmesi.
 *
 * Central şema (`tenant_databases.password_ciphertext` + `encryption_key_id`)
 * düz metin parola saklamaz. Üretimde KMS / envelope encryption implementasyonu
 * bu arayüzü karşılar.
 */

export interface PasswordDecryptor {
  /**
   * @param ciphertext - DB'deki password_ciphertext
   * @param keyId - encryption_key_id (KMS anahtar referansı)
   * @returns Düz metin DB parolası (asla loglanmamalı)
   */
  decrypt(ciphertext: string, keyId: string): Promise<string>;
}

/**
 * Yerel / geliştirme stub decrypt.
 *
 * Desteklenen ciphertext biçimleri:
 * 1. `plain:<parola>` — açık önek (seed / lokal)
 * 2. `encryption_key_id` = `dev-plain` | `local` | `stub` — ciphertext düz metin kabul edilir
 * 3. Aksi halde UTF-8 base64 decode denenir (basit lokal seed formatı)
 *
 * TODO(prod): AwsKmsPasswordDecryptor / VaultTransitDecryptor bağlanacak.
 */
export class StubPasswordDecryptor implements PasswordDecryptor {
  async decrypt(ciphertext: string, keyId: string): Promise<string> {
    const trimmed = ciphertext.trim();
    if (!trimmed) {
      throw new Error('password_ciphertext boş');
    }

    if (trimmed.startsWith('plain:')) {
      return trimmed.slice('plain:'.length);
    }

    const localKeys = new Set(['dev-plain', 'local', 'stub', 'dev']);
    if (localKeys.has(keyId.trim().toLowerCase())) {
      return trimmed;
    }

    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      // Geçersiz base64 çoğu ortamda garbage üretir; printable kontrolü
      if (decoded.length > 0 && /^[\x20-\x7E]+$/.test(decoded)) {
        return decoded;
      }
    } catch {
      // düş: hata aşağıda
    }

    throw new Error(
      `Stub decrypt bu ciphertext/keyId ile çalışamaz (keyId=${keyId}). ` +
        `Lokal için plain:<parola> veya encryption_key_id=dev-plain kullanın. ` +
        `Üretim KMS decrypt henüz bağlı değil.`,
    );
  }
}

let decryptor: PasswordDecryptor = new StubPasswordDecryptor();

/** Uygulama başlangıcında KMS implementasyonu enjekte edilebilir */
export function setPasswordDecryptor(impl: PasswordDecryptor): void {
  decryptor = impl;
}

export function getPasswordDecryptor(): PasswordDecryptor {
  return decryptor;
}
