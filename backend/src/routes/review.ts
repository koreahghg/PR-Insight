import { Router, Request, Response } from 'express'
import express from 'express'
import { GitHubApiError } from '../github/client'
import { parsePRUrl, fetchPR } from '../github/prFetcher'
import { analyzeDiff } from '../pr/diffAnalyzer'
import { reviewPR } from '../ai/prReviewer'

const router = Router()

router.post('/', express.json(), async (req: Request, res: Response) => {
  const { prUrl } = req.body

  if (!prUrl || typeof prUrl !== 'string' || prUrl.trim().length === 0) {
    res.status(400).json({ error: 'prUrl을 입력해주세요.' })
    return
  }

  const parsed = parsePRUrl(prUrl.trim())
  if (!parsed) {
    res.status(400).json({
      error: '유효한 GitHub PR URL을 입력해주세요. (예: https://github.com/owner/repo/pull/123)',
    })
    return
  }

  try {
    const pr = await fetchPR(parsed.owner, parsed.repo, parsed.prNumber)
    const aiReady = analyzeDiff(pr)
    const result = await reviewPR(aiReady)
    res.json(result)
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 404) {
        res.status(404).json({ error: 'PR을 찾을 수 없습니다. URL을 확인해주세요.' })
        return
      }
      res.status(502).json({ error: `GitHub API 오류가 발생했습니다. (${err.status})` })
      return
    }

    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    if (message.includes('GITHUB_TOKEN')) {
      res.status(500).json({ error: 'GitHub 토큰이 설정되지 않았습니다.' })
      return
    }

    console.error('[ReviewRoute]', err)
    res.status(500).json({ error: 'PR 리뷰 중 오류가 발생했습니다.' })
  }
})

export default router
