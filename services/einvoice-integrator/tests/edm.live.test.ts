import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EdmAdapter } from '../src/adapters/edm.adapter.ts';
import type { HttpClient, HttpRequest, HttpResponse } from '../src/http/client.ts';
import type { InvoiceDraftPayload } from '../src/adapters/types.ts';

function mockHttp(handler: (req: HttpRequest) => HttpResponse | Promise<HttpResponse>): HttpClient {
  return {
    request: async (req) => handler(req),
  };
}

const liveCredentials = {
  baseUrl: 'https://test.example-edm.local',
  username: 'edm-user',
  password: 'edm-pass',
  vkn: '1234567890',
  apiKey: '',
};

const draft = (): InvoiceDraftPayload => ({
  kind: 'efatura',
  ettn: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  documentNumber: 'EDM2026000000001',
  issueDate: '2026-07-15',
  senderVkn: '1234567890',
  receiverVknOrTckn: '9876543210',
  receiverTitle: 'EDM Alıcı',
  netTotal: 100,
  vatTotal: 20,
  grandTotal: 120,
  ublXml: '<Invoice>ubl</Invoice>',
});

const loginOk = (): HttpResponse => ({
  status: 200,
  headers: { 'content-type': 'text/xml' },
  body:
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<s:Body><LoginResponse xmlns="http://tempuri.org/">` +
    `<SESSION_ID>session-edm-1</SESSION_ID>` +
    `</LoginResponse></s:Body></s:Envelope>`,
});

test('edm live: credentials yoksa anlamlı hata', async () => {
  const adapter = new EdmAdapter(
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
      /EDM_USERNAME/i.test(err.message),
  );
});

test('edm live: Login + SendInvoice SOAP gövdesi HTTP ile gider', async () => {
  const calls: HttpRequest[] = [];

  const adapter = new EdmAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      calls.push(req);
      if ((req.body ?? '').includes('LoginRequest')) return loginOk();
      return {
        status: 200,
        headers: { 'content-type': 'text/xml' },
        body:
          `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<s:Body><SendInvoiceResponse xmlns="http://tempuri.org/">` +
          `<REQUEST_RETURN><RETURN_CODE>0</RETURN_CODE><INTL_TXN_ID>99</INTL_TXN_ID></REQUEST_RETURN>` +
          `<INVOICE TRXID="99" UUID="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" ID="EDM-REF-1"/>` +
          `</SendInvoiceResponse></s:Body></s:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());

  assert.equal(result.success, true);
  assert.equal(result.stub, false);
  assert.equal(result.providerRef, 'EDM-REF-1');
  assert.equal(result.status, 'sent');
  assert.equal(calls.length, 2);
  assert.match(calls[0]!.body ?? '', /LoginRequest/);
  assert.match(calls[0]!.body ?? '', /edm-user/);
  assert.match(calls[1]!.body ?? '', /SendInvoiceRequest/);
  assert.match(calls[1]!.body ?? '', /session-edm-1/);
  assert.match(calls[1]!.headers?.SOAPAction ?? '', /SendInvoice/);
  assert.match(calls[1]!.url, /EFaturaEDM/);
});

test('edm live: SOAP Fault → success=false', async () => {
  const adapter = new EdmAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      if ((req.body ?? '').includes('LoginRequest')) return loginOk();
      return {
        status: 500,
        headers: {},
        body:
          `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<s:Body><s:Fault><faultstring>Oturum geçersiz</faultstring></s:Fault></s:Body>` +
          `</s:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());
  assert.equal(result.success, false);
  assert.equal(result.stub, false);
  assert.match(result.errorMessage ?? '', /Oturum geçersiz/);
});
