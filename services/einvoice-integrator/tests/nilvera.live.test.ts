import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NilveraAdapter } from '../src/adapters/nilvera.adapter.ts';
import type { HttpClient, HttpRequest, HttpResponse } from '../src/http/client.ts';
import type { InvoiceDraftPayload } from '../src/adapters/types.ts';

function mockHttp(handler: (req: HttpRequest) => HttpResponse | Promise<HttpResponse>): HttpClient {
  return {
    request: async (req) => handler(req),
  };
}

const liveCredentials = {
  baseUrl: 'https://apitest.example-nilvera.local',
  username: '',
  password: '',
  vkn: '1234567890',
  apiKey: 'nilvera-test-api-key',
};

const draft = (): InvoiceDraftPayload => ({
  kind: 'efatura',
  ettn: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  documentNumber: 'NLV2026000000001',
  issueDate: '2026-07-15',
  senderVkn: '1234567890',
  receiverVknOrTckn: '9876543210',
  receiverTitle: 'Nilvera Alıcı',
  netTotal: 100,
  vatTotal: 20,
  grandTotal: 120,
  ublXml: '<Invoice>ubl</Invoice>',
});

test('nilvera live: credentials yoksa anlamlı hata', async () => {
  const adapter = new NilveraAdapter(
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
      /NILVERA_API_KEY/i.test(err.message),
  );
});

test('nilvera live: Send/Base64String REST gövdesi Bearer ile gider', async () => {
  let captured: HttpRequest | undefined;

  const adapter = new NilveraAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      captured = req;
      return {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          UUID: 'env-nilvera-42',
          InvoiceNumber: 'NLV2026000000099',
        }),
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());

  assert.equal(result.success, true);
  assert.equal(result.stub, false);
  assert.equal(result.providerRef, 'env-nilvera-42');
  assert.equal(result.documentNumber, 'NLV2026000000099');
  assert.equal(result.status, 'sent');
  assert.ok(captured);
  assert.match(captured!.url, /\/einvoice\/Send\/Base64String/);
  assert.equal(captured!.method, 'POST');
  assert.match(captured!.headers?.Authorization ?? '', /^Bearer nilvera-test-api-key$/);
  assert.match(captured!.body ?? '', /ZIPFileBase64/);
  assert.match(captured!.body ?? '', /Alias/);
});

test('nilvera live: HTTP hata → success=false', async () => {
  const adapter = new NilveraAdapter(liveCredentials, false, {
    http: mockHttp(() => ({
      status: 403,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ Message: 'Yetkisiz erişim' }),
    })),
  });

  const result = await adapter.sendInvoice(draft());
  assert.equal(result.success, false);
  assert.equal(result.stub, false);
  assert.match(result.errorMessage ?? '', /Yetkisiz erişim/);
});

test('nilvera live: username/password ile de auth olur', async () => {
  let auth = '';
  const adapter = new NilveraAdapter(
    {
      baseUrl: 'https://apitest.example-nilvera.local',
      username: 'portal-user',
      password: 'portal-secret-as-key',
      vkn: '1234567890',
      apiKey: '',
    },
    false,
    {
      http: mockHttp((req) => {
        auth = req.headers?.Authorization ?? '';
        return {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ UUID: 'u1' }),
        };
      }),
    },
  );

  const result = await adapter.sendInvoice(draft());
  assert.equal(result.success, true);
  assert.equal(auth, 'Bearer portal-secret-as-key');
});
