import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IzibizAdapter } from '../src/adapters/izibiz.adapter.ts';
import type { HttpClient, HttpRequest, HttpResponse } from '../src/http/client.ts';
import type { InvoiceDraftPayload } from '../src/adapters/types.ts';

function mockHttp(handler: (req: HttpRequest) => HttpResponse | Promise<HttpResponse>): HttpClient {
  return {
    request: async (req) => handler(req),
  };
}

const liveCredentials = {
  baseUrl: 'https://test.example-izibiz.local',
  username: 'izibiz-user',
  password: 'izibiz-pass',
  vkn: '1234567890',
  apiKey: '',
};

const draft = (): InvoiceDraftPayload => ({
  kind: 'efatura',
  ettn: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
  documentNumber: 'IZI2026000000001',
  issueDate: '2026-07-15',
  senderVkn: '1234567890',
  receiverVknOrTckn: '9876543210',
  receiverTitle: 'İzibiz Alıcı',
  netTotal: 100,
  vatTotal: 20,
  grandTotal: 120,
  ublXml: '<Invoice>ubl</Invoice>',
});

const loginOk = (): HttpResponse => ({
  status: 200,
  headers: { 'content-type': 'text/xml' },
  body:
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Body><LoginResponse xmlns="http://schemas.i2i.com/ei/wsdl">` +
    `<SESSION_ID>session-izibiz-1</SESSION_ID>` +
    `<REQUEST_RETURN><RETURN_CODE>0</RETURN_CODE></REQUEST_RETURN>` +
    `</LoginResponse></soap:Body></soap:Envelope>`,
});

test('izibiz live: credentials yoksa anlamlı hata', async () => {
  const adapter = new IzibizAdapter(
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
      /IZIBIZ_USERNAME/i.test(err.message),
  );
});

test('izibiz live: Login + SendInvoice SOAP gövdesi HTTP ile gider', async () => {
  const calls: HttpRequest[] = [];

  const adapter = new IzibizAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      calls.push(req);
      if ((req.body ?? '').includes('LoginRequest')) return loginOk();
      return {
        status: 200,
        headers: { 'content-type': 'text/xml' },
        body:
          `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<soap:Body><SendInvoiceResponse xmlns="http://schemas.i2i.com/ei/wsdl">` +
          `<REQUEST_RETURN><RETURN_CODE>0</RETURN_CODE><INTL_TXN_ID>77</INTL_TXN_ID></REQUEST_RETURN>` +
          `<INVOICE UUID="bbbbbbbb-cccc-dddd-eeee-ffffffffffff" ID="IZI-REF-1"/>` +
          `</SendInvoiceResponse></soap:Body></soap:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());

  assert.equal(result.success, true);
  assert.equal(result.stub, false);
  assert.equal(result.providerRef, 'IZI-REF-1');
  assert.equal(result.status, 'sent');
  assert.equal(calls.length, 2);
  assert.match(calls[0]!.url, /AuthenticationWS/);
  assert.match(calls[0]!.body ?? '', /LoginRequest/);
  assert.match(calls[0]!.body ?? '', /izibiz-user/);
  assert.match(calls[1]!.url, /EInvoiceWS/);
  assert.match(calls[1]!.body ?? '', /SendInvoiceRequest/);
  assert.match(calls[1]!.body ?? '', /session-izibiz-1/);
  assert.match(calls[1]!.headers?.SOAPAction ?? '', /SendInvoice/);
});

test('izibiz live: SOAP Fault → success=false', async () => {
  const adapter = new IzibizAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      if ((req.body ?? '').includes('LoginRequest')) return loginOk();
      return {
        status: 500,
        headers: {},
        body:
          `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<soap:Body><soap:Fault><faultstring>Geçersiz oturum</faultstring></soap:Fault></soap:Body>` +
          `</soap:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());
  assert.equal(result.success, false);
  assert.equal(result.stub, false);
  assert.match(result.errorMessage ?? '', /Geçersiz oturum/);
});
