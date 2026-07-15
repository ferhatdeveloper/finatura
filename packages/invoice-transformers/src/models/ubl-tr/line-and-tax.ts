export interface UblTaxSubtotal {
  taxableAmount: number;
  taxAmount: number;
  percent: number;
  /** UBL-TR vergi tipi; KDV=0015, stopaj senaryolarında adapter map eder */
  taxTypeCode: string;
  taxName: string;
}

export interface UblTaxTotal {
  taxAmount: number;
  taxSubtotals: UblTaxSubtotal[];
}

export interface UblMonetaryTotal {
  lineExtensionAmount: number;
  taxExclusiveAmount: number;
  taxInclusiveAmount: number;
  allowanceTotalAmount?: number;
  chargeTotalAmount?: number;
  payableAmount: number;
}

export interface UblInvoiceLine {
  id: string;
  invoicedQuantity: number;
  unitCode: string;
  lineExtensionAmount: number;
  itemName: string;
  itemDescription?: string;
  sellersItemIdentification?: string;
  priceAmount: number;
  taxTotal: UblTaxTotal;
}

export interface VehicleLineContext {
  plaka: string;
  saseNo: string;
  motorNo?: string;
  marka?: string;
  model?: string;
  modelYili?: number;
}

export function vehicleItemName(v: VehicleLineContext): string {
  const parts = [v.marka, v.model, v.modelYili?.toString(), "İkinci El Motorlu Taşıt"]
    .filter(Boolean)
    .join(" ");
  return parts || "İkinci El Motorlu Taşıt";
}

export function vehicleItemDescription(v: VehicleLineContext): string {
  const bits = [
    `Plaka: ${v.plaka}`,
    `Şasi: ${v.saseNo}`,
    v.motorNo ? `Motor: ${v.motorNo}` : undefined,
  ].filter(Boolean);
  return bits.join(" | ");
}

export function buildKdvTaxTotal(taxable: number, taxAmount: number, percent: number): UblTaxTotal {
  return {
    taxAmount,
    taxSubtotals: [
      {
        taxableAmount: taxable,
        taxAmount,
        percent,
        taxTypeCode: "0015",
        taxName: "KDV",
      },
    ],
  };
}
