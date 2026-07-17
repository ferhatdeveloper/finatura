# Finatura — Mali Müşavir Portalı

Aşama **5.2** UI iskeleti + **gerçekçi giriş / yetki akışı**. Mali müşavirlerin mükellef faturalarını, gider pusulalarını ve banka mutabakatını dönem bazında incelemesi; toplu onay yapması için Vite + React arayüzü.

## Özellikler

| Ekran | Rota | Açıklama |
|--------|------|----------|
| Giriş | `/giris` | E-posta, şifre, mali müşavir kodu ve/veya firma kodu |
| Yetkisiz | `/yetkisiz` | Rol `accountant` değilse panel engeli |
| Özet | `/` | Dönem kartları ve hızlı geçiş |
| Aylık fatura listesi | `/faturalar` | e-Fatura / e-Arşiv / alış-satış, filtreler |
| Gider pusulası | `/gider-pusulasi` | Stopaj, net ödeme, durum |
| Banka mutabakat | `/banka-mutabakat` | Hareket eşleştirme (yerel state) |
| Toplu onay | `/toplu-onay` | Çoklu seçim ile onay / red |

Liste / özet verileri hâlâ `src/data/mock.ts` içindedir. Auth UI akışı tamam; JWT hâlâ stub / mock olabilir.

## Kimlik doğrulama

1. Form `POST {VITE_API_GATEWAY_URL}/auth/login` çağırır (`email`, `password`, `firmaKodu`).
2. Gateway ayakta değilse veya stub kullanıcı yoksa **mock interceptor** devreye girer (JWT stub + `localStorage`).
3. Oturumda `role === "accountant"` değilse panel rotaları `/yetkisiz` yönlendirir.
4. Üst çubukta **firma ünvanı**, mali müşavir adı ve **Çıkış** vardır.

### Demo (mock)

| Alan | Değer |
|------|--------|
| E-posta | `mm@finatura.app` |
| Şifre | `mali1234` |
| Mali müşavir kodu | `MM-DEMO` |
| Firma kodu | `ORNEK-GALERI` |

Kodlardan **en az biri** yeterlidir.

### Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|---------|
| `VITE_API_GATEWAY_URL` | `http://localhost:3000` | api-gateway adresi |
| `VITE_AUTH_MODE` | `gateway` | `gateway` (varsayılan), `mock`, `auto` (gateway → mock) |

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
    ├── auth/          # AuthContext, login API + mock, rota koruması
    ├── data/mock.ts
    ├── components/
    └── pages/
```

## Notlar

- Flutter mobil uygulamaya dokunulmaz; bu paket yalnızca web portal iskeletidir.
- Gerçek tenant / belge API bağlandığında mock veri katmanı servis çağrılarıyla değiştirilecek.
- Gateway stub kullanıcısının rolü `owner` olabilir; portal yalnızca `accountant` kabul eder — demo için mock kimlik bilgilerini kullanın.
- UI metinleri Türkçedir.
