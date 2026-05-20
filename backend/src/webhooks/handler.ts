import { Request, Response } from 'express';
import { GitHubWebhookPayload } from '../github/types';
import { parsePRPayload } from '../pr/parser';
import { analyzeDiff } from '../pr/diffAnalyzer';
import { summarizePR } from '../ai/prSummarizer';

const HANDLED_ACTIONS = new Set(['opened', 'synchronize', 'reopened']);

export function handleWebhook(req: Request, res: Response): void {
  const event = req.headers['x-github-event'];

  if (event !== 'pull_request') {
    console.log(`[Webhook] Ignored event: ${String(event)}`);
    res.status(200).json({ message: 'Event ignored' });
    return;
  }

  let payload: GitHubWebhookPayload;
  try {
    payload = JSON.parse((req.body as Buffer).toString()) as GitHubWebhookPayload;
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  if (!HANDLED_ACTIONS.has(payload.action)) {
    console.log(`[Webhook] Ignored PR action: ${payload.action}`);
    res.status(200).json({ message: `Action "${payload.action}" ignored` });
    return;
  }

  // GitHub 10초 타임아웃 내 즉시 응답 후 비동기 처리
  res.status(200).json({ received: true, pr: payload.number });

  void parsePRPayload(payload)
    .then(async (parsed) => {
      const diff = analyzeDiff(parsed);
      console.log('[PR] Analyzed', {
        repo: diff.repository,
        number: diff.prNumber,
        files: diff.fileSummaries.map(f => `${f.filename} (+${f.additions}/-${f.deletions})`),
        totalChunks: diff.chunks.length,
      });

      const summary = await summarizePR(diff);
      console.log('[PR] Summary generated', {
        pr: `#${summary.prNumber} ${summary.title}`,
        overallSummary: summary.overallSummary,
        keyChanges: summary.keyChanges,
        reviewPoints: summary.reviewPoints,
        fileSummaries: summary.fileSummaries.map(f => `${f.filename}: ${f.summary}`),
      });
    })
    .catch((err: unknown) => {
      console.error('[PR] Processing failed', err instanceof Error ? err.message : err);
    });
}
