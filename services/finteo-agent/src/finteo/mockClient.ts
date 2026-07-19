import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FinteoClient } from './client.js';
import type { FinteoFetchParams, FinteoTransaction } from '../types.js';

interface FixtureTx {
  idSuffix: string;
  accountRef: string;
  direction: 'inbound' | 'outbound';
  amount: number;
  currencyCode: string;
  minutesAgo: number;
  counterpartyName?: string | null;
  counterpartyIban?: string | null;
  description?: string | null;
  kind: string;
  matchHints?: string[];
}

interface FixtureFile {
  accounts: Array<{
    providerAccountRef: string;
    bankName: string;
    alias: string;
    iban: string;
  }>;
  transactions: FixtureTx[];
}

let cachedFixture: FixtureFile | null = null;

function loadFixture(): FixtureFile {
  if (cachedFixture) return cachedFixture;
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, '../../fixtures/bank-transactions.tr.json');
  cachedFixture = JSON.parse(readFileSync(path, 'utf8')) as FixtureFile;
  return cachedFixture;
}

/**
 * Geliştirme mock Finteo client — TR banka örnekleri
 * (`fixtures/bank-transactions.tr.json`).
 *
 * Ürün mantığı: bankadan gelen para e-fatura kesmez; matching ile açık
 * veresiye/fatura önerilir, swipe-to-settle mahsup eder.
 * E-fatura: OCR → transformer → einvoice-integrator (ayrı yol).
 */
export class MockFinteoClient implements FinteoClient {
  readonly mode = 'mock' as const;

  async fetchTransactions(
    params: FinteoFetchParams,
  ): Promise<FinteoTransaction[]> {
    const fixture = loadFixture();
    const fallbackRef =
      params.accountRefs?.[0] ?? `mock-account-${params.tenantId}`;
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);

    const samples: FinteoTransaction[] = fixture.transactions.map((tx) => {
      const account =
        fixture.accounts.find((a) => a.providerAccountRef === tx.accountRef)
          ?.providerAccountRef ?? fallbackRef;
      return {
        providerTxId: `finteo-mock-${params.tenantId}-${tx.idSuffix}-${dayKey}`,
        providerAccountRef: account,
        direction: tx.direction,
        amount: tx.amount,
        currencyCode: tx.currencyCode || 'TRY',
        transactionAt: new Date(now.getTime() - tx.minutesAgo * 60_000),
        valueDate: dayKey,
        counterpartyName: tx.counterpartyName ?? null,
        counterpartyIban: tx.counterpartyIban ?? null,
        description: tx.description ?? null,
        rawPayload: {
          source: 'mock',
          tenantId: params.tenantId,
          kind: tx.kind,
          matchHints: tx.matchHints ?? [],
          fixtureId: tx.idSuffix,
        },
      };
    });

    if (params.since) {
      return samples.filter((tx) => tx.transactionAt >= params.since!);
    }
    return samples;
  }
}
