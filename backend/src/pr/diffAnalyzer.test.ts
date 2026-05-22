import { parsePatch, analyzeFile, analyzeDiff } from './diffAnalyzer'
import type { PRFile, ParsedPR } from '../github/types'

describe('parsePatch', () => {
  it('added/removed/context 라인을 올바르게 파싱한다', () => {
    const patch = `@@ -1,3 +1,3 @@
 line1
-old
+new
 line3`

    const hunks = parsePatch(patch)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].lines).toHaveLength(4)
    expect(hunks[0].lines[0]).toMatchObject({ type: 'context', content: 'line1' })
    expect(hunks[0].lines[1]).toMatchObject({ type: 'removed', content: 'old' })
    expect(hunks[0].lines[2]).toMatchObject({ type: 'added', content: 'new' })
    expect(hunks[0].lines[3]).toMatchObject({ type: 'context', content: 'line3' })
  })

  it('빈 패치는 빈 배열을 반환한다', () => {
    expect(parsePatch('')).toHaveLength(0)
  })

  it('여러 hunk를 파싱한다', () => {
    const patch = `@@ -1,2 +1,2 @@
 ctx
-old1
+new1
@@ -10,2 +10,2 @@
 ctx2
-old2
+new2`

    const hunks = parsePatch(patch)
    expect(hunks).toHaveLength(2)
    expect(hunks[0].oldStart).toBe(1)
    expect(hunks[1].oldStart).toBe(10)
  })

  it('hunk 헤더에서 라인 번호를 파싱한다', () => {
    const patch = `@@ -5,3 +7,3 @@
 ctx
-old
+new`

    const hunks = parsePatch(patch)
    expect(hunks[0].oldStart).toBe(5)
    expect(hunks[0].newStart).toBe(7)
  })
})

describe('analyzeFile', () => {
  it('patch가 있는 파일을 분석한다', () => {
    const file: PRFile = {
      filename: 'src/index.ts',
      status: 'modified',
      additions: 1,
      deletions: 1,
      patch: '@@ -1,1 +1,1 @@\n-old\n+new',
      previousFilename: null,
    }

    const result = analyzeFile(file)
    expect(result.filename).toBe('src/index.ts')
    expect(result.hasPatch).toBe(true)
    expect(result.hunks).toHaveLength(1)
    expect(result.additions).toBe(1)
    expect(result.deletions).toBe(1)
  })

  it('patch가 null인 파일은 hasPatch=false를 반환한다', () => {
    const file: PRFile = {
      filename: 'large_binary.bin',
      status: 'modified',
      additions: 0,
      deletions: 0,
      patch: null,
      previousFilename: null,
    }

    const result = analyzeFile(file)
    expect(result.hasPatch).toBe(false)
    expect(result.hunks).toHaveLength(0)
  })

  it('renamed 파일의 previousFilename을 유지한다', () => {
    const file: PRFile = {
      filename: 'src/new.ts',
      status: 'renamed',
      additions: 0,
      deletions: 0,
      patch: null,
      previousFilename: 'src/old.ts',
    }

    const result = analyzeFile(file)
    expect(result.previousFilename).toBe('src/old.ts')
  })
})

const MOCK_PR: ParsedPR = {
  title: 'feat: test',
  author: 'testuser',
  number: 42,
  repositoryFullName: 'owner/repo',
  baseRef: 'main',
  headRef: 'feature/test',
  headSha: 'abc123',
  htmlUrl: 'https://github.com/owner/repo/pull/42',
  body: null,
  files: [
    {
      filename: 'src/index.ts',
      status: 'modified',
      additions: 2,
      deletions: 1,
      patch: '@@ -1,1 +1,2 @@\n-old\n+new1\n+new2',
      previousFilename: null,
    },
  ],
}

describe('analyzeDiff', () => {
  it('PR을 AIReadyDiff 형식으로 변환한다', () => {
    const result = analyzeDiff(MOCK_PR)

    expect(result.prNumber).toBe(42)
    expect(result.repository).toBe('owner/repo')
    expect(result.author).toBe('testuser')
    expect(result.totalAdditions).toBe(2)
    expect(result.totalDeletions).toBe(1)
    expect(result.changedFiles).toBe(1)
    expect(result.fileSummaries).toHaveLength(1)
    expect(result.chunks).toHaveLength(1)
  })

  it('빈 파일 목록을 처리한다', () => {
    const result = analyzeDiff({ ...MOCK_PR, files: [] })

    expect(result.chunks).toHaveLength(0)
    expect(result.fileSummaries).toHaveLength(0)
    expect(result.totalAdditions).toBe(0)
    expect(result.totalDeletions).toBe(0)
  })

  it('chunk content에 파일명이 포함된다', () => {
    const result = analyzeDiff(MOCK_PR)
    expect(result.chunks[0].content).toContain('src/index.ts')
  })
})
