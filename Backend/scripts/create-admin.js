import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import { connectDB } from '../config/db.js'

const name = process.argv[2]
const email = process.argv[3]
const password = process.argv[4]

if (!name || !email || !password) {
    console.log('Usage: node scripts/create-admin.js "Admin Name" admin@email.com password123')
    process.exit(1)
}

async function start() {
    try {
        await connectDB()

        // Check if user already exists
        let user = await User.findOne({ email: email.toLowerCase().trim() })

        if (user) {
            console.log(`User with email ${email} already exists. Updating role to admin...`)
            user.role = 'admin'
            await user.save()
            console.log('Success! Existing user promoted to admin.')
        } else {
            console.log(`Creating new admin account: ${email}...`)
            user = await User.create({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password: password, // The User model has a pre-save hook to hash this
                role: 'admin'
            })
            console.log('Success! New admin account created.')
        }

        process.exit(0)
    } catch (err) {
        console.error('Error:', err.message)
        process.exit(1)
    }
}

start()
