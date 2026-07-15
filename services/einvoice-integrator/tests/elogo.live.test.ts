import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ElogoAdapter } from '../src/adapters/elogo.adapter.ts';
import type { HttpClient, HttpRequest, HttpResponse } from '../src/http/client.ts';
import type { InvoiceDraftPayload } from '../src/adapters/types.ts';

function mockHttp(handler: (req: HttpRequest) => HttpResponse | Promise<HttpResponse>): HttpClient {
  return {
    request: async (req) => handler(req),
  };
}

const liveCredentials = {
  baseUrl: 'https://test.example-elogo.local',
  username: 'elogo-user',
  password: 'elogo-pass',
  vkn: '1234567890',
  apiKey: '',
};

const draft = (): InvoiceDraftPayload => ({
  kind: 'efatura',
  ettn: '11111111-2222-3333-4444-555555555555',
  documentNumber: 'ELG2026000000001',
  issueDate: '2026-07-15',
  senderVkn: '1234567890',
  receiverVknOrTckn: '9876543210',
  receiverTitle: 'eLogo Alıcı',
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
    `<soap:Body><LoginResponse xmlns="http://tempuri.org/">` +
    `<LoginResult>true</LoginResult>` +
    `<sessionID>session-elogo-1</sessionID>` +
    `</LoginResponse></soap:Body></soap:Envelope>`,
});

test('elogo live: credentials yoksa anlamlı hata', async () => {
  const adapter = new ElogoAdapter(
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
      /ELOGO_USERNAME/i.test(err.message),
  );
});

test('elogo live: Login + SendDocument SOAP gövdesi HTTP ile gider', async () => {
  const calls: HttpRequest[] = [];

  const adapter = new ElogoAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      calls.push(req);
      if ((req.body ?? '').includes('<tem:Login>') || (req.body ?? '').includes(':Login>')) {
        return loginOk();
      }
      return {
        status: 200,
        headers: { 'content-type': 'text/xml' },
        body:
          `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<soap:Body><SendDocumentResponse xmlns="http://tempuri.org/">` +
          `<uuid>ref-elogo-99</uuid>` +
          `</SendDocumentResponse></soap:Body></soap:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());

  assert.equal(result.success, true);
  assert.equal(result.stub, false);
  assert.equal(result.providerRef, 'ref-elogo-99');
  assert.equal(result.status, 'sent');
  assert.equal(calls.length, 2);
  assert.match(calls[0]!.body ?? '', /Login/);
  assert.match(calls[0]!.body ?? '', /elogo-user/);
  assert.match(calls[0]!.body ?? '', /passWord/);
  assert.match(calls[1]!.body ?? '', /SendDocument/);
  assert.match(calls[1]!.body ?? '', /session-elogo-1/);
  assert.match(calls[1]!.body ?? '', /binaryData/);
  assert.match(calls[1]!.headers?.SOAPAction ?? '', /SendDocument/);
  assert.match(calls[1]!.url, /PostBoxService/);
});

test('elogo live: SOAP Fault → success=false', async () => {
  const adapter = new ElogoAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      if ((req.body ?? '').includes('Login')) return loginOk();
      return {
        status: 500,
        headers: {},
        body:
          `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<soap:Body><soap:Fault><faultstring>Oturum süresi doldu</faultstring></soap:Fault></soap:Body>` +
          `</soap:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());
  assert.equal(result.success, false);
  assert.equal(result.stub, false);
  assert.match(result.errorMessage ?? '', /Oturum süresi doldu/);
});
