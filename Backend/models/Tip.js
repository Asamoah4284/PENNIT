import mongoose from 'mongoose'

/**
 * A tip from a reader (subscriber on Reader plan) to a writer (author).
 * Only readers with an active Reader (GHC 9.99) subscription can tip.
 */
const tipSchema = new mongoose.Schema(
  {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toAuthorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', default: null, index: true },
    amountGhc: { type: Number, required: true, min: 0.01 },
    platformFeeGhc: { type: Number, default: 0, min: 0 },
    writerAmountGhc: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['completed', 'failed', 'refunded'], default: 'completed', index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.fromUserId = ret.fromUserId?.toString?.() ?? ret.fromUserId
        ret.toAuthorId = ret.toAuthorId?.toString?.() ?? ret.toAuthorId
        ret.workId = ret.workId?.toString?.() ?? ret.workId
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

export default mongoose.model('Tip', tipSchema)
