-- =============================================================================
-- Finatura Central — e-fatura entegratör enum genişletmesi (8 provider)
-- Database: finatura_central
-- Önkoşul: 03_einvoice_reseller.sql
-- =============================================================================
--
-- Mevcut kurulumlarda enum'a yeni değer ekler (IF NOT EXISTS).
-- Taze kurulumlarda 03'teki CREATE TYPE zaten 8 değeri içerir; bu betik no-op olur.
-- =============================================================================

ALTER TYPE public.einvoice_provider_code ADD VALUE IF NOT EXISTS 'elogo';
ALTER TYPE public.einvoice_provider_code ADD VALUE IF NOT EXISTS 'qnb';
ALTER TYPE public.einvoice_provider_code ADD VALUE IF NOT EXISTS 'nes';
ALTER TYPE public.einvoice_provider_code ADD VALUE IF NOT EXISTS 'nilvera';
ALTER TYPE public.einvoice_provider_code ADD VALUE IF NOT EXISTS 'izibiz';

COMMENT ON TYPE public.einvoice_provider_code IS
    'Finatura bayilikinde desteklenen e-fatura entegratörleri (edm, uyumsoft, fit, elogo, qnb, nes, nilvera, izibiz).';
