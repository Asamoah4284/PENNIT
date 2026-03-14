import mongoose from 'mongoose'

/**
 * Single-document app config (monetization, etc.).
 * Document id is fixed as 'global'; create it on first use.
 */
const appConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'global' },
    /** When true, subscription/paywall and writer earnings are active. Toggled by admin. */
    monetizationEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('AppConfig', appConfigSchema)
