-- =============================================================================
-- Finatura Central — Platform superadmin + sistem ayarları (OpenRouter vb.)
-- Database: finatura_central
-- Önkoşul: 05_auth_accountant.sql
-- =============================================================================

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS users_platform_admin_idx
    ON public.users (is_platform_admin)
    WHERE deleted_at IS NULL AND is_active = true AND is_platform_admin = true;

COMMENT ON COLUMN public.users.is_platform_admin IS
    'SaaS superadmin: sistem ayarları, OpenRouter anahtarı, platform raporları.';

-- -----------------------------------------------------------------------------
-- system_settings — anahtar/değer (gizli alanlar ciphertext)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_settings (
    key                 text PRIMARY KEY,
    value_text          text,
    value_json          jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_secret           boolean NOT NULL DEFAULT false,
    value_ciphertext    text,
    encryption_key_id   text,
    description         text,
    updated_by          uuid REFERENCES public.users (id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS system_settings_set_updated_at ON public.system_settings;
CREATE TRIGGER system_settings_set_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.system_settings IS
    'Platform geneli ayarlar (LLM/OpenRouter, özellik bayrakları). Gizli değerler value_ciphertext.';

-- Varsayılan anahtarlar (değerler admin UI / API ile doldurulur)
INSERT INTO public.system_settings (key, value_text, is_secret, description) VALUES
    ('llm.enabled', 'false', false, 'OCR alan çıkarımı için LLM açık mı'),
    ('llm.provider', 'openrouter', false, 'openai | openrouter | anthropic | gemini | openai_compatible'),
    ('llm.base_url', 'https://openrouter.ai/api/v1', false, 'OpenAI-compatible base URL'),
    ('llm.model', 'openai/gpt-4o-mini', false, 'Model id (OpenRouter: org/model)'),
    ('llm.api_key', NULL, true, 'LLM / OpenRouter API anahtarı'),
    ('llm.http_referer', 'https://finatura.app', false, 'OpenRouter HTTP-Referer'),
    ('llm.app_title', 'Finatura', false, 'OpenRouter X-Title')
ON CONFLICT (key) DO NOTHING;
