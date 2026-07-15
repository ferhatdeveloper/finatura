import { config } from '../config.js';
import type { FinteoClient } from './client.js';
import { HttpFinteoClient } from './httpClient.js';
import { MockFinteoClient } from './mockClient.js';

export function createFinteoClient(): FinteoClient {
  if (config.finteo.clientMode === 'http') {
    return new HttpFinteoClient();
  }
  return new MockFinteoClient();
}
