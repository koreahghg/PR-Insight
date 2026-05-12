import express from 'express'
import cors from 'cors'
import router from './routes'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }))
app.use(express.json())
app.use('/api', router)

export default app
