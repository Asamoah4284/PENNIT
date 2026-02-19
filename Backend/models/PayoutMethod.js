import mongoose from 'mongoose'

const payoutMethodSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    type: { type: String, enum: ['bank', 'mobile_money'], required: true },
    bankCode: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountName: { type: String, default: '' },
    mobileMoneyNumber: { type: String, default: '' },
    mobileMoneyProvider: { type: String, default: '' },
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

payoutMethodSchema.index({ authorId: 1 }, { unique: true })

export default mongoose.model('PayoutMethod', payoutMethodSchema)
