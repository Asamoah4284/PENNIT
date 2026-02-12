import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, unique: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    password: { type: String, required: true },
    role: { type: String, enum: ['reader', 'writer'], default: 'reader' },
    penName: { type: String, default: '' },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id.toString()
        ret.authorId = ret.authorId?.toString() ?? null
        delete ret._id
        delete ret.__v
        delete ret.password
        return ret
      },
    },
  }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

export default mongoose.model('User', userSchema)
