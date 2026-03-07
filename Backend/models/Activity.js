import mongoose from 'mongoose'

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.userId = ret.userId?.toString?.() ?? ret.userId
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

activitySchema.index({ createdAt: -1 })
activitySchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('Activity', activitySchema)
