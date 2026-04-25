// seed.js — Run manually to force-reset profile and goals in MongoDB
// Usage: node seed.js
// Safe to re-run — uses upsert so it won't duplicate

require('dotenv').config();
const mongoose = require('mongoose');
const { Profile } = require('./models');
const seedData = require('./config/seedData');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    const result = await Profile.findByIdAndUpdate(
      'main',
      { ...seedData, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    console.log('\n✅ Seed complete:\n');
    console.log(`  Age: ${result.currentAge} → Retirement ${result.retirementAge} (${new Date().getFullYear() + (result.retirementAge - result.currentAge)})`);
    console.log(`  Savings:     $${result.currentSavings.toLocaleString()}`);
    console.log(`  Investments: $${result.currentInvestments.toLocaleString()}`);
    console.log(`\n  Goals:`);
    result.goals.forEach(g => {
      console.log(`    • ${g.name} — ${g.targetYear} — $${g.targetAmount.toLocaleString()}`);
    });

  } catch (e) {
    console.error('Seed error:', e.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDone.');
  }
}

seed();
