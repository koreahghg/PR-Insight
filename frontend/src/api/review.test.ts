import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requestReview } from './review'
import type { CodeReviewResult } from '../types/review'

const MOCK_RESULT: CodeReviewResult = {
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

describe('requestReview', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('성공 시 CodeReviewResult를 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_RESULT }),
    )

    const result = await requestReview('https://github.com/owner/repo/pull/1')

    expect(result).toEqual(MOCK_RESULT)
    expect(fetch).toHaveBeenCalledWith(
      '/api/review',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ prUrl: 'https://github.com/owner/repo/pull/1' }),
      }),
    )
  })

  it('응답이 ok가 아닌 경우 서버 에러 메시지를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: '유효한 GitHub PR URL을 입력해주세요.' }),
      }),
    )

    await expect(requestReview('invalid')).rejects.toThrow('유효한 GitHub PR URL을 입력해주세요.')
  })

  it('json 파싱 실패 시 상태 코드 기반 기본 메시지를 던진다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('parse error')
        },
      }),
    )

    await expect(requestReview('https://github.com/owner/repo/pull/1')).rejects.toThrow(
      '요청 실패 (500)',
    )
  })

  it('signal을 fetch에 전달한다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => MOCK_RESULT })
    vi.stubGlobal('fetch', mockFetch)

    const controller = new AbortController()
    await requestReview('https://github.com/owner/repo/pull/1', controller.signal)

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/review',
      expect.objectContaining({ signal: controller.signal }),
    )
  })
})
