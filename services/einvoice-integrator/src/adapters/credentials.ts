import type { ProviderCredentials } from '../config.js';
import type { IntegratorProvider } from '../config.js';

function missingCredentialsError(
  provider: IntegratorProvider,
  missing: string[],
): Error {
  return Object.assign(
    new Error(
      `${provider}: canlı mod (EINVOICE_STUB_MODE=false) için eksik kimlik bilgisi: ${missing.join(', ')}. ` +
        `.env dosyasını doldurun veya stub moda dönün.`,
    ),
    { status: 503, code: 'missing_credentials' },
  );
}

export interface AssertLiveCredentialsOptions {
  /**
   * true: API_KEY veya USERNAME+PASSWORD yeterli (Nilvera Bearer vb.).
   * false/undefined: klasik USERNAME + PASSWORD zorunlu.
   */
  allowApiKeyAuth?: boolean;
}

/**
 * Canlı modda eksik kimlik bilgisi için anlamlı hata (SOAP / Basic / Bearer).
 * Stub modunda çağrılmaz.
 */
export function assertLiveCredentials(
  provider: IntegratorProvider,
  credentials: ProviderCredentials,
  envPrefix: string,
  options: AssertLiveCredentialsOptions = {},
): void {
  const missing: string[] = [];

  if (!credentials.baseUrl?.trim()) missing.push(`${envPrefix}_BASE_URL`);

  if (options.allowApiKeyAuth) {
    const hasApiKey = Boolean(credentials.apiKey?.trim());
    const hasUserPass =
      Boolean(credentials.username?.trim()) && Boolean(credentials.password?.trim());
    if (!hasApiKey && !hasUserPass) {
      missing.push(
        `${envPrefix}_API_KEY veya ${envPrefix}_USERNAME/${envPrefix}_PASSWORD`,
      );
    }
  } else {
    if (!credentials.username?.trim()) missing.push(`${envPrefix}_USERNAME`);
    if (!credentials.password?.trim()) missing.push(`${envPrefix}_PASSWORD`);
  }

  if (missing.length > 0) {
    throw missingCredentialsError(provider, missing);
  }
}

/**
 * OAuth2 client_credentials (NES vb.) — username/password opsiyonel (password grant).
 */
export function assertOAuthLiveCredentials(
  provider: IntegratorProvider,
  credentials: ProviderCredentials,
  envPrefix: string,
): void {
  const missing: string[] = [];

  if (!credentials.baseUrl?.trim()) missing.push(`${envPrefix}_BASE_URL`);
  if (!credentials.clientId?.trim()) missing.push(`${envPrefix}_CLIENT_ID`);
  if (!credentials.clientSecret?.trim()) missing.push(`${envPrefix}_CLIENT_SECRET`);

  if (missing.length > 0) {
    throw missingCredentialsError(provider, missing);
  }
}
