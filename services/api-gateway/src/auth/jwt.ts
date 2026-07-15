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

export function verifyAccessToken(token: string): AccessTokenClaims {
  const decoded = jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });

  if (typeof decoded === 'string' || decoded.typ !== 'access') {
    throw new Error('Geçersiz access token');
  }

  return decoded as AccessTokenClaims;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  const decoded = jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });

  if (typeof decoded === 'string' || decoded.typ !== 'refresh') {
    throw new Error('Geçersiz refresh token');
  }

  return decoded as RefreshTokenClaims;
}
