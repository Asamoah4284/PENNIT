import mongoose from 'mongoose'

/**
 * Captures a user's full engagement record with a single work.
 * One document per (userId, workId) pair — upserted on every interaction event.
 *
 * Fields are accumulated across sessions:
 *   readTime   → $max (best session, not cumulative, to avoid inflation)
 *   liked / commented / shared → once true, stay true
 *   engagementScore → recomputed on every upsert
 */
const userPostInteractionSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
    workId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Work',   required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', default: null,  index: true },

    /** Work category at time of interaction (denormalised for fast aggregation). */
    category: { type: String, default: '', index: true },

    /** Work genre (denormalised). */
    genre: { type: String, default: '' },

    /** Language the user was reading the work in (may differ from work.language when translated). */
    language: { type: String, default: 'en', index: true },

    /** Cumulative seconds the user spent reading in their best session (capped to avoid outliers). */
    readTime:  { type: Number, default: 0, min: 0 },

    /** Whether the user clapped/liked this work. */
    liked: { type: Boolean, default: false },

    /** Whether the user left a comment. */
    commented: { type: Boolean, default: false },

    /** Whether the user shared this work externally. */
    shared: { type: Boolean, default: false },

    /**
     * Composite engagement score, recomputed on every write.
     * Formula: (readTime * 0.4) + (liked * 3) + (commented * 5) + (shared * 6)
     */
    engagementScore: { type: Number, default: 0, index: true },

    /** Hour of day (0–23) when this interaction was last updated. Used for time-pattern detection. */
    hourOfDay: { type: Number, default: 0, min: 0, max: 23 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        ret.id       = ret._id.toString()
        ret.userId   = ret.userId?.toString?.()   ?? ret.userId
        ret.workId   = ret.workId?.toString?.()   ?? ret.workId
        ret.authorId = ret.authorId?.toString?.() ?? null
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// Unique index — one record per user-work pair
userPostInteractionSchema.index({ userId: 1, workId: 1 }, { unique: true })

// Feed aggregation: score breakdown per user by category / language / author
userPostInteractionSchema.index({ userId: 1, category: 1, engagementScore: -1 })
userPostInteractionSchema.index({ userId: 1, language: 1, engagementScore: -1 })
userPostInteractionSchema.index({ userId: 1, authorId: 1, engagementScore: -1 })

export default mongoose.model('UserPostInteraction', userPostInteractionSchema)
