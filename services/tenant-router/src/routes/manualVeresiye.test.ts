import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildManualVeresiyeInsert,
  validateManualVeresiyeBody,
} from './manualVeresiye.js';

test('validates elden tahsilat payload as cash credit movement', () => {
  const parsed = validateManualVeresiyeBody({
    cariId: '11111111-1111-4111-8111-111111111111',
    operation: 'tahsilat',
    assetKind: 'tl',
    amount: 1250,
    currencyCode: 'TRY',
    description: 'Elden alındı',
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.equal(parsed.value.direction, 'credit');
  assert.equal(parsed.value.metadata.channel, 'cash');
  assert.equal(parsed.value.metadata.operation, 'tahsilat');
});

test('builds veresiye insert without touching bank transactions', () => {
  const parsed = validateManualVeresiyeBody({
    cariId: '11111111-1111-4111-8111-111111111111',
    operation: 'tediye',
    assetKind: 'gold',
    amount: 10000,
    currencyCode: 'TRY',
    goldGrams: 8.25,
    goldPurity: 22,
    description: 'Elden verildi',
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const insert = buildManualVeresiyeInsert(parsed.value);

  assert.match(insert.sql, /INSERT INTO public\.veresiye_transactions/);
  assert.doesNotMatch(insert.sql, /bank_transactions/i);
  assert.equal(parsed.value.direction, 'debit');
  assert.equal(parsed.value.metadata.channel, 'cash');
});
