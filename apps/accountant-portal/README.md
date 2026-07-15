# Finatura — Mali Müşavir Portalı

Aşama **5.2** UI iskeleti. Mali müşavirlerin mükellef faturalarını, gider pusulalarını ve banka mutabakatını dönem bazında incelemesi; toplu onay yapması için Vite + React mock arayüzü.

## Özellikler (mock)

| Ekran | Rota | Açıklama |
|--------|------|----------|
| Özet | `/` | Dönem kartları ve hızlı geçiş |
| Aylık fatura listesi | `/faturalar` | e-Fatura / e-Arşiv / alış-satış, filtreler |
| Gider pusulası | `/gider-pusulasi` | Stopaj, net ödeme, durum |
| Banka mutabakat | `/banka-mutabakat` | Hareket eşleştirme (yerel state) |
| Toplu onay | `/toplu-onay` | Çoklu seçim ile onay / red |

Tüm veriler `src/data/mock.ts` içindedir; API yok.

## Gereksinimler

- Node.js 18+
- npm (veya pnpm / yarn)

## Kurulum ve çalıştırma

```bash
cd apps/accountant-portal
npm install
npm run dev
```

Geliştirme sunucusu varsayılan olarak **http://localhost:5174** adresinde açılır.

```bash
npm run build    # üretim derlemesi
npm run preview  # derlenmiş çıktıyı önizle
npm run lint     # TypeScript kontrolü
```

## Yapı

```
apps/accountant-portal/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles.css
    ├── data/mock.ts
    ├── components/
    └── pages/
```

## Notlar

- Flutter mobil uygulamaya dokunulmaz; bu paket yalnızca web portal iskeletidir.
- Gerçek tenant / API bağlandığında mock katmanı servis çağrılarıyla değiştirilecek.
- UI metinleri Türkçedir.
