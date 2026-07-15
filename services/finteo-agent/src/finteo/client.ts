import type { FinteoFetchParams, FinteoTransaction } from '../types.js';

/**
 * Finteo API servis arayüzü.
 * Gerçek HTTP adapter ve mock aynı sözleşmeyi uygular.
 */
export interface FinteoClient {
  readonly mode: 'mock' | 'http';

  /**
   * Belirtilen tenant / hesaplar için yeni banka hareketlerini çeker.
   * Idempotent import için her kayıtta benzersiz providerTxId beklenir.
   */
  fetchTransactions(params: FinteoFetchParams): Promise<FinteoTransaction[]>;
}

export class FinteoClientError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'FinteoClientError';
  }
}
