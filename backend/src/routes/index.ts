import { Router } from 'express'
import healthRouter from './health'
import { webhookRouter } from '../webhooks/router'
import refactorRouter from './refactor'
import reviewRouter from './review'

const router = Router()

router.use('/health', healthRouter)
router.use('/webhooks', webhookRouter)
router.use('/refactor', refactorRouter)
router.use('/review', reviewRouter)

export default router
