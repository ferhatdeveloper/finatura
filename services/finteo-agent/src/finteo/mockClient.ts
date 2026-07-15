import type { FinteoClient } from './client.js';
import type { FinteoFetchParams, FinteoTransaction } from '../types.js';

/**
 * Geliştirme / iskelet için deterministik mock Finteo client.
 * Her poll turunda aynı provider_tx_id'leri üretir → upsert ile tekrar yazılmaz.
 */
export class MockFinteoClient implements FinteoClient {
  readonly mode = 'mock' as const;

  async fetchTransactions(params: FinteoFetchParams): Promise<FinteoTransaction[]> {
    const accountRef = params.accountRefs?.[0] ?? `mock-account-${params.tenantId}`;
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);

    const samples: FinteoTransaction[] = [
      {
        providerTxId: `finteo-mock-${params.tenantId}-in-${dayKey}`,
        providerAccountRef: accountRef,
        direction: 'inbound',
        amount: 125_000,
        currencyCode: 'TRY',
        transactionAt: new Date(now.getTime() - 45 * 60_000),
        valueDate: dayKey,
        counterpartyName: 'AHMET YILMAZ',
        counterpartyIban: 'TR330006100519786457841326',
        description: `HAVALE/EFT 34 ABC 123 NOTER BEDELI TCKN 12345678901`,
        rawPayload: {
          source: 'mock',
          tenantId: params.tenantId,
          kind: 'inbound_eft',
        },
      },
      {
        providerTxId: `finteo-mock-${params.tenantId}-out-${dayKey}`,
        providerAccountRef: accountRef,
        direction: 'outbound',
        amount: 4_850.5,
        currencyCode: 'TRY',
        transactionAt: new Date(now.getTime() - 20 * 60_000),
        valueDate: dayKey,
        counterpartyName: 'TUPRAS A.S.',
        counterpartyIban: null,
        description: 'POS HARCAMASI AKARYAKIT',
        rawPayload: {
          source: 'mock',
          tenantId: params.tenantId,
          kind: 'outbound_pos',
        },
      },
    ];

    // since verilmişse pencere dışındakileri ele
    if (params.since) {
      return samples.filter((tx) => tx.transactionAt >= params.since!);
    }
    return samples;
  }
}
