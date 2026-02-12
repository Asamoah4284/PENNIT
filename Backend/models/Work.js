import mongoose from 'mongoose'

const workSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
    category: { type: String, required: true, enum: ['short_story', 'poem', 'novel'] },
    genre: { type: String, required: true },
    excerpt: { type: String, default: '' },
    body: { type: String, required: true },
    readCount: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.authorId = ret.authorId?.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

export default mongoose.model('Work', workSchema)
