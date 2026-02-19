import mongoose from 'mongoose'

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amountGhc: { type: Number, required: true, min: 0 },
    billingInterval: { type: String, enum: ['monthly'], default: 'monthly' },
    currency: { type: String, enum: ['GHC'], default: 'GHC' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema)
