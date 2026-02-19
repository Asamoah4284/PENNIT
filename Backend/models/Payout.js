import mongoose from 'mongoose'

const payoutSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    month: { type: String, required: true, index: true },
    amountGhc: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending',
      index: true,
    },
    paidAt: { type: Date, default: null },
    reference: { type: String, default: '' },
    failureReason: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.authorId = ret.authorId?.toString?.() ?? ret.authorId
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

payoutSchema.index({ authorId: 1, month: 1 }, { unique: true })

export default mongoose.model('Payout', payoutSchema)
