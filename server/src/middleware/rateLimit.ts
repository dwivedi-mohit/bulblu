import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(config: RateLimitConfig) {
  const store = new Map<string, ClientRecord>();

  // Periodically clean up expired entries
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, Math.max(10000, config.windowMs));

  // Allow process to exit cleanly
  if (typeof cleanup === 'object' && cleanup !== null && 'unref' in cleanup) {
    (cleanup as any).unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthRequest).userId || req.ip || 'anonymous';
    const key = `${userId}:${req.baseUrl || req.path}`;
    const now = Date.now();

    let record = store.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      store.set(key, record);
      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', config.max - 1);
      return next();
    }

    if (record.count >= config.max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        error: config.message || 'Too many requests. Please slow down and try again.',
        retryAfter,
      });
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - record.count));
    next();
  };
}

// Socket Rate Limiting helper
const socketLimiterStore = new Map<string, { count: number; resetTime: number }>();

export function checkSocketRateLimit(userId: string, action: string, max: number, windowMs: number): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  let record = socketLimiterStore.get(key);

  if (!record || now > record.resetTime) {
    socketLimiterStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= max) {
    return false;
  }

  record.count += 1;
  return true;
}

// Preset HTTP rate limiters
export const messageRateLimiter = createRateLimiter({
  windowMs: 5000,
  max: 10,
  message: 'Slow down! You are sending messages too fast.',
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 12,
  message: 'Upload limit reached. Please wait a minute before uploading more files.',
});

export const callRateLimiter = createRateLimiter({
  windowMs: 30000,
  max: 3,
  message: 'Call rate limit reached. Please wait before starting another call.',
});
