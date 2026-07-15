import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createIntegrator } from '../src/adapters/index.ts';
import { runSendApprovePdfFlow } from '../src/flow/sendApprovePdf.ts';
import type { InvoiceDraftPayload } from '../src/adapters/types.ts';

const sampleDraft = (): InvoiceDraftPayload => ({
  kind: 'efatura',
  issueDate: '2026-07-15',
  senderVkn: '1234567890',
  receiverVknOrTckn: '9876543210',
  receiverTitle: 'Stub Alıcı A.Ş.',
  netTotal: 1000,
  vatTotal: 200,
  grandTotal: 1200,
  vatRate: 20,
  ublXml: '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/>',
  localInvoiceId: 'inv-stub-1',
});

test('stub: Uyumsoft send → approve → pdf akışı', async () => {
  const integrator = createIntegrator('uyumsoft', true);
  const result = await runSendApprovePdfFlow(integrator, sampleDraft());

  assert.equal(result.ok, true);
  assert.equal(result.stage, 'complete');
  assert.ok(result.ettn);
  assert.equal(result.send?.stub, true);
  assert.equal(result.send?.success, true);
  assert.equal(result.send?.status, 'sent');
  assert.equal(result.approve?.status, 'accepted');
  assert.equal(result.pdf?.contentType, 'application/pdf');
  assert.ok(result.pdf?.base64);
});

test('stub: EDM sendInvoice tek adım', async () => {
  const integrator = createIntegrator('edm', { stubMode: true });
  const send = await integrator.sendInvoice(sampleDraft());
  assert.equal(send.success, true);
  assert.equal(send.stub, true);
  assert.equal(send.provider, 'edm');
  assert.match(send.providerRef ?? '', /^stub-edm-/);
});

test('stub: e-Arşiv skipApprove ile flow', async () => {
  const integrator = createIntegrator('fit', true);
  const result = await runSendApprovePdfFlow(
    integrator,
    { ...sampleDraft(), kind: 'earsiv' },
    { skipApprove: true },
  );
  assert.equal(result.ok, true);
  assert.equal(result.approve, undefined);
  assert.ok(result.pdf?.success);
});

test('stub: Nilvera sendInvoice tek adım', async () => {
  const integrator = createIntegrator('nilvera', { stubMode: true });
  const send = await integrator.sendInvoice(sampleDraft());
  assert.equal(send.success, true);
  assert.equal(send.stub, true);
  assert.equal(send.provider, 'nilvera');
  assert.match(send.providerRef ?? '', /^stub-nilvera-/);
});

test('stub: factory 8 provider oluşturur', () => {
  const providers = [
    'edm',
    'uyumsoft',
    'fit',
    'elogo',
    'qnb',
    'nes',
    'nilvera',
    'izibiz',
  ] as const;
  for (const p of providers) {
    const integrator = createIntegrator(p, true);
    assert.equal(integrator.provider, p);
  }
});
