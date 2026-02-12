/**
 * Remove works that have placeholder/lorem content (e.g. "International Optimization Analyst").
 * Run: node scripts/cleanup-placeholder-works.js
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import Work from '../models/Work.js'

// Titles or excerpts that indicate placeholder/lorem content
const PLACEHOLDER_TITLE_PATTERNS = [
  /optimization\s+(analyst|technician|agent)/i,
  /(product|international|central)\s+\w+\s+(analyst|technician|agent)/i,
  /^[\w\s]+(analyst|technician|agent)$/i,
]
const PLACEHOLDER_TEXT_PATTERNS = [
  /facilis\s+sapiente/i,
  /eveniet\s+aliquid\s+mollitia/i,
  /lorem\s+ipsum/i,
  /doloremque\s+ullam/i,
]

function isPlaceholder(work) {
  const title = (work.title || '').trim()
  const excerpt = (work.excerpt || '').trim()
  const body = (work.body || '').trim().slice(0, 200)
  const combined = `${title} ${excerpt} ${body}`.toLowerCase()

  if (PLACEHOLDER_TITLE_PATTERNS.some((re) => re.test(title))) return true
  if (PLACEHOLDER_TEXT_PATTERNS.some((re) => re.test(combined))) return true
  return false
}

async function cleanup() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pennit'
  await mongoose.connect(uri)
  console.log('Connected to MongoDB')

  const all = await Work.find().lean()
  const toDelete = all.filter(isPlaceholder)

  if (toDelete.length === 0) {
    console.log('No placeholder works found.')
    await mongoose.disconnect()
    process.exit(0)
    return
  }

  const ids = toDelete.map((w) => w._id)
  const result = await Work.deleteMany({ _id: { $in: ids } })
  console.log(`Deleted ${result.deletedCount} placeholder work(s):`)
  toDelete.forEach((w) => console.log(`  - ${w.title} (${w._id})`))

  await mongoose.disconnect()
  console.log('Done.')
  process.exit(0)
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
