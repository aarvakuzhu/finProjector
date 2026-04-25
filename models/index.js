const mongoose = require('mongoose');

// ── Monthly Finance Entry ────────────────────────────────────
const monthlyEntrySchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  income: {
    salary: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    rental: { type: Number, default: 0 },
    investments: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  expenses: {
    housing: { type: Number, default: 0 },
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

// ── Profile / Goals ──────────────────────────────────────────
const profileSchema = new mongoose.Schema({
  _id: { type: String, default: 'main' },
  currentAge: { type: Number, default: 35 },
  retirementAge: { type: Number, default: 65 },
  currentSavings: { type: Number, default: 0 },
  currentInvestments: { type: Number, default: 0 },
  annualReturnRate: { type: Number, default: 7 },
  inflationRate: { type: Number, default: 3 },
  salaryGrowthRate: { type: Number, default: 4 },
  goals: [{
    name: { type: String },
    targetYear: { type: Number },
    targetAmount: { type: Number },
    currentSaved: { type: Number, default: 0 },
    category: { type: String, enum: ['college','wedding','house','travel','emergency','other'], default: 'other' },
    color: { type: String, default: '#f59e0b' }
  }],
  updatedAt: { type: Date, default: Date.now }
});

// ── Rental Property ──────────────────────────────────────────
const rentalPropertySchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  address: { type: String, default: '' },
  monthlyRent: { type: Number, default: 0 },
  mortgage: { type: Number, default: 0 },       // monthly mortgage + escrow
  annualExpenses: {
    hoa: { type: Number, default: 0 },
    rentalFee: { type: Number, default: 0 },
    trugreen: { type: Number, default: 0 },
    termite: { type: Number, default: 0 },
    mowing: { type: Number, default: 0 },
    maintenance: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  multiYearExpenses: [{
    name: { type: String },
    totalCost: { type: Number },
    years: { type: Number }
  }],
  notes: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

const MonthlyEntry = mongoose.model('MonthlyEntry', monthlyEntrySchema);
const Profile = mongoose.model('Profile', profileSchema);
const RentalProperty = mongoose.model('RentalProperty', rentalPropertySchema);

module.exports = { MonthlyEntry, Profile, RentalProperty };
