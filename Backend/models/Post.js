import mongoose from 'mongoose'

const ESTIMATED_WORDS_PER_MINUTE = 200

/**
 * Calculate estimated reading time in minutes based on word count.
 * Rounds up to the nearest whole minute, with a minimum of 1 minute for non-empty content.
 * @param {string} content
 * @returns {number}
 */
function calculateEstimatedReadTime(content) {
  if (!content || typeof content !== 'string') return 0
  const words = content.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  const minutes = words.length / ESTIMATED_WORDS_PER_MINUTE
  return Math.max(1, Math.ceil(minutes))
}

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
    viewCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    estimatedReadTime: { type: Number, default: 0 }, // in minutes
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.author = ret.author?.toString?.() ?? ret.author
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

postSchema.pre('save', function preSave(next) {
  if (this.isModified('content')) {
    this.estimatedReadTime = calculateEstimatedReadTime(this.content)
  }
  next()
})

export default mongoose.model('Post', postSchema)

