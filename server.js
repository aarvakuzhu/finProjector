require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    const { Profile, MonthlyEntry } = require('./models');
    const seedData = require('./config/seedData');

    // Upsert profile — always ensure goals, investments are current
    const existing = await Profile.findById('main');
    if (!existing) {
      await Profile.create(seedData);
      console.log('Auto-seeded family profile and goals');
    } else {
      // Always patch goals and taxProfile to keep them current
      const needsGoalPatch = !existing.goals || existing.goals.length === 0 ||
        !existing.goals[0].durationYears;
      if (needsGoalPatch) {
        await Profile.findByIdAndUpdate('main', {
          goals: seedData.goals,
          currentInvestments: seedData.currentInvestments,
          taxProfile: seedData.taxProfile
        });
        console.log('Patched goals with distribution model and tax profile');
      }
    }

    // Auto-seed April 2026 monthly entry
    const existingApril = await MonthlyEntry.findOne({ year: 2026, month: 4 });
    if (!existingApril) {
      await MonthlyEntry.create({
        year: 2026, month: 4,
        income: { salary: 16917, bonus: 0, rental: 2350, investments: 0, other: 4583 },
        expenses: {
          taxes: 5340,        // Federal ,890 + GA 43 + FICA ,508 (auto-calculated)
          housing: 3150,      // Primary home mortgage
          utilities: 486.34,     // Electricity 80 + gas 5 + water 5 + internet 0 + trash 5
          groceries: 1200,
          dining: 400,
          transport: 350,     // Gas 50 + car maintenance 00
          insurance: 650,     // Home 20 + auto 80 + life 50
          healthcare: 850,    // Health insurance 50 + HSA 50 + dental 0
          childcare: 240,     // 2 kids × $120/mo classes
          subscriptions: 305.42, // Streaming 0 + gym 0 + Prime 5 + phone 80
          clothing: 200,      // $2,400/yr ÷ 12
          entertainment: 200,
          travel: 833,        // $10,000/yr ÷ 12 (annual travel budget)
          education: 250,     // Gifts $3,000/yr ÷ 12
          other: 250          // Misc
        },
        investments: { retirement401k: 2013, ira: 846, brokerage: 0, savings: 0, hsa: 150, other: 0 },
        notes: 'April 2026 — first tracked month with Cumming GA estimates. Override any field as needed. Tax auto-calculated from Georgia MFJ rates.'
      });
      console.log('Auto-seeded April 2026 monthly entry with expense estimates');
    }
  })
  .catch(err => console.error('MongoDB error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fintracker-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions', ttl: 7 * 24 * 60 * 60 }),
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use('/', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/api', require('./routes/rental'));
app.use('/', require('./routes/pages'));

app.listen(PORT, () => console.log(`FinTracker running on port ${PORT}`));
