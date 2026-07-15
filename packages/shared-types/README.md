# `@finatura/shared-types`

Finatura domain tipleri ve Zod doğrulama şemaları. API, Document Agent ve ileride Flutter istemcisi aynı sözleşmeyi paylaşır.

## İçerik

| Modül | Açıklama |
|-------|----------|
| `tenant` | Merkez üye firma (`tenants`), özet, abonelik, üyelik |
| `cari` | Tenant cari kartı (`customer_caris`) |
| `vehicle` | Oto galeri stok (`vehicles`) |
| `real-estate` | Emlak portföyü (`real_estates`) |
| `invoice` | e-Fatura / e-Arşiv / Gider Pusulası |
| `bank-transaction` | Banka hesabı + hareket (Finteo) |
| `ocr` | Kimlik, Noter sözleşmesi, Tapu OCR sonuçları |
| `enums` | SQL enum karşılıkları |

Alan adları veritabanı şemasıyla **snake_case** hizalıdır. OCR alanları form doldurma DTO’su olduğu için **camelCase** (ve kimlikte Türkçe alan adları) kullanır.

Kaynak şemalar:

- `database/central/01_schema.sql`
- `database/tenant_template/01_schema.sql`
- Roadmap Aşama 2 (OCR)

## Kurulum

Monorepo kökünden (workspace tanımlandıktan sonra):

```bash
npm install
```

Doğrudan paket dizininden:

```bash
cd packages/shared-types
npm install
npm run build
```

## Kullanım

```ts
import {
  cariCreateSchema,
  invoiceSchema,
  ocrResultSchema,
  type Cari,
  type Invoice,
  type OcrResult,
} from '@finatura/shared-types';

const parsed = cariCreateSchema.parse({
  title: 'Ahmet Yılmaz',
  party_type: 'customer',
  identity_type: 'tckn',
  identity_number: '12345678901',
});

function handleOcr(payload: unknown): OcrResult {
  return ocrResultSchema.parse(payload);
}

function assertInvoice(row: unknown): Invoice {
  return invoiceSchema.parse(row);
}
```

## Scriptler

| Komut | Açıklama |
|-------|----------|
| `npm run build` | `dist/` çıktısı + `.d.ts` |
| `npm run typecheck` | Derleme yapmadan tip kontrolü |

## Notlar

- Tipler `z.infer` ile Zod şemalarından türetilir; şema = tek kaynak.
- Postgres `numeric` alanları TypeScript’te `number` olarak modellenir.
- Tarihler API’de ISO string (`YYYY-MM-DD` / timestamptz) beklenir.
