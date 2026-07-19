-- =============================================================================
-- Tenant demo: cari + açık fatura/veresiye + banka hareketleri (test)
--
-- Ürün mantığı:
--   Bankadan gelen para → e-fatura KESİLMEZ.
--   Matching: açıklama (plaka/ada/TCKN/isim) ↔ açık fatura/veresiye önerisi.
--   Settlement: bank inbound → veresiye credit (mahsup).
--   E-fatura: OCR/noter → transformer → einvoice-integrator (ayrı).
--
-- Uygulama: tenant DB'de (ör. tenant_ornek) psql -f ...
-- Idempotent: sabit UUID'ler + NOT EXISTS.
-- =============================================================================

-- Cariler
INSERT INTO public.customer_caris (
    id, code, party_type, title, identity_type, identity_number, phone, is_active
)
SELECT v.id, v.code, 'customer'::public.cari_party_type, v.title,
       v.identity_type::public.identity_type, v.identity_number, v.phone, true
FROM (VALUES
    ('a1000000-0000-4000-8000-0000000000a1'::uuid, 'AY-001', 'Ahmet Yılmaz', 'tckn', '10000000146', '5551112233'),
    ('a1000000-0000-4000-8000-0000000000a2'::uuid, 'SK-002', 'Selin Karaca', 'tckn', '10000000154', '5552223344'),
    ('a1000000-0000-4000-8000-0000000000a3'::uuid, 'HAS-003', 'Has Altın Takas', 'vkn', '9876543210', '5553334455'),
    ('a1000000-0000-4000-8000-0000000000a4'::uuid, 'FILO-004', 'Örnek Filo Kiralama A.Ş.', 'vkn', '1234567890', '5554445566')
) AS v(id, code, title, identity_type, identity_number, phone)
WHERE NOT EXISTS (
    SELECT 1 FROM public.customer_caris c WHERE c.id = v.id OR c.code = v.code
);

-- Araç (plaka eşleşmesi)
INSERT INTO public.vehicles (
    id, plate, brand, model, model_year, status, sell_price, buyer_cari_id, sold_at
)
SELECT
    'b2000000-0000-4000-8000-0000000000v1'::uuid,
    '34 ABC 123',
    'Volkswagen',
    'Passat',
    2020,
    'sold'::public.vehicle_status,
    185000,
    'a1000000-0000-4000-8000-0000000000a1'::uuid,
    CURRENT_DATE - 5
WHERE NOT EXISTS (
    SELECT 1 FROM public.vehicles x
    WHERE x.id = 'b2000000-0000-4000-8000-0000000000v1'::uuid
       OR (x.plate = '34 ABC 123' AND x.deleted_at IS NULL)
);

-- Emlak (ada/parsel)
INSERT INTO public.real_estates (
    id, title, ada, parsel, city, district, status, list_price, buyer_cari_id
)
SELECT
    'c3000000-0000-4000-8000-0000000000e1'::uuid,
    'Ada 412 Parsel 7 — örnek daire',
    '412',
    '7',
    'İstanbul',
    'Kadıköy',
    'reserved'::public.real_estate_status,
    45000,
    'a1000000-0000-4000-8000-0000000000a2'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.real_estates r
    WHERE r.id = 'c3000000-0000-4000-8000-0000000000e1'::uuid
);

-- Gönderilmiş satış faturası (matching adayı)
INSERT INTO public.invoices (
    id, kind, direction, status, issue_date, cari_id,
    counterparty_title, counterparty_vkn, net_total, vat_total, grand_total,
    related_vehicle_id, uuid_ettn, document_number, sent_at
)
SELECT
    'd4000000-0000-4000-8000-0000000000i1'::uuid,
    'efatura'::public.invoice_kind,
    'sales'::public.invoice_direction,
    'sent'::public.invoice_status,
    CURRENT_DATE - 4,
    'a1000000-0000-4000-8000-0000000000a1'::uuid,
    'Ahmet Yılmaz',
    '10000000146',
    154166.67,
    30833.33,
    185000,
    'b2000000-0000-4000-8000-0000000000v1'::uuid,
    'e5000000-0000-4000-8000-0000000000e1'::uuid,
    'GIB2026000000001',
    now() - interval '4 days'
WHERE NOT EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = 'd4000000-0000-4000-8000-0000000000i1'::uuid
);

-- Açık veresiye borçları (settlement hedefi)
INSERT INTO public.veresiye_transactions (
    id, cari_id, asset_kind, direction, amount, currency_code,
    description, transaction_date, related_vehicle_id, invoice_id
)
SELECT
    'e6000000-0000-4000-8000-0000000000r1'::uuid,
    'a1000000-0000-4000-8000-0000000000a1'::uuid,
    'tl'::public.veresiye_asset_kind,
    'debit'::public.veresiye_direction,
    185000,
    'TRY',
    '34 ABC 123 araç satış bakiyesi',
    CURRENT_DATE - 4,
    'b2000000-0000-4000-8000-0000000000v1'::uuid,
    'd4000000-0000-4000-8000-0000000000i1'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.veresiye_transactions v
    WHERE v.id = 'e6000000-0000-4000-8000-0000000000r1'::uuid
);

INSERT INTO public.veresiye_transactions (
    id, cari_id, asset_kind, direction, amount, currency_code,
    description, transaction_date, related_real_estate_id
)
SELECT
    'e6000000-0000-4000-8000-0000000000r2'::uuid,
    'a1000000-0000-4000-8000-0000000000a2'::uuid,
    'tl'::public.veresiye_asset_kind,
    'debit'::public.veresiye_direction,
    45000,
    'TRY',
    'Ada 412 / Parsel 7 kapora bakiyesi',
    CURRENT_DATE - 3,
    'c3000000-0000-4000-8000-0000000000e1'::uuid
WHERE EXISTS (
    SELECT 1 FROM public.real_estates r
    WHERE r.id = 'c3000000-0000-4000-8000-0000000000e1'::uuid
)
AND NOT EXISTS (
    SELECT 1 FROM public.veresiye_transactions v
    WHERE v.id = 'e6000000-0000-4000-8000-0000000000r2'::uuid
);

INSERT INTO public.veresiye_transactions (
    id, cari_id, asset_kind, direction, amount, currency_code,
    gold_grams, gold_purity, description, transaction_date
)
SELECT
    'e6000000-0000-4000-8000-0000000000r3'::uuid,
    'a1000000-0000-4000-8000-0000000000a3'::uuid,
    'gold'::public.veresiye_asset_kind,
    'debit'::public.veresiye_direction,
    98000,
    'TRY',
    12.40,
    22,
    'Has 12.40 gr takas bakiyesi',
    CURRENT_DATE - 2
WHERE NOT EXISTS (
    SELECT 1 FROM public.veresiye_transactions v
    WHERE v.id = 'e6000000-0000-4000-8000-0000000000r3'::uuid
);

-- Banka hesapları
INSERT INTO public.bank_accounts (
    id, bank_name, iban, account_alias, currency_code, provider_ref, is_active
)
SELECT v.id, v.bank_name, v.iban, v.alias, 'TRY', v.pref, true
FROM (VALUES
    ('f7000000-0000-4000-8000-0000000000b1'::uuid, 'Garanti BBVA', 'TR640006200012345678901234', 'Garanti İşletme', 'garanti-isletme-tl'),
    ('f7000000-0000-4000-8000-0000000000b2'::uuid, 'Yapı Kredi', 'TR670006701000000012345678', 'Yapı Kredi TL', 'ykb-tl'),
    ('f7000000-0000-4000-8000-0000000000b3'::uuid, 'Ziraat Bankası', 'TR330001001000000012345678', 'Ziraat TL', 'ziraat-tl')
) AS v(id, bank_name, iban, alias, pref)
WHERE NOT EXISTS (
    SELECT 1 FROM public.bank_accounts a WHERE a.id = v.id OR a.iban = v.iban
);

-- Banka hareketleri (unmatched — settlement UI / matching test)
INSERT INTO public.bank_transactions (
    id, bank_account_id, provider, provider_tx_id, direction, amount,
    currency_code, transaction_at, value_date, counterparty_name,
    counterparty_iban, description, raw_payload, match_status
)
SELECT
    v.id,
    a.id,
    'finteo',
    v.ptx,
    v.direction::public.bank_tx_direction,
    v.amount,
    'TRY',
    now() - (v.mins || ' minutes')::interval,
    CURRENT_DATE,
    v.cp_name,
    v.cp_iban,
    v.descr,
    jsonb_build_object('source', 'tenant_seed', 'kind', v.kind, 'matchHints', to_jsonb(string_to_array(v.hints, '|'))),
    'unmatched'::public.bank_tx_match_status
FROM (VALUES
    ('f8000000-0000-4000-8000-0000000000t1'::uuid, 'garanti-isletme-tl', 'seed-in-galeri-plaka', 'inbound', 185000::numeric,
     90, 'AHMET YILMAZ', 'TR120006400000112233445566',
     'HAVALE/EFT GELEN 34 ABC 123 ARAC BEDELI GONDEREN: AHMET YILMAZ TCKN:10000000146',
     'inbound_eft_vehicle', 'plate:34 ABC 123|tckn:10000000146'),
    ('f8000000-0000-4000-8000-0000000000t2'::uuid, 'ykb-tl', 'seed-in-emlak-ada', 'inbound', 42500.50::numeric,
     220, 'SELIN KARACA', 'TR450004600092348000123456',
     'EFT GELEN ADA 412 PARSEL 7 KAPORA / SELIN KARACA',
     'inbound_eft_estate', 'ada:412|parsel:7'),
    ('f8000000-0000-4000-8000-0000000000t3'::uuid, 'garanti-isletme-tl', 'seed-in-kuyum-has', 'inbound', 98000::numeric,
     400, 'HAS ALTIN TAKAS', 'TR880006200098765432109876',
     'HAVALE GELEN HAS 12,40 GR KARSILIGI / HAS ALTIN TAKAS',
     'inbound_eft_gold', 'gold:12.40'),
    ('f8000000-0000-4000-8000-0000000000t4'::uuid, 'ziraat-tl', 'seed-in-vkn', 'inbound', 250000::numeric,
     60, 'ORNEK FILO KIRALAMA A.S.', 'TR560004600211223344556677',
     'GELEN EFT VKN 1234567890 ORNEK FILO KIRALAMA A.S. FATURA BEDELI',
     'inbound_eft_corporate', 'vkn:1234567890'),
    ('f8000000-0000-4000-8000-0000000000t5'::uuid, 'garanti-isletme-tl', 'seed-in-partial', 'inbound', 50000::numeric,
     30, 'AHMET YILMAZ', 'TR120006400000112233445566',
     'HAVALE/EFT 34 ABC 123 KALAN BAKİYE GONDEREN AHMET YILMAZ',
     'inbound_eft_partial', 'plate:34 ABC 123'),
    ('f8000000-0000-4000-8000-0000000000t6'::uuid, 'garanti-isletme-tl', 'seed-out-noter', 'outbound', 12500::numeric,
     500, 'ISTANBUL 12 NOTERLIGI', NULL,
     'EFT GIDEN NOTER HARC VE DONER SERMAYE',
     'outbound_noter', ''),
    ('f8000000-0000-4000-8000-0000000000t7'::uuid, 'ykb-tl', 'seed-in-noise', 'inbound', 1500::numeric,
     15, 'BILINMEYEN GONDERICI', 'TR990001001234567890123456',
     'GELEN HAVALE REFNO 998877',
     'inbound_unmatched', '')
) AS v(id, pref, ptx, direction, amount, mins, cp_name, cp_iban, descr, kind, hints)
INNER JOIN public.bank_accounts a
  ON a.provider_ref = v.pref AND a.deleted_at IS NULL
WHERE NOT EXISTS (
    SELECT 1 FROM public.bank_transactions t
    WHERE t.id = v.id OR (t.provider = 'finteo' AND t.provider_tx_id = v.ptx)
);

INSERT INTO public.schema_migrations (version, description)
VALUES ('03_seed_demo_bank', 'Demo cari/fatura/veresiye/banka hareketleri')
ON CONFLICT (version) DO NOTHING;
