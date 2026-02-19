import mongoose from 'mongoose'

const workReadSchema = new mongoose.Schema(
  {
    workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    ipAddress: { type: String, required: true, index: true },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    timeSpent: { type: Number, default: 0, min: 0 }, // seconds
    countedAsRead: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
)

workReadSchema.index({ workId: 1, userId: 1, ipAddress: 1, createdAt: -1 })
workReadSchema.index({ workId: 1, userId: 1, countedAsRead: 1, createdAt: -1 })
workReadSchema.index({ workId: 1, ipAddress: 1, countedAsRead: 1, createdAt: -1 })

export default mongoose.model('WorkRead', workReadSchema)
