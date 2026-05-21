export type RefactorCategory = 'readability' | 'performance' | 'maintainability' | 'security'
export type RefactorImpact = 'high' | 'medium' | 'low'

export interface RefactorSuggestion {
  title: string
  originalCode: string
  improvedCode: string
  explanation: string
  category: RefactorCategory
  impact: RefactorImpact
}

export interface RefactorResult {
  suggestions: RefactorSuggestion[]
  overallSummary: string
}
