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
const PORT = process.env.PORT || 3000

await connectDB()

app.use(cors())
app.use(express.json())
app.use(clientIpMiddleware)

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api/works', worksRouter)
app.use('/api/authors', authorsRouter)
app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/posts', postsRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PENNIT API is running' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
}).on('error', (err) => {
  console.error('Server failed to start:', err.message)
  process.exit(1)
})
