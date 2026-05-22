import { useState, useCallback, useEffect, useRef } from 'react'
import { CodeReviewResult } from '../types/review'
import { requestReview } from '../api/review'

export type PRReviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; data: CodeReviewResult }
  | { status: 'error'; message: string }

export function usePRReview() {
  const [state, setState] = useState<PRReviewState>({ status: 'idle' })
  const unmounted = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      unmounted.current = true
      controllerRef.current?.abort()
    }
  }, [])

  const submit = useCallback(async (prUrl: string) => {
    controllerRef.current?.abort()
    controllerRef.current = new AbortController()

    setState({ status: 'loading' })
    try {
      const data = await requestReview(prUrl, controllerRef.current.signal)
      if (!unmounted.current) {
        setState({ status: 'result', data })
      }
    } catch (err) {
      if (unmounted.current) return
      if (err instanceof DOMException && err.name === 'AbortError') return
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
      })
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, submit, reset }
}
