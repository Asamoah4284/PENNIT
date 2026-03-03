import mongoose from 'mongoose'

const workCommentLikeSchema = new mongoose.Schema(
  {
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkComment', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  {
    timestamps: true,
  }
)

workCommentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true })

export default mongoose.model('WorkCommentLike', workCommentLikeSchema)

