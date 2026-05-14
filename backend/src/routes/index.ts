import { Router } from 'express'
import healthRouter from './health'
import { webhookRouter } from '../webhooks/router'

const router = Router()

router.use('/health', healthRouter)
router.use('/webhooks', webhookRouter)

export default router
