import { memo, useState, FormEvent } from 'react'
import { RefactorRequest } from '../api/refactor'

const LANGUAGES = [
  '', 'TypeScript', 'JavaScript', 'Python', 'Go', 'Java',
  'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Kotlin', 'Swift',
]

interface Props {
  onSubmit: (req: RefactorRequest) => void
  isLoading: boolean
}

export const RefactorForm = memo(function RefactorForm({ onSubmit, isLoading }: Props) {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('')
  const [context, setContext] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    onSubmit({
      code,
      language: language || undefined,
      context: context || undefined,
    })
  }

  const isOverLimit = code.length > 20000

  return (
    <form className="refactor-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="language">언어</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isLoading}
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l || '자동 감지'}</option>
            ))}
          </select>
        </div>
        <div className="form-field form-field--flex">
          <label htmlFor="context">컨텍스트 (선택)</label>
          <input
            id="context"
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="이 코드의 역할을 간단히 설명해주세요"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="code">
          코드 <span className="required">*</span>
        </label>
        <textarea
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="리팩토링할 코드를 붙여넣으세요..."
          rows={16}
          disabled={isLoading}
          required
        />
        <span className={`char-count${isOverLimit ? ' char-count--over' : ''}`}>
          {code.length.toLocaleString()} / 20,000자
        </span>
      </div>

      <button
        type="submit"
        className="btn-submit"
        disabled={isLoading || !code.trim() || isOverLimit}
      >
        {isLoading ? (
          <>
            <span className="spinner" />
            AI 분석 중...
          </>
        ) : (
          '리팩토링 제안 받기'
        )}
      </button>
    </form>
  )
})
