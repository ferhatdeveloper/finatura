/**
 * Parser’lara enjekte edilen LLM alan çıkarıcı (JSON nesnesi döner).
 */
export type LlmFieldExtractor = (
  prompt: string,
  ocrText: string,
) => Promise<Record<string, unknown>>;

export type LlmProviderName =
  | 'openai'
  | 'openrouter'
  | 'anthropic'
  | 'gemini'
  | 'openai_compatible';

export interface LlmConfig {
  provider: LlmProviderName;
  apiKey: string;
  model: string;
  /** OpenAI-compatible base (OpenAI veya OpenRouter) */
  baseUrl?: string;
  /** OpenRouter: HTTP-Referer */
  httpReferer?: string;
  /** OpenRouter: X-Title */
  appTitle?: string;
}
