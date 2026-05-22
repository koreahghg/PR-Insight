import { RefactorResult } from '../types/refactor'
import { RequestCache } from '../utils/requestCache'

export interface RefactorRequest {
  code: string
  language?: string
  context?: string
}

const cache = new RequestCache<RefactorResult>()
const inFlight = new Map<string, Promise<RefactorResult>>()

export async function requestRefactor(
  payload: RefactorRequest,
  signal?: AbortSignal,
): Promise<RefactorResult> {
  const key = RequestCache.hashRequest(payload as unknown as Record<string, unknown>)

  const cached = cache.get(key)
  if (cached) return cached

  const existing = inFlight.get(key)
  if (existing) return existing

  const promise = fetch('/api/refactor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `요청 실패 (${res.status})`)
      }
      return res.json() as Promise<RefactorResult>
    })
    .then((data) => {
      cache.set(key, data)
      return data
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, promise)
  return promise
}
