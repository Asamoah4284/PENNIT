import mongoose from 'mongoose'

/**
 * Connect to MongoDB using MONGODB_URI from environment.
 * Logs success; on failure logs error and throws so caller can exit.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    const err = new Error('MONGODB_URI is not set')
    console.error('[PENNIT] MongoDB:', err.message)
    throw err
  }
  try {
    await mongoose.connect(uri)
    console.log('[PENNIT] MongoDB connected successfully')
  } catch (err) {
    console.error('[PENNIT] MongoDB connection failed:', err?.message || err)
    throw err
  }
}
