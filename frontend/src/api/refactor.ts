import { RefactorResult } from '../types/refactor'

export interface RefactorRequest {
  code: string
  language?: string
  context?: string
}

export async function requestRefactor(payload: RefactorRequest): Promise<RefactorResult> {
  const response = await fetch('/api/refactor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? `요청 실패 (${response.status})`)
  }

  return response.json()
}
