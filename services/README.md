# services/

Backend servisler ve ajanlar bu klasörde yaşar:

| Servis | Yol | Aşama |
|--------|-----|--------|
| API Gateway | `api-gateway/` | 1.2 — JWT auth + tenant-router proxy |
| Tenant Router | `tenant-router/` | 1.2 — `X-Tenant-ID` → izole DB |
| Document Agent | `document-agent/` | 2.x — OCR / evrak parser |
| Forms Agent | `forms-agent/` | 3.3 — yer gösterme / araç kapora PDF iskeleti |
| e-Fatura Entegratör | `einvoice-integrator/` | 3.2 — EDM / Uyumsoft / FIT |
| Finteo / Matching / Luca | *(planlanan)* | 4–5 |

Her servisin kendi `package.json`, `.env.example` ve `README.md` dosyası vardır.
