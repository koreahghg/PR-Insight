import { PRFile, FileStatus } from '../github/types'

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
  addedLines: string[]
  removedLines: string[]
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
  const lines = patch.split('\n')
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
      currentHunk = {
        header: line,
        oldStart,
        newStart,
        lines: [],
        addedLines: [],
        removedLines: [],
      }
      continue
    }

    if (!currentHunk) continue

    if (line.startsWith('+')) {
      const content = line.slice(1)
      currentHunk.lines.push({ type: 'added', content, oldLineNum: null, newLineNum })
      currentHunk.addedLines.push(content)
      newLineNum++
    } else if (line.startsWith('-')) {
      const content = line.slice(1)
      currentHunk.lines.push({ type: 'removed', content, oldLineNum, newLineNum: null })
      currentHunk.removedLines.push(content)
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
