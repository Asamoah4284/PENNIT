import mongoose from 'mongoose'

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    amountGhc: { type: Number, required: true, min: 0 },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true },
    status: { type: String, enum: ['succeeded', 'pending', 'failed', 'refunded'], default: 'pending', index: true },
    externalPaymentId: { type: String, default: '', index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.userId = ret.userId?.toString?.() ?? ret.userId
        ret.subscriptionId = ret.subscriptionId?.toString?.() ?? ret.subscriptionId
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

subscriptionPaymentSchema.index({ periodStart: 1, status: 1 })

export default mongoose.model('SubscriptionPayment', subscriptionPaymentSchema)
