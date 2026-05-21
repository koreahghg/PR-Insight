import { Router, Request, Response } from 'express'
import { generateRefactorSuggestions } from '../ai/codeRefactorer'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  const { code, language, context } = req.body

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    res.status(400).json({ error: '코드를 입력해주세요.' })
    return
  }

  if (code.length > 20000) {
    res.status(400).json({ error: '코드가 너무 깁니다. 20,000자 이하로 입력해주세요.' })
    return
  }

  try {
    const result = await generateRefactorSuggestions(
      code,
      typeof language === 'string' ? language : undefined,
      typeof context === 'string' ? context : undefined
    )
    res.json(result)
  } catch (err) {
    console.error('[refactor] Error:', err)
    res.status(500).json({ error: 'AI 분석 중 오류가 발생했습니다.' })
  }
})

export default router
