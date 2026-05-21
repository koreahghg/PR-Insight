import { useState } from 'react'
import { RefactorForm } from './components/RefactorForm'
import { RefactorResult } from './components/RefactorResult'
import { requestRefactor, RefactorRequest } from './api/refactor'
import { RefactorResult as RefactorResultType } from './types/refactor'

type AppState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; data: RefactorResultType }
  | { status: 'error'; message: string }

function App() {
  const [state, setState] = useState<AppState>({ status: 'idle' })

  async function handleSubmit(req: RefactorRequest) {
    setState({ status: 'loading' })
    try {
      const data = await requestRefactor(req)
      setState({ status: 'result', data })
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
      })
    }
  }

  function handleReset() {
    setState({ status: 'idle' })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">PR Insight</h1>
        <p className="app-subtitle">코드를 붙여넣으면 AI가 리팩토링 방법을 제안합니다</p>
      </header>

      <main className="app-main">
        {state.status !== 'result' && (
          <RefactorForm
            onSubmit={handleSubmit}
            isLoading={state.status === 'loading'}
          />
        )}

        {state.status === 'error' && (
          <div className="error-banner">
            <span>{state.message}</span>
            <button className="error-retry" onClick={handleReset}>
              다시 시도
            </button>
          </div>
        )}

        {state.status === 'result' && (
          <RefactorResult result={state.data} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}

export default App
