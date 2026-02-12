import mongoose from 'mongoose'

/**
 * Connect to MongoDB using the connection string from environment.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pennit'
  try {
    await mongoose.connect(uri)
    console.log('MongoDB connected successfully')
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  }
}
