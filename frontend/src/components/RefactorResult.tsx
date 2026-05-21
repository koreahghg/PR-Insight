import { RefactorResult, RefactorSuggestion, RefactorCategory, RefactorImpact } from '../types/refactor'

const CATEGORY_LABEL: Record<RefactorCategory, string> = {
  readability: '가독성',
  performance: '성능',
  maintainability: '유지보수성',
  security: '보안',
}

const IMPACT_LABEL: Record<RefactorImpact, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

interface SuggestionCardProps {
  suggestion: RefactorSuggestion
  index: number
}

function SuggestionCard({ suggestion, index }: SuggestionCardProps) {
  return (
    <div className="suggestion-card">
      <div className="suggestion-header">
        <span className="suggestion-number">#{index + 1}</span>
        <span className="suggestion-title">{suggestion.title}</span>
        <div className="suggestion-badges">
          <span className={`badge badge--${suggestion.category}`}>
            {CATEGORY_LABEL[suggestion.category]}
          </span>
          <span className={`badge badge--impact-${suggestion.impact}`}>
            영향도: {IMPACT_LABEL[suggestion.impact]}
          </span>
        </div>
      </div>

      <div className="code-comparison">
        <div className="code-block code-block--before">
          <div className="code-block-label code-block-label--before">문제 코드</div>
          <pre><code>{suggestion.originalCode}</code></pre>
        </div>
        <div className="code-comparison-arrow">→</div>
        <div className="code-block code-block--after">
          <div className="code-block-label code-block-label--after">개선 코드</div>
          <pre><code>{suggestion.improvedCode}</code></pre>
        </div>
      </div>

      <div className="suggestion-explanation">
        <span className="explanation-label">개선 이유</span>
        <p>{suggestion.explanation}</p>
      </div>
    </div>
  )
}

interface Props {
  result: RefactorResult
  onReset: () => void
}

export function RefactorResult({ result, onReset }: Props) {
  return (
    <div className="refactor-result">
      <div className="result-header">
        <div>
          <h2 className="result-title">리팩토링 제안</h2>
          <p className="result-count">{result.suggestions.length}개의 개선 사항</p>
        </div>
        <button className="btn-reset" onClick={onReset}>
          새 코드 분석
        </button>
      </div>

      <div className="overall-summary">
        <p>{result.overallSummary}</p>
      </div>

      <div className="suggestions-list">
        {result.suggestions.length === 0 ? (
          <div className="no-suggestions">
            <p>개선할 사항이 발견되지 않았습니다. 코드 품질이 우수합니다!</p>
          </div>
        ) : (
          result.suggestions.map((s, i) => (
            <SuggestionCard key={i} suggestion={s} index={i} />
          ))
        )}
      </div>
    </div>
  )
}
