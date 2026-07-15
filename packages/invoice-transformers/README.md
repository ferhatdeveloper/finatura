# @finatura/invoice-transformers

**Aşama 3.1** — Noter satış sözleşmesi OCR JSON çıktısını tek adımda **e-Fatura / e-Arşiv** veya **Gider Pusulası** UBL-TR benzeri taslağa dönüştürür.

> Entegratör gönderimi (EDM / Uyumsoft / FIT) **Aşama 3.2** (`services/einvoice-integrator/`) kapsamındadır; bu paket yalnızca taslak üretir.

## Ne yapar?

| Senaryo | Koşul | Çıktı |
|---------|--------|--------|
| Araç **satışı** | Tenant kimliği = noter **satıcı** | `efatura` veya `earsiv` |
| Şahıstan **alış** | Tenant = **alıcı** ve satıcı **TCKN (şahıs)** | `gider_pusulasi` |

## Kurulum

```bash
cd packages/invoice-transformers
npm install
npm run build
npm test
```

## Kullanım

```ts
import {
  NoterToDocumentTransformer,
  type NoterSozlesmeOcr,
  type TenantParty,
} from "@finatura/invoice-transformers";

const tenant: TenantParty = {
  vknOrTckn: "1234567890",
  unvan: "Örnek Oto Galeri Ltd. Şti.",
  eFaturaMukellefi: true,
};

const noter: NoterSozlesmeOcr = {
  /* Document Agent 2.1 JSON */
  alici: { tcknOrVkn: "12345678901", unvan: "Ayşe Yılmaz" },
  satici: { tcknOrVkn: "1234567890", unvan: "Örnek Oto Galeri Ltd. Şti." },
  arac: { plaka: "06 ABC 123", saseNo: "WVWZZZ1JZYW123456", marka: "VW", model: "Golf" },
  satisBedeli: 850000,
  bedelTipi: "dahil",
};

const result = new NoterToDocumentTransformer().transform(noter, tenant, {
  kdvOrani: 20,
  // opsiyonel: fark üzerinden KDV
  // alisMaliyeti: 700000,
});

// result.draft  → UBL-TR benzeri taslak (entegratöre verilir)
// result.summary → tenant `invoices` satırına yakın sade özet
```

Sınıf bazlı kullanım:

- `EFaturaTransformer` — sadece satış
- `GiderPusulasiTransformer` — sadece şahıs alış
- `NoterToDocumentTransformer` — yönü otomatik seçer

## OCR JSON alanları

Document Agent ile uyum için beklenen çekirdek alanlar:

- `alici.tcknOrVkn`, `satici.tcknOrVkn`, `alici.unvan`, `satici.unvan`
- `arac.plaka`, `arac.saseNo` (+ marka/model opsiyonel)
- `satisBedeli`, `bedelTipi` (`dahil` \| `hariç`)
- `sozlesmeNo`, `sozlesmeTarihi` (opsiyonel)

Örnek dosyalar: `examples/`.

## UBL-TR taslak modeli

Ara katman alanları (serileştirme 3.2’de):

- `ublVersionId: 2.1`, `customizationId: TR1.2`
- `profileId`: `TEMELFATURA` \| `EARSIVFATURA` \| `GIDERPUSULASI`
- `AccountingSupplierParty` / `AccountingCustomerParty` (VKN/TCKN)
- `TaxTotal`, `LegalMonetaryTotal`, `InvoiceLine` (plaka/şasi açıklamada)

## KDV notları (taslak varsayımları)

- Varsayılan KDV **%20**; `TransformOptions.kdvOrani` ile değiştirilir.
- `alisMaliyeti` verilirse satışta **fark üzerinden KDV** matrahı kullanılır (sadeleştirilmiş taslak).
- Gider pusulasında `stopajOrani` varsayılan **0** (araç alımında genelde uygulanmaz; hizmet senaryoları için bırakıldı).

Mali müşavir / mükellef özel oranı uygulama katmanında override edilmelidir.

## Klasör yapısı

```
packages/invoice-transformers/
├── examples/                 # örnek OCR + tenant JSON
├── src/
│   ├── models/ubl-tr/        # UBL-TR benzeri taslak tipler
│   ├── transformers/         # EFatura / GiderPusulasi / router
│   ├── types/                # Noter OCR + tenant tipleri
│   └── utils/                # para, kimlik
├── tests/
├── package.json
└── README.md
```

## Bilinçli sınırlar

- SQL / DB yazımı yok (Aşama 1).
- Entegratör HTTP çağrısı yok (Aşama 3.2).
- XML imzalama / GİB şema validasyonu yok; taslak JSON model üretilir.
