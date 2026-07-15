# Finatura Luca Agent — AŞAMA 5.1

Mali müşavir entegrasyon ajanı: tenant DB’de biriken **e-Fatura**, **gider pusulası** ve **banka hareketlerini** Luca’nın fiş aktarımına uygun **yevmiye fişi XML** formatına dönüştürür.

Paket: `@finatura/luca-agent`  
Sahiplik: `services/luca-agent/`

---

## Ne üretir?

Çift kayıtlı mahsup fişleri:

| Kaynak | Tipik kayıt |
|--------|-------------|
| e-Fatura / e-Arşiv satış | 120 / 600 / 391 |
| e-Fatura alış | 153 / 191 / 320 |
| Gider pusulası | 153 / 320 / 360 (stopaj) |
| Banka gelen | 102 / 120 |
| Banka giden | 320 / 102 |

Hesap kodları `AccountMap` ile firma planına göre değiştirilebilir.

---

## Kurulum

```bash
cd services/luca-agent
npm install
npm run typecheck
npm run build
```

Örnek XML üret ( `examples/ornek-yevmiye-fisi.xml` ):

```bash
npm run example
```

---

## Kullanım

```ts
import { exportLucaXml } from '@finatura/luca-agent';

const result = exportLucaXml(
  {
    invoices: [
      {
        id: '...',
        kind: 'efatura',
        direction: 'sales',
        documentNumber: 'GIB2026000000123',
        issueDate: '2026-07-05',
        counterpartyTitle: 'Ahmet Yılmaz',
        counterpartyVkn: '12345678901',
        netTotal: 847457.63,
        vatTotal: 152542.37,
        grandTotal: 1000000,
        cariHesapEki: '01.001',
      },
      {
        id: '...',
        kind: 'gider_pusulasi',
        direction: 'purchase',
        documentNumber: 'GP2026000000045',
        issueDate: '2026-07-08',
        counterpartyTitle: 'Mehmet Demir',
        netTotal: 500000,
        vatTotal: 0,
        grandTotal: 400000,
        stopajAmount: 100000,
      },
    ],
    bankTransactions: [
      {
        id: '...',
        direction: 'inbound',
        amount: 1000000,
        transactionAt: '2026-07-06T14:22:00+03:00',
        description: '34 ABC 123 araç bedeli',
        cariHesapEki: '01.001',
      },
    ],
  },
  {
    firma: {
      unvan: 'Örnek Oto Galeri Ltd. Şti.',
      vkn: '1234567890',
      donemYil: 2026,
      donemAy: 7,
    },
    // accountMap: { alicilar: '120.01', bankalar: '102.01' },
    varsayilanStopajOrani: 0.2,
  },
);

// result.xml  → dosyaya yaz / portalden indir
// result.ozet → fiş adedi, borç/alacak, dengeli mi
// result.uyarilar → doğrulama uyarıları
```

---

## Dosya yapısı

```
services/luca-agent/
├── README.md
├── package.json
├── tsconfig.json
├── docs/
│   └── SCHEMA.md              # XML şema dokümantasyonu
├── examples/
│   └── ornek-yevmiye-fisi.xml # galeri senaryosu örneği
└── src/
    ├── index.ts               # public API
    ├── types.ts
    ├── account-map.ts         # varsayılan TDHP
    ├── format.ts
    ├── validate.ts            # borç=alacak kontrolü
    ├── xml-builder.ts
    ├── exporter.ts            # ana exportLucaXml
    ├── cli-example.ts
    └── transformers/
        ├── invoice.ts         # e-fatura + gider pusulası
        └── bank.ts
```

---

## Luca’ya aktarım

1. Dönem için XML üret (`exportLucaXml`).
2. Mali müşavir portalinden (Aşama 5.2) veya dosya olarak indir.
3. Luca’da **Muhasebe → Fiş İşlemleri → Excel Veri Aktarımı**  
   - XML satırları Excel şablonuna projekte edilir (alanlar: Fiş No, Tarih, Hesap Kodu, Borç, Alacak).  
   - Detay: [docs/SCHEMA.md](./docs/SCHEMA.md)
4. Hesap kodlarının Luca hesap planında açık olduğundan emin olun.
5. Tek seferde en fazla **50 fiş** yükleyin; fazlasını `baslangicFisNo` ile parçalayın.

---

## Tenant şema bağı

Giriş tipleri `database/tenant_template` tablolarıyla uyumludur:

- `invoices` → `InvoiceInput`
- `bank_transactions` → `BankTransactionInput`

Bu paket saf dönüştürücüdür; DB okuma / HTTP API Aşama 5.2 portalında bağlanır.

---

## API özeti

| Fonksiyon | Açıklama |
|-----------|----------|
| `exportLucaXml` | Toplu fiş + XML |
| `exportInvoicesToLucaXml` | Sadece faturalar |
| `exportBankToLucaXml` | Sadece banka |
| `transformInvoice` / `bankTransactionToFis` | Tekil fiş |
| `buildLucaXml` | Fiş dizisinden XML |
| `validateFisler` | Denge kontrolü |
| `DEFAULT_ACCOUNT_MAP` | Varsayılan hesap kodları |
