import { useState } from 'react'
import { RefactorForm } from './components/RefactorForm'
import { RefactorResult } from './components/RefactorResult'
import { PRReviewResult } from './components/PRReviewResult'
import { requestRefactor, RefactorRequest } from './api/refactor'
import { RefactorResult as RefactorResultType } from './types/refactor'
import { CodeReviewResult } from './types/review'

type TabId = 'refactor' | 'review'

type RefactorState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; data: RefactorResultType }
  | { status: 'error'; message: string }

const MOCK_REVIEW: CodeReviewResult = {
  prNumber: 42,
  repository: 'owner/pr-insight',
  title: 'feat: GitHub OAuth 인증 및 사용자 세션 관리 구현',
  author: 'koreahghg',
  categories: {
    bug: {
      issues: [
        {
          filename: 'src/auth/session.ts',
          line: '42',
          severity: 'high',
          description: '세션 토큰이 만료된 후에도 유효성 검사 없이 사용될 수 있습니다.',
          suggestion: 'isExpired() 체크를 미들웨어에서 반드시 수행하거나, 토큰 검증 시 만료 시간을 항상 확인하세요.',
        },
        {
          filename: 'src/auth/oauth.ts',
          line: '18',
          severity: 'medium',
          description: 'state 파라미터 검증이 없어 CSRF 공격에 취약합니다.',
          suggestion: 'OAuth flow 시작 시 무작위 state 값을 생성하고, 콜백에서 반드시 일치 여부를 검증하세요.',
        },
      ],
    },
    security: {
      issues: [
        {
          filename: 'src/config/env.ts',
          line: '9',
          severity: 'high',
          description: 'CLIENT_SECRET이 클라이언트 번들에 포함될 수 있는 방식으로 임포트되고 있습니다.',
          suggestion: '서버 전용 환경변수는 VITE_ 접두사 없이 사용하고, 서버 코드에서만 접근하도록 분리하세요.',
        },
        {
          filename: 'src/api/user.ts',
          severity: 'medium',
          description: '사용자 입력값이 SQL 쿼리에 직접 삽입되어 injection 취약점이 존재합니다.',
          suggestion: '파라미터화된 쿼리 또는 ORM을 사용하세요.',
        },
      ],
    },
    performance: {
      issues: [
        {
          filename: 'src/components/UserList.tsx',
          line: '31',
          severity: 'medium',
          description: '매 렌더링마다 새로운 객체가 생성되어 하위 컴포넌트의 불필요한 리렌더링이 발생합니다.',
          suggestion: 'useMemo 또는 useCallback을 사용해 참조 동일성을 유지하세요.',
        },
      ],
    },
    style: {
      issues: [
        {
          filename: 'src/hooks/useAuth.ts',
          severity: 'low',
          description: '핸들러 함수 이름이 일관되지 않습니다. (handleLogin vs onLogout)',
          suggestion: '동일한 prefix를 사용하세요. (handle* 또는 on* 중 하나로 통일)',
        },
        {
          filename: 'src/types/user.ts',
          line: '12',
          severity: 'low',
          description: 'User 인터페이스에 사용되지 않는 필드 refreshTokenExpiry가 포함되어 있습니다.',
          suggestion: '실제로 사용하거나 타입 정의에서 제거하세요.',
        },
      ],
    },
  },
  totalIssues: 7,
  generatedAt: new Date().toISOString(),
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('refactor')
  const [refactorState, setRefactorState] = useState<RefactorState>({ status: 'idle' })

  async function handleRefactorSubmit(req: RefactorRequest) {
    setRefactorState({ status: 'loading' })
    try {
      const data = await requestRefactor(req)
      setRefactorState({ status: 'result', data })
    } catch (err) {
      setRefactorState({
        status: 'error',
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
      })
    }
  }

  function handleRefactorReset() {
    setRefactorState({ status: 'idle' })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">PR Insight</h1>
        <p className="app-subtitle">AI 기반 코드 분석 도구</p>
      </header>

      {/* 탭 네비게이션 */}
      <div className="border-b border-[#21262d] flex gap-1 px-6" style={{ backgroundColor: '#0d1117' }}>
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
        {/* 코드 리팩토링 탭 */}
        {activeTab === 'refactor' && (
          <>
            <div style={{ display: refactorState.status === 'result' ? 'none' : 'block' }}>
              <RefactorForm
                onSubmit={handleRefactorSubmit}
                isLoading={refactorState.status === 'loading'}
              />
            </div>

            {refactorState.status === 'error' && (
              <div className="error-banner">
                <span>{refactorState.message}</span>
                <button className="error-retry" onClick={handleRefactorReset}>
                  다시 시도
                </button>
              </div>
            )}

            {refactorState.status === 'result' && (
              <RefactorResult result={refactorState.data} onReset={handleRefactorReset} />
            )}
          </>
        )}

        {/* PR 리뷰 탭 */}
        {activeTab === 'review' && (
          <PRReviewResult result={MOCK_REVIEW} />
        )}
      </main>
    </div>
  )
}

export default App
