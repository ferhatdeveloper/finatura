import type { PaymentGatewayAdapter } from './adapter.js';
import { getPaymentAdapter } from './createAdapter.js';
import { fulfillWebhookEvent, type FulfillmentResult } from './fulfillment.js';
import type { PaymentWebhookEvent } from './types.js';
import { PaymentProviderError } from './types.js';

export interface ProcessWebhookResult {
  verified: boolean;
  event: PaymentWebhookEvent | null;
  fulfillment: FulfillmentResult | null;
}

/**
 * Webhook iskeleti:
 * 1) imza doğrula
 * 2) standart olaya parse et
 * 3) başarıda kontör fulfill
 */
export async function processPaymentWebhook(params: {
  headers: Record<string, string | string[] | undefined>;
  rawBody: string | Buffer;
  adapter?: PaymentGatewayAdapter;
}): Promise<ProcessWebhookResult> {
  const adapter = params.adapter ?? getPaymentAdapter();

  const verified = await adapter.verifyWebhook(
    params.headers,
    params.rawBody,
  );

  if (!verified) {
    throw new PaymentProviderError('Webhook imza doğrulaması başarısız');
  }

  const event = await adapter.parseWebhook(params.headers, params.rawBody);
  const fulfillment = await fulfillWebhookEvent(event);

  return { verified, event, fulfillment };
}
