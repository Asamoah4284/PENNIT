import mongoose from 'mongoose'

const savedWorkSchema = new mongoose.Schema(
  {
    workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  {
    timestamps: true,
  }
)

savedWorkSchema.index({ workId: 1, userId: 1 }, { unique: true })

export default mongoose.model('SavedWork', savedWorkSchema)

