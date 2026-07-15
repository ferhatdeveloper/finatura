# Luca Fiş Aktarımı XML Şeması (v1.0)

Finatura → Luca yevmiye fişi dışa aktarım formatı.  
Namespace: `https://finatura.app/schemas/luca-fis-aktarim/v1`

Luca arayüzünde hedef menü: **Muhasebe → Fiş İşlemleri → Excel Veri Aktarımı**  
(veya Luca Asistan / ara dönüştürücü ile XML satırlarının Excel şablonuna map edilmesi).

Bu şema, Luca’nın fiş aktarımında beklediği zorunlu alanlarla birebir hizalanır.

---

## Kök öğe

```xml
<LucaFisAktarim versiyon="1.0" xmlns="https://finatura.app/schemas/luca-fis-aktarim/v1">
```

| Öznitelik | Zorunlu | Açıklama |
|-----------|---------|----------|
| `versiyon` | Evet | Şema sürümü (`1.0`) |
| `xmlns` | Evet | Finatura şema URI |

---

## Ağaç yapısı

```
LucaFisAktarim
├── Meta?                  (üretici bilgisi)
├── Firma                  (mükellef)
├── Donem                  (yıl / ay)
└── Fisler
    └── Fis+
        ├── FisNo, FisTarihi, FisTipi, FisKodu, BelgeTuru, Aciklama
        ├── Kaynak, KaynakId
        └── Satirlar
            └── Satir+
                ├── SiraNo, HesapKodu, HesapAdi?
                ├── EvrakNo?, EvrakTarihi?
                ├── Aciklama
                ├── Borc, Alacak
                └── Miktar?
```

---

## Firma / Dönem

| Eleman | Tip | Zorunlu | Not |
|--------|-----|---------|-----|
| `Firma/Unvan` | string | Evet | Mükellef unvanı |
| `Firma/Vkn` | string | Evet | 10 hane VKN veya 11 hane TCKN |
| `Donem/Yil` | int | Evet | Örn. `2026` |
| `Donem/Ay` | string | Evet | `01`–`12` (iki hane) |

---

## Fis (yevmiye fişi üst bilgisi)

| Eleman | Tip | Zorunlu | Luca eşlemesi |
|--------|-----|---------|---------------|
| `FisNo` | int | Evet | Fiş No — aynı no+tarih aynı fişte birleşir |
| `FisTarihi` | date | Evet | `YYYY-MM-DD` (Luca ekranında GG.AA.YYYY) |
| `FisTipi` | enum | Evet | `Mahsup` \| `Acilis` \| `Kapanis` |
| `FisKodu` | string | Hayır | Varsayılan `MM` |
| `BelgeTuru` | string | Hayır | `e-Fatura`, `e-Arsiv`, `Gider Pusulasi`, `Banka` |
| `Aciklama` | string | Hayır | Fiş kes açıklaması |
| `Kaynak` | enum | Hayır | Finatura izlenebilirlik |
| `KaynakId` | uuid/string | Hayır | `invoices.id` / `bank_transactions.id` |

**Kaynak değerleri:** `efatura` \| `earsiv` \| `gider_pusulasi` \| `banka_gelen` \| `banka_giden`

---

## Satir (muavin satırı)

| Eleman | Tip | Zorunlu | Luca eşlemesi |
|--------|-----|---------|---------------|
| `SiraNo` | int | Evet | Satır sırası |
| `HesapKodu` | string | **Evet** | Luca hesap planında mevcut olmalı |
| `HesapAdi` | string | Hayır | Bilgi amaçlı |
| `EvrakNo` | string | Hayır | Fatura / GP / banka ref |
| `EvrakTarihi` | date | Hayır | `YYYY-MM-DD` |
| `Aciklama` | string | Hayır | Muavin açıklama |
| `Borc` | decimal | **Evet** | `0.00` formatı; tek taraflı |
| `Alacak` | decimal | **Evet** | `0.00` formatı; tek taraflı |
| `Miktar` | decimal | Hayır | Opsiyonel |

### Kurallar

1. Her fişte **en az 2 satır** (çift kayıt).
2. Fiş içinde `Σ Borc = Σ Alacak` (0,01 TL tolerans).
3. Aynı satırda hem Borç hem Alacak > 0 olmamalı.
4. Tutarlar nokta ondalıklı, iki hane (`1000.00`).
5. Mahsup fişinde Luca sınırı: **400 satır** / fiş.

---

## Kaynak → muhasebe kuralları (varsayılan TDHP)

### e-Fatura / e-Arşiv satış

| Hesap | Borç | Alacak |
|-------|------|--------|
| 120 Alıcılar (+ cari eki) | grand_total | |
| 600 Yurtiçi Satışlar | | net_total |
| 391 Hesaplanan KDV | | vat_total |

### e-Fatura / e-Arşiv alış

| Hesap | Borç | Alacak |
|-------|------|--------|
| 153 Ticari Mallar | net_total | |
| 191 İndirilecek KDV | vat_total | |
| 320 Satıcılar (+ cari eki) | | grand_total |

### Gider pusulası (şahıstan alış)

| Hesap | Borç | Alacak |
|-------|------|--------|
| 153 Ticari Mallar | ödenecek + stopaj | |
| 320 Satıcılar | | ödenecek |
| 360 Ödenecek Vergi | | stopaj |

Varsayılan stopaj oranı: **%20** (`varsayilanStopajOrani` ile değiştirilebilir).

### Banka gelen

| Hesap | Borç | Alacak |
|-------|------|--------|
| 102 Bankalar | amount | |
| 120 Alıcılar | | amount |

### Banka giden

| Hesap | Borç | Alacak |
|-------|------|--------|
| 320 Satıcılar | amount | |
| 102 Bankalar | | amount |

Hesap kodları `AccountMap` ile tamamen override edilir.

---

## Tenant DB eşlemesi

| XML alanı | PostgreSQL kaynağı |
|-----------|-------------------|
| Fatura fişleri | `invoices` (`kind`, `direction`, tutarlar, `document_number`, `issue_date`) |
| Banka fişleri | `bank_transactions` + `bank_accounts` |
| Cari eki | Uygulama katmanı (`cariHesapEki`) — opsiyonel `customer_caris` mapping |
| Firma VKN | Merkez / tenant ayarları |

---

## Excel Veri Aktarımı satır projeksiyonu

XML satırı → Luca Excel şablonu:

| Excel sütunu | XML |
|--------------|-----|
| Fiş No | `Fis/FisNo` |
| Fiş Tarihi | `Fis/FisTarihi` |
| Hesap Kodu | `Satir/HesapKodu` |
| Borç | `Satir/Borc` |
| Alacak | `Satir/Alacak` |
| Evrak No | `Satir/EvrakNo` |
| Açıklama | `Satir/Aciklama` |

Not: Tek yüklemede maksimum **50 fiş** (Luca limiti). Büyük dönemler dosyaya bölünmelidir (`baslangicFisNo` ile devam).
