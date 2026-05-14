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

  if (!Buffer.isBuffer(req.body)) {
    res.status(500).json({ error: 'Invalid body type' });
    return;
  }

  const expected = `sha256=${createHmac('sha256', secret).update(req.body).digest('hex')}`;

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}
