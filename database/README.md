# Finatura — Veritabanı Şemaları

Bu klasör Faz 1.1 ve 1.3 SQL şemalarını içerir.

## Klasör yapısı

```
database/
  central/                 # finatura_central (çok kiracılı kontrol düzlemi)
    01_schema.sql
    02_seed_plans.sql
    03_einvoice_reseller.sql   # bayilik: tenant entegratör seçimi
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

## Güvenlik notu

`tenant_databases.password_ciphertext` ve
`tenant_einvoice_providers.credentials_ciphertext` düz metin tutmaz.
Uygulama katmanında KMS / envelope encryption kullanılmalıdır.

## Bilinçli olarak şimdi yapılmayan

- Dinamik DB router (Faz 1.2)
- Uygulama kodu / ORM migrasyonları
