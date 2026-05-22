import { CodeReviewResult } from '../types/review'

export async function requestReview(prUrl: string, signal?: AbortSignal): Promise<CodeReviewResult> {
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prUrl }),
    signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `요청 실패 (${response.status})`)
  }

  return response.json() as Promise<CodeReviewResult>
}
