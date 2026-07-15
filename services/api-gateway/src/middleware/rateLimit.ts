import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

/**
 * Basit bellek içi rate-limit placeholder.
 * Üretimde Redis (veya eşdeğeri) sliding-window / token-bucket ile değiştirilecek.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(req: Request): string {
  const user = req.auth?.userId;
  if (user) return `user:${user}`;
  const tenant = req.header(config.tenantHeader) ?? req.auth?.tenantId;
  if (tenant) return `tenant:${tenant}`;
  return `ip:${req.ip ?? 'unknown'}`;
}

export function rateLimitPlaceholder(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!config.rateLimit.enabled) {
    next();
    return;
  }

  const now = Date.now();
  const key = clientKey(req);
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + config.rateLimit.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, config.rateLimit.maxRequests - bucket.count);

  res.setHeader('X-RateLimit-Limit', String(config.rateLimit.maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
  req.rateLimitRemaining = remaining;

  if (bucket.count > config.rateLimit.maxRequests) {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'İstek limiti aşıldı (placeholder)',
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    });
    return;
  }

  next();
}

/** Test / grace-shutdown için bellek temizliği */
export function clearRateLimitBuckets(): void {
  buckets.clear();
}
