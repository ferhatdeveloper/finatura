import type { LlmConfig, LlmFieldExtractor, LlmProviderName } from './types.js';

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

function detectProvider(): LlmProviderName | null {
  const explicit = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (
    explicit === 'openai' ||
    explicit === 'anthropic' ||
    explicit === 'gemini' ||
    explicit === 'openai_compatible'
  ) {
    return explicit;
  }
  if (firstEnv('OPENAI_API_KEY')) return 'openai';
  if (firstEnv('ANTHROPIC_API_KEY')) return 'anthropic';
  if (firstEnv('GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY')) {
    return 'gemini';
  }
  if (firstEnv('LLM_API_KEY') && firstEnv('LLM_BASE_URL')) {
    return 'openai_compatible';
  }
  return null;
}

/** Ortamdan LLM config; anahtar yoksa null. */
export function resolveLlmConfig(): LlmConfig | null {
  const provider = detectProvider();
  if (!provider) return null;

  const apiKey =
    firstEnv(
      'LLM_API_KEY',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GEMINI_API_KEY',
      'GOOGLE_API_KEY',
      'GOOGLE_AI_API_KEY',
    ) ?? '';

  if (!apiKey) return null;

  const model =
    firstEnv('LLM_MODEL') ??
    (provider === 'anthropic'
      ? 'claude-3-5-haiku-latest'
      : provider === 'gemini'
        ? 'gemini-2.0-flash'
        : 'gpt-4o-mini');

  const baseUrl =
    firstEnv('LLM_BASE_URL') ??
    (provider === 'openai' || provider === 'openai_compatible'
      ? 'https://api.openai.com/v1'
      : undefined);

  return { provider, apiKey, model, baseUrl };
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('LLM yanıtında JSON nesnesi yok');
  }
  const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('LLM JSON nesnesi değil');
  }
  return parsed as Record<string, unknown>;
}

async function callOpenAiCompatible(
  cfg: LlmConfig,
  prompt: string,
): Promise<string> {
  const base = (cfg.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Yanıtın yalnızca geçerli bir JSON nesnesi olsun. Açıklama yazma.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${body.slice(0, 240)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI boş içerik');
  return content;
}

async function callAnthropic(cfg: LlmConfig, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic HTTP ${res.status}: ${body.slice(0, 240)}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((c) => c.type === 'text')?.text;
  if (!text) throw new Error('Anthropic boş içerik');
  return text;
}

async function callGemini(cfg: LlmConfig, prompt: string): Promise<string> {
  const model = encodeURIComponent(cfg.model);
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 240)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini boş içerik');
  return text;
}

async function callLlm(cfg: LlmConfig, prompt: string): Promise<string> {
  switch (cfg.provider) {
    case 'anthropic':
      return callAnthropic(cfg, prompt);
    case 'gemini':
      return callGemini(cfg, prompt);
    case 'openai':
    case 'openai_compatible':
      return callOpenAiCompatible(cfg, prompt);
    default:
      throw new Error(`Desteklenmeyen LLM: ${cfg.provider}`);
  }
}

/** Config varsa ve LLM_ENABLED=true ise JSON alan çıkarıcı; aksi halde null (yerel OCR). */
export function createLlmFieldExtractor(
  cfg: LlmConfig | null = resolveLlmConfig(),
): LlmFieldExtractor | null {
  const enabled =
    process.env.LLM_ENABLED?.trim().toLowerCase() === 'true' ||
    process.env.LLM_ENABLED?.trim() === '1';
  if (!enabled || !cfg) return null;
  return async (prompt: string, _ocrText: string) => {
    const raw = await callLlm(cfg, prompt);
    return extractJsonObject(raw);
  };
}
