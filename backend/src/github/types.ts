export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
}

export interface GitHubRepository {
  id: number;
  full_name: string;
  name: string;
  owner: GitHubUser;
  html_url: string;
}

export interface GitHubRef {
  ref: string;
  sha: string;
  repo: GitHubRepository;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: GitHubUser;
  head: GitHubRef;
  base: GitHubRef;
  html_url: string;
  additions: number;
  deletions: number;
  changed_files: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubWebhookPayload {
  action: string;
  number: number;
  pull_request: GitHubPullRequest;
  repository: GitHubRepository;
  sender: GitHubUser;
}

export type FileStatus =
  | 'added'
  | 'removed'
  | 'modified'
  | 'renamed'
  | 'copied'
  | 'changed'
  | 'unchanged';

export interface GitHubPRFile {
  sha: string;
  filename: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

export interface PRFile {
  filename: string;
  status: FileStatus;
  additions: number;
  deletions: number;
  patch: string | null;
  previousFilename: string | null;
}

export interface ParsedPR {
  title: string;
  author: string;
  number: number;
  repositoryFullName: string;
  baseRef: string;
  headRef: string;
  headSha: string;
  htmlUrl: string;
  body: string | null;
  files: PRFile[];
}
