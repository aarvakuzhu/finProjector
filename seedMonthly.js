// seedMonthly.js — Seeds April 2026 with known income & investment data
// Run: node seedMonthly.js
// Safe to re-run — uses upsert

require('dotenv').config();
const mongoose = require('mongoose');
const { MonthlyEntry } = require('./models');

// ── Known income (monthly) ──────────────────────────────────
// Ash:    $203,000/yr = $16,917/mo gross salary
// KP:     $55,000/yr  = $4,583/mo gross salary
// Rental: $2,350/mo (1 property)

// ── Known investments (monthly) ─────────────────────────────
// Ash 401k: 10% of $203k = $20,300/yr = $1,692/mo  (pre-tax, employer plan)
// Ash ROTH: 5%  of $203k = $10,150/yr = $846/mo   (post-tax IRA)

const APRIL_2026 = {
  year: 2026,
  month: 4,

  income: {
    salary: 16917,      // Ash gross monthly ($203k/12)
    bonus: 0,
    rental: 2350,       // 1 rental property
    investments: 0,
    other: 4583         // KP salary ($55k/12) — tracked as "other" income
  },

  expenses: {
    housing: 0,         // Fill in: mortgage/rent
    utilities: 0,       // Fill in
    groceries: 0,       // Fill in
    dining: 0,
    transport: 0,
    insurance: 0,
    healthcare: 0,
    education: 0,
    entertainment: 0,
    clothing: 0,
    travel: 0,
    subscriptions: 0,
    childcare: 0,
    other: 0
  },

  investments: {
    retirement401k: 1692,  // Ash 401k (10% of $203k)
    ira: 846,              // Ash ROTH IRA (5% post-tax)
    brokerage: 0,          // Fill in if any
    savings: 0,            // Fill in monthly savings transfers
    hsa: 0,
    other: 0
  },

  notes: 'April 2026 — first tracked month. Income: Ash $203k salary + KP $55k + rental $2,350. Investments: 401k 10% + ROTH 5%. Expenses TBD.'
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const entry = await MonthlyEntry.findOneAndUpdate(
      { year: APRIL_2026.year, month: APRIL_2026.month },
      APRIL_2026,
      { upsert: true, new: true }
    );

    const totalIncome = Object.values(entry.income).reduce((a, b) => a + b, 0);
    const totalInvested = Object.values(entry.investments).reduce((a, b) => a + b, 0);

    console.log('\n✅ April 2026 entry seeded:\n');
    console.log(`  Ash salary:      $${entry.income.salary.toLocaleString()}/mo`);
    console.log(`  KP salary:       $${entry.income.other.toLocaleString()}/mo`);
    console.log(`  Rental:          $${entry.income.rental.toLocaleString()}/mo`);
    console.log(`  Total income:    $${totalIncome.toLocaleString()}/mo`);
    console.log(``);
    console.log(`  401k:            $${entry.investments.retirement401k.toLocaleString()}/mo`);
    console.log(`  ROTH IRA:        $${entry.investments.ira.toLocaleString()}/mo`);
    console.log(`  Total invested:  $${totalInvested.toLocaleString()}/mo`);
    console.log(``);
    console.log(`  ⚠️  Expenses not yet entered — log in and fill them in for April.`);

  } catch (e) {
    console.error('Seed error:', e.message);
  } finally {
    await mongoose.disconnect();
    console.log('Done.');
  }
}

seed();
