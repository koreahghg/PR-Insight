import { parsePRUrl } from './prFetcher'

describe('parsePRUrl', () => {
  it('표준 GitHub PR URL을 파싱한다', () => {
    expect(parsePRUrl('https://github.com/owner/repo/pull/123')).toEqual({
      owner: 'owner',
      repo: 'repo',
      prNumber: 123,
    })
  })

  it('하이픈이 포함된 레포 이름을 파싱한다', () => {
    expect(parsePRUrl('https://github.com/my-org/my-repo/pull/456')).toEqual({
      owner: 'my-org',
      repo: 'my-repo',
      prNumber: 456,
    })
  })

  it('URL에 추가 경로가 있어도 파싱한다', () => {
    expect(parsePRUrl('https://github.com/owner/repo/pull/42/files')).toEqual({
      owner: 'owner',
      repo: 'repo',
      prNumber: 42,
    })
  })

  it('GitLab URL에는 null을 반환한다', () => {
    expect(parsePRUrl('https://gitlab.com/owner/repo/merge_requests/1')).toBeNull()
  })

  it('이슈 URL에는 null을 반환한다', () => {
    expect(parsePRUrl('https://github.com/owner/repo/issues/123')).toBeNull()
  })

  it('빈 문자열에는 null을 반환한다', () => {
    expect(parsePRUrl('')).toBeNull()
  })

  it('불완전한 URL에는 null을 반환한다', () => {
    expect(parsePRUrl('https://github.com/owner')).toBeNull()
  })
})
