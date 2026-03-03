import mongoose from 'mongoose'

/**
 * planType: 'reader' = full reader (GHC 9.99, can tip); 'writer' = writer premium (GHC 4.99, featured + save/playlist).
 */
const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    planType: { type: String, enum: ['reader', 'writer'], default: 'reader' },
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
