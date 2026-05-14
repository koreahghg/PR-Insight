import { createHmac, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function validateSignature(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  const signature = req.headers['x-hub-signature-256'];
  if (typeof signature !== 'string') {
    res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' });
    return;
  }

  const rawBody = req.body as Buffer;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

  // 길이가 다르면 timingSafeEqual이 throw하므로 먼저 체크
  if (signature.length !== expected.length) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const isValid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!isValid) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}
