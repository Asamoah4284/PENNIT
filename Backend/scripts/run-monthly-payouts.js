/**
 * Process payouts for a given month: for each WriterEarnings with status 'calculated',
 * call payment provider transfer, create Payout record, update WriterEarnings to 'paid' on success.
 * Usage: node scripts/run-monthly-payouts.js 2026-02
 * Run only when MONETIZATION_ENABLED=true. Payout step is skipped when disabled.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import WriterEarnings from '../models/WriterEarnings.js'
import PayoutMethod from '../models/PayoutMethod.js'
import Payout from '../models/Payout.js'
import * as paymentProvider from '../services/paymentProvider.js'

const month = process.argv[2]
if (!month || !/^\d{4}-\d{2}$/.test(month)) {
  console.error('Usage: node scripts/run-monthly-payouts.js YYYY-MM')
  process.exit(1)
}

async function main() {
  if (process.env.MONETIZATION_ENABLED !== 'true') {
    console.log('Monetization disabled; skipping payouts.')
    process.exit(0)
  }

  await connectDB()

  const earnings = await WriterEarnings.find({ month, status: 'calculated' }).lean()
  for (const e of earnings) {
    if (e.amountGhc <= 0) continue

    const method = await PayoutMethod.findOne({ authorId: e.authorId }).lean()
    if (!method) {
      console.warn(`No payout method for author ${e.authorId}; skipping.`)
      continue
    }

    const existing = await Payout.findOne({ authorId: e.authorId, month })
    if (existing) {
      console.warn(`Payout already exists for author ${e.authorId} ${month}; skipping.`)
      continue
    }

    const payout = await Payout.create({
      authorId: e.authorId,
      month,
      amountGhc: e.amountGhc,
      status: 'processing',
    })

    try {
      const result = await paymentProvider.transferPayout({
        authorId: e.authorId,
        amountGhc: e.amountGhc,
        payoutMethod: method,
      })

      if (result.success) {
        payout.status = 'paid'
        payout.paidAt = new Date()
        payout.reference = result.reference || ''
        await payout.save()
        await WriterEarnings.updateOne(
          { _id: e._id },
          { $set: { status: 'paid' } }
        )
        console.log(`Paid author ${e.authorId} GH₵ ${e.amountGhc} (${result.reference})`)
      } else {
        payout.status = 'failed'
        payout.failureReason = result.failureReason || 'Unknown'
        await payout.save()
        console.warn(`Payout failed for author ${e.authorId}: ${payout.failureReason}`)
      }
    } catch (err) {
      payout.status = 'failed'
      payout.failureReason = err.message || 'Transfer error'
      await payout.save()
      console.warn(`Payout error for author ${e.authorId}:`, err.message)
    }
  }

  console.log(`Payout run for ${month} complete.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
