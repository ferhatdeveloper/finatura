import type { InvoiceDraftSummary } from "../models/ubl-tr/efatura-draft.js";
import type { GiderPusulasiDraft } from "../models/ubl-tr/gider-pusulasi-draft.js";
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
import { createEttn, isIndividual, todayIsoDate } from "../utils/identity.js";
import { computeVat, roundTry } from "../utils/money.js";
import {
  assertNoterMinimum,
  TransformValidationError,
} from "./detect-direction.js";

export class GiderPusulasiTransformer {
  /**
   * Şahıstan araç alış: satıcı = şahıs, alıcı = tenant (galeri).
   */
  transform(
    noter: NoterSozlesmeOcr,
    tenant: TenantParty,
    options: TransformOptions = {},
  ): { draft: GiderPusulasiDraft; summary: InvoiceDraftSummary } {
    assertNoterMinimum(noter);

    if (!isIndividual(noter.satici.tcknOrVkn)) {
      throw new TransformValidationError(
        "Gider Pusulası yalnızca şahıs (TCKN) satıcı için üretilir.",
      );
    }

    const vatRate = options.kdvOrani ?? 20;
    const stopajOrani = options.stopajOrani ?? 0;
    const bedelDahil = (noter.bedelTipi ?? "dahil") === "dahil";
    const issueDate = options.issueDate ?? noter.sozlesmeTarihi ?? todayIsoDate();
    const uuid = createEttn();

    const vat = computeVat(noter.satisBedeli, vatRate, bedelDahil);
    const stopajMatrah = vat.lineExtensionAmount;
    const stopajTutar = roundTry(stopajMatrah * (stopajOrani / 100));

    const supplier = buildParty({
      identity: noter.satici.tcknOrVkn,
      name: noter.satici.unvan ?? "Satıcı Şahıs",
      address: noter.satici.adres,
      taxOffice: noter.satici.vergiDairesi,
      telephone: noter.satici.telefon,
      email: noter.satici.email,
    });

    const customer = buildParty({
      identity: tenant.vknOrTckn,
      name: tenant.unvan,
      address: tenant.adres ?? noter.alici.adres,
      city: tenant.sehir,
      district: tenant.ilce,
      postalCode: tenant.postaKodu,
      countryCode: tenant.ulkeKodu ?? "TR",
      taxOffice: tenant.vergiDairesi ?? noter.alici.vergiDairesi,
      telephone: tenant.telefon ?? noter.alici.telefon,
      email: tenant.email ?? noter.alici.email,
    });

    const lineTax = buildKdvTaxTotal(
      vat.lineExtensionAmount,
      vat.taxAmount,
      vat.vatRate,
    );

    const payable = roundTry(vat.payableAmount - stopajTutar);

    const draft: GiderPusulasiDraft = {
      kind: "gider_pusulasi",
      direction: "alis",
      ublVersionId: "2.1",
      customizationId: "TR1.2",
      profileId: "GIDERPUSULASI",
      invoiceTypeCode: "SATIS",
      documentCurrencyCode: noter.paraBirimi ?? "TRY",
      uuid,
      id: options.documentNumber,
      issueDate,
      note: [
        `Şahıstan araç alımı — noter sözleşmesinden üretildi${
          noter.sozlesmeNo ? `: ${noter.sozlesmeNo}` : ""
        }`,
        vehicleItemDescription(noter.arac),
        stopajOrani > 0 ? `Stopaj %${stopajOrani}` : undefined,
      ].filter((n): n is string => Boolean(n)),
      accountingSupplierParty: supplier,
      accountingCustomerParty: customer,
      taxTotal: lineTax,
      withholdingTaxTotal:
        stopajOrani > 0
          ? {
              taxAmount: stopajTutar,
              taxSubtotals: [
                {
                  taxableAmount: stopajMatrah,
                  taxAmount: stopajTutar,
                  percent: stopajOrani,
                  taxTypeCode: "0003",
                  taxName: "GV Stopaj",
                },
              ],
            }
          : undefined,
      legalMonetaryTotal: {
        lineExtensionAmount: vat.lineExtensionAmount,
        taxExclusiveAmount: vat.taxExclusiveAmount,
        taxInclusiveAmount: vat.taxInclusiveAmount,
        payableAmount: payable,
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
      kind: "gider_pusulasi",
      direction: "alis",
      status: "draft",
      uuidEttn: uuid,
      issueDate,
      documentNumber: options.documentNumber,
      counterpartyTitle: supplier.partyName,
      counterpartyVkn: supplier.partyIdentification.value,
      currencyCode: draft.documentCurrencyCode,
      netTotal: vat.lineExtensionAmount,
      vatTotal: vat.taxAmount,
      grandTotal: payable,
      vatRate: vat.vatRate,
      notes: draft.note?.join(" | "),
      metadata: {
        transformer: "GiderPusulasiTransformer",
        plaka: noter.arac.plaka,
        saseNo: noter.arac.saseNo,
        sozlesmeNo: noter.sozlesmeNo,
        stopajOrani,
        stopajTutar,
      },
    };

    return { draft, summary };
  }
}
