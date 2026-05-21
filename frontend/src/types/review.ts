export type ReviewSeverity = 'high' | 'medium' | 'low'

export type ReviewCategoryName = 'bug' | 'performance' | 'style' | 'security'

export interface ReviewIssue {
  filename: string
  line?: string
  severity: ReviewSeverity
  description: string
  suggestion?: string
}

export interface ReviewCategory {
  issues: ReviewIssue[]
}

export interface CodeReviewResult {
  prNumber: number
  repository: string
  title: string
  author: string
  categories: Record<ReviewCategoryName, ReviewCategory>
  totalIssues: number
  generatedAt: string
}
