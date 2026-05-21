import { AIReadyDiff, DiffChunk } from '../pr/diffAnalyzer'
import { chatCompletion, parseAIJson } from './openaiClient'
import { FileSummaryResult, PRSummaryResult } from './types'

// ── 프롬프트 전략 ──────────────────────────────────────────────────────────
//
// [전략 개요]
// 대형 PR은 단일 API 호출로 처리하기엔 토큰 초과 위험이 있어 2단계 전략을 사용한다.
//
//   Stage 1 — 파일별 요약 (분할 처리)
//     각 파일의 diff chunk를 개별 API 호출로 요약한다.
//     파일이 여러 chunk로 분할된 경우:
//       1a) 각 chunk를 독립적으로 병렬 요약 (API latency 최소화)
//       1b) chunk 요약들을 집계하여 파일 최종 요약 생성
//           → chunk content 대신 요약 텍스트를 입력으로 재사용하므로 토큰 절약
//
//   Stage 2 — PR 전체 요약 (집계)
//     파일별 요약 + PR 메타데이터를 하나의 호출로 집계하여
//     전체 변경 목적, 핵심 변경 사항, 리뷰 포인트를 생성한다.
//
// [토큰 예산]
//   chunk content ≈ 3000 chars ≈ 750 tokens
//   시스템 프롬프트 ≈ 150 tokens
//   응답 ≈ 300 tokens
//   → 호출당 ≈ 1200 tokens (gpt-4o-mini 기준 약 $0.0002)
// ──────────────────────────────────────────────────────────────────────────

// Stage 1a: 단일 chunk 요약 프롬프트
// JSON 응답만 요구하여 파싱 안정성 확보
const FILE_CHUNK_SYSTEM = `You are a senior code reviewer. Analyze code diffs and provide concise, factual summaries in Korean.
Focus on: what changed functionally, what was added/removed/modified.
Respond ONLY with valid JSON: {"summary": "string", "changes": ["string"]}`

// Stage 1b: 다중 chunk 집계 프롬프트
// chunk content가 아닌 요약 텍스트를 입력으로 받아 토큰 절약
const FILE_AGGREGATE_SYSTEM = `You are a senior code reviewer.
You will receive multiple partial summaries of the same file split into chunks.
Consolidate them into one coherent summary in Korean.
Respond ONLY with valid JSON: {"summary": "string", "changes": ["string"]}`

// Stage 2: PR 전체 요약 프롬프트
// 파일별 요약 + PR 메타데이터를 기반으로 PR의 목적과 리뷰 포인트를 도출
const PR_SUMMARY_SYSTEM = `You are a senior code reviewer writing a PR summary for a development team.
You will receive PR metadata and file-level change summaries.
Provide a holistic assessment in Korean.
Respond ONLY with valid JSON:
{
  "overallSummary": "string (2-3 sentences: what this PR does and why)",
  "keyChanges": ["string"],
  "reviewPoints": ["string (specific things reviewers should focus on)"]
}`

// ── Stage 1a: 단일 chunk 요약 ──────────────────────────────────────────────

async function summarizeChunk(chunk: DiffChunk): Promise<{ summary: string; changes: string[] }> {
  const partLabel =
    chunk.totalChunks > 1 ? ` (part ${chunk.chunkIndex + 1}/${chunk.totalChunks})` : ''

  const raw = await chatCompletion(
    [
      { role: 'system', content: FILE_CHUNK_SYSTEM },
      {
        role: 'user',
        content: `File: \`${chunk.filename}\`${partLabel}\n\n\`\`\`diff\n${chunk.content}\n\`\`\``,
      },
    ],
    { maxTokens: 300 }
  )

  return parseAIJson(raw, { summary: `${chunk.filename} 변경됨`, changes: [] }, 'PRSummarizer')
}

// ── Stage 1b: 다중 chunk 집계 ──────────────────────────────────────────────

async function aggregateChunks(
  filename: string,
  partials: Array<{ summary: string; changes: string[] }>
): Promise<{ summary: string; changes: string[] }> {
  const parts = partials
    .map((p, i) => `Part ${i + 1}:\n요약: ${p.summary}\n변경: ${p.changes.join(' / ')}`)
    .join('\n\n')

  const raw = await chatCompletion(
    [
      { role: 'system', content: FILE_AGGREGATE_SYSTEM },
      {
        role: 'user',
        content: `File: \`${filename}\` (${partials.length}개 파트로 분석됨)\n\n${parts}`,
      },
    ],
    { maxTokens: 300 }
  )

  return parseAIJson(raw, { summary: `${filename} 변경됨`, changes: [] }, 'PRSummarizer')
}

// ── Stage 1 진입점: 파일 단위 요약 ────────────────────────────────────────

async function summarizeFile(
  filename: string,
  chunks: DiffChunk[],
  meta: { status: string; additions: number; deletions: number }
): Promise<FileSummaryResult> {
  // chunk가 1개면 단일 호출로 처리 (집계 호출 불필요)
  if (chunks.length === 1) {
    const result = await summarizeChunk(chunks[0])
    return { filename, status: meta.status as FileSummaryResult['status'], ...result }
  }

  // chunk가 여러 개면 1a → 1b 2단계 처리
  const partials = await Promise.all(chunks.map(summarizeChunk))
  const aggregated = await aggregateChunks(filename, partials)
  return { filename, status: meta.status as FileSummaryResult['status'], ...aggregated }
}

// ── Stage 2: PR 전체 요약 ──────────────────────────────────────────────────

async function generatePRSummary(
  aiReady: AIReadyDiff,
  fileSummaries: FileSummaryResult[]
): Promise<{ overallSummary: string; keyChanges: string[]; reviewPoints: string[] }> {
  const fileList = aiReady.fileSummaries
    .map(f => `- ${f.filename} [${f.status}] +${f.additions}/-${f.deletions}`)
    .join('\n')

  // 파일 요약은 summary + changes 형식으로 직렬화하여 토큰 절약
  const summaryText = fileSummaries
    .map(f => `**${f.filename}**: ${f.summary}\n${f.changes.map(c => `  - ${c}`).join('\n')}`)
    .join('\n\n')

  const raw = await chatCompletion(
    [
      { role: 'system', content: PR_SUMMARY_SYSTEM },
      {
        role: 'user',
        content: [
          `PR #${aiReady.prNumber}: "${aiReady.title}"`,
          `작성자: ${aiReady.author} | 저장소: ${aiReady.repository}`,
          `브랜치: ${aiReady.headBranch} → ${aiReady.baseBranch}`,
          `변경 통계: +${aiReady.totalAdditions}/-${aiReady.totalDeletions} (${aiReady.changedFiles}개 파일)`,
          '',
          '변경 파일 목록:',
          fileList,
          '',
          '파일별 요약:',
          summaryText,
        ].join('\n'),
      },
    ],
    { maxTokens: 600 }
  )

  return parseAIJson(
    raw,
    { overallSummary: `PR #${aiReady.prNumber} 분석 완료`, keyChanges: [], reviewPoints: [] },
    'PRSummarizer'
  )
}

// ── 메인 진입점 ───────────────────────────────────────────────────────────

// PR 요약 파이프라인:
//   1. chunks를 파일명 기준으로 그룹핑
//   2. 파일별 요약 병렬 생성 (Promise.all — 독립 호출이므로 순서 무관)
//   3. 전체 PR 요약 생성
export async function summarizePR(aiReady: AIReadyDiff): Promise<PRSummaryResult> {
  // chunks → Map<filename, DiffChunk[]>
  const chunksByFile = new Map<string, DiffChunk[]>()
  for (const chunk of aiReady.chunks) {
    const arr = chunksByFile.get(chunk.filename) ?? []
    arr.push(chunk)
    chunksByFile.set(chunk.filename, arr)
  }

  const metaByFile = new Map(
    aiReady.fileSummaries.map(f => [
      f.filename,
      { status: f.status, additions: f.additions, deletions: f.deletions },
    ])
  )

  // 파일별 요약 병렬 생성
  const fileSummaries = await Promise.all(
    Array.from(chunksByFile.entries()).map(([filename, chunks]) =>
      summarizeFile(
        filename,
        chunks,
        metaByFile.get(filename) ?? { status: 'modified', additions: 0, deletions: 0 }
      )
    )
  )

  const overall = await generatePRSummary(aiReady, fileSummaries)

  return {
    prNumber: aiReady.prNumber,
    repository: aiReady.repository,
    title: aiReady.title,
    author: aiReady.author,
    overallSummary: overall.overallSummary,
    keyChanges: overall.keyChanges,
    fileSummaries,
    reviewPoints: overall.reviewPoints,
    generatedAt: new Date().toISOString(),
  }
}

