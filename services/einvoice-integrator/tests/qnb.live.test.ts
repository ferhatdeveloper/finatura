import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QnbAdapter } from '../src/adapters/qnb.adapter.ts';
import type { HttpClient, HttpRequest, HttpResponse } from '../src/http/client.ts';
import type { InvoiceDraftPayload } from '../src/adapters/types.ts';

function mockHttp(handler: (req: HttpRequest) => HttpResponse | Promise<HttpResponse>): HttpClient {
  return {
    request: async (req) => handler(req),
  };
}

const liveCredentials = {
  baseUrl: 'https://test.example-qnb.local',
  username: 'qnb-user',
  password: 'qnb-pass',
  vkn: '1234567890',
  apiKey: '',
};

const draft = (): InvoiceDraftPayload => ({
  kind: 'efatura',
  ettn: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
  documentNumber: 'QNB2026000000001',
  issueDate: '2026-07-15',
  senderVkn: '1234567890',
  receiverVknOrTckn: '9876543210',
  receiverTitle: 'QNB Alıcı',
  netTotal: 100,
  vatTotal: 20,
  grandTotal: 120,
  ublXml: '<Invoice>ubl</Invoice>',
});

const loginOk = (): HttpResponse => ({
  status: 200,
  headers: {
    'content-type': 'text/xml',
    'set-cookie': 'JSESSIONID=session-qnb-1; Path=/; HttpOnly',
  },
  body:
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Body><wsLoginResponse><return>true</return></wsLoginResponse></soap:Body>` +
    `</soap:Envelope>`,
});

test('qnb live: credentials yoksa anlamlı hata', async () => {
  const adapter = new QnbAdapter(
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
      /QNB_USERNAME/i.test(err.message),
  );
});

test('qnb live: Login + belgeGonderExt SOAP gövdesi HTTP ile gider', async () => {
  const calls: HttpRequest[] = [];

  const adapter = new QnbAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      calls.push(req);
      if ((req.body ?? '').includes('wsLogin')) return loginOk();
      return {
        status: 200,
        headers: { 'content-type': 'text/xml' },
        body:
          `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<soap:Body><belgeGonderExtResponse><return>belge-oid-qnb-42</return></belgeGonderExtResponse></soap:Body>` +
          `</soap:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());

  assert.equal(result.success, true);
  assert.equal(result.stub, false);
  assert.equal(result.providerRef, 'belge-oid-qnb-42');
  assert.equal(result.status, 'sent');
  assert.equal(calls.length, 2);
  assert.match(calls[0]!.url, /userService/);
  assert.match(calls[0]!.body ?? '', /wsLogin/);
  assert.match(calls[0]!.body ?? '', /qnb-user/);
  assert.match(calls[1]!.url, /connectorService/);
  assert.match(calls[1]!.body ?? '', /belgeGonderExt/);
  assert.match(calls[1]!.body ?? '', /FATURA_UBL/);
  assert.match(calls[1]!.headers?.Cookie ?? '', /session-qnb-1/);
  assert.match(calls[1]!.headers?.SOAPAction ?? '', /belgeGonderExt/);
});

test('qnb live: SOAP Fault → success=false', async () => {
  const adapter = new QnbAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      if ((req.body ?? '').includes('wsLogin')) return loginOk();
      return {
        status: 500,
        headers: {},
        body:
          `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<soap:Body><soap:Fault><faultstring>Yetkisiz erişim</faultstring></soap:Fault></soap:Body>` +
          `</soap:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());
  assert.equal(result.success, false);
  assert.equal(result.stub, false);
  assert.match(result.errorMessage ?? '', /Yetkisiz erişim/);
});
