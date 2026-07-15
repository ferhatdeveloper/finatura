import { config } from '../config.js';
import type { PaymentGatewayAdapter } from './adapter.js';
import { StubPaymentAdapter } from './stubAdapter.js';
import type { PaymentProvider } from './types.js';
import { PaymentProviderError } from './types.js';

let cached: PaymentGatewayAdapter | null = null;

/**
 * Ortam değişkenine göre adapter seçer.
 * iyzico / paytr henüz stub'a düşer (iskelet); gerçek SDK sonraki PR.
 */
export function createPaymentAdapter(
  provider: PaymentProvider = config.payment.provider,
): PaymentGatewayAdapter {
  switch (provider) {
    case 'stub':
      return new StubPaymentAdapter();
    case 'iyzico':
    case 'paytr':
      // Gerçek istemci bağlanana kadar aynı sözleşmeyle stub kullan.
      console.warn(
        `[payment] provider=${provider} henüz implemente değil; stub kullanılıyor`,
      );
      return new StubPaymentAdapter();
    default: {
      const _exhaustive: never = provider;
      throw new PaymentProviderError(`Bilinmeyen ödeme sağlayıcısı: ${_exhaustive}`);
    }
  }
}

/** Process yaşamı boyunca tek adapter örneği */
export function getPaymentAdapter(): PaymentGatewayAdapter {
  if (!cached) {
    cached = createPaymentAdapter();
  }
  return cached;
}

/** Test için cache temizleme */
export function resetPaymentAdapterCache(): void {
  cached = null;
}
