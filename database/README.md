# Finatura — Veritabanı Şemaları

Bu klasör Faz 1.1 ve 1.3 SQL şemalarını içerir.

## Klasör yapısı

```
database/
  central/                 # finatura_central (çok kiracılı kontrol düzlemi)
    01_schema.sql
    02_seed_plans.sql
    03_einvoice_reseller.sql   # bayilik: tenant entegratör seçimi
    04_einvoice_providers_expand.sql
    05_auth_accountant.sql         # users + firmaKodu
    05b_membership_accountant.sql  # membership_role + bağlama
    06_accountant_approvals.sql    # dönem onayı + Luca export
  tenant_template/         # Her yeni üye firmaya kopyalanan izole DB şablonu
    01_schema.sql
```

## Uygulama sırası

### Merkez DB

```bash
createdb finatura_central
psql -d finatura_central -f database/central/01_schema.sql
psql -d finatura_central -f database/central/02_seed_plans.sql
psql -d finatura_central -f database/central/03_einvoice_reseller.sql
psql -d finatura_central -f database/central/04_einvoice_providers_expand.sql
psql -d finatura_central -f database/central/05_auth_accountant.sql
psql -d finatura_central -f database/central/05b_membership_accountant.sql
psql -d finatura_central -f database/central/06_accountant_approvals.sql
```

### Yeni kiracı DB (şablon)

```bash
createdb tenant_<slug>
psql -d tenant_<slug> -f database/tenant_template/01_schema.sql
```

Provisioning tamamlandığında `tenant_databases.schema_version` = `1.0.0` ve
kiracıdaki `schema_migrations` kaydı ile hizalanmalıdır.

## Bayilik (03_einvoice_reseller.sql)

- `einvoice_provider_code`: `edm` | `uyumsoft` | `fit`
- `tenant_einvoice_providers`: tenant başına hangi entegratör aktif / birincil
- `v_tenant_einvoice_primary`: birincil entegratör özeti (credentials yok)

Satın alınabilir paket kataloğu uygulama katmanındadır:
`services/billing-agent/src/payment/packages.ts`

## Auth / üyelik / mali müşavir

| Dosya | İçerik |
|-------|--------|
| `05_auth_accountant.sql` | `users`, `tenants.mali_musavir_kodu`, `accountant_codes` (login `firmaKodu`) |
| `05b_membership_accountant.sql` | **`membership_role` tek kaynak**, `mali_musavir_baglantilari` |
| `06_accountant_approvals.sql` | Dönem onayları / Luca export (ayrı) |

Rol enum: `owner \| admin \| member \| viewer \| accountant`

API (api-gateway): `/v1/tenants/:id/accountant/invite`, `/v1/accountant/link`, `/v1/me/tenants`

## Güvenlik notu

`tenant_databases.password_ciphertext` ve
`tenant_einvoice_providers.credentials_ciphertext` düz metin tutmaz.
Uygulama katmanında KMS / envelope encryption kullanılmalıdır.

## Bilinçli olarak şimdi yapılmayan

- Dinamik DB router (Faz 1.2)
- Uygulama kodu / ORM migrasyonları
