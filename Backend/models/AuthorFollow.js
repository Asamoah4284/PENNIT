import mongoose from 'mongoose'

const authorFollowSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  {
    timestamps: true,
  }
)

authorFollowSchema.index({ authorId: 1, followerId: 1 }, { unique: true })

export default mongoose.model('AuthorFollow', authorFollowSchema)

