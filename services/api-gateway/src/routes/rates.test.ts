import test from 'node:test';
import assert from 'node:assert/strict';
import { mapTruncgil } from './rates.js';

test('mapTruncgil builds fx and gold lists with bid/ask', () => {
  const snapshot = mapTruncgil(
    {
      Update_Date: '2026-07-16 16:20:00',
      USD: {
        Buying: '40.1840',
        Selling: '40.2210',
        Change: '0.12',
        Type: 'Currency',
      },
      EUR: {
        Buying: '43.55',
        Selling: '43.62',
        Change: '-0.08',
        Type: 'Currency',
      },
      'gram-altin': {
        Buying: '4310',
        Selling: '4340',
        Change: '-0.1',
        Type: 'Gold',
      },
      'ceyrek-altin': {
        Buying: '7020',
        Selling: '7180',
        Change: '0.14',
        Type: 'Gold',
      },
    },
    'https://finans.truncgil.com/v4/today.json',
  );

  assert.equal(snapshot.demo, false);
  assert.ok(snapshot.fx.length >= 2);
  assert.ok(snapshot.gold.length >= 2);
  assert.equal(snapshot.fx[0]?.symbol, 'USDTRY');
  assert.equal(snapshot.fx[0]?.bid, 40.184);
  assert.equal(snapshot.fx[0]?.ask, 40.221);
  assert.ok(snapshot.gold.some((g) => g.ask >= 4300));
});
