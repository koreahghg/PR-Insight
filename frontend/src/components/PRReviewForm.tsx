import { memo, useState, FormEvent } from 'react'

interface Props {
  onSubmit: (prUrl: string) => void
  isLoading: boolean
}

export const PRReviewForm = memo(function PRReviewForm({ onSubmit, isLoading }: Props) {
  const [prUrl, setPrUrl] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!prUrl.trim()) return
    onSubmit(prUrl.trim())
  }

  const isValid = /^(?:https?:\/\/)?(?:www\.)?github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(prUrl)

  return (
    <form className="refactor-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="pr-url">
          GitHub PR URL <span className="required">*</span>
        </label>
        <input
          id="pr-url"
          type="text"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          disabled={isLoading}
          required
        />
        {prUrl && !isValid && (
          <span className="char-count char-count--over">
            유효한 GitHub PR URL을 입력해주세요.
          </span>
        )}
      </div>

      <button type="submit" className="btn-submit" disabled={isLoading || !isValid}>
        {isLoading ? (
          <>
            <span className="spinner" />
            PR 분석 중...
          </>
        ) : (
          'PR 리뷰 시작'
        )}
      </button>
    </form>
  )
})
