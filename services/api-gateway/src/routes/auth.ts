import { Router } from 'express';
import { issueTokenPair, verifyRefreshToken } from '../auth/jwt.js';
import {
  extractLoginIdentifier,
  hasLookupKey,
  normalizeLoginIdentifier,
} from '../auth/loginIdentifier.js';
import { authenticateUser, findUserById } from '../auth/stubUsers.js';
import type { LoginTenantHint } from '../auth/userRepository.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

export const authRouter = Router();

function parseTenantHint(body: unknown): LoginTenantHint | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  const firmaKodu =
    typeof b.firmaKodu === 'string' ? b.firmaKodu.trim() : undefined;
  const tenantSlug =
    typeof b.tenantSlug === 'string' ? b.tenantSlug.trim() : undefined;
  const tenantId =
    typeof b.tenantId === 'string' ? b.tenantId.trim() : undefined;

  if (!firmaKodu && !tenantSlug && !tenantId) return undefined;
  return {
    ...(firmaKodu ? { firmaKodu } : {}),
    ...(tenantSlug ? { tenantSlug } : {}),
    ...(tenantId ? { tenantId } : {}),
  };
}

function issueAuthTokens(user: {
  userId: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
  isPlatformAdmin?: boolean;
}) {
  return issueTokenPair({
    sub: user.userId,
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    role: user.role,
    isPlatformAdmin: Boolean(user.isPlatformAdmin),
  });
}

/**
 * SaaS girişi — UserRepository (stub | central) üzerinden.
 * Body: identifier (veya username / email) + password;
 * opsiyonel firmaKodu | tenantSlug | tenantId.
 * Identifier: e-posta | telefon | TCKN | vergi no.
 */
authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const identifier = extractLoginIdentifier(req.body);
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';
    const tenantHint = parseTenantHint(req.body);

    if (!identifier || !password) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'kullanıcı adı (identifier) ve password zorunludur',
      });
      return;
    }

    if (!hasLookupKey(normalizeLoginIdentifier(identifier))) {
      res.status(400).json({
        error: 'invalid_request',
        message:
          'Geçerli e-posta, telefon, TC kimlik veya vergi numarası girin',
      });
      return;
    }

    const user = await authenticateUser(identifier, password, tenantHint);
    if (!user) {
      res.status(401).json({
        error: 'invalid_credentials',
        message: tenantHint
          ? 'Kullanıcı adı, şifre veya firma kodu hatalı'
          : 'Kullanıcı adı veya şifre hatalı',
      });
      return;
    }

    const tokens = issueAuthTokens(user);

    res.json({
      user: {
        id: user.userId,
        email: user.email,
        displayName: user.displayName,
        tenantId: user.tenantId,
        tenantSlug: user.tenantSlug,
        role: user.role,
        isPlatformAdmin: Boolean(user.isPlatformAdmin),
      },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/auth/refresh', async (req, res, next) => {
  try {
    const refreshToken =
      typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
    const tenantHint = parseTenantHint(req.body);

    if (!refreshToken) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'refreshToken zorunludur',
      });
      return;
    }

    try {
      const claims = verifyRefreshToken(refreshToken);
      const user = await findUserById(claims.sub, tenantHint);
      if (!user) {
        res.status(401).json({
          error: 'invalid_refresh',
          message: 'Refresh token kullanıcısı bulunamadı',
        });
        return;
      }

      res.json(issueAuthTokens(user));
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code?: string }).code)
          : 'invalid_refresh';
      res.status(401).json({
        error: code === 'token_expired' ? 'refresh_expired' : 'invalid_refresh',
        message:
          code === 'token_expired'
            ? 'Refresh token süresi dolmuş — yeniden giriş yapın'
            : 'Refresh token geçersiz — yeniden giriş yapın',
      });
    }
  } catch (err) {
    next(err);
  }
});

/** Oturum + tenant bağlamı doğrulama örneği */
authRouter.get('/auth/me', requireAuth, tenantContext, (req, res) => {
  res.json({
    user: req.auth,
    tenant: req.tenant,
  });
});
