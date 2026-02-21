import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import { connectDB } from '../config/db.js'

const email = process.argv[2]

if (!email) {
    console.error('Please provide an email address: node scripts/make-admin.js example@email.com')
    process.exit(1)
}

async function start() {
    try {
        await connectDB()
        const user = await User.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            { role: 'admin' },
            { new: true }
        )

        if (user) {
            console.log(`Success! User ${email} is now an admin.`)
        } else {
            console.error(`User with email ${email} not found.`)
        }
        process.exit(0)
    } catch (err) {
        console.error('Error:', err)
        process.exit(1)
    }
}

start()
