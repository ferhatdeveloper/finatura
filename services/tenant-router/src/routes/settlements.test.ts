import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSettlementCreditInsert,
  buildSettlementMetadata,
} from './settlements.js';

test('builds veresiye credit insert for bank settlement', () => {
  const insert = buildSettlementCreditInsert({
    bankTxId: '22222222-2222-4222-8222-222222222222',
    veresiyeId: '33333333-3333-4333-8333-333333333333',
    cariId: '11111111-1111-4111-8111-111111111111',
    settleAmount: 7500,
    currencyCode: 'TRY',
    description: 'Banka havalesi mahsup',
  });

  assert.match(insert.sql, /INSERT INTO public\.veresiye_transactions/);
  assert.match(insert.sql, /'credit'::public\.veresiye_direction/);
  assert.doesNotMatch(insert.sql, /UPDATE public\.bank_transactions/);
  assert.equal(insert.values[0], '11111111-1111-4111-8111-111111111111');
  assert.equal(insert.values[1], 7500);
});

test('settlement metadata keeps bank and source references', () => {
  const metadata = buildSettlementMetadata({
    bankTxId: '22222222-2222-4222-8222-222222222222',
    veresiyeId: '33333333-3333-4333-8333-333333333333',
  });

  assert.equal(metadata.channel, 'bank');
  assert.equal(metadata.source, 'bank_settlement');
  assert.equal(metadata.bankTxId, '22222222-2222-4222-8222-222222222222');
  assert.equal(metadata.veresiyeId, '33333333-3333-4333-8333-333333333333');
});
