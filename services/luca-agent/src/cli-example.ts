/**
 * Örnek çıktı üretici: npm run example
 * XML'i stdout'a yazar; examples/ ile aynı senaryo.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportLucaXml } from './exporter.js';
import type { BankTransactionInput, InvoiceInput } from './types.js';

const invoices: InvoiceInput[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    kind: 'efatura',
    direction: 'sales',
    documentNumber: 'GIB2026000000123',
    issueDate: '2026-07-05',
    counterpartyTitle: 'Ahmet Yılmaz',
    counterpartyVkn: '12345678901',
    netTotal: 847457.63,
    vatTotal: 152542.37,
    grandTotal: 1000000,
    vatRate: 18,
    cariHesapEki: '01.001',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    kind: 'gider_pusulasi',
    direction: 'purchase',
    documentNumber: 'GP2026000000045',
    issueDate: '2026-07-08',
    counterpartyTitle: 'Mehmet Demir',
    counterpartyVkn: '98765432109',
    netTotal: 500000,
    vatTotal: 0,
    grandTotal: 400000,
    stopajAmount: 100000,
    cariHesapEki: '01.010',
  },
];

const bankTransactions: BankTransactionInput[] = [
  {
    id: 'b2000000-0000-4000-8000-000000000001',
    direction: 'inbound',
    amount: 1000000,
    transactionAt: '2026-07-06T14:22:00+03:00',
    valueDate: '2026-07-06',
    counterpartyName: 'Ahmet Yılmaz',
    description: '34 ABC 123 araç bedeli',
    bankName: 'Ziraat',
    matchedInvoiceDocumentNumber: 'GIB2026000000123',
    cariHesapEki: '01.001',
  },
  {
    id: 'b2000000-0000-4000-8000-000000000002',
    direction: 'outbound',
    amount: 400000,
    transactionAt: '2026-07-09T10:05:00+03:00',
    valueDate: '2026-07-09',
    counterpartyName: 'Mehmet Demir',
    description: 'Gider pusulası ödemesi GP2026000000045',
    bankName: 'Ziraat',
    cariHesapEki: '01.010',
  },
];

const result = exportLucaXml(
  { invoices, bankTransactions },
  {
    firma: {
      unvan: 'Örnek Oto Galeri Ltd. Şti.',
      vkn: '1234567890',
      donemYil: 2026,
      donemAy: 7,
    },
    baslangicFisNo: 1,
    metaYaz: true,
  },
);

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'examples', 'ornek-yevmiye-fisi.xml');
writeFileSync(outPath, result.xml, 'utf8');

console.log(`Yazıldı: ${outPath}`);
console.log(
  `Özet: ${result.ozet.fisAdedi} fiş, borc=${result.ozet.toplamBorc} alacak=${result.ozet.toplamAlacak} dengeli=${result.ozet.dengeli}`,
);
if (result.uyarilar.length) {
  console.log('Uyarılar:', result.uyarilar);
}
