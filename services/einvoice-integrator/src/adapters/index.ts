import {
  config,
  credentialsFor,
  type IntegratorProvider,
} from '../config.js';
import type { HttpClient } from '../http/client.js';
import { EdmAdapter } from './edm.adapter.js';
import { ElogoAdapter } from './elogo.adapter.js';
import { FitAdapter } from './fit.adapter.js';
import { IzibizAdapter } from './izibiz.adapter.js';
import { NesAdapter } from './nes.adapter.js';
import { NilveraAdapter } from './nilvera.adapter.js';
import { QnbAdapter } from './qnb.adapter.js';
import { UyumsoftAdapter } from './uyumsoft.adapter.js';
import type { EinvoiceIntegrator } from './types.js';

export type {
  ApproveOptions,
  ApproveResult,
  EinvoiceIntegrator,
  InvoiceDraftPayload,
  InvoiceKind,
  InvoiceLine,
  IntegratorInvoiceStatus,
  PdfDownloadResult,
  SendResult,
  StatusResult,
} from './types.js';

export { EdmAdapter } from './edm.adapter.js';
export { ElogoAdapter } from './elogo.adapter.js';
export { FitAdapter } from './fit.adapter.js';
export { IzibizAdapter } from './izibiz.adapter.js';
export { NesAdapter } from './nes.adapter.js';
export { NilveraAdapter } from './nilvera.adapter.js';
export { QnbAdapter } from './qnb.adapter.js';
export { UyumsoftAdapter } from './uyumsoft.adapter.js';
export type { HttpClient, HttpRequest, HttpResponse } from '../http/client.js';
export { createFetchHttpClient } from '../http/client.js';

export interface CreateIntegratorOptions {
  stubMode?: boolean;
  /** Live yollarda mock HTTP inject (test) */
  http?: HttpClient;
}

export function createIntegrator(
  provider: IntegratorProvider = config.provider,
  stubModeOrOptions: boolean | CreateIntegratorOptions = config.stubMode,
): EinvoiceIntegrator {
  const options: CreateIntegratorOptions =
    typeof stubModeOrOptions === 'boolean'
      ? { stubMode: stubModeOrOptions }
      : stubModeOrOptions;

  const stubMode = options.stubMode ?? config.stubMode;
  const credentials = credentialsFor(provider);
  const httpOpts = { http: options.http };

  switch (provider) {
    case 'edm':
      return new EdmAdapter(credentials, stubMode, httpOpts);
    case 'uyumsoft':
      return new UyumsoftAdapter(credentials, stubMode, httpOpts);
    case 'fit':
      return new FitAdapter(credentials, stubMode, httpOpts);
    case 'elogo':
      return new ElogoAdapter(credentials, stubMode, httpOpts);
    case 'qnb':
      return new QnbAdapter(credentials, stubMode, httpOpts);
    case 'nes':
      return new NesAdapter(credentials, stubMode, httpOpts);
    case 'izibiz':
      return new IzibizAdapter(credentials, stubMode, httpOpts);
    case 'nilvera':
      return new NilveraAdapter(credentials, stubMode, httpOpts);
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Bilinmeyen entegratör: ${_exhaustive}`);
    }
  }
}

/** Ortamda seçili varsayılan entegratör örneği */
export function getDefaultIntegrator(): EinvoiceIntegrator {
  return createIntegrator(config.provider, config.stubMode);
}
