import { FileStatus } from '../github/types'

export interface FileSummaryResult {
  filename: string
  status: FileStatus
  // AI가 생성한 파일 변경 내용 한 줄 요약
  summary: string
  // 구체적인 변경 항목 목록 (bullet point 형태)
  changes: string[]
}

export interface PRSummaryResult {
  prNumber: number
  repository: string
  title: string
  author: string
  // PR 전체 목적과 영향을 2~3문장으로 설명
  overallSummary: string
  // 주요 변경 사항 목록
  keyChanges: string[]
  // 파일별 요약 목록
  fileSummaries: FileSummaryResult[]
  // 리뷰어가 집중해서 봐야 할 포인트
  reviewPoints: string[]
  generatedAt: string
}
