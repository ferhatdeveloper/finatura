import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Router } from 'express';

function resolveOpenApiPath(): string {
  return join(process.cwd(), 'openapi', 'openapi.yaml');
}

export const openApiRouter = Router();

openApiRouter.get('/openapi.yaml', (_req, res) => {
  try {
    const yaml = readFileSync(resolveOpenApiPath(), 'utf8');
    res.type('application/yaml').send(yaml);
  } catch (err) {
    console.error('[openapi]', err);
    res.status(500).json({
      error: 'openapi_unavailable',
      message: 'OpenAPI stub okunamadı',
    });
  }
});

openApiRouter.get('/openapi.json', (_req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'Finatura API Gateway',
      version: '0.1.0',
      description:
        'Stub spesifikasyon. Tam YAML için GET /openapi.yaml kullanın.',
    },
    paths: {
      '/health': { get: { summary: 'Liveness' } },
      '/ready': { get: { summary: 'Readiness' } },
      '/auth/login': { post: { summary: 'SaaS giriş (stub)' } },
      '/auth/refresh': { post: { summary: 'Token yenileme (stub)' } },
      '/auth/me': { get: { summary: 'Oturum bilgisi' } },
      '/v1/me/tenants': { get: { summary: 'Kullanıcı tenant üyelikleri' } },
      '/v1/tenants/{id}/accountant/invite': {
        post: { summary: 'Mali müşavir davet kodu' },
      },
      '/v1/accountant/link': {
        post: { summary: 'Davet kodu ile mali müşavir bağlama' },
      },
      '/v1/ping': { get: { summary: 'Korumalı ping' } },
    },
  });
});
