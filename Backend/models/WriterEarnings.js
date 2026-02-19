import mongoose from 'mongoose'

const writerEarningsSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    month: { type: String, required: true, index: true }, // e.g. '2026-02'
    points: { type: Number, required: true, min: 0 },
    pointValue: { type: Number, required: true, min: 0 },
    amountGhc: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['calculated', 'paid'], default: 'calculated', index: true },
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

writerEarningsSchema.index({ authorId: 1, month: 1 }, { unique: true })

export default mongoose.model('WriterEarnings', writerEarningsSchema)
