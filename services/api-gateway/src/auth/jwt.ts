import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { AccessTokenClaims, RefreshTokenClaims } from '../types.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export function signAccessToken(claims: Omit<AccessTokenClaims, 'typ'>): string {
  const payload: AccessTokenClaims = { ...claims, typ: 'access' };
  return jwt.sign(payload, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: config.jwt.accessTtlSeconds,
  });
}

export function signRefreshToken(userId: string): string {
  const payload: RefreshTokenClaims = { sub: userId, typ: 'refresh' };
  return jwt.sign(payload, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: config.jwt.refreshTtlSeconds,
  });
}

export function issueTokenPair(
  claims: Omit<AccessTokenClaims, 'typ'>,
): TokenPair {
  return {
    accessToken: signAccessToken(claims),
    refreshToken: signRefreshToken(claims.sub),
    tokenType: 'Bearer',
    expiresIn: config.jwt.accessTtlSeconds,
  };
}

const verifyOpts: jwt.VerifyOptions = {
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
  /** İstemci/saat kayması için kısa tolerans */
  clockTolerance: 60,
};

function isTokenExpiredError(err: unknown): boolean {
  return err instanceof jwt.TokenExpiredError;
}

function isJwtError(err: unknown): boolean {
  return err instanceof jwt.JsonWebTokenError;
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, verifyOpts);
    if (typeof decoded === 'string') {
      throw Object.assign(new Error('JWT geçersiz'), { code: 'invalid_token' });
    }
    const payload = decoded as jwt.JwtPayload & { typ?: string };
    if (payload.typ !== 'access') {
      throw Object.assign(new Error('Geçersiz access token'), {
        code: 'invalid_token',
      });
    }
    return payload as AccessTokenClaims;
  } catch (err) {
    if (isTokenExpiredError(err)) {
      throw Object.assign(new Error('JWT süresi dolmuş'), {
        code: 'token_expired',
      });
    }
    if (isJwtError(err)) {
      throw Object.assign(new Error('JWT geçersiz'), { code: 'invalid_token' });
    }
    throw err;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, verifyOpts);
    if (typeof decoded === 'string') {
      throw Object.assign(new Error('Refresh token geçersiz'), {
        code: 'invalid_token',
      });
    }
    const payload = decoded as jwt.JwtPayload & { typ?: string };
    if (payload.typ !== 'refresh') {
      throw Object.assign(new Error('Geçersiz refresh token'), {
        code: 'invalid_token',
      });
    }
    return payload as RefreshTokenClaims;
  } catch (err) {
    if (isTokenExpiredError(err)) {
      throw Object.assign(new Error('Refresh token süresi dolmuş'), {
        code: 'token_expired',
      });
    }
    if (isJwtError(err)) {
      throw Object.assign(new Error('Refresh token geçersiz'), {
        code: 'invalid_token',
      });
    }
    throw err;
  }
}
