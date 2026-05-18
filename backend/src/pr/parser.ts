import { getGitHubToken } from '../github/client';
import { fetchPRFiles } from '../github/diffFetcher';
import { GitHubWebhookPayload, ParsedPR } from '../github/types';

export async function parsePRPayload(payload: GitHubWebhookPayload): Promise<ParsedPR> {
  const { pull_request: pr, repository } = payload;
  const [owner, repo] = repository.full_name.split('/');

  const token = getGitHubToken();
  const files = await fetchPRFiles(token, owner, repo, pr.number);

  return {
    title: pr.title,
    author: pr.user.login,
    number: pr.number,
    repositoryFullName: repository.full_name,
    baseRef: pr.base.ref,
    headRef: pr.head.ref,
    headSha: pr.head.sha,
    htmlUrl: pr.html_url,
    body: pr.body,
    files,
  };
}
