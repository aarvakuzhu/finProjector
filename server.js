require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection + auto-seed
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    const { Profile, MonthlyEntry } = require('./models');

    // Auto-seed profile + goals if first run
    const existingProfile = await Profile.findById('main');
    if (!existingProfile) {
      const seedData = require('./config/seedData');
      await Profile.create(seedData);
      console.log('Auto-seeded family profile and goals');
    }

    // Auto-seed April 2026 monthly entry
    // Income:      Ash $203k/yr + KP $55k/yr + rental $2,350/mo
    // Investments: Ash 401k 10% ($1,692) + Ash ROTH 5% ($846) + KP 401k 7% ($321)
    const existingApril = await MonthlyEntry.findOne({ year: 2026, month: 4 });
    if (!existingApril) {
      await MonthlyEntry.create({
        year: 2026, month: 4,
        income: {
          salary: 16917,    // Ash $203,000 / 12
          bonus: 0,
          rental: 2350,     // 1 rental property
          investments: 0,
          other: 4583       // KP $55,000 / 12
        },
        expenses: {
          housing: 0, utilities: 0, groceries: 0, dining: 0,
          transport: 0, insurance: 0, healthcare: 0, education: 0,
          entertainment: 0, clothing: 0, travel: 0,
          subscriptions: 0, childcare: 0, other: 0
        },
        investments: {
          retirement401k: 2013,  // Ash 401k $1,692 + KP 401k $321
          ira: 846,              // Ash ROTH IRA 5% post-tax
          brokerage: 0,
          savings: 0,
          hsa: 0,
          other: 0
        },
        notes: 'April 2026 — first tracked month. Ash $203k + KP $55k + rental $2,350. Ash: 401k 10% + ROTH 5%. KP: 401k 7%. Expenses to be filled in.'
      });
      console.log('Auto-seeded April 2026 monthly entry');
    }
  })
  .catch(err => console.error('MongoDB error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'fintracker-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60
  }),
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Routes
app.use('/', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/pages'));

app.listen(PORT, () => console.log(`FinTracker running on port ${PORT}`));
