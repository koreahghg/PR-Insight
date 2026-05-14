import { Request, Response } from 'express';

interface GitHubUser {
  login: string;
}

interface GitHubRef {
  sha: string;
  ref: string;
}

interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  head: GitHubRef;
  base: Pick<GitHubRef, 'ref'>;
  user: GitHubUser;
  additions: number;
  deletions: number;
  changed_files: number;
}

interface PullRequestPayload {
  action: string;
  pull_request: PullRequest;
  repository: {
    full_name: string;
  };
}

const HANDLED_ACTIONS = new Set(['opened', 'synchronize', 'reopened']);

export function handleWebhook(req: Request, res: Response): void {
  const event = req.headers['x-github-event'];

  if (event !== 'pull_request') {
    console.log(`[Webhook] Ignored event: ${String(event)}`);
    res.status(200).json({ message: 'Event ignored' });
    return;
  }

  const payload = JSON.parse((req.body as Buffer).toString()) as PullRequestPayload;

  if (!HANDLED_ACTIONS.has(payload.action)) {
    console.log(`[Webhook] Ignored PR action: ${payload.action}`);
    res.status(200).json({ message: `Action "${payload.action}" ignored` });
    return;
  }

  const { pull_request: pr, repository } = payload;

  console.log('[PR Event] Received', {
    repo: repository.full_name,
    action: payload.action,
    number: pr.number,
    title: pr.title,
    author: pr.user.login,
    base: pr.base.ref,
    head: pr.head.ref,
    sha: pr.head.sha,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
  });

  res.status(200).json({ received: true, pr: pr.number });
}
