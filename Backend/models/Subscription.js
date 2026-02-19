import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
      default: 'active',
      index: true,
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    externalSubscriptionId: { type: String, default: '', index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.userId = ret.userId?.toString?.() ?? ret.userId
        ret.planId = ret.planId?.toString?.() ?? ret.planId
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

subscriptionSchema.index({ userId: 1, status: 1 })

export default mongoose.model('Subscription', subscriptionSchema)
