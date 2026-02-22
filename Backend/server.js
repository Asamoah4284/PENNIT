import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db.js'
import configRouter from './routes/config.js'
import worksRouter from './routes/works.js'
import authorsRouter from './routes/authors.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'
import postsRouter from './routes/posts.js'
import subscriptionsRouter from './routes/subscriptions.js'
import earningsRouter from './routes/earnings.js'
import writerStatsRouter from './routes/writerStats.js'
import readerStatsRouter from './routes/readerStats.js'
import usersRouter from './routes/users.js'
import adminRouter from './routes/admin.js'
import { clientIpMiddleware } from './middleware/clientIp.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 3000

/** Health check */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PENNIT API is running' })
})

/** CORS configuration */
const allowedOrigins = [
  'http://localhost:5173',    // Vite dev server
  'http://127.0.0.1:5173',
  'https://pennit.io',        // Production frontend
  'https://www.pennit.io'
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true) // Allow tools like Postman or server-to-server requests
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true, // Allow cookies, Authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  optionsSuccessStatus: 204
}))

// Preflight requests handler
app.options('*', cors())

/** Middlewares */
app.use(express.json())
app.use(clientIpMiddleware)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

/** API routes */
app.use('/api/config', configRouter)
app.use('/api/works', worksRouter)
app.use('/api/authors', authorsRouter)
app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/posts', postsRouter)
app.use('/api/subscriptions', subscriptionsRouter)
app.use('/api/earnings', earningsRouter)
app.use('/api/writers', writerStatsRouter)
app.use('/api/readers', readerStatsRouter)
app.use('/api/users', usersRouter)
app.use('/api/victor-access-control', adminRouter)

/** Root route */
app.get('/', (req, res) => {
  res.json({ 
    name: 'PENNIT API', 
    health: '/api/health', 
    docs: 'Use /api/works, /api/authors, /api/auth, etc.' 
  })
})

/** Global error handler */
app.use((err, req, res, next) => {
  console.error('[PENNIT] Error:', err?.message || err)
  res.status(500).json({ error: err?.message || 'Something went wrong' })
})

/** Start server */
async function start() {
  console.log('[PENNIT] Starting…')
  try {
    console.log('[PENNIT] Connecting to MongoDB...')
    await connectDB()
    console.log('[PENNIT] MongoDB connection established.')
  } catch (err) {
    console.error('[PENNIT] Startup failed: database connection error.')
    console.error('[PENNIT] Connection details:', err.message)
    process.exit(1)
  }

  const server = app.listen(PORT, () => {
    console.log(`[PENNIT] Server listening on port ${PORT}`)
  })

  server.on('error', (err) => {
    console.error('[PENNIT] Server failed to start:', err?.message || err)
    process.exit(1)
  })
}

start().catch((err) => {
  console.error('[PENNIT] Fatal:', err?.message || err)
  process.exit(1)
})