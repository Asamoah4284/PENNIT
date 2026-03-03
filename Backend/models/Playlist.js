import mongoose from 'mongoose'

/**
 * A named, ordered reading playlist owned by a single subscriber-level user.
 * Works are stored as an ordered array of ObjectId references so clients can
 * retrieve them in the original sequence.
 */
const playlistSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:        { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 280 },
    workIds:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Work' }],
    isPrivate:   { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.userId = ret.userId?.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

export default mongoose.model('Playlist', playlistSchema)
