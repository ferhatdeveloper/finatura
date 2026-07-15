import { config } from '../config.js';
import type { FinteoClient } from './client.js';
import { HttpFinteoClient } from './httpClient.js';
import { MockFinteoClient } from './mockClient.js';

/**
 * FINTEO_CLIENT_MODE=http → HttpFinteoClient (eksik credential assertConfig’te patlar).
 * FINTEO_CLIENT_MODE=mock → MockFinteoClient (yalnızca açıkça).
 * http seçiliyken asla mock’a düşülmez.
 */
export function createFinteoClient(): FinteoClient {
  if (config.finteo.clientMode === 'mock') {
    return new MockFinteoClient();
  }
  if (config.finteo.clientMode === 'http') {
    return new HttpFinteoClient();
  }
  throw new Error(
    `Bilinmeyen FINTEO_CLIENT_MODE="${config.finteo.clientMode}" — yalnızca "http" veya "mock"`,
  );
}
