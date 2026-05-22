import { githubGet, getGitHubToken } from './client'
import { GitHubPullRequest, ParsedPR } from './types'
import { fetchPRFiles } from './diffFetcher'

export function parsePRUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
  const match = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(url)
  if (!match) return null
  return { owner: match[1], repo: match[2], prNumber: parseInt(match[3], 10) }
}

export async function fetchPR(owner: string, repo: string, prNumber: number): Promise<ParsedPR> {
  const token = getGitHubToken()
  const [pr, files] = await Promise.all([
    githubGet<GitHubPullRequest>(`/repos/${owner}/${repo}/pulls/${prNumber}`, token),
    fetchPRFiles(token, owner, repo, prNumber),
  ])

  return {
    title: pr.title,
    author: pr.user.login,
    number: pr.number,
    repositoryFullName: `${owner}/${repo}`,
    baseRef: pr.base.ref,
    headRef: pr.head.ref,
    headSha: pr.head.sha,
    htmlUrl: pr.html_url,
    body: pr.body,
    files,
  }
}
