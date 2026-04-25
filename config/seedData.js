// config/seedData.js — Family profile and goals seed data
// This is the source of truth for initial setup.
// Values can be updated via the app UI after seeding.

module.exports = {
  _id: 'main',

  // Ash (primary), born May 1981
  currentAge: 45,
  retirementAge: 65,          // Target retirement: 2046

  // Current financial position
  currentSavings: 100000,     // Cash / bank accounts
  currentInvestments: 300000, // 401k + IRA + brokerage

  // Growth assumptions
  annualReturnRate: 7,        // % annual return (S&P historical avg)
  inflationRate: 3,           // %
  salaryGrowthRate: 4,        // %

  // Life goals
  // Abhi born Apr 2012 → college 2030
  // Adhar born Jun 2014 → college 2032
  goals: [
    {
      name: 'College — Abhi',
      category: 'college',
      targetYear: 2030,
      targetAmount: 200000,
      currentSaved: 0,
      color: '#14b8a6'
    },
    {
      name: 'College — Adhar',
      category: 'college',
      targetYear: 2032,
      targetAmount: 200000,
      currentSaved: 0,
      color: '#8b5cf6'
    },
    {
      name: 'Wedding — Abhi',
      category: 'wedding',
      targetYear: 2038,
      targetAmount: 100000,
      currentSaved: 0,
      color: '#ec4899'
    },
    {
      name: 'Wedding — Adhar',
      category: 'wedding',
      targetYear: 2041,
      targetAmount: 100000,
      currentSaved: 0,
      color: '#f97316'
    }
  ],

  updatedAt: new Date()
};
