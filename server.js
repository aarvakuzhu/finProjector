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
    } else if (!existing.goals || existing.goals.length === 0) {
      // Goals missing — patch them in
      await Profile.findByIdAndUpdate('main', {
        goals: seedData.goals,
        currentInvestments: seedData.currentInvestments
      });
      console.log('Patched missing goals into existing profile');
    }

    // Auto-seed April 2026 monthly entry
    const existingApril = await MonthlyEntry.findOne({ year: 2026, month: 4 });
    if (!existingApril) {
      await MonthlyEntry.create({
        year: 2026, month: 4,
        income: { salary: 16917, bonus: 0, rental: 2350, investments: 0, other: 4583 },
        expenses: { housing: 0, utilities: 0, groceries: 0, dining: 0, transport: 0, insurance: 0, healthcare: 0, education: 0, entertainment: 0, clothing: 0, travel: 0, subscriptions: 0, childcare: 0, other: 0 },
        investments: { retirement401k: 2013, ira: 846, brokerage: 0, savings: 0, hsa: 0, other: 0 },
        notes: 'April 2026 — first tracked month. Ash $203k + KP $55k + rental $2,350. 401k 10% + ROTH 5% + KP 401k 7%.'
      });
      console.log('Auto-seeded April 2026 monthly entry');
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
