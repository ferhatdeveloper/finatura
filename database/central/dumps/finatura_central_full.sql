-- Finatura central full dump (pg_dump)
-- Generated for restore onto finatura_pg / finatura_central
-- DO NOT apply to saas_postgres / kargomkapinda_*

--
-- PostgreSQL database dump
--

\restrict UG43KVMtug1tYUhUxD7lC1NVggREp8B2yMySPYMj1g7qbzRHJoW3eMaM3XhJAIh

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.tenants DROP CONSTRAINT IF EXISTS tenants_sector_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tenant_subscriptions DROP CONSTRAINT IF EXISTS tenant_subscriptions_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tenant_subscriptions DROP CONSTRAINT IF EXISTS tenant_subscriptions_plan_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tenant_memberships DROP CONSTRAINT IF EXISTS tenant_memberships_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tenant_kontor_balances DROP CONSTRAINT IF EXISTS tenant_kontor_balances_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tenant_einvoice_providers DROP CONSTRAINT IF EXISTS tenant_einvoice_providers_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.tenant_databases DROP CONSTRAINT IF EXISTS tenant_databases_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.mali_musavir_baglantilari DROP CONSTRAINT IF EXISTS mali_musavir_baglantilari_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.mali_musavir_baglantilari DROP CONSTRAINT IF EXISTS mali_musavir_accountant_user_fk;
ALTER TABLE IF EXISTS ONLY public.kontor_ledger DROP CONSTRAINT IF EXISTS kontor_ledger_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.accountant_period_approvals DROP CONSTRAINT IF EXISTS accountant_period_approvals_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.accountant_export_jobs DROP CONSTRAINT IF EXISTS accountant_export_jobs_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.accountant_export_jobs DROP CONSTRAINT IF EXISTS accountant_export_jobs_approval_id_fkey;
ALTER TABLE IF EXISTS ONLY public.accountant_codes DROP CONSTRAINT IF EXISTS accountant_codes_tenant_id_fkey;
ALTER TABLE IF EXISTS ONLY public.accountant_access_codes DROP CONSTRAINT IF EXISTS accountant_access_codes_tenant_id_fkey;
DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
DROP TRIGGER IF EXISTS tenants_set_updated_at ON public.tenants;
DROP TRIGGER IF EXISTS tenant_subscriptions_set_updated_at ON public.tenant_subscriptions;
DROP TRIGGER IF EXISTS tenant_memberships_set_updated_at ON public.tenant_memberships;
DROP TRIGGER IF EXISTS tenant_kontor_balances_set_updated_at ON public.tenant_kontor_balances;
DROP TRIGGER IF EXISTS tenant_einvoice_providers_set_updated_at ON public.tenant_einvoice_providers;
DROP TRIGGER IF EXISTS tenant_databases_set_updated_at ON public.tenant_databases;
DROP TRIGGER IF EXISTS system_settings_set_updated_at ON public.system_settings;
DROP TRIGGER IF EXISTS subscription_plans_set_updated_at ON public.subscription_plans;
DROP TRIGGER IF EXISTS sectors_set_updated_at ON public.sectors;
DROP TRIGGER IF EXISTS mali_musavir_baglantilari_set_updated_at ON public.mali_musavir_baglantilari;
DROP TRIGGER IF EXISTS accountant_codes_set_updated_at ON public.accountant_codes;
DROP INDEX IF EXISTS public.users_vergi_no_active_uidx;
DROP INDEX IF EXISTS public.users_tckn_active_uidx;
DROP INDEX IF EXISTS public.users_platform_admin_idx;
DROP INDEX IF EXISTS public.users_phone_digits_active_uidx;
DROP INDEX IF EXISTS public.users_is_active_idx;
DROP INDEX IF EXISTS public.users_email_active_uidx;
DROP INDEX IF EXISTS public.tenants_tax_number_idx;
DROP INDEX IF EXISTS public.tenants_status_idx;
DROP INDEX IF EXISTS public.tenants_slug_active_uidx;
DROP INDEX IF EXISTS public.tenants_sector_id_idx;
DROP INDEX IF EXISTS public.tenants_mali_musavir_kodu_uidx;
DROP INDEX IF EXISTS public.tenant_subscriptions_tenant_id_idx;
DROP INDEX IF EXISTS public.tenant_subscriptions_status_idx;
DROP INDEX IF EXISTS public.tenant_memberships_user_id_idx;
DROP INDEX IF EXISTS public.tenant_memberships_active_uidx;
DROP INDEX IF EXISTS public.tenant_einvoice_providers_tenant_provider_uidx;
DROP INDEX IF EXISTS public.tenant_einvoice_providers_tenant_id_idx;
DROP INDEX IF EXISTS public.tenant_einvoice_providers_provider_idx;
DROP INDEX IF EXISTS public.tenant_einvoice_providers_primary_uidx;
DROP INDEX IF EXISTS public.tenant_databases_tenant_id_idx;
DROP INDEX IF EXISTS public.tenant_databases_primary_uidx;
DROP INDEX IF EXISTS public.mali_musavir_tenant_id_idx;
DROP INDEX IF EXISTS public.mali_musavir_tenant_accountant_approved_uidx;
DROP INDEX IF EXISTS public.mali_musavir_kod_pending_uidx;
DROP INDEX IF EXISTS public.mali_musavir_accountant_user_id_idx;
DROP INDEX IF EXISTS public.kontor_ledger_tenant_created_idx;
DROP INDEX IF EXISTS public.kontor_ledger_reference_idx;
DROP INDEX IF EXISTS public.idx_accountant_approvals_tenant_period;
DROP INDEX IF EXISTS public.accountant_codes_tenant_id_idx;
DROP INDEX IF EXISTS public.accountant_codes_code_active_uidx;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.tenants DROP CONSTRAINT IF EXISTS tenants_pkey;
ALTER TABLE IF EXISTS ONLY public.tenant_subscriptions DROP CONSTRAINT IF EXISTS tenant_subscriptions_pkey;
ALTER TABLE IF EXISTS ONLY public.tenant_memberships DROP CONSTRAINT IF EXISTS tenant_memberships_pkey;
ALTER TABLE IF EXISTS ONLY public.tenant_kontor_balances DROP CONSTRAINT IF EXISTS tenant_kontor_balances_pkey;
ALTER TABLE IF EXISTS ONLY public.tenant_einvoice_providers DROP CONSTRAINT IF EXISTS tenant_einvoice_providers_pkey;
ALTER TABLE IF EXISTS ONLY public.tenant_databases DROP CONSTRAINT IF EXISTS tenant_databases_pkey;
ALTER TABLE IF EXISTS ONLY public.system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_pkey;
ALTER TABLE IF EXISTS ONLY public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_code_key;
ALTER TABLE IF EXISTS ONLY public.sectors DROP CONSTRAINT IF EXISTS sectors_pkey;
ALTER TABLE IF EXISTS ONLY public.sectors DROP CONSTRAINT IF EXISTS sectors_code_key;
ALTER TABLE IF EXISTS ONLY public.mali_musavir_baglantilari DROP CONSTRAINT IF EXISTS mali_musavir_baglantilari_pkey;
ALTER TABLE IF EXISTS ONLY public.kontor_ledger DROP CONSTRAINT IF EXISTS kontor_ledger_pkey;
ALTER TABLE IF EXISTS ONLY public.accountant_period_approvals DROP CONSTRAINT IF EXISTS accountant_period_approvals_tenant_id_period_key;
ALTER TABLE IF EXISTS ONLY public.accountant_period_approvals DROP CONSTRAINT IF EXISTS accountant_period_approvals_pkey;
ALTER TABLE IF EXISTS ONLY public.accountant_export_jobs DROP CONSTRAINT IF EXISTS accountant_export_jobs_pkey;
ALTER TABLE IF EXISTS ONLY public.accountant_codes DROP CONSTRAINT IF EXISTS accountant_codes_pkey;
ALTER TABLE IF EXISTS ONLY public.accountant_access_codes DROP CONSTRAINT IF EXISTS accountant_access_codes_tenant_id_code_hash_key;
ALTER TABLE IF EXISTS ONLY public.accountant_access_codes DROP CONSTRAINT IF EXISTS accountant_access_codes_pkey;
DROP VIEW IF EXISTS public.v_tenant_einvoice_primary;
DROP VIEW IF EXISTS public.v_active_tenant_connections;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.tenants;
DROP TABLE IF EXISTS public.tenant_subscriptions;
DROP TABLE IF EXISTS public.tenant_memberships;
DROP TABLE IF EXISTS public.tenant_kontor_balances;
DROP TABLE IF EXISTS public.tenant_einvoice_providers;
DROP TABLE IF EXISTS public.tenant_databases;
DROP TABLE IF EXISTS public.system_settings;
DROP TABLE IF EXISTS public.subscription_plans;
DROP TABLE IF EXISTS public.sectors;
DROP TABLE IF EXISTS public.mali_musavir_baglantilari;
DROP TABLE IF EXISTS public.kontor_ledger;
DROP TABLE IF EXISTS public.accountant_period_approvals;
DROP TABLE IF EXISTS public.accountant_export_jobs;
DROP TABLE IF EXISTS public.accountant_codes;
DROP TABLE IF EXISTS public.accountant_access_codes;
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP TYPE IF EXISTS public.tenant_status;
DROP TYPE IF EXISTS public.subscription_status;
DROP TYPE IF EXISTS public.sector_code;
DROP TYPE IF EXISTS public.membership_role;
DROP TYPE IF EXISTS public.kontor_ledger_type;
DROP TYPE IF EXISTS public.einvoice_provider_code;
DROP TYPE IF EXISTS public.accountant_link_status;
DROP TYPE IF EXISTS public.accountant_approval_status;
DROP EXTENSION IF EXISTS pgcrypto;
--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: accountant_approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.accountant_approval_status AS ENUM (
    'pending',
    'approved',
    'revoked'
);


--
-- Name: accountant_link_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.accountant_link_status AS ENUM (
    'pending',
    'approved',
    'revoked'
);


--
-- Name: TYPE accountant_link_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.accountant_link_status IS 'Mali müşavir üyelik bağlantısı: pending | approved | revoked';


--
-- Name: einvoice_provider_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.einvoice_provider_code AS ENUM (
    'edm',
    'uyumsoft',
    'fit',
    'elogo',
    'qnb',
    'nes',
    'nilvera',
    'izibiz'
);


--
-- Name: TYPE einvoice_provider_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.einvoice_provider_code IS 'Finatura bayilikinde desteklenen e-fatura entegratörleri (edm, uyumsoft, fit, elogo, qnb, nes, nilvera, izibiz).';


--
-- Name: kontor_ledger_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.kontor_ledger_type AS ENUM (
    'credit',
    'debit',
    'adjust',
    'refund'
);


--
-- Name: membership_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.membership_role AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer',
    'accountant'
);


--
-- Name: TYPE membership_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TYPE public.membership_role IS 'tenant_memberships.role tek kaynağı: owner | admin | member | viewer | accountant';


--
-- Name: sector_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sector_code AS ENUM (
    'oto_galeri',
    'kuyumculuk',
    'emlak'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'trial',
    'active',
    'past_due',
    'cancelled',
    'expired'
);


--
-- Name: tenant_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tenant_status AS ENUM (
    'pending',
    'provisioning',
    'active',
    'suspended',
    'cancelled'
);


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accountant_access_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accountant_access_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code_hash text NOT NULL,
    accountant_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE accountant_access_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accountant_access_codes IS 'Mali müşavir erişim kodları (hash). Uygulama stub kodları JSON store ile başlar.';


--
-- Name: accountant_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accountant_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code text NOT NULL,
    label text,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT accountant_codes_code_len CHECK (((char_length(code) >= 4) AND (char_length(code) <= 64)))
);


--
-- Name: TABLE accountant_codes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accountant_codes IS 'Tenant başına ek firma kodları (login firmaKodu). Davet akışı: mali_musavir_baglantilari.';


--
-- Name: COLUMN accountant_codes.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.accountant_codes.code IS 'Büyük/küçük harf duyarsız unique (aktif kodlar).';


--
-- Name: accountant_export_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accountant_export_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    approval_id uuid,
    period character(7) NOT NULL,
    filename text NOT NULL,
    fis_adedi integer DEFAULT 0 NOT NULL,
    dengeli boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE accountant_export_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accountant_export_jobs IS 'Luca XML dışa aktarım denetim kaydı (opsiyonel).';


--
-- Name: accountant_period_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accountant_period_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    period character(7) NOT NULL,
    status public.accountant_approval_status DEFAULT 'approved'::public.accountant_approval_status NOT NULL,
    include_invoices boolean DEFAULT true NOT NULL,
    include_bank boolean DEFAULT true NOT NULL,
    invoice_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    bank_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    approved_by text,
    approved_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE accountant_period_approvals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accountant_period_approvals IS 'Dönem bazlı mali müşavir onayı; Luca XML dışa aktarım önkoşulu.';


--
-- Name: kontor_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kontor_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    entry_type public.kontor_ledger_type NOT NULL,
    amount numeric(14,2) NOT NULL,
    balance_after numeric(14,2) NOT NULL,
    reference_type text,
    reference_id uuid,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kontor_ledger_amount_nonzero CHECK ((amount <> (0)::numeric))
);


--
-- Name: TABLE kontor_ledger; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.kontor_ledger IS 'Kontör yükleme / düşüm / düzeltme hareket defteri (append-only tercih edilir).';


--
-- Name: COLUMN kontor_ledger.amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.kontor_ledger.amount IS 'credit/refund pozitif; debit negatif olabilir veya entry_type ile ayrılır — uygulama tutarlılığı gerekir.';


--
-- Name: mali_musavir_baglantilari; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mali_musavir_baglantilari (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    accountant_user_id uuid,
    invited_by_user_id uuid NOT NULL,
    kod text NOT NULL,
    status public.accountant_link_status DEFAULT 'pending'::public.accountant_link_status NOT NULL,
    expires_at timestamp with time zone,
    approved_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mali_musavir_kod_format CHECK ((kod ~ '^[A-Z0-9]{6,16}$'::text))
);


--
-- Name: TABLE mali_musavir_baglantilari; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mali_musavir_baglantilari IS 'Tenant ↔ mali müşavir davet kodu ve bağlantı durumu (üyelik bağlama).';


--
-- Name: COLUMN mali_musavir_baglantilari.accountant_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mali_musavir_baglantilari.accountant_user_id IS 'Bağlanan mali müşavir (users.id); pending iken NULL.';


--
-- Name: COLUMN mali_musavir_baglantilari.kod; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mali_musavir_baglantilari.kod IS 'Pending davet kodu; bağlanınca status=approved.';


--
-- Name: sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code public.sector_code NOT NULL,
    name_tr text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE sectors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sectors IS 'Finatura sektör kataloğu (Oto Galeri, Kuyumculuk, Emlak).';


--
-- Name: COLUMN sectors.code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sectors.code IS 'Uygulama katmanında kullanılan sabit sektör kodu.';


--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name_tr text NOT NULL,
    description text,
    included_kontor integer DEFAULT 0 NOT NULL,
    price_amount numeric(12,2),
    currency_code character(3) DEFAULT 'TRY'::bpchar NOT NULL,
    billing_period text DEFAULT 'monthly'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscription_plans_billing_period CHECK ((billing_period = ANY (ARRAY['monthly'::text, 'yearly'::text, 'one_time'::text]))),
    CONSTRAINT subscription_plans_kontor_nonneg CHECK ((included_kontor >= 0))
);


--
-- Name: TABLE subscription_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.subscription_plans IS 'Abonelik plan tanımları (kontör kotası dahil).';


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value_text text,
    value_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_secret boolean DEFAULT false NOT NULL,
    value_ciphertext text,
    encryption_key_id text,
    description text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE system_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.system_settings IS 'Platform geneli ayarlar (LLM/OpenRouter, özellik bayrakları). Gizli değerler value_ciphertext.';


--
-- Name: tenant_databases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_databases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    db_host text NOT NULL,
    db_port integer DEFAULT 5432 NOT NULL,
    db_name text NOT NULL,
    db_user text NOT NULL,
    password_ciphertext text NOT NULL,
    encryption_key_id text NOT NULL,
    ssl_mode text DEFAULT 'require'::text NOT NULL,
    is_primary boolean DEFAULT true NOT NULL,
    is_healthy boolean DEFAULT true NOT NULL,
    last_health_check_at timestamp with time zone,
    schema_version text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT tenant_databases_port_range CHECK (((db_port > 0) AND (db_port <= 65535))),
    CONSTRAINT tenant_databases_ssl_mode CHECK ((ssl_mode = ANY (ARRAY['disable'::text, 'allow'::text, 'prefer'::text, 'require'::text, 'verify-ca'::text, 'verify-full'::text])))
);


--
-- Name: TABLE tenant_databases; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenant_databases IS 'İzole kiracı PostgreSQL bağlantı bilgileri. Parola yalnızca şifreli saklanır.';


--
-- Name: COLUMN tenant_databases.password_ciphertext; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenant_databases.password_ciphertext IS 'Uygulama / KMS ile şifrelenmiş DB parolası; düz metin yazılmaz.';


--
-- Name: COLUMN tenant_databases.encryption_key_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenant_databases.encryption_key_id IS 'Şifre çözmede kullanılacak anahtar kimliği.';


--
-- Name: COLUMN tenant_databases.schema_version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenant_databases.schema_version IS 'tenant_template migrasyon sürümü (örn. 1.0.0).';


--
-- Name: tenant_einvoice_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_einvoice_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    provider public.einvoice_provider_code NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    merchant_code text,
    branch_code text,
    credentials_ciphertext text,
    encryption_key_id text,
    environment text DEFAULT 'test'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    activated_at timestamp with time zone,
    deactivated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT tenant_einvoice_providers_credentials_pair CHECK ((((credentials_ciphertext IS NULL) AND (encryption_key_id IS NULL)) OR ((credentials_ciphertext IS NOT NULL) AND (encryption_key_id IS NOT NULL)))),
    CONSTRAINT tenant_einvoice_providers_environment CHECK ((environment = ANY (ARRAY['test'::text, 'production'::text])))
);


--
-- Name: TABLE tenant_einvoice_providers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenant_einvoice_providers IS 'Tenant e-fatura entegratör seçimi ve bağlantı meta bilgisi (Finatura bayilik).';


--
-- Name: COLUMN tenant_einvoice_providers.is_primary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenant_einvoice_providers.is_primary IS 'Gönderimde kullanılacak varsayılan entegratör.';


--
-- Name: COLUMN tenant_einvoice_providers.credentials_ciphertext; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenant_einvoice_providers.credentials_ciphertext IS 'Entegratör API kimlik bilgileri; düz metin yazılmaz.';


--
-- Name: COLUMN tenant_einvoice_providers.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenant_einvoice_providers.metadata IS 'Sağlayıcı özel alanlar (JSON); şema sık değişen özellikler için.';


--
-- Name: tenant_kontor_balances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_kontor_balances (
    tenant_id uuid NOT NULL,
    balance numeric(14,2) DEFAULT 0 NOT NULL,
    reserved numeric(14,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_kontor_balances_nonneg CHECK ((balance >= (0)::numeric)),
    CONSTRAINT tenant_kontor_reserved_lte_balance CHECK ((reserved <= balance)),
    CONSTRAINT tenant_kontor_reserved_nonneg CHECK ((reserved >= (0)::numeric))
);


--
-- Name: TABLE tenant_kontor_balances; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenant_kontor_balances IS 'Tenant kontör anlık bakiyesi. Mutasyonlar ledger üzerinden yapılmalıdır.';


--
-- Name: tenant_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.membership_role DEFAULT 'member'::public.membership_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    invited_at timestamp with time zone,
    joined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: TABLE tenant_memberships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenant_memberships IS 'Kullanıcıların tenant üyelikleri ve rolleri (merkezi yetkilendirme).';


--
-- Name: COLUMN tenant_memberships.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenant_memberships.role IS 'Üyelik rolü (public.membership_role). Mali müşavir = accountant.';


--
-- Name: tenant_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status public.subscription_status DEFAULT 'trial'::public.subscription_status NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE tenant_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenant_subscriptions IS 'Tenant abonelik dönemleri.';


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    display_name text NOT NULL,
    legal_name text,
    tax_office text,
    tax_number text,
    sector_id uuid NOT NULL,
    status public.tenant_status DEFAULT 'pending'::public.tenant_status NOT NULL,
    primary_email text,
    primary_phone text,
    timezone text DEFAULT 'Europe/Istanbul'::text NOT NULL,
    locale text DEFAULT 'tr-TR'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    provisioned_at timestamp with time zone,
    suspended_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    mali_musavir_kodu text,
    CONSTRAINT tenants_slug_format CHECK ((slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text)),
    CONSTRAINT tenants_slug_len CHECK (((char_length(slug) >= 2) AND (char_length(slug) <= 63)))
);


--
-- Name: TABLE tenants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tenants IS 'Üye firmalar (kiracılar). Her aktif tenant için ayrı PostgreSQL veritabanı vardır.';


--
-- Name: COLUMN tenants.slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.slug IS 'URL / subdomain güvenli kimlik (benzersiz, soft-delete sonrası tekrar kullanılabilir).';


--
-- Name: COLUMN tenants.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.metadata IS 'Esnek ek alanlar (JSON); şema sık değişen özellikler için.';


--
-- Name: COLUMN tenants.mali_musavir_kodu; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tenants.mali_musavir_kodu IS 'Kalıcı firma / mali müşavir kodu (unique). Web form firmaKodu ile resolve.';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    full_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    is_platform_admin boolean DEFAULT false NOT NULL,
    phone text,
    phone_digits text,
    tckn text,
    vergi_no text,
    CONSTRAINT users_email_format CHECK ((email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)),
    CONSTRAINT users_phone_digits_format CHECK (((phone_digits IS NULL) OR (phone_digits ~ '^[0-9]{10,15}$'::text))),
    CONSTRAINT users_tckn_format CHECK (((tckn IS NULL) OR (tckn ~ '^[0-9]{11}$'::text))),
    CONSTRAINT users_vergi_no_format CHECK (((vergi_no IS NULL) OR (vergi_no ~ '^[0-9]{10}$'::text)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.users IS 'Merkezi SaaS kullanıcıları. Parola yalnızca hash olarak saklanır.';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.password_hash IS 'Geliştirme: dev:<plaintext>. Üretim: bcrypt/argon2 hash. Düz metin yazılmaz.';


--
-- Name: COLUMN users.full_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.full_name IS 'Görünen ad (API cevabında displayName).';


--
-- Name: COLUMN users.is_platform_admin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.is_platform_admin IS 'SaaS superadmin: sistem ayarları, OpenRouter anahtarı, platform raporları.';


--
-- Name: COLUMN users.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.phone IS 'Kullanıcının görünen telefonu (+90… / 0…). Login eşlemesi phone_digits üzerinden.';


--
-- Name: COLUMN users.phone_digits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.phone_digits IS 'Normalize TR cep: yalnızca rakam, 10 hane (5xxxxxxxxx). Login lookup anahtarı.';


--
-- Name: COLUMN users.tckn; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.tckn IS 'TC kimlik no (11 hane). Login identifier olarak kullanılabilir.';


--
-- Name: COLUMN users.vergi_no; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.vergi_no IS 'Vergi kimlik no / VKN (10 hane). Login identifier olarak kullanılabilir.';


--
-- Name: v_active_tenant_connections; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_active_tenant_connections AS
 SELECT t.id AS tenant_id,
    t.slug,
    t.display_name,
    t.status AS tenant_status,
    s.code AS sector_code,
    td.id AS tenant_database_id,
    td.db_host,
    td.db_port,
    td.db_name,
    td.db_user,
    td.ssl_mode,
    td.schema_version,
    td.is_healthy,
    kb.balance AS kontor_balance
   FROM (((public.tenants t
     JOIN public.sectors s ON ((s.id = t.sector_id)))
     LEFT JOIN public.tenant_databases td ON (((td.tenant_id = t.id) AND (td.is_primary = true) AND (td.deleted_at IS NULL))))
     LEFT JOIN public.tenant_kontor_balances kb ON ((kb.tenant_id = t.id)))
  WHERE ((t.deleted_at IS NULL) AND (t.status = 'active'::public.tenant_status));


--
-- Name: VIEW v_active_tenant_connections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_active_tenant_connections IS 'Aktif tenant özeti + birincil DB meta (parola yok). Router katmanı için.';


--
-- Name: v_tenant_einvoice_primary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_tenant_einvoice_primary AS
 SELECT t.id AS tenant_id,
    t.slug,
    t.display_name,
    tep.id AS config_id,
    tep.provider,
    tep.environment,
    tep.merchant_code,
    tep.branch_code,
    tep.is_active,
    tep.is_primary,
    tep.activated_at,
    tep.metadata
   FROM (public.tenants t
     JOIN public.tenant_einvoice_providers tep ON (((tep.tenant_id = t.id) AND (tep.is_primary = true) AND (tep.is_active = true) AND (tep.deleted_at IS NULL))))
  WHERE (t.deleted_at IS NULL);


--
-- Name: VIEW v_tenant_einvoice_primary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.v_tenant_einvoice_primary IS 'Tenant birincil e-fatura entegratörü (credentials yok). Router / billing için.';


--
-- Data for Name: accountant_access_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accountant_access_codes (id, tenant_id, code_hash, accountant_name, is_active, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: accountant_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accountant_codes (id, tenant_id, code, label, is_active, expires_at, created_by, created_at, updated_at, revoked_at) FROM stdin;
1f758dc9-454a-47df-a18b-ae31a74f4ef0	00000000-0000-4000-8000-0000000000aa	MM-DEMO	Demo mali müşavir kodu	t	\N	\N	2026-07-17 10:37:59.296682+00	2026-07-17 10:37:59.296682+00	\N
\.


--
-- Data for Name: accountant_export_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accountant_export_jobs (id, tenant_id, approval_id, period, filename, fis_adedi, dengeli, created_at) FROM stdin;
\.


--
-- Data for Name: accountant_period_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accountant_period_approvals (id, tenant_id, period, status, include_invoices, include_bank, invoice_ids, bank_ids, approved_by, approved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: kontor_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kontor_ledger (id, tenant_id, entry_type, amount, balance_after, reference_type, reference_id, description, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: mali_musavir_baglantilari; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mali_musavir_baglantilari (id, tenant_id, accountant_user_id, invited_by_user_id, kod, status, expires_at, approved_at, revoked_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sectors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sectors (id, code, name_tr, description, is_active, created_at, updated_at) FROM stdin;
6f59c95d-1192-408b-a7e5-85576540c473	oto_galeri	Oto Galeri	İkinci el / galeri araç alım-satım ve stok yönetimi	t	2026-07-17 10:37:58.983218+00	2026-07-17 10:37:58.983218+00
adcb35f7-0224-4847-bd24-dec2409353a1	kuyumculuk	Kuyumculuk	Altın ve döviz veresiye, kuyumcu cari işlemleri	t	2026-07-17 10:37:58.983218+00	2026-07-17 10:37:58.983218+00
541dd31f-3f0c-463a-a6fe-ddb30afbd011	emlak	Emlak	Gayrimenkul portföy ve emlakçı cari yönetimi	t	2026-07-17 10:37:58.983218+00	2026-07-17 10:37:58.983218+00
\.


--
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subscription_plans (id, code, name_tr, description, included_kontor, price_amount, currency_code, billing_period, is_active, created_at, updated_at) FROM stdin;
1f5ed4b1-20a1-4728-84f7-13de377ae537	trial	Deneme	Sınırlı deneme planı	50	0.00	TRY	one_time	t	2026-07-17 10:37:59.032099+00	2026-07-17 10:37:59.032099+00
f1ef4ac2-8913-4516-a725-ecbf302fdb1f	starter	Başlangıç	Küçük işletmeler için aylık	200	1499.00	TRY	monthly	t	2026-07-17 10:37:59.032099+00	2026-07-17 10:37:59.032099+00
c2d035b4-0e8c-4505-bd2f-519a62158055	business	İşletme	Yoğun kullanım için aylık	750	3999.00	TRY	monthly	t	2026-07-17 10:37:59.032099+00	2026-07-17 10:37:59.032099+00
fadfbd5b-ef06-499c-b802-d3ba3fce7f2a	yearly	Yıllık İş	İşletme planının yıllık hali	9000	39990.00	TRY	yearly	t	2026-07-17 10:37:59.032099+00	2026-07-17 10:37:59.032099+00
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.system_settings (key, value_text, value_json, is_secret, value_ciphertext, encryption_key_id, description, updated_by, created_at, updated_at) FROM stdin;
llm.enabled	false	{}	f	\N	\N	OCR alan çıkarımı için LLM açık mı	\N	2026-07-17 10:37:59.263269+00	2026-07-17 10:37:59.263269+00
llm.provider	openrouter	{}	f	\N	\N	openai | openrouter | anthropic | gemini | openai_compatible	\N	2026-07-17 10:37:59.263269+00	2026-07-17 10:37:59.263269+00
llm.base_url	https://openrouter.ai/api/v1	{}	f	\N	\N	OpenAI-compatible base URL	\N	2026-07-17 10:37:59.263269+00	2026-07-17 10:37:59.263269+00
llm.model	openai/gpt-4o-mini	{}	f	\N	\N	Model id (OpenRouter: org/model)	\N	2026-07-17 10:37:59.263269+00	2026-07-17 10:37:59.263269+00
llm.api_key	\N	{}	t	\N	\N	LLM / OpenRouter API anahtarı	\N	2026-07-17 10:37:59.263269+00	2026-07-17 10:37:59.263269+00
llm.http_referer	https://finatura.app	{}	f	\N	\N	OpenRouter HTTP-Referer	\N	2026-07-17 10:37:59.263269+00	2026-07-17 10:37:59.263269+00
llm.app_title	Finatura	{}	f	\N	\N	OpenRouter X-Title	\N	2026-07-17 10:37:59.263269+00	2026-07-17 10:37:59.263269+00
\.


--
-- Data for Name: tenant_databases; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenant_databases (id, tenant_id, db_host, db_port, db_name, db_user, password_ciphertext, encryption_key_id, ssl_mode, is_primary, is_healthy, last_health_check_at, schema_version, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: tenant_einvoice_providers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenant_einvoice_providers (id, tenant_id, provider, is_primary, is_active, merchant_code, branch_code, credentials_ciphertext, encryption_key_id, environment, metadata, activated_at, deactivated_at, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: tenant_kontor_balances; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenant_kontor_balances (tenant_id, balance, reserved, updated_at) FROM stdin;
00000000-0000-4000-8000-0000000000aa	100.00	0.00	2026-07-17 10:37:59.296191+00
\.


--
-- Data for Name: tenant_memberships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenant_memberships (id, tenant_id, user_id, role, is_active, invited_at, joined_at, created_at, updated_at, deleted_at) FROM stdin;
45dafe61-3960-4b5e-9277-318fc4ae4c1b	00000000-0000-4000-8000-0000000000aa	00000000-0000-4000-8000-000000000001	owner	t	\N	2026-07-17 10:37:59.295081+00	2026-07-17 10:37:59.295081+00	2026-07-17 10:37:59.295081+00	\N
586418d1-6292-4441-830d-ab39c1a23514	00000000-0000-4000-8000-0000000000aa	00000000-0000-4000-8000-000000000002	accountant	t	\N	2026-07-17 10:37:59.295081+00	2026-07-17 10:37:59.295081+00	2026-07-17 10:37:59.295081+00	\N
dccdf737-8abf-48c2-b723-70fa4ba82607	00000000-0000-4000-8000-0000000000aa	00000000-0000-4000-8000-000000000003	admin	t	\N	2026-07-17 10:37:59.295081+00	2026-07-17 10:37:59.295081+00	2026-07-17 10:37:59.295081+00	\N
\.


--
-- Data for Name: tenant_subscriptions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenant_subscriptions (id, tenant_id, plan_id, status, starts_at, ends_at, trial_ends_at, cancelled_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tenants (id, slug, display_name, legal_name, tax_office, tax_number, sector_id, status, primary_email, primary_phone, timezone, locale, metadata, provisioned_at, suspended_at, cancelled_at, created_at, updated_at, deleted_at, mali_musavir_kodu) FROM stdin;
00000000-0000-4000-8000-0000000000aa	ornek-galeri	Örnek Oto Galeri Ltd.	Örnek Oto Galeri Limited Şirketi	\N	1234567890	6f59c95d-1192-408b-a7e5-85576540c473	active	demo@finatura.app	+90 555 111 22 33	Europe/Istanbul	tr-TR	{}	2026-07-17 10:37:59.291956+00	\N	\N	2026-07-17 10:37:59.291956+00	2026-07-17 10:37:59.333551+00	\N	DEMO-GALERI
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, full_name, is_active, last_login_at, created_at, updated_at, deleted_at, is_platform_admin, phone, phone_digits, tckn, vergi_no) FROM stdin;
00000000-0000-4000-8000-000000000001	demo@finatura.app	dev:demo1234	Finatura Demo	t	\N	2026-07-17 10:37:59.293945+00	2026-07-17 10:37:59.33198+00	\N	f	+90 555 111 22 33	5551112233	10000000146	1234567890
00000000-0000-4000-8000-000000000002	mm@finatura.app	dev:mali1234	Ayşe Yılmaz, SMMM	t	\N	2026-07-17 10:37:59.293945+00	2026-07-17 10:37:59.333111+00	\N	f	+90 555 222 33 44	5552223344	10000000154	9876543210
00000000-0000-4000-8000-000000000003	admin@finatura.app	dev:admin1234	Finatura Superadmin	t	\N	2026-07-17 10:37:59.293945+00	2026-07-17 10:37:59.333373+00	\N	t	+90 555 999 88 77	5559998877	10000000162	1111111111
\.


--
-- Name: accountant_access_codes accountant_access_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_access_codes
    ADD CONSTRAINT accountant_access_codes_pkey PRIMARY KEY (id);


--
-- Name: accountant_access_codes accountant_access_codes_tenant_id_code_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_access_codes
    ADD CONSTRAINT accountant_access_codes_tenant_id_code_hash_key UNIQUE (tenant_id, code_hash);


--
-- Name: accountant_codes accountant_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_codes
    ADD CONSTRAINT accountant_codes_pkey PRIMARY KEY (id);


--
-- Name: accountant_export_jobs accountant_export_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_export_jobs
    ADD CONSTRAINT accountant_export_jobs_pkey PRIMARY KEY (id);


--
-- Name: accountant_period_approvals accountant_period_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_period_approvals
    ADD CONSTRAINT accountant_period_approvals_pkey PRIMARY KEY (id);


--
-- Name: accountant_period_approvals accountant_period_approvals_tenant_id_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_period_approvals
    ADD CONSTRAINT accountant_period_approvals_tenant_id_period_key UNIQUE (tenant_id, period);


--
-- Name: kontor_ledger kontor_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kontor_ledger
    ADD CONSTRAINT kontor_ledger_pkey PRIMARY KEY (id);


--
-- Name: mali_musavir_baglantilari mali_musavir_baglantilari_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mali_musavir_baglantilari
    ADD CONSTRAINT mali_musavir_baglantilari_pkey PRIMARY KEY (id);


--
-- Name: sectors sectors_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_code_key UNIQUE (code);


--
-- Name: sectors sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_code_key UNIQUE (code);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: tenant_databases tenant_databases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_databases
    ADD CONSTRAINT tenant_databases_pkey PRIMARY KEY (id);


--
-- Name: tenant_einvoice_providers tenant_einvoice_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_einvoice_providers
    ADD CONSTRAINT tenant_einvoice_providers_pkey PRIMARY KEY (id);


--
-- Name: tenant_kontor_balances tenant_kontor_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_kontor_balances
    ADD CONSTRAINT tenant_kontor_balances_pkey PRIMARY KEY (tenant_id);


--
-- Name: tenant_memberships tenant_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_pkey PRIMARY KEY (id);


--
-- Name: tenant_subscriptions tenant_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: accountant_codes_code_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX accountant_codes_code_active_uidx ON public.accountant_codes USING btree (upper(code)) WHERE ((is_active = true) AND (revoked_at IS NULL));


--
-- Name: accountant_codes_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accountant_codes_tenant_id_idx ON public.accountant_codes USING btree (tenant_id) WHERE ((is_active = true) AND (revoked_at IS NULL));


--
-- Name: idx_accountant_approvals_tenant_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accountant_approvals_tenant_period ON public.accountant_period_approvals USING btree (tenant_id, period);


--
-- Name: kontor_ledger_reference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kontor_ledger_reference_idx ON public.kontor_ledger USING btree (reference_type, reference_id) WHERE (reference_id IS NOT NULL);


--
-- Name: kontor_ledger_tenant_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX kontor_ledger_tenant_created_idx ON public.kontor_ledger USING btree (tenant_id, created_at DESC);


--
-- Name: mali_musavir_accountant_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mali_musavir_accountant_user_id_idx ON public.mali_musavir_baglantilari USING btree (accountant_user_id) WHERE (accountant_user_id IS NOT NULL);


--
-- Name: mali_musavir_kod_pending_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mali_musavir_kod_pending_uidx ON public.mali_musavir_baglantilari USING btree (kod) WHERE (status = 'pending'::public.accountant_link_status);


--
-- Name: mali_musavir_tenant_accountant_approved_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mali_musavir_tenant_accountant_approved_uidx ON public.mali_musavir_baglantilari USING btree (tenant_id, accountant_user_id) WHERE ((status = 'approved'::public.accountant_link_status) AND (accountant_user_id IS NOT NULL));


--
-- Name: mali_musavir_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mali_musavir_tenant_id_idx ON public.mali_musavir_baglantilari USING btree (tenant_id);


--
-- Name: tenant_databases_primary_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_databases_primary_uidx ON public.tenant_databases USING btree (tenant_id) WHERE ((is_primary = true) AND (deleted_at IS NULL));


--
-- Name: tenant_databases_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_databases_tenant_id_idx ON public.tenant_databases USING btree (tenant_id) WHERE (deleted_at IS NULL);


--
-- Name: tenant_einvoice_providers_primary_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_einvoice_providers_primary_uidx ON public.tenant_einvoice_providers USING btree (tenant_id) WHERE ((is_primary = true) AND (is_active = true) AND (deleted_at IS NULL));


--
-- Name: tenant_einvoice_providers_provider_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_einvoice_providers_provider_idx ON public.tenant_einvoice_providers USING btree (provider) WHERE ((deleted_at IS NULL) AND (is_active = true));


--
-- Name: tenant_einvoice_providers_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_einvoice_providers_tenant_id_idx ON public.tenant_einvoice_providers USING btree (tenant_id) WHERE (deleted_at IS NULL);


--
-- Name: tenant_einvoice_providers_tenant_provider_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_einvoice_providers_tenant_provider_uidx ON public.tenant_einvoice_providers USING btree (tenant_id, provider) WHERE ((deleted_at IS NULL) AND (is_active = true));


--
-- Name: tenant_memberships_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_memberships_active_uidx ON public.tenant_memberships USING btree (tenant_id, user_id) WHERE (deleted_at IS NULL);


--
-- Name: tenant_memberships_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_memberships_user_id_idx ON public.tenant_memberships USING btree (user_id) WHERE ((deleted_at IS NULL) AND (is_active = true));


--
-- Name: tenant_subscriptions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_subscriptions_status_idx ON public.tenant_subscriptions USING btree (status);


--
-- Name: tenant_subscriptions_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_subscriptions_tenant_id_idx ON public.tenant_subscriptions USING btree (tenant_id);


--
-- Name: tenants_mali_musavir_kodu_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenants_mali_musavir_kodu_uidx ON public.tenants USING btree (upper(mali_musavir_kodu)) WHERE ((mali_musavir_kodu IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: tenants_sector_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenants_sector_id_idx ON public.tenants USING btree (sector_id);


--
-- Name: tenants_slug_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenants_slug_active_uidx ON public.tenants USING btree (slug) WHERE (deleted_at IS NULL);


--
-- Name: tenants_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenants_status_idx ON public.tenants USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: tenants_tax_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenants_tax_number_idx ON public.tenants USING btree (tax_number) WHERE (tax_number IS NOT NULL);


--
-- Name: users_email_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_active_uidx ON public.users USING btree (lower(email)) WHERE (deleted_at IS NULL);


--
-- Name: users_is_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_is_active_idx ON public.users USING btree (is_active) WHERE ((deleted_at IS NULL) AND (is_active = true));


--
-- Name: users_phone_digits_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_phone_digits_active_uidx ON public.users USING btree (phone_digits) WHERE ((phone_digits IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: users_platform_admin_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_platform_admin_idx ON public.users USING btree (is_platform_admin) WHERE ((deleted_at IS NULL) AND (is_active = true) AND (is_platform_admin = true));


--
-- Name: users_tckn_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_tckn_active_uidx ON public.users USING btree (tckn) WHERE ((tckn IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: users_vergi_no_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_vergi_no_active_uidx ON public.users USING btree (vergi_no) WHERE ((vergi_no IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: accountant_codes accountant_codes_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accountant_codes_set_updated_at BEFORE UPDATE ON public.accountant_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: mali_musavir_baglantilari mali_musavir_baglantilari_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER mali_musavir_baglantilari_set_updated_at BEFORE UPDATE ON public.mali_musavir_baglantilari FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sectors sectors_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sectors_set_updated_at BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscription_plans subscription_plans_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subscription_plans_set_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: system_settings system_settings_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER system_settings_set_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tenant_databases tenant_databases_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tenant_databases_set_updated_at BEFORE UPDATE ON public.tenant_databases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tenant_einvoice_providers tenant_einvoice_providers_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tenant_einvoice_providers_set_updated_at BEFORE UPDATE ON public.tenant_einvoice_providers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tenant_kontor_balances tenant_kontor_balances_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tenant_kontor_balances_set_updated_at BEFORE UPDATE ON public.tenant_kontor_balances FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tenant_memberships tenant_memberships_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tenant_memberships_set_updated_at BEFORE UPDATE ON public.tenant_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tenant_subscriptions tenant_subscriptions_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tenant_subscriptions_set_updated_at BEFORE UPDATE ON public.tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: tenants tenants_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tenants_set_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: accountant_access_codes accountant_access_codes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_access_codes
    ADD CONSTRAINT accountant_access_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: accountant_codes accountant_codes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_codes
    ADD CONSTRAINT accountant_codes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: accountant_export_jobs accountant_export_jobs_approval_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_export_jobs
    ADD CONSTRAINT accountant_export_jobs_approval_id_fkey FOREIGN KEY (approval_id) REFERENCES public.accountant_period_approvals(id) ON DELETE SET NULL;


--
-- Name: accountant_export_jobs accountant_export_jobs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_export_jobs
    ADD CONSTRAINT accountant_export_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: accountant_period_approvals accountant_period_approvals_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accountant_period_approvals
    ADD CONSTRAINT accountant_period_approvals_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: kontor_ledger kontor_ledger_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kontor_ledger
    ADD CONSTRAINT kontor_ledger_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: mali_musavir_baglantilari mali_musavir_accountant_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mali_musavir_baglantilari
    ADD CONSTRAINT mali_musavir_accountant_user_fk FOREIGN KEY (accountant_user_id) REFERENCES public.users(id);


--
-- Name: mali_musavir_baglantilari mali_musavir_baglantilari_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mali_musavir_baglantilari
    ADD CONSTRAINT mali_musavir_baglantilari_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: tenant_databases tenant_databases_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_databases
    ADD CONSTRAINT tenant_databases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_einvoice_providers tenant_einvoice_providers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_einvoice_providers
    ADD CONSTRAINT tenant_einvoice_providers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_kontor_balances tenant_kontor_balances_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_kontor_balances
    ADD CONSTRAINT tenant_kontor_balances_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_memberships tenant_memberships_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenant_subscriptions tenant_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);


--
-- Name: tenant_subscriptions tenant_subscriptions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_subscriptions
    ADD CONSTRAINT tenant_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: tenants tenants_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id);


--
-- PostgreSQL database dump complete
--

\unrestrict UG43KVMtug1tYUhUxD7lC1NVggREp8B2yMySPYMj1g7qbzRHJoW3eMaM3XhJAIh

