import { roundMoney } from './format.js';
import { transformInvoice } from './transformers/invoice.js';
import { bankTransactionToFis } from './transformers/bank.js';
import { validateFisler } from './validate.js';
import { buildLucaXml } from './xml-builder.js';
import type {
  BankTransactionInput,
  InvoiceInput,
  LucaExportOptions,
  LucaExportResult,
  LucaFis,
} from './types.js';

export interface ExportBatchInput {
  invoices?: InvoiceInput[];
  bankTransactions?: BankTransactionInput[];
}

/**
 * e-Fatura, gider pusulası ve banka hareketlerini Luca yevmiye fişi XML'ine dönüştürür.
 */
export function exportLucaXml(
  batch: ExportBatchInput,
  options: LucaExportOptions,
): LucaExportResult {
  const uyarilar: string[] = [];
  const fisler: LucaFis[] = [];
  let fisNo = options.baslangicFisNo ?? 1;

  const invoices = [...(batch.invoices ?? [])].sort((a, b) =>
    a.issueDate.localeCompare(b.issueDate),
  );
  for (const inv of invoices) {
    if (inv.grandTotal <= 0 && inv.netTotal <= 0) {
      uyarilar.push(`Fatura ${inv.id}: tutar sıfır, atlandı.`);
      continue;
    }
    fisler.push(transformInvoice(inv, fisNo++, options));
  }

  const banks = [...(batch.bankTransactions ?? [])].sort((a, b) =>
    a.transactionAt.localeCompare(b.transactionAt),
  );
  for (const tx of banks) {
    if (tx.amount <= 0) {
      uyarilar.push(`Banka ${tx.id}: tutar geçersiz, atlandı.`);
      continue;
    }
    fisler.push(bankTransactionToFis(tx, fisNo++, options));
  }

  const issues = validateFisler(fisler);
  for (const i of issues) {
    uyarilar.push(`Fiş #${i.fisNo} [${i.seviye}]: ${i.mesaj}`);
  }

  const hatali = issues.some((i) => i.seviye === 'error');
  const toplamBorc = roundMoney(
    fisler.reduce((s, f) => s + f.satirlar.reduce((x, r) => x + r.borc, 0), 0),
  );
  const toplamAlacak = roundMoney(
    fisler.reduce((s, f) => s + f.satirlar.reduce((x, r) => x + r.alacak, 0), 0),
  );

  const xml = buildLucaXml(options.firma, fisler, options);

  return {
    fisler,
    xml,
    ozet: {
      fisAdedi: fisler.length,
      toplamBorc,
      toplamAlacak,
      dengeli: !hatali && toplamBorc === toplamAlacak,
    },
    uyarilar,
  };
}

/** Tek fatura / tek banka hareketi kısayolları */
export function exportInvoicesToLucaXml(
  invoices: InvoiceInput[],
  options: LucaExportOptions,
): LucaExportResult {
  return exportLucaXml({ invoices }, options);
}

export function exportBankToLucaXml(
  bankTransactions: BankTransactionInput[],
  options: LucaExportOptions,
): LucaExportResult {
  return exportLucaXml({ bankTransactions }, options);
}
