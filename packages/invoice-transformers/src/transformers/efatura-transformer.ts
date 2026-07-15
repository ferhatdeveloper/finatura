import type { InvoiceDraftSummary, UblTrInvoiceDraft } from "../models/ubl-tr/efatura-draft.js";
import {
  buildKdvTaxTotal,
  vehicleItemDescription,
  vehicleItemName,
} from "../models/ubl-tr/line-and-tax.js";
import { buildParty } from "../models/ubl-tr/party.js";
import type {
  NoterSozlesmeOcr,
  TenantParty,
  TransformOptions,
} from "../types/noter-sozlesme.js";
import { createEttn, todayIsoDate } from "../utils/identity.js";
import { computeMarginVat, computeVat } from "../utils/money.js";
import {
  assertNoterMinimum,
  TransformValidationError,
} from "./detect-direction.js";

export class EFaturaTransformer {
  /**
   * Galeri araç satışı: tenant = satıcı, karşı taraf = alıcı.
   */
  transform(
    noter: NoterSozlesmeOcr,
    tenant: TenantParty,
    options: TransformOptions = {},
  ): { draft: UblTrInvoiceDraft; summary: InvoiceDraftSummary } {
    assertNoterMinimum(noter);

    const vatRate = options.kdvOrani ?? 20;
    const bedelDahil = (noter.bedelTipi ?? "dahil") === "dahil";
    const issueDate = options.issueDate ?? noter.sozlesmeTarihi ?? todayIsoDate();
    const uuid = createEttn();
    const kind = options.forceBelgeTuru === "earsiv" || tenant.eFaturaMukellefi === false
      ? "earsiv"
      : "efatura";

    const vat =
      options.alisMaliyeti != null
        ? computeMarginVat(noter.satisBedeli, options.alisMaliyeti, vatRate)
        : computeVat(noter.satisBedeli, vatRate, bedelDahil);

    const supplier = buildParty({
      identity: tenant.vknOrTckn,
      name: tenant.unvan,
      address: tenant.adres ?? noter.satici.adres,
      city: tenant.sehir,
      district: tenant.ilce,
      postalCode: tenant.postaKodu,
      countryCode: tenant.ulkeKodu ?? "TR",
      taxOffice: tenant.vergiDairesi ?? noter.satici.vergiDairesi,
      telephone: tenant.telefon ?? noter.satici.telefon,
      email: tenant.email ?? noter.satici.email,
    });

    const customer = buildParty({
      identity: noter.alici.tcknOrVkn,
      name: noter.alici.unvan ?? "Alıcı",
      address: noter.alici.adres,
      taxOffice: noter.alici.vergiDairesi,
      telephone: noter.alici.telefon,
      email: noter.alici.email,
    });

    if (!customer.partyName) {
      throw new TransformValidationError("Alıcı unvanı eksik.");
    }

    const lineTax = buildKdvTaxTotal(
      vat.lineExtensionAmount,
      vat.taxAmount,
      vat.vatRate,
    );

    const draft: UblTrInvoiceDraft = {
      kind,
      direction: "satis",
      ublVersionId: "2.1",
      customizationId: "TR1.2",
      profileId: kind === "earsiv" ? "EARSIVFATURA" : "TEMELFATURA",
      invoiceTypeCode: "SATIS",
      documentCurrencyCode: noter.paraBirimi ?? "TRY",
      uuid,
      id: options.documentNumber,
      issueDate,
      note: [
        `Noter satış sözleşmesinden üretildi${noter.sozlesmeNo ? `: ${noter.sozlesmeNo}` : ""}`,
        vehicleItemDescription(noter.arac),
        options.alisMaliyeti != null
          ? `KDV fark yöntemi (alış maliyeti: ${options.alisMaliyeti})`
          : undefined,
      ].filter((n): n is string => Boolean(n)),
      accountingSupplierParty: supplier,
      accountingCustomerParty: customer,
      taxTotal: lineTax,
      legalMonetaryTotal: {
        lineExtensionAmount: vat.lineExtensionAmount,
        taxExclusiveAmount: vat.taxExclusiveAmount,
        taxInclusiveAmount: vat.taxInclusiveAmount,
        payableAmount: vat.payableAmount,
      },
      invoiceLines: [
        {
          id: "1",
          invoicedQuantity: 1,
          unitCode: "C62",
          lineExtensionAmount: vat.lineExtensionAmount,
          itemName: vehicleItemName(noter.arac),
          itemDescription: vehicleItemDescription(noter.arac),
          sellersItemIdentification: noter.arac.plaka,
          priceAmount: vat.lineExtensionAmount,
          taxTotal: lineTax,
        },
      ],
      source: {
        documentType: "noter_sozlesme",
        sozlesmeNo: noter.sozlesmeNo,
        kaynakBelgeId: noter.kaynakBelgeId,
        plaka: noter.arac.plaka,
        saseNo: noter.arac.saseNo,
      },
    };

    const summary: InvoiceDraftSummary = {
      kind,
      direction: "satis",
      status: "draft",
      uuidEttn: uuid,
      issueDate,
      documentNumber: options.documentNumber,
      counterpartyTitle: customer.partyName,
      counterpartyVkn: customer.partyIdentification.value,
      currencyCode: draft.documentCurrencyCode,
      netTotal: vat.lineExtensionAmount,
      vatTotal: vat.taxAmount,
      grandTotal: vat.payableAmount,
      vatRate: vat.vatRate,
      notes: draft.note?.join(" | "),
      metadata: {
        transformer: "EFaturaTransformer",
        plaka: noter.arac.plaka,
        saseNo: noter.arac.saseNo,
        sozlesmeNo: noter.sozlesmeNo,
        marginVat: options.alisMaliyeti != null,
      },
    };

    return { draft, summary };
  }
}
