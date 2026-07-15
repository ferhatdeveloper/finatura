import { Router } from 'express';
import { issueTokenPair, verifyRefreshToken } from '../auth/jwt.js';
import { authenticateUser, findUserById } from '../auth/stubUsers.js';
import { requireAuth } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';

export const authRouter = Router();

/**
 * SaaS girişi — UserRepository (stub | central) üzerinden.
 * Üretim: AUTH_PROVIDER=central + public.users + bcrypt.
 */
authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email : '';
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'email ve password zorunludur',
      });
      return;
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      res.status(401).json({
        error: 'invalid_credentials',
        message: 'E-posta veya şifre hatalı',
      });
      return;
    }

    const tokens = issueTokenPair({
      sub: user.userId,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
    });

    res.json({
      user: {
        id: user.userId,
        email: user.email,
        displayName: user.displayName,
        tenantId: user.tenantId,
        tenantSlug: user.tenantSlug,
        role: user.role,
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

    if (!refreshToken) {
      res.status(400).json({
        error: 'invalid_request',
        message: 'refreshToken zorunludur',
      });
      return;
    }

    try {
      const claims = verifyRefreshToken(refreshToken);
      const user = await findUserById(claims.sub);
      if (!user) {
        res.status(401).json({
          error: 'invalid_refresh',
          message: 'Refresh token kullanıcısı bulunamadı',
        });
        return;
      }

      const tokens = issueTokenPair({
        sub: user.userId,
        email: user.email,
        tenantId: user.tenantId,
        tenantSlug: user.tenantSlug,
      });

      res.json(tokens);
    } catch {
      res.status(401).json({
        error: 'invalid_refresh',
        message: 'Refresh token geçersiz veya süresi dolmuş',
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
