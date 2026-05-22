import { useState, useCallback, useEffect, useRef } from 'react'
import { requestRefactor, cancelPendingRequest, RefactorRequest } from '../api/refactor'
import { RefactorResult } from '../types/refactor'

export type RefactorState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; data: RefactorResult }
  | { status: 'error'; message: string }

export function useRefactor() {
  const [state, setState] = useState<RefactorState>({ status: 'idle' })
  const unmounted = useRef(false)

  useEffect(() => {
    return () => {
      unmounted.current = true
      cancelPendingRequest()
    }
  }, [])

  const submit = useCallback(async (req: RefactorRequest) => {
    setState({ status: 'loading' })
    try {
      const data = await requestRefactor(req)
      if (!unmounted.current) {
        setState({ status: 'result', data })
      }
    } catch (err) {
      if (unmounted.current) return
      // AbortError는 사용자가 새 요청을 보낸 것이므로 에러로 처리하지 않음
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
