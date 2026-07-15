# Finatura Accountant Bridge

Mali müşavir köprüsü: **kod doğrula → dönem onayla → Luca XML**.

Paket: `@finatura/accountant-bridge`  
Sahiplik: `services/accountant-bridge/`  
Bağımlılık: `@finatura/luca-agent` (`exportLucaXml`)

---

## Akış

```
1) POST /api/accountant/verify-code
   → { tenantId, code }  →  stub oturum token

2) POST /api/accountant/approve-period
   → { token, tenantId, period, fatura/banka seçimi }
   → onay kaydı (bellek + JSON stub)

3) GET|POST /api/accountant/export-luca
   → exportLucaXml(...)  →  application/xml indirme
```

Portal (`apps/accountant-portal` TopluOnay) bu API’yi `fetch` ile çağırır; başarısız olursa yerel mock’a düşer.

---

## Kurulum

```bash
cd services/luca-agent && npm install && npm run build
cd ../accountant-bridge && npm install
npm run typecheck
npm test
npm run dev
```

Varsayılan port: **4055** (`.env.example`).

---

## Endpoint’ler

| Metod | Yol | Açıklama |
|-------|-----|----------|
| `POST` | `/api/accountant/verify-code` | Tenant + müşavir kodu doğrula |
| `POST` | `/api/accountant/approve-period` | Dönem onayı (fatura/banka seçimi) |
| `GET` / `POST` | `/api/accountant/export-luca` | Luca yevmiye XML indir |
| `GET` | `/api/accountant/approvals` | Onay listesi (debug) |
| `GET` | `/health` | Sağlık |

### Demo kodlar

| tenantId | code |
|----------|------|
| `anadolu-oto` | `MM-2026-DEMO` |
| `pirlanta-kuyum` | `MM-PIRLANTA-01` |

### Örnek

```bash
# 1) Kod doğrula
curl -s localhost:4055/api/accountant/verify-code \
  -H 'content-type: application/json' \
  -d '{"tenantId":"anadolu-oto","code":"MM-2026-DEMO"}'

# 2) Dönem onayla
curl -s localhost:4055/api/accountant/approve-period \
  -H 'content-type: application/json' \
  -d '{"token":"<TOKEN>","tenantId":"anadolu-oto","period":"2026-07","includeInvoices":true,"includeBank":true,"invoiceIds":["o1","o2"],"bankIds":["o4"]}'

# 3) XML indir
curl -OJ "localhost:4055/api/accountant/export-luca?token=<TOKEN>&tenantId=anadolu-oto&period=2026-07"
```

JSON meta + gövde için `?format=json` ekleyin.

---

## Onay state

- Varsayılan: bellek + `data/approvals.json` (JSON stub)
- SQL iskeleti (opsiyonel): `database/central/06_accountant_approvals.sql`

---

## Yapı

```
services/accountant-bridge/
├── README.md
├── package.json
├── src/
│   ├── index.ts
│   ├── routes/accountant.ts
│   ├── services/          # verify / approve / export
│   ├── store/approvals.ts # bellek + JSON
│   └── demo/sample-batch.ts
└── tests/
```
