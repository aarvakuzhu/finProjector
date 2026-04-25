// seedMonthly.js — Force re-seed April 2026 and update profile investments
// Run from Render shell: node seedMonthly.js
require('dotenv').config();
const mongoose = require('mongoose');
const { Profile, MonthlyEntry } = require('./models');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected\n');

    // Update profile with correct investment total (includes KP 401k)
    await Profile.findByIdAndUpdate('main', {
      currentInvestments: 321845,  // Ash ~$300k + KP Ready Save $13,845 + Empower $8,000
      currentSavings: 100000,
    });
    console.log('✅ Profile updated: investments = $321,845');

    // Upsert April 2026 entry
    const entry = await MonthlyEntry.findOneAndUpdate(
      { year: 2026, month: 4 },
      {
        year: 2026, month: 4,
        income: {
          salary: 16917,   // Ash $203,000 / 12
          bonus: 0,
          rental: 2350,    // 1 rental property
          investments: 0,
          other: 4583      // KP $55,000 / 12
        },
        expenses: {
          housing: 0, utilities: 0, groceries: 0, dining: 0,
          transport: 0, insurance: 0, healthcare: 0, education: 0,
          entertainment: 0, clothing: 0, travel: 0,
          subscriptions: 0, childcare: 0, other: 0
        },
        investments: {
          retirement401k: 2013,  // Ash $1,692 + KP $321
          ira: 846,              // Ash ROTH IRA
          brokerage: 0, savings: 0, hsa: 0, other: 0
        },
        notes: 'April 2026 — first tracked month. Ash $203k + KP $55k + rental $2,350. Ash: 401k 10% + ROTH 5%. KP: 401k 7%.'
      },
      { upsert: true, new: true }
    );

    const totalIncome = Object.values(entry.income).reduce((a,b) => a+b, 0);
    const totalInvested = Object.values(entry.investments).reduce((a,b) => a+b, 0);

    console.log('\n✅ April 2026 monthly entry seeded:\n');
    console.log(`  Ash salary:        $${entry.income.salary.toLocaleString()}/mo`);
    console.log(`  KP salary:         $${entry.income.other.toLocaleString()}/mo`);
    console.log(`  Rental:            $${entry.income.rental.toLocaleString()}/mo`);
    console.log(`  Total income:      $${totalIncome.toLocaleString()}/mo`);
    console.log('');
    console.log(`  401k combined:     $${entry.investments.retirement401k.toLocaleString()}/mo  (Ash $1,692 + KP $321)`);
    console.log(`  ROTH IRA (Ash):    $${entry.investments.ira.toLocaleString()}/mo`);
    console.log(`  Total invested:    $${totalInvested.toLocaleString()}/mo`);
    console.log('');
    console.log('  ⚠️  Expenses not yet entered — log in and fill in April expenses.');

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDone.');
  }
}

seed();
