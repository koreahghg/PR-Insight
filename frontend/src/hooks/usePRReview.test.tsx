import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePRReview } from './usePRReview'
import * as reviewApi from '../api/review'
import type { CodeReviewResult } from '../types/review'

vi.mock('../api/review')

const mockRequestReview = vi.mocked(reviewApi.requestReview)

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

describe('usePRReview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('초기 상태는 idle이다', () => {
    const { result } = renderHook(() => usePRReview())
    expect(result.current.state.status).toBe('idle')
  })

  it('submit 후 result 상태로 변경된다', async () => {
    mockRequestReview.mockResolvedValue(MOCK_RESULT)

    const { result } = renderHook(() => usePRReview())

    await act(async () => {
      await result.current.submit('https://github.com/owner/repo/pull/1')
    })

    expect(result.current.state.status).toBe('result')
    if (result.current.state.status === 'result') {
      expect(result.current.state.data).toEqual(MOCK_RESULT)
    }
  })

  it('API 오류 시 error 상태로 변경된다', async () => {
    mockRequestReview.mockRejectedValue(new Error('PR을 찾을 수 없습니다.'))

    const { result } = renderHook(() => usePRReview())

    await act(async () => {
      await result.current.submit('https://github.com/owner/repo/pull/999')
    })

    expect(result.current.state.status).toBe('error')
    if (result.current.state.status === 'error') {
      expect(result.current.state.message).toBe('PR을 찾을 수 없습니다.')
    }
  })

  it('reset 호출 시 idle 상태로 돌아간다', async () => {
    mockRequestReview.mockResolvedValue(MOCK_RESULT)

    const { result } = renderHook(() => usePRReview())

    await act(async () => {
      await result.current.submit('https://github.com/owner/repo/pull/1')
    })
    expect(result.current.state.status).toBe('result')

    act(() => {
      result.current.reset()
    })
    expect(result.current.state.status).toBe('idle')
  })

  it('연속 submit 시 이전 요청이 abort된다', async () => {
    let resolveFirst!: (v: CodeReviewResult) => void
    const firstPromise = new Promise<CodeReviewResult>((res) => {
      resolveFirst = res
    })

    mockRequestReview
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(MOCK_RESULT)

    const { result } = renderHook(() => usePRReview())

    // 첫 번째 submit (응답 대기 중)
    act(() => {
      result.current.submit('https://github.com/owner/repo/pull/1')
    })

    // 두 번째 submit (첫 번째 abort)
    await act(async () => {
      await result.current.submit('https://github.com/owner/repo/pull/2')
    })

    // 첫 번째 resolve는 무시되어야 함
    act(() => {
      resolveFirst({ ...MOCK_RESULT, prNumber: 999 })
    })

    expect(result.current.state.status).toBe('result')
    if (result.current.state.status === 'result') {
      expect(result.current.state.data.prNumber).toBe(1)
    }
  })
})
