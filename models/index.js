const mongoose = require('mongoose');

// Monthly Finance Entry
const monthlyEntrySchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1-12

  // Income
  income: {
    salary: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    rental: { type: Number, default: 0 },
    investments: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  // Expenses
  expenses: {
    housing: { type: Number, default: 0 },      // mortgage/rent
    utilities: { type: Number, default: 0 },
    groceries: { type: Number, default: 0 },
    dining: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    healthcare: { type: Number, default: 0 },
    education: { type: Number, default: 0 },
    entertainment: { type: Number, default: 0 },
    clothing: { type: Number, default: 0 },
    travel: { type: Number, default: 0 },
    subscriptions: { type: Number, default: 0 },
    childcare: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  // Investments / Savings this month
  investments: {
    retirement401k: { type: Number, default: 0 },
    ira: { type: Number, default: 0 },
    brokerage: { type: Number, default: 0 },
    savings: { type: Number, default: 0 },
    hsa: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
monthlyEntrySchema.index({ year: 1, month: 1 }, { unique: true });

// Profile / Goals (single document)
const profileSchema = new mongoose.Schema({
  _id: { type: String, default: 'main' },

  // Personal
  currentAge: { type: Number, default: 35 },
  retirementAge: { type: Number, default: 65 },
  currentSavings: { type: Number, default: 0 },         // total savings today
  currentInvestments: { type: Number, default: 0 },     // total investment portfolio today

  // Assumptions
  annualReturnRate: { type: Number, default: 7 },       // % annual investment return
  inflationRate: { type: Number, default: 3 },          // % inflation
  salaryGrowthRate: { type: Number, default: 4 },       // % annual salary increase

  // Life Goals
  goals: [{
    name: { type: String },
    targetYear: { type: Number },
    targetAmount: { type: Number },
    currentSaved: { type: Number, default: 0 },
    category: { type: String, enum: ['college', 'wedding', 'house', 'travel', 'emergency', 'other'], default: 'other' },
    color: { type: String, default: '#f59e0b' }
  }],

  updatedAt: { type: Date, default: Date.now }
});

const MonthlyEntry = mongoose.model('MonthlyEntry', monthlyEntrySchema);
const Profile = mongoose.model('Profile', profileSchema);

module.exports = { MonthlyEntry, Profile };
