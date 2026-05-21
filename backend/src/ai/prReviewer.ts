import { AIReadyDiff, DiffChunk } from '../pr/diffAnalyzer'
import { chatCompletion } from './openaiClient'
import { CodeReviewResult, ReviewCategoryName, ReviewIssue } from './types'

// ── 프롬프트 전략 ──────────────────────────────────────────────────────────
//
// [전략 개요]
// prSummarizer와 동일한 청킹 인프라를 재사용한다.
// 차이점: 요약이 아닌 이슈 목록을 추출하므로 집계 단계가 단순하다.
//
//   Stage 1 — chunk별 이슈 추출 (병렬)
//     각 chunk를 독립적으로 분석, 4개 카테고리별 이슈 배열 반환
//     같은 파일의 여러 chunk 결과는 단순 배열 병합으로 집계 (LLM 재호출 불필요)
//
//   집계 — 전체 파일에 걸친 카테고리별 이슈 병합
//     추가 LLM 호출 없이 in-memory 합산
//
// [토큰 예산]
//   chunk content ≈ 3000 chars ≈ 750 tokens
//   시스템 프롬프트 ≈ 250 tokens
//   응답 ≈ 500 tokens (4개 카테고리 × 이슈 배열)
//   → 호출당 ≈ 1500 tokens
// ──────────────────────────────────────────────────────────────────────────

const REVIEW_SYSTEM = `You are a senior code reviewer conducting a thorough quality and security audit.
Analyze the provided diff and identify issues in exactly four categories:
- bug: logic errors, null dereferences, off-by-one errors, missing error handling, incorrect conditionals
- performance: unnecessary re-renders, N+1 queries, inefficient algorithms, memory leaks, blocking operations
- style: naming inconsistencies, code duplication, overly complex functions, dead code, missing types
- security: injection risks (SQL/XSS/command), hardcoded secrets, insecure defaults, improper input validation, CORS misconfigurations

Rules:
- Only report issues visible in added lines (marked with +). Skip removed lines (marked with -).
- "line" field: reference the hunk header or line content to identify location (e.g., "@@ -10,5 +10,7 @@" or "+  const x = null"). Omit if not identifiable.
- severity: "high" = must fix before merge, "medium" = should fix, "low" = nice to have
- Return an empty array [] for categories with no issues
- All text in Korean
Respond ONLY with valid JSON:
{
  "bug": [{"line": "string", "severity": "high|medium|low", "description": "string", "suggestion": "string"}],
  "performance": [{"line": "string", "severity": "high|medium|low", "description": "string", "suggestion": "string"}],
  "style": [{"line": "string", "severity": "high|medium|low", "description": "string", "suggestion": "string"}],
  "security": [{"line": "string", "severity": "high|medium|low", "description": "string", "suggestion": "string"}]
}`

// LLM이 반환하는 단일 이슈의 raw 형태 (filename 미포함)
type RawIssue = {
  line?: string
  severity: 'high' | 'medium' | 'low'
  description: string
  suggestion?: string
}

type ChunkReviewRaw = Record<ReviewCategoryName, RawIssue[]>

const EMPTY_REVIEW: ChunkReviewRaw = { bug: [], performance: [], style: [], security: [] }

const CATEGORY_NAMES: ReviewCategoryName[] = ['bug', 'performance', 'style', 'security']

// ── chunk 단위 분석 ────────────────────────────────────────────────────────

async function reviewChunk(chunk: DiffChunk): Promise<{ filename: string; raw: ChunkReviewRaw }> {
  const partLabel =
    chunk.totalChunks > 1 ? ` (part ${chunk.chunkIndex + 1}/${chunk.totalChunks})` : ''

  const response = await chatCompletion(
    [
      { role: 'system', content: REVIEW_SYSTEM },
      {
        role: 'user',
        content: `File: \`${chunk.filename}\`${partLabel}\n\n\`\`\`diff\n${chunk.content}\n\`\`\``,
      },
    ],
    { maxTokens: 500 }
  )

  return {
    filename: chunk.filename,
    raw: parseJson(response, EMPTY_REVIEW),
  }
}

// ── 메인 진입점 ───────────────────────────────────────────────────────────

// PR 코드 리뷰 파이프라인:
//   1. 모든 chunk를 병렬로 분석 (파일·청크 경계 무관)
//   2. filename 주입 후 카테고리별 이슈 배열 병합
//   3. CodeReviewResult 반환
export async function reviewPR(aiReady: AIReadyDiff): Promise<CodeReviewResult> {
  const chunkResults = await Promise.all(aiReady.chunks.map(reviewChunk))

  const accumulated: Record<ReviewCategoryName, ReviewIssue[]> = {
    bug: [],
    performance: [],
    style: [],
    security: [],
  }

  for (const { filename, raw } of chunkResults) {
    for (const cat of CATEGORY_NAMES) {
      for (const issue of raw[cat] ?? []) {
        accumulated[cat].push({ filename, ...issue })
      }
    }
  }

  const totalIssues = CATEGORY_NAMES.reduce((sum, cat) => sum + accumulated[cat].length, 0)

  return {
    prNumber: aiReady.prNumber,
    repository: aiReady.repository,
    title: aiReady.title,
    author: aiReady.author,
    categories: {
      bug: { issues: accumulated.bug },
      performance: { issues: accumulated.performance },
      style: { issues: accumulated.style },
      security: { issues: accumulated.security },
    },
    totalIssues,
    generatedAt: new Date().toISOString(),
  }
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

function parseJson<T>(raw: string, fallback: T): T {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw) as T
  } catch {
    console.warn('[PRReviewer] JSON parse failed, using fallback.\nRaw:', raw)
    return fallback
  }
}
