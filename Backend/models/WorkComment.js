import mongoose from 'mongoose'

const workCommentSchema = new mongoose.Schema(
  {
    workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', default: null, index: true },
    content: { type: String, required: true, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkComment', default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.workId = ret.workId?.toString()
        ret.userId = ret.userId?.toString()
        ret.authorId = ret.authorId?.toString() ?? null
        ret.parentId = ret.parentId?.toString?.() ?? null
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

export default mongoose.model('WorkComment', workCommentSchema)

