/**
 * Parser’lara enjekte edilen LLM alan çıkarıcı (JSON nesnesi döner).
 */
export type LlmFieldExtractor = (
  prompt: string,
  ocrText: string,
) => Promise<Record<string, unknown>>;

export type LlmProviderName = 'openai' | 'anthropic' | 'gemini' | 'openai_compatible';

export interface LlmConfig {
  provider: LlmProviderName;
  apiKey: string;
  model: string;
  /** OpenAI-compatible base (örn. https://api.openai.com/v1 veya OpenRouter) */
  baseUrl?: string;
}
