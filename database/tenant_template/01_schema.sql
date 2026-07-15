-- =============================================================================
-- Finatura Tenant Template Schema
-- Purpose: Cloned for each new member company (isolated PostgreSQL database).
-- Used by sectors: Oto Galeri, Kuyumculuk, Emlak (tables may be unused per sector).
-- Phase: 1.3
-- Schema version: 1.0.0
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

CREATE TYPE public.cari_party_type AS ENUM (
    'customer',     -- müşteri / alıcı
    'supplier',     -- satıcı / tedarikçi
    'realtor',      -- emlakçı / aracılık
    'both'          -- hem alıcı hem satıcı
);

CREATE TYPE public.identity_type AS ENUM (
    'tckn',         -- 11 hane TC Kimlik
    'vkn',          -- 10 hane Vergi Kimlik
    'passport',
    'other'
);

CREATE TYPE public.vehicle_status AS ENUM (
    'in_stock',
    'reserved',
    'sold',
    'consignment',  -- konsinye
    'returned',
    'archived'
);

CREATE TYPE public.real_estate_type AS ENUM (
    'land',         -- arsa / arazi
    'residential',  -- konut
    'commercial',   -- işyeri
    'other'
);

CREATE TYPE public.real_estate_status AS ENUM (
    'available',
    'reserved',
    'sold',
    'rented',
    'withdrawn',
    'archived'
);

CREATE TYPE public.veresiye_asset_kind AS ENUM (
    'tl',           -- galeri / emlak TL borç-alacak
    'gold',         -- kuyumcu altın
    'fx'            -- döviz
);

CREATE TYPE public.veresiye_direction AS ENUM (
    'debit',        -- borç (bizden alacaklı / bize borçlu bağlamına göre uygulama yorumlar)
    'credit'        -- alacak
);

CREATE TYPE public.invoice_kind AS ENUM (
    'efatura',
    'earsiv',
    'gider_pusulasi'
);

CREATE TYPE public.invoice_direction AS ENUM (
    'sales',
    'purchase'
);

CREATE TYPE public.invoice_status AS ENUM (
    'draft',
    'queued',
    'sent',
    'accepted',
    'rejected',
    'cancelled'
);

CREATE TYPE public.bank_tx_direction AS ENUM (
    'inbound',
    'outbound'
);

CREATE TYPE public.bank_tx_match_status AS ENUM (
    'unmatched',
    'matched',
    'ignored'
);

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- customer_caris — müşteri / alıcı / satıcı / emlakçı kartları
-- -----------------------------------------------------------------------------

CREATE TABLE public.customer_caris (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code             text,                          -- iç cari kodu
    party_type       public.cari_party_type NOT NULL DEFAULT 'customer',
    title            text NOT NULL,                 -- Unvan
    identity_type    public.identity_type,
    identity_number  text,                          -- TCKN / VKN
    tax_office       text,
    contact_name     text,
    email            text,
    phone            text,
    mobile_phone     text,
    address_line     text,
    city             text,
    district         text,
    neighborhood     text,
    postal_code      text,
    country_code     char(2) NOT NULL DEFAULT 'TR',
    notes            text,
    is_active        boolean NOT NULL DEFAULT true,
    metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz,

    CONSTRAINT customer_caris_identity_number_digits CHECK (
        identity_number IS NULL
        OR identity_number ~ '^[0-9A-Za-z]+$'
    ),
    CONSTRAINT customer_caris_tckn_len CHECK (
        identity_type IS DISTINCT FROM 'tckn'
        OR identity_number IS NULL
        OR char_length(identity_number) = 11
    ),
    CONSTRAINT customer_caris_vkn_len CHECK (
        identity_type IS DISTINCT FROM 'vkn'
        OR identity_number IS NULL
        OR char_length(identity_number) = 10
    )
);

CREATE UNIQUE INDEX customer_caris_code_uidx
    ON public.customer_caris (code)
    WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX customer_caris_identity_uidx
    ON public.customer_caris (identity_type, identity_number)
    WHERE identity_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX customer_caris_title_idx
    ON public.customer_caris (title)
    WHERE deleted_at IS NULL;

CREATE INDEX customer_caris_party_type_idx
    ON public.customer_caris (party_type)
    WHERE deleted_at IS NULL;

CREATE INDEX customer_caris_phone_idx
    ON public.customer_caris (phone)
    WHERE phone IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER customer_caris_set_updated_at
    BEFORE UPDATE ON public.customer_caris
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.customer_caris IS
    'Cari kartlar: müşteri, satıcı, emlakçı (TCKN/VKN, unvan, iletişim, adres).';
COMMENT ON COLUMN public.customer_caris.title IS 'Ünvan / ticari unvan.';
COMMENT ON COLUMN public.customer_caris.identity_number IS 'TCKN (11) veya VKN (10) vb.';

-- -----------------------------------------------------------------------------
-- vehicles — oto galeri stok
-- -----------------------------------------------------------------------------

CREATE TABLE public.vehicles (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plate             text,
    chassis_number    text,                         -- şasi / VIN
    engine_number     text,
    brand             text NOT NULL,
    model             text NOT NULL,
    model_year        integer,
    color             text,
    fuel_type         text,
    transmission      text,
    kilometer         integer,
    buy_price         numeric(14, 2),
    sell_price        numeric(14, 2),
    vat_rate          numeric(5, 2) NOT NULL DEFAULT 20.00,
    currency_code     char(3) NOT NULL DEFAULT 'TRY',
    status            public.vehicle_status NOT NULL DEFAULT 'in_stock',
    supplier_cari_id  uuid REFERENCES public.customer_caris (id),
    buyer_cari_id     uuid REFERENCES public.customer_caris (id),
    purchased_at      date,
    sold_at           date,
    notes             text,
    metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,

    CONSTRAINT vehicles_model_year_range CHECK (
        model_year IS NULL OR (model_year >= 1900 AND model_year <= 2100)
    ),
    CONSTRAINT vehicles_kilometer_nonneg CHECK (kilometer IS NULL OR kilometer >= 0),
    CONSTRAINT vehicles_prices_nonneg CHECK (
        (buy_price IS NULL OR buy_price >= 0)
        AND (sell_price IS NULL OR sell_price >= 0)
    ),
    CONSTRAINT vehicles_vat_rate_range CHECK (vat_rate >= 0 AND vat_rate <= 100)
);

CREATE UNIQUE INDEX vehicles_plate_uidx
    ON public.vehicles (plate)
    WHERE plate IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX vehicles_chassis_uidx
    ON public.vehicles (chassis_number)
    WHERE chassis_number IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX vehicles_status_idx
    ON public.vehicles (status)
    WHERE deleted_at IS NULL;

CREATE INDEX vehicles_brand_model_idx
    ON public.vehicles (brand, model)
    WHERE deleted_at IS NULL;

CREATE INDEX vehicles_supplier_cari_idx ON public.vehicles (supplier_cari_id);
CREATE INDEX vehicles_buyer_cari_idx ON public.vehicles (buyer_cari_id);

CREATE TRIGGER vehicles_set_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.vehicles IS
    'Galeri araç stoku: plaka, şasi, marka, model, motor no, alış/satış, KDV.';
COMMENT ON COLUMN public.vehicles.chassis_number IS 'Şasi numarası / VIN.';
COMMENT ON COLUMN public.vehicles.vat_rate IS 'KDV oranı (%); örn. 20.00';

-- -----------------------------------------------------------------------------
-- real_estates — emlak portföyü
-- -----------------------------------------------------------------------------

CREATE TABLE public.real_estates (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    property_type      public.real_estate_type NOT NULL DEFAULT 'land',
    status             public.real_estate_status NOT NULL DEFAULT 'available',
    title              text,                        -- ilan / portföy adı
    ada                text,                        -- ada
    parsel             text,                        -- parsel
    city               text NOT NULL,
    district           text,
    neighborhood       text,
    address_line       text,
    block_number       text,                        -- blok (bina)
    door_number        text,
    gross_sqm          numeric(12, 2),
    net_sqm            numeric(12, 2),
    list_price         numeric(14, 2),
    sale_price         numeric(14, 2),
    currency_code      char(3) NOT NULL DEFAULT 'TRY',
    vat_rate           numeric(5, 2),
    owner_name         text,
    owner_identity     text,
    owner_phone        text,
    owner_cari_id      uuid REFERENCES public.customer_caris (id),
    realtor_cari_id    uuid REFERENCES public.customer_caris (id),
    buyer_cari_id      uuid REFERENCES public.customer_caris (id),
    listed_at          date,
    sold_at            date,
    notes              text,
    metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted_at         timestamptz,

    CONSTRAINT real_estates_sqm_nonneg CHECK (
        (gross_sqm IS NULL OR gross_sqm >= 0)
        AND (net_sqm IS NULL OR net_sqm >= 0)
    ),
    CONSTRAINT real_estates_prices_nonneg CHECK (
        (list_price IS NULL OR list_price >= 0)
        AND (sale_price IS NULL OR sale_price >= 0)
    ),
    CONSTRAINT real_estates_vat_rate_range CHECK (
        vat_rate IS NULL OR (vat_rate >= 0 AND vat_rate <= 100)
    )
);

CREATE INDEX real_estates_location_idx
    ON public.real_estates (city, district, neighborhood)
    WHERE deleted_at IS NULL;

CREATE INDEX real_estates_ada_parsel_idx
    ON public.real_estates (ada, parsel)
    WHERE deleted_at IS NULL AND ada IS NOT NULL AND parsel IS NOT NULL;

CREATE INDEX real_estates_status_idx
    ON public.real_estates (status)
    WHERE deleted_at IS NULL;

CREATE INDEX real_estates_owner_cari_idx ON public.real_estates (owner_cari_id);
CREATE INDEX real_estates_realtor_cari_idx ON public.real_estates (realtor_cari_id);
CREATE INDEX real_estates_buyer_cari_idx ON public.real_estates (buyer_cari_id);

CREATE TRIGGER real_estates_set_updated_at
    BEFORE UPDATE ON public.real_estates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.real_estates IS
    'Emlak portföyü: ada, parsel, il/ilçe/mahalle, m², malik bilgileri.';
COMMENT ON COLUMN public.real_estates.ada IS 'Tapu ada numarası.';
COMMENT ON COLUMN public.real_estates.parsel IS 'Tapu parsel numarası.';

-- -----------------------------------------------------------------------------
-- veresiye_transactions — altın/döviz (kuyumcu) veya TL borç-alacak
-- -----------------------------------------------------------------------------

CREATE TABLE public.veresiye_transactions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cari_id          uuid NOT NULL REFERENCES public.customer_caris (id),
    asset_kind       public.veresiye_asset_kind NOT NULL DEFAULT 'tl',
    direction        public.veresiye_direction NOT NULL,
    -- TL / döviz tutarı
    amount           numeric(18, 4) NOT NULL,
    currency_code    char(3) NOT NULL DEFAULT 'TRY',
    -- Kuyumcu: gram / milyem vb.
    gold_grams       numeric(18, 4),
    gold_purity      numeric(8, 4),                 -- örn. 22, 14, 0.995
    fx_rate          numeric(18, 8),                -- işlem kuru
    description      text,
    transaction_date date NOT NULL DEFAULT (CURRENT_DATE),
    due_date         date,
    related_vehicle_id     uuid REFERENCES public.vehicles (id),
    related_real_estate_id uuid REFERENCES public.real_estates (id),
    invoice_id       uuid,                          -- invoices FK aşağıda eklenecek (circular: deferred)
    metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz,

    CONSTRAINT veresiye_amount_nonzero CHECK (amount <> 0),
    CONSTRAINT veresiye_gold_fields CHECK (
        asset_kind <> 'gold'
        OR (gold_grams IS NOT NULL AND gold_grams > 0)
    ),
    CONSTRAINT veresiye_fx_currency CHECK (
        asset_kind <> 'fx'
        OR currency_code <> 'TRY'
    )
);

CREATE INDEX veresiye_cari_date_idx
    ON public.veresiye_transactions (cari_id, transaction_date DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX veresiye_asset_kind_idx
    ON public.veresiye_transactions (asset_kind)
    WHERE deleted_at IS NULL;

CREATE INDEX veresiye_transaction_date_idx
    ON public.veresiye_transactions (transaction_date)
    WHERE deleted_at IS NULL;

CREATE TRIGGER veresiye_transactions_set_updated_at
    BEFORE UPDATE ON public.veresiye_transactions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.veresiye_transactions IS
    'Veresiye: kuyumcuda altın/döviz; galeri ve emlakta TL borç-alacak hareketleri.';
COMMENT ON COLUMN public.veresiye_transactions.asset_kind IS 'tl | gold | fx';
COMMENT ON COLUMN public.veresiye_transactions.gold_grams IS 'Altın işlemlerinde gram tutarı.';

-- -----------------------------------------------------------------------------
-- invoices — e-Fatura, e-Arşiv, Gider Pusulası taslakları
-- -----------------------------------------------------------------------------

CREATE TABLE public.invoices (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind               public.invoice_kind NOT NULL,
    direction          public.invoice_direction NOT NULL DEFAULT 'sales',
    status             public.invoice_status NOT NULL DEFAULT 'draft',
    document_number    text,                        -- resmi belge no (gönderim sonrası)
    uuid_ettn          uuid,                        -- ETTN
    issue_date         date NOT NULL DEFAULT (CURRENT_DATE),
    cari_id            uuid REFERENCES public.customer_caris (id),
    counterparty_title text,
    counterparty_vkn   text,
    currency_code      char(3) NOT NULL DEFAULT 'TRY',
    exchange_rate      numeric(18, 8),
    net_total          numeric(14, 2) NOT NULL DEFAULT 0,
    vat_total          numeric(14, 2) NOT NULL DEFAULT 0,
    grand_total        numeric(14, 2) NOT NULL DEFAULT 0,
    vat_rate           numeric(5, 2),
    related_vehicle_id     uuid REFERENCES public.vehicles (id),
    related_real_estate_id uuid REFERENCES public.real_estates (id),
    provider_payload   jsonb NOT NULL DEFAULT '{}'::jsonb,  -- entegratör isteği/yanıtı
    error_message      text,
    sent_at            timestamptz,
    notes              text,
    metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted_at         timestamptz,

    CONSTRAINT invoices_totals_nonneg CHECK (
        net_total >= 0 AND vat_total >= 0 AND grand_total >= 0
    ),
    CONSTRAINT invoices_vat_rate_range CHECK (
        vat_rate IS NULL OR (vat_rate >= 0 AND vat_rate <= 100)
    )
);

CREATE INDEX invoices_status_idx
    ON public.invoices (status)
    WHERE deleted_at IS NULL;

CREATE INDEX invoices_kind_idx
    ON public.invoices (kind)
    WHERE deleted_at IS NULL;

CREATE INDEX invoices_cari_id_idx
    ON public.invoices (cari_id)
    WHERE deleted_at IS NULL;

CREATE INDEX invoices_issue_date_idx
    ON public.invoices (issue_date DESC)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX invoices_document_number_uidx
    ON public.invoices (kind, document_number)
    WHERE document_number IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX invoices_ettn_uidx
    ON public.invoices (uuid_ettn)
    WHERE uuid_ettn IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER invoices_set_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.invoices IS
    'e-Fatura, e-Arşiv ve Gider Pusulası taslak / gönderim kayıtları.';
COMMENT ON COLUMN public.invoices.uuid_ettn IS 'Elektronik belge ETTN (UUID).';
COMMENT ON COLUMN public.invoices.provider_payload IS 'Entegratör ham istek/yanıt (JSON).';

-- veresiye → invoice FK (tablolar oluşturulduktan sonra)
ALTER TABLE public.veresiye_transactions
    ADD CONSTRAINT veresiye_transactions_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES public.invoices (id);

CREATE INDEX veresiye_invoice_id_idx
    ON public.veresiye_transactions (invoice_id)
    WHERE invoice_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- bank_transactions — Finteo / banka entegrasyonu (ileride kullanım)
-- -----------------------------------------------------------------------------

CREATE TABLE public.bank_accounts (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name        text NOT NULL,
    iban             text,
    account_alias    text,
    currency_code    char(3) NOT NULL DEFAULT 'TRY',
    is_active        boolean NOT NULL DEFAULT true,
    provider_ref     text,                          -- Finteo hesap referansı
    metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);

CREATE UNIQUE INDEX bank_accounts_iban_uidx
    ON public.bank_accounts (iban)
    WHERE iban IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER bank_accounts_set_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.bank_accounts IS
    'Firma banka hesapları; Finteo eşlemesi için provider_ref.';

CREATE TABLE public.bank_transactions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id    uuid NOT NULL REFERENCES public.bank_accounts (id),
    provider           text NOT NULL DEFAULT 'finteo',
    provider_tx_id     text,                        -- dış sistem benzersiz id
    direction          public.bank_tx_direction NOT NULL,
    amount             numeric(14, 2) NOT NULL,
    currency_code      char(3) NOT NULL DEFAULT 'TRY',
    transaction_at     timestamptz NOT NULL,
    value_date         date,
    counterparty_name  text,
    counterparty_iban  text,
    description        text,
    raw_payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
    match_status       public.bank_tx_match_status NOT NULL DEFAULT 'unmatched',
    matched_cari_id    uuid REFERENCES public.customer_caris (id),
    matched_invoice_id uuid REFERENCES public.invoices (id),
    matched_veresiye_id uuid REFERENCES public.veresiye_transactions (id),
    imported_at        timestamptz NOT NULL DEFAULT now(),
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted_at         timestamptz,

    CONSTRAINT bank_transactions_amount_positive CHECK (amount > 0)
);

CREATE UNIQUE INDEX bank_transactions_provider_uidx
    ON public.bank_transactions (provider, provider_tx_id)
    WHERE provider_tx_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX bank_transactions_account_time_idx
    ON public.bank_transactions (bank_account_id, transaction_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX bank_transactions_match_status_idx
    ON public.bank_transactions (match_status)
    WHERE deleted_at IS NULL;

CREATE INDEX bank_transactions_matched_cari_idx
    ON public.bank_transactions (matched_cari_id)
    WHERE matched_cari_id IS NOT NULL;

CREATE TRIGGER bank_transactions_set_updated_at
    BEFORE UPDATE ON public.bank_transactions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.bank_transactions IS
    'Banka hareketleri (Finteo vb.). Eşleştirme: cari / fatura / veresiye.';
COMMENT ON COLUMN public.bank_transactions.provider_tx_id IS
    'Sağlayıcıdaki benzersiz hareket kimliği (idempotent import).';

-- -----------------------------------------------------------------------------
-- Schema version marker (provisioning / migrasyon takibi)
-- -----------------------------------------------------------------------------

CREATE TABLE public.schema_migrations (
    version     text PRIMARY KEY,
    description text,
    applied_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.schema_migrations (version, description)
VALUES ('1.0.0', 'Initial tenant_template: caris, vehicles, real_estates, veresiye, invoices, bank');

COMMENT ON TABLE public.schema_migrations IS
    'Uygulanan tenant şablon sürümleri; merkez schema_version ile hizalanır.';
