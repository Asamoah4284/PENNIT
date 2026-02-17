import mongoose from 'mongoose'

/**
 * Connect to MongoDB using the connection string from environment.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pennit'
  await mongoose.connect(uri)
}
