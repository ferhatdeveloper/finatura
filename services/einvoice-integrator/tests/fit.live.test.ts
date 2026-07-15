import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FitAdapter } from '../src/adapters/fit.adapter.ts';
import type { HttpClient, HttpRequest, HttpResponse } from '../src/http/client.ts';
import type { InvoiceDraftPayload } from '../src/adapters/types.ts';

function mockHttp(handler: (req: HttpRequest) => HttpResponse | Promise<HttpResponse>): HttpClient {
  return {
    request: async (req) => handler(req),
  };
}

const liveCredentials = {
  baseUrl: 'https://test.example-fit.local',
  username: 'fit-user',
  password: 'fit-pass',
  vkn: '1234567890',
  apiKey: '',
};

const draft = (): InvoiceDraftPayload => ({
  kind: 'efatura',
  ettn: 'ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb',
  documentNumber: 'FIT2026000000001',
  issueDate: '2026-07-15',
  senderVkn: '1234567890',
  receiverVknOrTckn: '9876543210',
  receiverTitle: 'FIT Alıcı',
  netTotal: 100,
  vatTotal: 20,
  grandTotal: 120,
  ublXml: '<Invoice>ubl</Invoice>',
});

test('fit live: credentials yoksa anlamlı hata', async () => {
  const adapter = new FitAdapter(
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
      /FIT_USERNAME/i.test(err.message),
  );
});

test('fit live: SendUBL SOAP gövdesi HTTP ile gider', async () => {
  let captured: HttpRequest | undefined;

  const adapter = new FitAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      captured = req;
      return {
        status: 200,
        headers: { 'content-type': 'text/xml' },
        body:
          `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<soap:Body><SendUBLResponse><UUID>env-fit-42</UUID></SendUBLResponse></soap:Body>` +
          `</soap:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());

  assert.equal(result.success, true);
  assert.equal(result.stub, false);
  assert.equal(result.providerRef, 'env-fit-42');
  assert.equal(result.status, 'sent');
  assert.ok(captured);
  assert.match(captured!.url, /ClientEInvoice/);
  assert.match(captured!.body ?? '', /SendUBL/);
  assert.match(captured!.body ?? '', /fit-user/);
  assert.match(captured!.body ?? '', /DocData/);
  assert.match(captured!.headers?.SOAPAction ?? '', /SendUBL/);
  assert.match(captured!.headers?.Authorization ?? '', /^Basic /);
});

test('fit live: SOAP Fault → success=false', async () => {
  const adapter = new FitAdapter(liveCredentials, false, {
    http: mockHttp(() => ({
      status: 500,
      headers: {},
      body:
        `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
        `<soap:Body><soap:Fault><faultstring>Yetkisiz erişim</faultstring></soap:Fault></soap:Body>` +
        `</soap:Envelope>`,
    })),
  });

  const result = await adapter.sendInvoice(draft());
  assert.equal(result.success, false);
  assert.equal(result.stub, false);
  assert.match(result.errorMessage ?? '', /Yetkisiz erişim/);
});
