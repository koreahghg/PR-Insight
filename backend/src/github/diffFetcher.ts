import { githubGet } from './client';
import { GitHubPRFile, PRFile } from './types';

export async function fetchPRFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRFile[]> {
  const files = await githubGet<GitHubPRFile[]>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    token,
  );

  return files.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ?? null,
    previousFilename: file.previous_filename ?? null,
  }));
}
