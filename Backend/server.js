import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db.js'
import worksRouter from './routes/works.js'
import authorsRouter from './routes/authors.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'
import postsRouter from './routes/posts.js'
import { clientIpMiddleware } from './middleware/clientIp.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 3000

async function start() {
  try {
    console.log('[PENNIT] Connecting to database…')
    await connectDB()
    console.log('[PENNIT] MongoDB connected.')
  } catch (err) {
    console.error('[PENNIT] Startup failed: MongoDB connection error.', err?.message || err)
    process.exit(1)
  }

  app.use(cors())
  app.use(express.json())
  app.use(clientIpMiddleware)

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
  app.use('/api/works', worksRouter)
  app.use('/api/authors', authorsRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/upload', uploadRouter)
  app.use('/api/posts', postsRouter)

  app.get('/', (req, res) => {
    res.json({ name: 'PENNIT API', health: '/api/health', docs: 'Use /api/works, /api/authors, /api/auth, etc.' })
  })

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'PENNIT API is running' })
  })

  app.use((err, req, res, next) => {
    console.error('[PENNIT] Error:', err.stack)
    res.status(500).json({ error: 'Something went wrong' })
  })

  app.listen(PORT, () => {
    console.log(`[PENNIT] Server listening on port ${PORT}`)
  }).on('error', (err) => {
    console.error('[PENNIT] Server failed to start:', err.message)
    process.exit(1)
  })
}

start()
