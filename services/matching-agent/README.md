# Matching Agent (Aşama 4.2)

Finatura **Akıllı Eşleştirme Ajanı** — banka dekont açıklamasından sinyal süzüp açık fatura / sözleşme adaylarıyla skor üretir.

> Sahiplik: `services/matching-agent/`  
> Dokunulmaz: Finteo client, Flutter UI

## Ne yapar?

1. **Sinyal süzme** (`extractSignals`)
   - **Plaka** — `34 ABC 123`, `06AB1234`, `34-AB-1234`
   - **Ada / Parsel** — `Ada:120 Parsel:5`, `120/5`
   - **TCKN** — 11 hane + algoritmik doğrulama
   - **Müşteri adı** — `GONDEREN:` etiketi ve büyük harfli aday blokları
2. **Skorlama** — TCKN > Plaka / Ada-Parsel > İsim benzerliği > Tutar yakınlığı
3. **Öneri listesi** — `minScore` üstü adaylar, confidence ile sıralı

## Kurulum

```bash
cd services/matching-agent
npm install
npm test
npm run build
```

## Kullanım

```ts
import { createMatchingAgent } from "@finatura/matching-agent";

const agent = createMatchingAgent();

const suggestions = agent.matchTransaction(
  {
    id: "tx-1",
    description: "Gelen EFT 34 ABC 123 AHMET YILMAZ araç bedeli",
    amount: 250_000,
  },
  [
    {
      id: "inv-1",
      kind: "invoice",
      plate: "34ABC123",
      customerName: "Ahmet Yılmaz",
      amount: 250_000,
      status: "open",
    },
  ],
);

console.log(suggestions[0]?.score, suggestions[0]?.breakdown);
```

Sadece süzme:

```ts
import { extractSignals } from "@finatura/matching-agent";

const signals = extractSignals("Ada 10 Parsel 2 TCKN 10000000146");
// { plates, adaParsel, tckns, candidateNames, ... }
```

## Varsayılan ağırlıklar

| Sinyal | Puan |
|--------|------|
| TCKN tam eşleşme | 45 |
| Plaka tam eşleşme | 35 |
| Ada/Parsel tam eşleşme | 35 |
| Müşteri adı (benzerlik × 25) | ≤ 25 |
| Tutar birebir | 15 |
| Tutar yakın (%2) | 8 |

`confidence = min(1, score / 100)`  
Varsayılan eleme eşiği: `minScore = 25`

## Klasör yapısı

```
services/matching-agent/
├── src/
│   ├── extractors/     # plaka, ada-parsel, tckn, müşteri adı
│   ├── scoring/        # ağırlıklar + skor hesabı
│   ├── matcher.ts      # MatchingAgent API
│   ├── types.ts
│   └── index.ts
├── tests/              # vitest iskeleti
├── package.json
├── tsconfig.json
└── README.md
```

## Finteo köprüsü

`services/finteo-agent` sync sonrası unmatched hareketler için bu paketi **in-process** import eder (`MATCHING_BRIDGE_MODE=inprocess`). Skorlar tenant DB `bank_transactions.raw_payload.finatura_match` altına yazılır. Ayrı HTTP servis için `MATCHING_BRIDGE_MODE=http` + `MATCHING_AGENT_URL`.

## Sonraki adımlar (bilinçli boşluklar)

- Sözleşme adayları (şimdilik fatura join’leri)
- `match_suggestions` jsonb kolonu migrasyonu (`02_match_suggestions.sql.todo`)
- 4.3 “Swipe to Settle” UI köprüsü
