import test from 'node:test';
import assert from 'node:assert/strict';
import { mapDatshopRate, parseDatshopRatesPayload } from './rates.js';

test('maps datshop currency item into Finatura market rate', () => {
  const rate = mapDatshopRate(
    {
      code: 'USDTRY',
      name: 'Amerikan Doları',
      alis: '40.1840',
      satis: '40.2210',
      degisim: '%0.12',
      tarih: '2026-07-16 16:20:00',
    },
    'fx',
  );

  assert.notEqual(rate, null);
  if (rate === null) return;

  assert.equal(rate.symbol, 'USDTRY');
  assert.equal(rate.label, 'Amerikan Doları');
  assert.equal(rate.category, 'fx');
  assert.equal(rate.bid, 40.184);
  assert.equal(rate.ask, 40.221);
  assert.equal(rate.changePercent, 0.12);
  assert.equal(rate.source, 'datshop.com.tr');
});

test('parses embedded datshop payload for fx and gold lists', () => {
  const html = `
    <html>
      <script id="__NEXT_DATA__" type="application/json">
        {"props":{"pageProps":{"rates":[
          {"symbol":"USDTRY","title":"USD/TRY","buy":40.1,"sell":40.2,"change":0.2,"type":"currency"},
          {"symbol":"GRAMALTIN","title":"GRAM ALTIN","buy":4310,"sell":4340,"change":-0.1,"type":"gold"}
        ]}}}
      </script>
    </html>`;

  const parsed = parseDatshopRatesPayload(html, 'text/html');

  assert.equal(parsed.fx.length, 1);
  assert.equal(parsed.gold.length, 1);
  assert.equal(parsed.fx[0]?.symbol, 'USDTRY');
  assert.equal(parsed.gold[0]?.symbol, 'GRAMALTIN');
});
