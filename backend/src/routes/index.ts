import { Router } from 'express'
import express from 'express'
import healthRouter from './health'
import { webhookRouter } from '../webhooks/router'
import refactorRouter from './refactor'
import reviewRouter from './review'

const router = Router()

// webhook은 express.raw()가 필요하므로 JSON 미들웨어를 전역으로 올릴 수 없음
// 대신 webhook을 제외한 라우트에 일괄 적용
const jsonParser = express.json({ limit: '1mb' })

router.use('/health', healthRouter)
router.use('/webhooks', webhookRouter)
router.use('/refactor', jsonParser, refactorRouter)
router.use('/review', jsonParser, reviewRouter)

export default router
