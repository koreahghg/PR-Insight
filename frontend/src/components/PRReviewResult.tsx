import { CodeReviewResult, ReviewCategoryName, ReviewIssue, ReviewSeverity } from '../types/review'

const CATEGORY_ORDER: ReviewCategoryName[] = ['bug', 'security', 'performance', 'style']

function sortCategoriesByCount(
  categories: CodeReviewResult['categories']
): ReviewCategoryName[] {
  return [...CATEGORY_ORDER].sort(
    (a, b) => categories[b].issues.length - categories[a].issues.length
  )
}

type CategoryStyle = {
  label: string
  icon: string
  sectionBorder: string
  sectionHeaderBg: string
  titleColor: string
  summaryBadge: string
}

const CATEGORY_STYLES: Record<ReviewCategoryName, CategoryStyle> = {
  bug: {
    label: '버그',
    icon: '🐛',
    sectionBorder: 'border-red-900/40',
    sectionHeaderBg: 'bg-red-950/30',
    titleColor: 'text-red-400',
    summaryBadge: 'bg-red-950/60 border border-red-900/50 text-red-400',
  },
  security: {
    label: '보안',
    icon: '🔒',
    sectionBorder: 'border-purple-900/40',
    sectionHeaderBg: 'bg-purple-950/30',
    titleColor: 'text-purple-400',
    summaryBadge: 'bg-purple-950/60 border border-purple-900/50 text-purple-400',
  },
  performance: {
    label: '성능',
    icon: '⚡',
    sectionBorder: 'border-yellow-900/40',
    sectionHeaderBg: 'bg-yellow-950/30',
    titleColor: 'text-yellow-400',
    summaryBadge: 'bg-yellow-950/60 border border-yellow-900/50 text-yellow-400',
  },
  style: {
    label: '스타일',
    icon: '✨',
    sectionBorder: 'border-sky-900/40',
    sectionHeaderBg: 'bg-sky-950/30',
    titleColor: 'text-sky-400',
    summaryBadge: 'bg-sky-950/60 border border-sky-900/50 text-sky-400',
  },
}

type SeverityStyle = {
  dot: string
  text: string
  label: string
  badge: string
}

const SEVERITY_STYLES: Record<ReviewSeverity, SeverityStyle> = {
  high: {
    dot: 'bg-red-500',
    text: 'text-red-400',
    label: '높음',
    badge: 'bg-red-950/60 text-red-400 border border-red-900/50',
  },
  medium: {
    dot: 'bg-yellow-500',
    text: 'text-yellow-400',
    label: '중간',
    badge: 'bg-yellow-950/60 text-yellow-400 border border-yellow-900/50',
  },
  low: {
    dot: 'bg-slate-600',
    text: 'text-slate-400',
    label: '낮음',
    badge: 'bg-slate-900/60 text-slate-400 border border-slate-700/50',
  },
}

function IssueCard({ issue }: { issue: ReviewIssue }) {
  const sev = SEVERITY_STYLES[issue.severity]

  return (
    <div className="bg-gh-bg border border-gh-border2 rounded-lg p-4 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${sev.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
          {sev.label}
        </span>
        <code className="text-xs font-mono text-gh-accent bg-gh-card px-2 py-0.5 rounded border border-gh-border2">
          {issue.filename}{issue.line ? `:${issue.line}` : ''}
        </code>
      </div>

      <p className="text-sm text-gh-text leading-relaxed">{issue.description}</p>

      {issue.suggestion && (
        <div className="flex items-start gap-2 pt-0.5">
          <span className="text-gh-dim text-xs mt-0.5 shrink-0">→</span>
          <p className="text-xs text-gh-muted leading-relaxed">{issue.suggestion}</p>
        </div>
      )}
    </div>
  )
}

function CategorySection({ name, issues }: { name: ReviewCategoryName; issues: ReviewIssue[] }) {
  const style = CATEGORY_STYLES[name]
  if (issues.length === 0) return null

  return (
    <section className={`rounded-xl border ${style.sectionBorder} overflow-hidden`}>
      <div className={`${style.sectionHeaderBg} border-b ${style.sectionBorder} px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{style.icon}</span>
          <h3 className={`text-sm font-semibold ${style.titleColor}`}>{style.label}</h3>
        </div>
        <span className={`text-xs font-mono font-bold ${style.titleColor}`}>
          {issues.length}개
        </span>
      </div>
      <div className="p-4 space-y-3 bg-gh-card/50">
        {issues.map((issue, i) => (
          <IssueCard key={i} issue={issue} />
        ))}
      </div>
    </section>
  )
}

interface Props {
  result: CodeReviewResult
  onReset?: () => void
}

export function PRReviewResult({ result, onReset }: Props) {
  const date = new Date(result.generatedAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const categoriesWithIssues = sortCategoriesByCount(result.categories).filter(
    (cat) => result.categories[cat].issues.length > 0
  )

  return (
    <div className="space-y-5">
      {/* PR 헤더 카드 */}
      <div className="bg-gh-card border border-gh-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono text-gh-dim bg-gh-bg border border-gh-border2 px-2 py-0.5 rounded">
                #{result.prNumber}
              </span>
              <span className="text-xs text-gh-muted">{result.repository}</span>
            </div>
            <h2 className="text-lg font-semibold text-gh-bright leading-snug">{result.title}</h2>
            <p className="text-sm text-gh-muted mt-1">@{result.author}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right">
              <div className="text-3xl font-bold text-gh-bright tabular-nums">{result.totalIssues}</div>
              <div className="text-xs text-gh-muted mt-0.5">개 이슈 발견</div>
            </div>
            {onReset && (
              <button className="btn-reset" onClick={onReset}>
                새 PR 분석
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 pt-3.5 border-t border-gh-border2 text-xs text-gh-dim">
          분석 완료: {date}
        </div>
      </div>

      {/* 카테고리 요약 배지 */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORY_ORDER.map((cat) => {
          const count = result.categories[cat].issues.length
          const style = CATEGORY_STYLES[cat]
          return (
            <span
              key={cat}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${style.summaryBadge}`}
            >
              <span>{style.icon}</span>
              {style.label}
              <span className="font-mono">{count}</span>
            </span>
          )
        })}
      </div>

      {/* 카테고리별 이슈 섹션 */}
      {result.totalIssues === 0 ? (
        <div className="bg-gh-card border border-gh-border rounded-xl p-10 text-center">
          <p className="text-gh-muted text-sm">발견된 이슈가 없습니다. 코드 품질이 우수합니다!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categoriesWithIssues.map((cat) => (
            <CategorySection
              key={cat}
              name={cat}
              issues={result.categories[cat].issues}
            />
          ))}
        </div>
      )}
    </div>
  )
}
