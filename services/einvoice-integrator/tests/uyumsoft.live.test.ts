import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UyumsoftAdapter } from '../src/adapters/uyumsoft.adapter.ts';
import { invoiceDraftFromTransformer } from '../src/flow/fromTransformerDraft.ts';
import type { HttpClient, HttpRequest, HttpResponse } from '../src/http/client.ts';
import type { InvoiceDraftPayload } from '../src/adapters/types.ts';
import type { TransformResult } from '@finatura/invoice-transformers';

function mockHttp(handler: (req: HttpRequest) => HttpResponse | Promise<HttpResponse>): HttpClient {
  return {
    request: async (req) => handler(req),
  };
}

const liveCredentials = {
  baseUrl: 'https://efatura-test.example-uyumsoft.local',
  username: 'demo-user',
  password: 'demo-pass',
  vkn: '1234567890',
  apiKey: '',
};

const draft = (): InvoiceDraftPayload => ({
  kind: 'efatura',
  ettn: '11111111-2222-3333-4444-555555555555',
  documentNumber: 'UYU2026000000001',
  issueDate: '2026-07-15',
  senderVkn: '1234567890',
  receiverVknOrTckn: '9876543210',
  receiverTitle: 'Canlı Alıcı',
  netTotal: 100,
  vatTotal: 20,
  grandTotal: 120,
  ublXml: '<Invoice>ubl</Invoice>',
});

test('live: credentials yoksa anlamlı hata', async () => {
  const adapter = new UyumsoftAdapter(
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
      /UYUMSOFT_USERNAME/i.test(err.message),
  );
});

test('live: SendInvoice SOAP gövdesi HTTP ile gider', async () => {
  let captured: HttpRequest | undefined;

  const adapter = new UyumsoftAdapter(liveCredentials, false, {
    http: mockHttp((req) => {
      captured = req;
      return {
        status: 200,
        headers: { 'content-type': 'text/xml' },
        body:
          `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
          `<soap:Body><SendInvoiceResponse><InvoiceId>prov-99</InvoiceId></SendInvoiceResponse></soap:Body>` +
          `</soap:Envelope>`,
      };
    }),
  });

  const result = await adapter.sendInvoice(draft());

  assert.equal(result.success, true);
  assert.equal(result.stub, false);
  assert.equal(result.providerRef, 'prov-99');
  assert.equal(result.status, 'sent');
  assert.ok(captured);
  assert.match(captured!.url, /BasicIntegration/);
  assert.match(captured!.body ?? '', /SendInvoice/);
  assert.match(captured!.body ?? '', /demo-user/);
  assert.match(captured!.headers?.SOAPAction ?? '', /SendInvoice/);
});

test('live: SOAP Fault → success=false', async () => {
  const adapter = new UyumsoftAdapter(liveCredentials, false, {
    http: mockHttp(() => ({
      status: 500,
      headers: {},
      body:
        `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
        `<soap:Body><soap:Fault><faultstring>Yetkisiz</faultstring></soap:Fault></soap:Body>` +
        `</soap:Envelope>`,
    })),
  });

  const result = await adapter.sendInvoice(draft());
  assert.equal(result.success, false);
  assert.equal(result.stub, false);
  assert.match(result.errorMessage ?? '', /Yetkisiz/);
});

test('fromTransformer: TransformResult → InvoiceDraftPayload', () => {
  const transformResult = {
    belgeTuru: 'efatura',
    draft: {
      accountingSupplierParty: {
        partyIdentification: { schemeId: 'VKN', value: '1234567890' },
      },
      accountingCustomerParty: {
        partyIdentification: { schemeId: 'TCKN', value: '11111111111' },
      },
      invoiceLines: [
        {
          id: '1',
          invoicedQuantity: 1,
          unitCode: 'C62',
          lineExtensionAmount: 1000,
          itemName: 'Araç',
          itemDescription: 'Plaka: 06 ABC',
          priceAmount: 1000,
          taxTotal: {
            taxAmount: 200,
            taxSubtotals: [
              {
                taxableAmount: 1000,
                taxAmount: 200,
                percent: 20,
                taxTypeCode: '0015',
                taxName: 'KDV',
              },
            ],
          },
        },
      ],
    },
    summary: {
      kind: 'efatura',
      direction: 'satis',
      status: 'draft',
      uuidEttn: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      issueDate: '2026-07-15',
      counterpartyTitle: 'Alıcı Şahıs',
      counterpartyVkn: '11111111111',
      currencyCode: 'TRY',
      netTotal: 1000,
      vatTotal: 200,
      grandTotal: 1200,
      vatRate: 20,
      metadata: { transformer: 'EFaturaTransformer' },
    },
  } as TransformResult;

  const payload = invoiceDraftFromTransformer(transformResult, {
    ublXml: '<Invoice/>',
    localInvoiceId: 'local-1',
  });

  assert.equal(payload.kind, 'efatura');
  assert.equal(payload.ettn, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  assert.equal(payload.senderVkn, '1234567890');
  assert.equal(payload.receiverTitle, 'Alıcı Şahıs');
  assert.equal(payload.ublXml, '<Invoice/>');
  assert.equal(payload.lines?.[0]?.description, 'Plaka: 06 ABC');
  assert.equal(payload.metadata?.transformerBridge, true);
});
