import { ParsedPR, PRFile, FileStatus } from '../github/types'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DiffLine {
  type: 'added' | 'removed' | 'context'
  content: string
  oldLineNum: number | null
  newLineNum: number | null
}

export interface DiffHunk {
  header: string
  oldStart: number
  newStart: number
  lines: DiffLine[]
}

export interface AnalyzedFileDiff {
  filename: string
  status: FileStatus
  additions: number
  deletions: number
  previousFilename: string | null
  hunks: DiffHunk[]
  hasPatch: boolean
}

export interface FileSummary {
  filename: string
  status: FileStatus
  additions: number
  deletions: number
  previousFilename: string | null
}

export interface DiffChunk {
  filename: string
  chunkIndex: number
  totalChunks: number
  content: string
}

export interface AIReadyDiff {
  repository: string
  prNumber: number
  title: string
  author: string
  baseBranch: string
  headBranch: string
  totalAdditions: number
  totalDeletions: number
  changedFiles: number
  fileSummaries: FileSummary[]
  chunks: DiffChunk[]
}

// ── Patch Parser ───────────────────────────────────────────────────────────

function parseHunkHeader(header: string): { oldStart: number; newStart: number } {
  const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(header)
  if (!match) return { oldStart: 1, newStart: 1 }
  return { oldStart: parseInt(match[1], 10), newStart: parseInt(match[2], 10) }
}

export function parsePatch(patch: string): DiffHunk[] {
  const lines = patch.split(/\r?\n/)
  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null
  let oldLineNum = 0
  let newLineNum = 0

  for (const line of lines) {
    if (line.startsWith('@@')) {
      if (currentHunk) hunks.push(currentHunk)
      const { oldStart, newStart } = parseHunkHeader(line)
      oldLineNum = oldStart
      newLineNum = newStart
      currentHunk = { header: line, oldStart, newStart, lines: [] }
      continue
    }

    if (!currentHunk) continue

    if (line.startsWith('+')) {
      currentHunk.lines.push({ type: 'added', content: line.slice(1), oldLineNum: null, newLineNum })
      newLineNum++
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({ type: 'removed', content: line.slice(1), oldLineNum, newLineNum: null })
      oldLineNum++
    } else if (line.startsWith(' ')) {
      const content = line.slice(1)
      currentHunk.lines.push({ type: 'context', content, oldLineNum, newLineNum })
      oldLineNum++
      newLineNum++
    }
    // '\\ No newline at end of file' 라인은 의도적으로 무시
  }

  if (currentHunk) hunks.push(currentHunk)
  return hunks
}

// ── File Analyzer ──────────────────────────────────────────────────────────

export function analyzeFile(file: PRFile): AnalyzedFileDiff {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    previousFilename: file.previousFilename,
    hunks: file.patch ? parsePatch(file.patch) : [],
    hasPatch: file.patch !== null,
  }
}

// ── Chunker & Formatter ────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 3000

function formatHunk(hunk: DiffHunk): string {
  const lineTexts = hunk.lines.map(line => {
    const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '
    return `${prefix}${line.content}`
  })
  return [hunk.header, ...lineTexts].join('\n')
}

function buildFileHeader(file: AnalyzedFileDiff, continued = false): string {
  const rename = file.previousFilename ? ` (renamed from ${file.previousFilename})` : ''
  const suffix = continued ? ' [continued]' : ''
  return `### ${file.filename}${rename}${suffix}\nStatus: ${file.status} | +${file.additions} -${file.deletions}`
}

function splitIntoChunks(file: AnalyzedFileDiff, chunkSize: number): string[] {
  const header = buildFileHeader(file)

  if (!file.hasPatch || file.hunks.length === 0) {
    return [`${header}\n(no diff available)`]
  }

  const chunks: string[] = []
  let current = `${header}\n`

  for (const hunk of file.hunks) {
    const hunkText = `${formatHunk(hunk)}\n`

    if (hunkText.length > chunkSize) {
      console.warn(`[DiffAnalyzer] hunk exceeds chunkSize (${hunkText.length} > ${chunkSize}): ${file.filename} ${hunk.header}`)
    }

    // 현재 청크가 헤더만 있는 초기 상태가 아닐 때만 분리
    if (current.length + hunkText.length > chunkSize && current.length > header.length + 1) {
      chunks.push(current.trimEnd())
      current = `${buildFileHeader(file, true)}\n${hunkText}`
    } else {
      current += hunkText
    }
  }

  if (current.trim()) chunks.push(current.trimEnd())
  return chunks
}

// ── Main Entry ─────────────────────────────────────────────────────────────

export function analyzeDiff(parsed: ParsedPR, chunkSize = DEFAULT_CHUNK_SIZE): AIReadyDiff {
  const analyzedFiles = parsed.files.map(analyzeFile)

  const fileSummaries: FileSummary[] = analyzedFiles.map(f => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    previousFilename: f.previousFilename,
  }))

  const chunks: DiffChunk[] = analyzedFiles.flatMap(file => {
    const parts = splitIntoChunks(file, chunkSize)
    return parts.map((content, i) => ({
      filename: file.filename,
      chunkIndex: i,
      totalChunks: parts.length,
      content,
    }))
  })

  return {
    repository: parsed.repositoryFullName,
    prNumber: parsed.number,
    title: parsed.title,
    author: parsed.author,
    baseBranch: parsed.baseRef,
    headBranch: parsed.headRef,
    totalAdditions: parsed.files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: parsed.files.reduce((sum, f) => sum + f.deletions, 0),
    changedFiles: parsed.files.length,
    fileSummaries,
    chunks,
  }
}
