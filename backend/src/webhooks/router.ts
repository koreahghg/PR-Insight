import { Router, Request, Response } from 'express';
import express from 'express';
import { validateSignature } from './validator';
import { handleWebhook } from './handler';

export const webhookRouter = Router();

// GitHub 웹훅 수신 - signature 검증 필수
// express.raw()로 raw Buffer를 유지해야 HMAC 검증이 가능
webhookRouter.post(
  '/github',
  express.raw({ type: 'application/json' }),
  validateSignature,
  handleWebhook,
);

// 테스트용 엔드포인트 - signature 검증 없이 payload 확인
webhookRouter.post('/test', express.json(), (req: Request, res: Response) => {
  const event = req.headers['x-github-event'] ?? 'unknown';
  console.log(`[Test Webhook] Event: ${String(event)}`);
  console.log('[Test Webhook] Payload:', JSON.stringify(req.body, null, 2));
  res.status(200).json({ received: true, event, payload: req.body });
});
