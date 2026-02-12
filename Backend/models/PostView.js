import mongoose from 'mongoose'

const postViewSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    ipAddress: { type: String, required: true, index: true },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    timeSpent: { type: Number, default: 0, min: 0 }, // in seconds
    countedAsRead: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
)

postViewSchema.index({ postId: 1, userId: 1, ipAddress: 1, createdAt: -1 })
postViewSchema.index({ postId: 1, userId: 1, countedAsRead: 1, createdAt: -1 })
postViewSchema.index({ postId: 1, ipAddress: 1, countedAsRead: 1, createdAt: -1 })

export default mongoose.model('PostView', postViewSchema)

