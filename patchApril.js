// One-time patch: update April 2026 utilities to actual values
require('dotenv').config();
const mongoose = require('mongoose');
const { MonthlyEntry } = require('./models');

async function patch() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await MonthlyEntry.findOneAndUpdate(
    { year: 2026, month: 4 },
    { $set: { 'expenses.utilities': 486.34 } },
    { new: true }
  );
  if (result) {
    console.log(`✅ April 2026 utilities updated to $486.34`);
    console.log(`   (Sawnee $207.43 + Xoom $111.13 + AT&T $94.99 + GA Water $72.79)`);
  } else {
    console.log('April 2026 entry not found — will use correct value when created');
  }
  await mongoose.disconnect();
}
patch().catch(console.error);
