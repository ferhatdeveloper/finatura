import type {
  InvoiceDraftSummary,
  TransformResult,
  UblInvoiceLine,
} from '@finatura/invoice-transformers';
import type { InvoiceDraftPayload, InvoiceKind, InvoiceLine } from '../adapters/types.js';

/**
 * Transformer (Aşama 3.1) çıktısından entegratör gönderim taslağına ince köprü.
 * UBL XML üretimi bu pakette yok; hazır `ublXml` opsiyonel olarak eklenir.
 */
export type TransformerBridgeInput =
  | TransformResult
  | {
      summary: InvoiceDraftSummary;
      /** TransformResult.draft — sender VKN çıkarımı için */
      draft?: {
        accountingSupplierParty: { partyIdentification: { value: string } };
        accountingCustomerParty: { partyIdentification: { value: string } };
        invoiceLines?: UblInvoiceLine[];
      };
      belgeTuru?: InvoiceDraftSummary['kind'];
    };

export interface FromTransformerOptions {
  /** Hazır UBL-TR XML (harici serileştirici veya gelecekteki exporter) */
  ublXml?: string;
  localInvoiceId?: string;
  /** Özet/draft’ta yoksa veya ezer */
  senderVkn?: string;
}

function mapLines(lines: UblInvoiceLine[] | undefined): InvoiceLine[] | undefined {
  if (!lines?.length) return undefined;
  return lines.map((line) => {
    const vatRate = line.taxTotal.taxSubtotals[0]?.percent ?? 0;
    const vatAmount = line.taxTotal.taxAmount;
    return {
      description: line.itemDescription ?? line.itemName,
      quantity: line.invoicedQuantity,
      unitCode: line.unitCode,
      unitPrice: line.priceAmount,
      vatRate,
      netAmount: line.lineExtensionAmount,
      vatAmount,
      lineTotal: line.lineExtensionAmount + vatAmount,
    };
  });
}

function resolveSenderVkn(
  input: TransformerBridgeInput,
  options: FromTransformerOptions,
): string {
  if (options.senderVkn?.trim()) return options.senderVkn.trim();

  const draft = 'draft' in input ? input.draft : undefined;
  const kind =
    'belgeTuru' in input && input.belgeTuru
      ? input.belgeTuru
      : input.summary.kind;

  if (draft) {
    // Gider pusulasında tenant = müşteri (alan); e-Fatura’da tenant = satıcı
    if (kind === 'gider_pusulasi') {
      return draft.accountingCustomerParty.partyIdentification.value;
    }
    return draft.accountingSupplierParty.partyIdentification.value;
  }

  throw Object.assign(
    new Error(
      'fromTransformer: senderVkn gerekli (options.senderVkn veya TransformResult.draft).',
    ),
    { status: 400 },
  );
}

/**
 * `@finatura/invoice-transformers` TransformResult / özet → InvoiceDraftPayload
 */
export function invoiceDraftFromTransformer(
  input: TransformerBridgeInput,
  options: FromTransformerOptions = {},
): InvoiceDraftPayload {
  const { summary } = input;
  const kind = summary.kind as InvoiceKind;
  const draft = 'draft' in input ? input.draft : undefined;
  const senderVkn = resolveSenderVkn(input, options);

  return {
    localInvoiceId: options.localInvoiceId,
    ettn: summary.uuidEttn,
    documentNumber: summary.documentNumber,
    kind,
    issueDate: summary.issueDate,
    senderVkn,
    receiverVknOrTckn: summary.counterpartyVkn,
    receiverTitle: summary.counterpartyTitle,
    currencyCode: summary.currencyCode || 'TRY',
    netTotal: summary.netTotal,
    vatTotal: summary.vatTotal,
    grandTotal: summary.grandTotal,
    vatRate: summary.vatRate,
    ublXml: options.ublXml,
    lines: mapLines(draft?.invoiceLines),
    metadata: {
      ...summary.metadata,
      direction: summary.direction,
      transformerBridge: true,
    },
  };
}
