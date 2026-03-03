import mongoose from 'mongoose'

/**
 * Aggregated preference profile for a single user, rebuilt from their full
 * UserPostInteraction history whenever a new interaction is recorded.
 *
 * One document per user (upserted). The document is a materialised view — it
 * can always be deleted and rebuilt from scratch using rebuildUserPreferences().
 *
 * Example:
 * {
 *   userId: "123",
 *   preferredLanguages: ["tw", "en"],
 *   favoriteCategories: ["poem", "short_story"],
 *   favoriteAuthors: [ObjectId("author1")],
 *   engagementByCategory: { poem: 42, short_story: 18 },
 *   engagementByLanguage:  { tw: 38, en: 22 },
 *   engagementByAuthor:    { "author1": 28 },
 *   activeHours:           { "22": 14, "7": 8 },
 * }
 */
const userPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    /**
     * Ordered list of categories, most-engaged first.
     * ["poem", "short_story", "novel"]
     */
    favoriteCategories: { type: [String], default: [] },

    /**
     * Ordered list of language codes, most-engaged first.
     * ["tw", "en"]
     */
    preferredLanguages: { type: [String], default: [] },

    /**
     * Ordered list of author ObjectIds, most-engaged first (top 20).
     */
    favoriteAuthors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Author' }],

    /**
     * Aggregated engagement score per work category.
     * { "poem": 42, "short_story": 18 }
     */
    engagementByCategory: { type: Map, of: Number, default: {} },

    /**
     * Aggregated engagement score per language code.
     * { "tw": 38, "en": 22 }
     */
    engagementByLanguage: { type: Map, of: Number, default: {} },

    /**
     * Aggregated engagement score per author (authorId string as key).
     * { "68abc...": 28 }
     */
    engagementByAuthor: { type: Map, of: Number, default: {} },

    /**
     * Interaction counts bucketed by hour-of-day (string keys "0"–"23").
     * Used to detect time-based reading patterns.
     * { "22": 14, "7": 8 }
     */
    activeHours: { type: Map, of: Number, default: {} },

    /** ISO date of last full rebuild. */
    lastRecalculated: { type: Date, default: null },
  },
  { timestamps: true }
)

export default mongoose.model('UserPreferences', userPreferencesSchema)
