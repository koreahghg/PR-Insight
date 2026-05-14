import express from 'express'
import cors from 'cors'
import router from './routes'

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' }))
// express.json()을 전역으로 두면 express.raw()가 필요한 webhook route에서 body가 이미 소비됨
// 각 route에서 필요한 body parser를 직접 등록한다
app.use('/api', router)

export default app
