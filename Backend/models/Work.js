import mongoose from 'mongoose'

/**
 * Reusable sub-schema for a single content field translated into all four
 * supported languages. Stored inside Work.translations.
 */
const perFieldSchema = new mongoose.Schema(
  {
    en:  { type: String, default: '' },
    twi: { type: String, default: '' },
    ga:  { type: String, default: '' },
    ewe: { type: String, default: '' },
  },
  { _id: false }
)

/**
 * Holds pre-computed translations generated at publish time via OpenAI.
 * Keyed by field name (title, excerpt, body); each field stores all four
 * language variants so readers never need to call the AI at read time.
 */
const translationsSchema = new mongoose.Schema(
  {
    title:   { type: perFieldSchema, default: () => ({}) },
    excerpt: { type: perFieldSchema, default: () => ({}) },
    body:    { type: perFieldSchema, default: () => ({}) },
  },
  { _id: false }
)

const workSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    authorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
    category:    { type: String, required: true, enum: ['short_story', 'poem', 'novel'] },
    genre:       { type: String, required: true },
    excerpt:     { type: String, default: '' },
    body:        { type: String, required: true },
    readCount:   { type: Number, default: 0 },
    thumbnailUrl:{ type: String, default: '' },
    status:      { type: String, enum: ['draft', 'pending', 'published'], default: 'pending' },
    clapCount:   { type: Number, default: 0 },
    commentCount:{ type: Number, default: 0 },
    saveCount:   { type: Number, default: 0 },
    shareCount:  { type: Number, default: 0 },
    topics:      { type: [String], default: [] },

    /** Language the writer authored the content in. */
    language: { type: String, enum: ['en', 'tw', 'ga', 'ee'], default: 'en' },

    /**
     * Pre-computed translations. Populated once when the work is first published.
     * Each nested field holds all four language variants of that text.
     */
    translations: { type: translationsSchema, default: () => ({}) },

    /**
     * Subscriber-only early-access window.
     * Set at publish time to (now + EARLY_ACCESS_HOURS). While this date is in the
     * future, only subscribed readers can view the full content. After it passes, all
     * readers can access it (unless it is also marked featured/editorsPick).
     */
    earlyAccessUntil: { type: Date, default: null },

    /**
     * Editor-curated badges. Featured and Editor's Pick pieces are permanently
     * subscriber-only regardless of the early-access window.
     */
    featured:     { type: Boolean, default: false },
    editorsPick:  { type: Boolean, default: false },
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
