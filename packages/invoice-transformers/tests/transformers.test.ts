import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  NoterToDocumentTransformer,
  TransformValidationError,
  type NoterSozlesmeOcr,
  type TenantParty,
} from "../src/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

const tenant = loadJson<TenantParty>("examples/tenant-galeri.json");
const satisNoter = loadJson<NoterSozlesmeOcr>("examples/noter-satis-galeri.json");
const alisNoter = loadJson<NoterSozlesmeOcr>("examples/noter-alis-sahis.json");

test("galeri satışı → e-Fatura taslağı", () => {
  const transformer = new NoterToDocumentTransformer();
  const result = transformer.transform(satisNoter, tenant);

  assert.equal(result.belgeTuru, "efatura");
  assert.equal(result.draft.direction, "satis");
  assert.equal(result.draft.profileId, "TEMELFATURA");
  assert.equal(result.draft.accountingSupplierParty.partyIdentification.value, "1234567890");
  assert.equal(result.draft.accountingCustomerParty.partyIdentification.schemeId, "TCKN");
  assert.equal(result.draft.source.plaka, "06 ABC 123");
  assert.ok(result.summary.grandTotal > 0);
  assert.equal(result.summary.status, "draft");
});

test("şahıstan alış → Gider Pusulası taslağı", () => {
  const transformer = new NoterToDocumentTransformer();
  const result = transformer.transform(alisNoter, tenant);

  assert.equal(result.belgeTuru, "gider_pusulasi");
  assert.equal(result.draft.direction, "alis");
  assert.equal(result.draft.profileId, "GIDERPUSULASI");
  assert.equal(result.draft.accountingSupplierParty.partyIdentification.schemeId, "TCKN");
  assert.equal(result.draft.accountingCustomerParty.partyIdentification.value, "1234567890");
  assert.match(result.draft.invoiceLines[0]!.itemDescription ?? "", /Şasi/);
});

test("tenant eşleşmezse hata", () => {
  const transformer = new NoterToDocumentTransformer();
  const foreignTenant: TenantParty = { ...tenant, vknOrTckn: "0000000000" };

  assert.throws(
    () => transformer.transform(satisNoter, foreignTenant),
    (err: unknown) => err instanceof TransformValidationError,
  );
});

test("previewDirection satış yönünü gösterir", () => {
  const transformer = new NoterToDocumentTransformer();
  const preview = transformer.previewDirection(satisNoter, tenant);
  assert.equal(preview.yon, "satis");
  assert.equal(preview.belgeTuru, "efatura");
});
