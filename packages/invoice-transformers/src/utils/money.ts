/** Kuruş hassasiyetinde yuvarlama (TRY). */
export function roundTry(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface VatBreakdown {
  /** KDV matrahı */
  lineExtensionAmount: number;
  taxAmount: number;
  taxInclusiveAmount: number;
  taxExclusiveAmount: number;
  payableAmount: number;
  vatRate: number;
}

/**
 * Bedelden matrah + KDV üretir.
 * bedelDahil=true ise tutar KDV dahil kabul edilir.
 */
export function computeVat(
  amount: number,
  vatRatePercent: number,
  bedelDahil: boolean,
): VatBreakdown {
  const rate = vatRatePercent / 100;
  let lineExtensionAmount: number;
  let taxAmount: number;
  let taxInclusiveAmount: number;

  if (bedelDahil) {
    taxInclusiveAmount = roundTry(amount);
    lineExtensionAmount = roundTry(taxInclusiveAmount / (1 + rate));
    taxAmount = roundTry(taxInclusiveAmount - lineExtensionAmount);
  } else {
    lineExtensionAmount = roundTry(amount);
    taxAmount = roundTry(lineExtensionAmount * rate);
    taxInclusiveAmount = roundTry(lineExtensionAmount + taxAmount);
  }

  return {
    lineExtensionAmount,
    taxAmount,
    taxInclusiveAmount,
    taxExclusiveAmount: lineExtensionAmount,
    payableAmount: taxInclusiveAmount,
    vatRate: vatRatePercent,
  };
}

/**
 * Fark üzerinden KDV (ikinci el araç) — matrah = satış − alış, KDV matrah üzerinden.
 * satişBedeli burada KDV hariç fark matrahı olarak işlenir (sadeleştirilmiş taslak).
 */
export function computeMarginVat(
  saleAmountInclusive: number,
  costAmount: number,
  vatRatePercent: number,
): VatBreakdown {
  const margin = Math.max(0, roundTry(saleAmountInclusive - costAmount));
  // Fark tutarını KDV dahil varsayarak parçalarız (galeri pratiği).
  return computeVat(margin, vatRatePercent, true);
}
