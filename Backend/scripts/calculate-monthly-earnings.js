/**
 * Calculate and persist writer earnings for a given month.
 * Usage: node scripts/calculate-monthly-earnings.js 2026-02
 * Run after month end when MONETIZATION_ENABLED=true.
 */
import 'dotenv/config'
import { connectDB } from '../config/db.js'
import { calculateAndPersistEarningsForMonth } from '../services/earningsService.js'

const month = process.argv[2]
if (!month || !/^\d{4}-\d{2}$/.test(month)) {
  console.error('Usage: node scripts/calculate-monthly-earnings.js YYYY-MM')
  process.exit(1)
}

async function main() {
  await connectDB()
  await calculateAndPersistEarningsForMonth(month)
  console.log(`Earnings calculated for ${month}.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
