import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NesAdapter } from '../src/adapters/nes.adapter.ts';
import type { HttpClient, HttpRequest, HttpResponse } from '../src/http/client.ts';
import type { InvoiceDraftPayload } from '../src/adapters/types.ts';

function mockHttp(handler: (req: HttpRequest) => HttpResponse | Promise<HttpResponse>): HttpClient {
  return {
    request: async (req) => handler(req),
  };
}

const liveCredentials = {
  baseUrl: 'https://api.test-nes.local',
  username: '',
  password: '',
  vkn: '1234567890',
  apiKey: '',
  clientId: 'nes-client',
  clientSecret: 'nes-secret',
};

const draft = (): InvoiceDraftPayload => ({
  kind: 'efatura',
  ettn: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  documentNumber: 'NES2026000000001',
  issueDate: '2026-07-15',
  senderVkn: '1234567890',
  receiverVknOrTckn: '9876543210',
  receiverTitle: 'NES Alıcı',
  netTotal: 100,
  vatTotal: 20,
  grandTotal: 120,
  ublXml: '<Invoice>ubl</Invoice>',
});

test('nes live: OAuth credentials yoksa anlamlı hata', async () => {
  const adapter = new NesAdapter(
    { baseUrl: 'https://x.example', username: '', password: '', vkn: '', apiKey: '' },
    false,
    {
      http: mockHttp(() => {
        throw new Error('HTTP çağrılmamalı');
      }),
    },
  );

  await assert.rejects(
    () => adapter.sendInvoice(draft()),
    (err: unknown) =>
      err instanceof Error &&
      /eksik kimlik bilgisi/i.test(err.message) &&
      /NES_CLIENT_ID/i.test(err.message) &&
      /NES_CLIENT_SECRET/i.test(err.message),
  );
});

test('nes live: OAuth token + fatura/olustur REST', async () => {
  const calls: HttpRequest[] = [];

  const adapter = new NesAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      calls.push(req);
      if (req.url.includes('/oauth/token')) {
        assert.equal(req.method, 'POST');
        assert.match(req.headers?.['Content-Type'] ?? '', /x-www-form-urlencoded/);
        assert.match(req.body ?? '', /grant_type=client_credentials/);
        assert.match(req.body ?? '', /client_id=nes-client/);
        assert.match(req.body ?? '', /client_secret=nes-secret/);
        return {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            access_token: 'tok-nes-1',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
        };
      }

      assert.match(req.url, /\/fatura\/olustur$/);
      assert.equal(req.method, 'POST');
      assert.equal(req.headers?.Authorization, 'Bearer tok-nes-1');
      assert.match(req.body ?? '', /aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/);
      assert.match(req.body ?? '', /ublXml/);

      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ success: true, uuid: 'nes-ref-99', callId: 'call-1' }),
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());

  assert.equal(result.success, true);
  assert.equal(result.stub, false);
  assert.equal(result.provider, 'nes');
  assert.equal(result.providerRef, 'nes-ref-99');
  assert.equal(result.status, 'sent');
  assert.equal(calls.length, 2);
});

test('nes live: password grant tercih edilir (username+password doluysa)', async () => {
  let tokenBody = '';

  const adapter = new NesAdapter(
    {
      ...liveCredentials,
      username: 'nes-user',
      password: 'nes-pass',
    },
    false,
    {
      http: mockHttp((req) => {
        if (req.url.includes('/oauth/token')) {
          tokenBody = req.body ?? '';
          return {
            status: 200,
            headers: {},
            body: JSON.stringify({ access_token: 'tok-pw' }),
          };
        }
        return {
          status: 200,
          headers: {},
          body: JSON.stringify({ uuid: 'x' }),
        };
      }),
    },
  );

  await adapter.sendInvoice(draft());
  assert.match(tokenBody, /grant_type=password/);
  assert.match(tokenBody, /username=nes-user/);
  assert.match(tokenBody, /password=nes-pass/);
});

test('nes live: REST hata → success=false', async () => {
  const adapter = new NesAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      if (req.url.includes('/oauth/token')) {
        return {
          status: 200,
          headers: {},
          body: JSON.stringify({ access_token: 'tok' }),
        };
      }
      return {
        status: 403,
        headers: {},
        body: JSON.stringify({ message: 'Kontör yetersiz' }),
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());
  assert.equal(result.success, false);
  assert.equal(result.stub, false);
  assert.match(result.errorMessage ?? '', /Kontör yetersiz/);
});
