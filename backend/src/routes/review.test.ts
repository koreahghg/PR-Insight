import request from 'supertest'
import app from '../app'
import { GitHubApiError } from '../github/client'
import * as prFetcher from '../github/prFetcher'
import * as diffAnalyzer from '../pr/diffAnalyzer'
import * as prReviewer from '../ai/prReviewer'
import type { ParsedPR } from '../github/types'
import type { AIReadyDiff } from '../pr/diffAnalyzer'
import type { CodeReviewResult } from '../ai/types'

jest.mock('../github/prFetcher', () => ({
  ...jest.requireActual('../github/prFetcher'),
  fetchPR: jest.fn(),
}))
jest.mock('../pr/diffAnalyzer', () => ({
  ...jest.requireActual('../pr/diffAnalyzer'),
  analyzeDiff: jest.fn(),
}))
jest.mock('../ai/prReviewer', () => ({
  reviewPR: jest.fn(),
}))

const mockFetchPR = jest.mocked(prFetcher.fetchPR)
const mockAnalyzeDiff = jest.mocked(diffAnalyzer.analyzeDiff)
const mockReviewPR = jest.mocked(prReviewer.reviewPR)

const MOCK_PARSED_PR: ParsedPR = {
  title: 'feat: test',
  author: 'testuser',
  number: 1,
  repositoryFullName: 'owner/repo',
  baseRef: 'main',
  headRef: 'feature/test',
  headSha: 'abc123',
  htmlUrl: 'https://github.com/owner/repo/pull/1',
  body: null,
  files: [],
}

const MOCK_AI_READY: AIReadyDiff = {
  repository: 'owner/repo',
  prNumber: 1,
  title: 'feat: test',
  author: 'testuser',
  baseBranch: 'main',
  headBranch: 'feature/test',
  totalAdditions: 0,
  totalDeletions: 0,
  changedFiles: 0,
  fileSummaries: [],
  chunks: [],
}

const MOCK_REVIEW_RESULT: CodeReviewResult = {
  prNumber: 1,
  repository: 'owner/repo',
  title: 'feat: test',
  author: 'testuser',
  categories: {
    bug: { issues: [] },
    performance: { issues: [] },
    style: { issues: [] },
    security: { issues: [] },
  },
  totalIssues: 0,
  generatedAt: new Date().toISOString(),
}

describe('POST /api/review', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('prUrl이 없으면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/review')
      .set('Content-Type', 'application/json')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('prUrl을 입력해주세요.')
  })

  it('prUrl이 빈 문자열이면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/review')
      .set('Content-Type', 'application/json')
      .send({ prUrl: '   ' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('prUrl을 입력해주세요.')
  })

  it('유효하지 않은 URL이면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/review')
      .set('Content-Type', 'application/json')
      .send({ prUrl: 'https://example.com/not-a-pr' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('유효한 GitHub PR URL')
  })

  it('PR이 존재하지 않으면 404를 반환한다', async () => {
    mockFetchPR.mockRejectedValue(new GitHubApiError(404, 'GitHub API 404: Not Found'))

    const res = await request(app)
      .post('/api/review')
      .set('Content-Type', 'application/json')
      .send({ prUrl: 'https://github.com/owner/repo/pull/999' })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('PR을 찾을 수 없습니다. URL을 확인해주세요.')
  })

  it('유효한 PR URL로 200과 리뷰 결과를 반환한다', async () => {
    mockFetchPR.mockResolvedValue(MOCK_PARSED_PR)
    mockAnalyzeDiff.mockReturnValue(MOCK_AI_READY)
    mockReviewPR.mockResolvedValue(MOCK_REVIEW_RESULT)

    const res = await request(app)
      .post('/api/review')
      .set('Content-Type', 'application/json')
      .send({ prUrl: 'https://github.com/owner/repo/pull/1' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ prNumber: 1, totalIssues: 0 })
    expect(mockFetchPR).toHaveBeenCalledWith('owner', 'repo', 1)
  })

  it('AI 오류 발생 시 500을 반환한다', async () => {
    mockFetchPR.mockResolvedValue(MOCK_PARSED_PR)
    mockAnalyzeDiff.mockReturnValue(MOCK_AI_READY)
    mockReviewPR.mockRejectedValue(new Error('OpenAI API error'))

    const res = await request(app)
      .post('/api/review')
      .set('Content-Type', 'application/json')
      .send({ prUrl: 'https://github.com/owner/repo/pull/1' })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('PR 리뷰 중 오류가 발생했습니다.')
  })
})
