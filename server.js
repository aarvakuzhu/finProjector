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
    // Auto-seed profile/goals on first run (if no profile exists)
    const { Profile } = require('./models');
    const existing = await Profile.findById('main');
    if (!existing) {
      const seedData = require('./config/seedData');
      await Profile.create(seedData);
      console.log('✅ Auto-seeded family profile and goals');
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
