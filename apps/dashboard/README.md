# Finatura — Operasyon Paneli (`apps/dashboard`)

> **FROZEN — LEGACY**  
> Operasyon arayüzü **Flutter Web**’e taşındı (`apps/mobile` → `app.finatura.app` / `login.finatura.app`).  
> Bu Vite paneli artık production deploy hedefi değildir; yalnızca referans / geçiş kodu olarak tutulur.  
> Yeni özellikler Flutter istemcisine eklenir.

---

Mobildeki ana işlerin **eski web karşılığı** (Vite): giriş (firma kodu), belge tara, cari/veresiye özet, banka mutabakat (settlement), e-fatura taslakları.

Marketing site (`apps/web`) ve mali müşavir portalı (`apps/accountant-portal`) **ayrı** kalır; bu uygulama Dokploy marketing deploy’una karışmaz.

## Yerel çalıştırma

```bash
cd apps/dashboard
cp .env.example .env   # isteğe bağlı
npm install
npm run dev
```

Açılır: **http://localhost:5175**

| Script | Açıklama |
|--------|----------|
| `npm run dev` | Vite geliştirme sunucusu (port **5175**) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Typecheck + production bundle → `dist/` |
| `npm run preview` | `dist` önizleme |

## Demo giriş (mock)

| Alan | Değer |
|------|--------|
| E-posta | `demo@finatura.app` |
| Şifre | `demo1234` |
| Firma kodu | `ornek` (veya `demo`) |

`VITE_USE_MOCK=true` (varsayılan): HTTP atlamadan mock yanıt.  
`VITE_USE_MOCK=false`: gerçek gateway / document-agent çağrıları.

## Endpoint path’leri (hazır)

| İş | Metot | Path | Servis |
|----|-------|------|--------|
| Giriş | `POST` | `/auth/login` | api-gateway (`VITE_API_GATEWAY_URL`, :3000) |
| Belge analiz | `POST` | `/api/v1/documents/analyze` | document-agent (`VITE_DOCUMENT_AGENT_URL`, :3100) |
| Cari özet | `GET` | `/v1/tenant/caris/summary` | gateway → tenant |
| Settlement | `GET` | `/v1/tenant/settlements` | gateway → tenant |
| E-fatura taslak | `GET` | `/v1/tenant/einvoices/drafts` | gateway → tenant |

Login body: `{ email, password, firmaKodu }` (+ `tenantSlug` yedek alanı).

## Rotalar

| Yol | Ekran |
|-----|--------|
| `/login` | E-posta, şifre, firma kodu |
| `/` | Özet |
| `/tara` | Belge yükle → analyze |
| `/cari` | Cari / veresiye özet |
| `/banka-mutabakat` | Settlement listesi |
| `/e-fatura` | E-fatura taslakları |

## Dokploy notu

Production operasyon hedefi **Flutter Web** (`apps/mobile/Dockerfile`, `docker-compose.app.yml`). Bu Vite paneli frozen/legacy’dir — yeni Dokploy Application oluşturulmamalıdır.
