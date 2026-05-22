import { useState } from 'react'
import { RefactorForm } from './components/RefactorForm'
import { RefactorResult } from './components/RefactorResult'
import { PRReviewForm } from './components/PRReviewForm'
import { PRReviewResult } from './components/PRReviewResult'
import { useRefactor } from './hooks/useRefactor'
import { usePRReview } from './hooks/usePRReview'

type TabId = 'refactor' | 'review'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('refactor')
  const { state: refactorState, submit: submitRefactor, reset: resetRefactor } = useRefactor()
  const { state: reviewState, submit: submitReview, reset: resetReview } = usePRReview()

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">PR Insight</h1>
        <p className="app-subtitle">AI 기반 코드 분석 도구</p>
      </header>

      <div className="border-b border-gh-border2 flex gap-1 px-6 bg-gh-bg">
        {([
          { id: 'refactor' as TabId, label: '코드 리팩토링' },
          { id: 'review' as TabId, label: 'PR 리뷰' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === id
                ? 'border-[#58a6ff] text-[#58a6ff]'
                : 'border-transparent text-[#8b949e] hover:text-[#c9d1d9]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="app-main">
        {activeTab === 'refactor' && (
          <>
            <div style={{ display: refactorState.status === 'result' ? 'none' : 'block' }}>
              <RefactorForm
                onSubmit={submitRefactor}
                isLoading={refactorState.status === 'loading'}
              />
            </div>

            {refactorState.status === 'error' && (
              <div className="error-banner">
                <span>{refactorState.message}</span>
                <button className="error-retry" onClick={resetRefactor}>
                  다시 시도
                </button>
              </div>
            )}

            {refactorState.status === 'result' && (
              <RefactorResult result={refactorState.data} onReset={resetRefactor} />
            )}
          </>
        )}

        {activeTab === 'review' && (
          <>
            {reviewState.status !== 'result' && (
              <PRReviewForm
                onSubmit={submitReview}
                isLoading={reviewState.status === 'loading'}
              />
            )}

            {reviewState.status === 'error' && (
              <div className="error-banner">
                <span>{reviewState.message}</span>
                <button className="error-retry" onClick={resetReview}>
                  다시 시도
                </button>
              </div>
            )}

            {reviewState.status === 'result' && (
              <PRReviewResult result={reviewState.data} onReset={resetReview} />
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
