import mongoose from 'mongoose'

const workHighlightSchema = new mongoose.Schema(
    {
        workId: { type: mongoose.Schema.Types.ObjectId, ref: 'Work', required: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        text: { type: String, required: true },
        color: { type: String, default: 'yellow' }, // Optional: support multiple colors
        note: { type: String, default: '' }, // Optional: permit users to add notes to highlights
    },
    {
        timestamps: true,
    }
)

export default mongoose.model('WorkHighlight', workHighlightSchema)
