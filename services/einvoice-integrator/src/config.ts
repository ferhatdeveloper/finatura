import 'dotenv/config';

export type IntegratorProvider =
  | 'edm'
  | 'uyumsoft'
  | 'fit'
  | 'elogo'
  | 'qnb'
  | 'nes'
  | 'izibiz'
  | 'nilvera';

function env(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  return '';
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes';
}

function parseProvider(raw: string): IntegratorProvider {
  const value = raw.toLowerCase();
  if (
    value === 'edm' ||
    value === 'uyumsoft' ||
    value === 'fit' ||
    value === 'elogo' ||
    value === 'qnb' ||
    value === 'nes' ||
    value === 'izibiz' ||
    value === 'nilvera'
  ) {
    return value;
  }
  return 'edm';
}

export interface ProviderCredentials {
  baseUrl: string;
  username: string;
  password: string;
  vkn: string;
  apiKey: string;
  /** OAuth2 client id (NES vb.) */
  clientId?: string;
  /** OAuth2 client secret (NES vb.) */
  clientSecret?: string;
}

export const config = {
  port: Number(env('PORT', '3200')) || 3200,
  nodeEnv: env('NODE_ENV', 'development'),
  provider: parseProvider(env('EINVOICE_PROVIDER', 'edm')),
  stubMode: envBool('EINVOICE_STUB_MODE', true),
  defaultSenderVkn: env('DEFAULT_SENDER_VKN'),
  edm: {
    baseUrl: env('EDM_BASE_URL', 'https://test.edmbilisim.com.tr'),
    username: env('EDM_USERNAME'),
    password: env('EDM_PASSWORD'),
    vkn: env('EDM_VKN'),
    apiKey: env('EDM_API_KEY'),
  } satisfies ProviderCredentials,
  uyumsoft: {
    baseUrl: env('UYUMSOFT_BASE_URL', 'https://efatura-test.uyumsoft.com.tr'),
    username: env('UYUMSOFT_USERNAME'),
    password: env('UYUMSOFT_PASSWORD'),
    vkn: env('UYUMSOFT_VKN'),
    apiKey: env('UYUMSOFT_API_KEY'),
  } satisfies ProviderCredentials,
  fit: {
    baseUrl: env('FIT_BASE_URL', 'https://earsivwstest.fitbulut.com'),
    username: env('FIT_USERNAME'),
    password: env('FIT_PASSWORD'),
    vkn: env('FIT_VKN'),
    apiKey: env('FIT_API_KEY'),
  } satisfies ProviderCredentials,
  elogo: {
    baseUrl: env('ELOGO_BASE_URL', 'https://betatest.elogo.com.tr'),
    username: env('ELOGO_USERNAME'),
    password: env('ELOGO_PASSWORD'),
    vkn: env('ELOGO_VKN'),
    apiKey: env('ELOGO_API_KEY'),
  } satisfies ProviderCredentials,
  qnb: {
    baseUrl: env('QNB_BASE_URL', 'https://connectortest.efinans.com.tr'),
    username: env('QNB_USERNAME'),
    password: env('QNB_PASSWORD'),
    vkn: env('QNB_VKN'),
    apiKey: env('QNB_API_KEY'),
  } satisfies ProviderCredentials,
  nes: {
    baseUrl: env('NES_BASE_URL', 'https://api.nes.com.tr'),
    username: env('NES_USERNAME'),
    password: env('NES_PASSWORD'),
    vkn: env('NES_VKN'),
    apiKey: env('NES_API_KEY'),
    clientId: env('NES_CLIENT_ID'),
    clientSecret: env('NES_CLIENT_SECRET'),
  } satisfies ProviderCredentials,
  izibiz: {
    baseUrl: env('IZIBIZ_BASE_URL', 'https://efaturatest.izibiz.com.tr'),
    username: env('IZIBIZ_USERNAME'),
    password: env('IZIBIZ_PASSWORD'),
    vkn: env('IZIBIZ_VKN'),
    apiKey: env('IZIBIZ_API_KEY'),
  } satisfies ProviderCredentials,
  nilvera: {
    baseUrl: env('NILVERA_BASE_URL', 'https://apitest.nilvera.com'),
    username: env('NILVERA_USERNAME'),
    password: env('NILVERA_PASSWORD'),
    vkn: env('NILVERA_VKN'),
    apiKey: env('NILVERA_API_KEY'),
  } satisfies ProviderCredentials,
};

export function credentialsFor(provider: IntegratorProvider): ProviderCredentials {
  switch (provider) {
    case 'edm':
      return config.edm;
    case 'uyumsoft':
      return config.uyumsoft;
    case 'fit':
      return config.fit;
    case 'elogo':
      return config.elogo;
    case 'qnb':
      return config.qnb;
    case 'nes':
      return config.nes;
    case 'izibiz':
      return config.izibiz;
    case 'nilvera':
      return config.nilvera;
  }
}

export function assertConfig(): void {
  if (!Number.isFinite(config.port) || config.port <= 0) {
    throw new Error('PORT geçersiz');
  }
}
