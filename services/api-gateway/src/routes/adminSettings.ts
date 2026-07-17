import { Router } from 'express';
import { getCentralPool } from '../db/centralPool.js';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from '../crypto/settingsSecret.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { requirePlatformAdmin } from '../middleware/platformAdmin.js';
import { config } from '../config.js';

export const adminSettingsRouter = Router();

const LLM_KEYS = [
  'llm.enabled',
  'llm.provider',
  'llm.base_url',
  'llm.model',
  'llm.api_key',
  'llm.http_referer',
  'llm.app_title',
] as const;

interface SettingRow {
  key: string;
  value_text: string | null;
  value_json: unknown;
  is_secret: boolean;
  value_ciphertext: string | null;
  description: string | null;
  updated_at: Date;
}

function stubFallbackSettings(): Record<string, unknown> {
  return {
    'llm.enabled': process.env.LLM_ENABLED ?? 'false',
    'llm.provider': process.env.LLM_PROVIDER ?? 'openrouter',
    'llm.base_url':
      process.env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1',
    'llm.model': process.env.LLM_MODEL ?? 'openai/gpt-4o-mini',
    'llm.api_key': maskSecret(
      process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY || null,
    ),
    'llm.api_key_set': Boolean(
      process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY,
    ),
    'llm.http_referer':
      process.env.LLM_HTTP_REFERER ?? 'https://finatura.app',
    'llm.app_title': process.env.LLM_APP_TITLE ?? 'Finatura',
    _source: 'env_stub',
  };
}

async function resolveLlmConfigPayload(): Promise<Record<string, unknown>> {
  const envKey =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.LLM_API_KEY?.trim() ||
    '';
  if (envKey) {
    return {
      enabled:
        process.env.LLM_ENABLED === 'true' || process.env.LLM_ENABLED === '1',
      provider: process.env.LLM_PROVIDER ?? 'openrouter',
      baseUrl: process.env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1',
      model: process.env.LLM_MODEL ?? 'openai/gpt-4o-mini',
      apiKey: envKey,
      httpReferer: process.env.LLM_HTTP_REFERER ?? 'https://finatura.app',
      appTitle: process.env.LLM_APP_TITLE ?? 'Finatura',
      source: 'env',
    };
  }

  if (config.authProvider !== 'central' || !config.centralDatabaseUrl) {
    return {
      enabled: false,
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: 'openai/gpt-4o-mini',
      apiKey: '',
      httpReferer: 'https://finatura.app',
      appTitle: 'Finatura',
      source: 'empty',
    };
  }

  const pool = getCentralPool();
  const { rows } = await pool.query<SettingRow>(
    `SELECT key, value_text, is_secret, value_ciphertext
     FROM public.system_settings
     WHERE key LIKE 'llm.%'`,
  );
  const map = new Map(rows.map((r) => [r.key, r]));
  const getText = (k: string, fallback: string) =>
    map.get(k)?.value_text?.trim() || fallback;
  let apiKey = '';
  const keyRow = map.get('llm.api_key');
  if (keyRow?.value_ciphertext) {
    try {
      apiKey = decryptSecret(keyRow.value_ciphertext);
    } catch {
      apiKey = '';
    }
  }

  return {
    enabled: getText('llm.enabled', 'false') === 'true',
    provider: getText('llm.provider', 'openrouter'),
    baseUrl: getText('llm.base_url', 'https://openrouter.ai/api/v1'),
    model: getText('llm.model', 'openai/gpt-4o-mini'),
    apiKey,
    httpReferer: getText('llm.http_referer', 'https://finatura.app'),
    appTitle: getText('llm.app_title', 'Finatura'),
    source: 'central_db',
  };
}

/**
 * GET /v1/admin/llm-config
 * document-agent: X-Internal-Token veya platform admin Bearer.
 */
adminSettingsRouter.get(
  '/llm-config',
  optionalAuth,
  async (req, res, next) => {
    try {
      const internal = req.header('x-internal-token');
      const expected = process.env.INTERNAL_SERVICE_TOKEN?.trim();
      const allowedInternal = Boolean(expected && internal === expected);

      if (!allowedInternal && !req.auth?.isPlatformAdmin) {
        res.status(401).json({
          error: 'unauthorized',
          message:
            'Authorization: Bearer (platform admin) veya X-Internal-Token',
        });
        return;
      }

      res.json(await resolveLlmConfigPayload());
    } catch (err) {
      next(err);
    }
  },
);

adminSettingsRouter.get(
  '/settings',
  requireAuth,
  requirePlatformAdmin,
  async (_req, res, next) => {
    try {
      if (config.authProvider !== 'central' || !config.centralDatabaseUrl) {
        res.json({ settings: stubFallbackSettings() });
        return;
      }

      const pool = getCentralPool();
      const { rows } = await pool.query<SettingRow>(
        `SELECT key, value_text, value_json, is_secret, value_ciphertext, description, updated_at
         FROM public.system_settings
         ORDER BY key`,
      );

      const settings: Record<string, unknown> = {};
      for (const row of rows) {
        if (row.is_secret) {
          let plain: string | null = null;
          if (row.value_ciphertext) {
            try {
              plain = decryptSecret(row.value_ciphertext);
            } catch {
              plain = null;
            }
          }
          settings[row.key] = maskSecret(plain);
          settings[`${row.key}_set`] = Boolean(plain);
        } else {
          settings[row.key] = row.value_text;
        }
      }
      settings._source = 'central_db';
      res.json({ settings });
    } catch (err) {
      next(err);
    }
  },
);

adminSettingsRouter.put(
  '/settings',
  requireAuth,
  requirePlatformAdmin,
  async (req, res, next) => {
    try {
      const body = req.body?.settings;
      if (!body || typeof body !== 'object') {
        res.status(400).json({
          error: 'invalid_request',
          message: 'settings nesnesi zorunlu',
        });
        return;
      }

      const incoming = body as Record<string, unknown>;

      if (config.authProvider !== 'central' || !config.centralDatabaseUrl) {
        const applied: Record<string, unknown> = {};
        for (const key of LLM_KEYS) {
          if (key in incoming && incoming[key] != null) {
            applied[key] =
              key === 'llm.api_key'
                ? maskSecret(String(incoming[key]))
                : incoming[key];
          }
        }
        res.json({
          ok: true,
          warning:
            'AUTH_PROVIDER=stub — ayarlar kalıcı değil. Central DB + 07_system_settings.sql uygulayın; veya document-agent env (OPENROUTER_API_KEY).',
          applied,
        });
        return;
      }

      const pool = getCentralPool();
      const userId = req.auth!.userId;

      for (const [key, raw] of Object.entries(incoming)) {
        if (!LLM_KEYS.includes(key as (typeof LLM_KEYS)[number])) continue;
        if (raw === undefined) continue;

        const isSecret = key === 'llm.api_key';
        if (isSecret) {
          const text = String(raw ?? '').trim();
          if (!text || text.includes('…') || text.includes('••••')) {
            continue;
          }
          const { ciphertext, keyId } = encryptSecret(text);
          await pool.query(
            `INSERT INTO public.system_settings (key, is_secret, value_ciphertext, encryption_key_id, updated_by)
             VALUES ($1, true, $2, $3, $4)
             ON CONFLICT (key) DO UPDATE SET
               value_ciphertext = EXCLUDED.value_ciphertext,
               encryption_key_id = EXCLUDED.encryption_key_id,
               updated_by = EXCLUDED.updated_by,
               updated_at = now()`,
            [key, ciphertext, keyId, userId],
          );
        } else {
          const text = String(raw ?? '');
          await pool.query(
            `INSERT INTO public.system_settings (key, value_text, is_secret, updated_by)
             VALUES ($1, $2, false, $3)
             ON CONFLICT (key) DO UPDATE SET
               value_text = EXCLUDED.value_text,
               updated_by = EXCLUDED.updated_by,
               updated_at = now()`,
            [key, text, userId],
          );
        }
      }

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);
