module.exports = {
  _id: 'main',
  currentAge: 45,
  retirementAge: 65,
  currentSavings: 100000,
  currentInvestments: 321845,
  annualReturnRate: 7,
  inflationRate: 3,
  salaryGrowthRate: 4,

  // Tax profile (Georgia, MFJ)
  taxProfile: {
    filingStatus: 'mfj',
    state: 'georgia',
    ashGross: 203000,
    kpGross: 55000,
    ash401kPct: 10,
    kp401kPct: 7,
    ashRothPct: 5
  },

  goals: [
    {
      name: 'College — Abhi',
      category: 'college',
      targetYear: 2030,       // first year of college
      targetAmount: 200000,   // total over 4 years
      annualAmount: 50000,    // per year
      durationYears: 4,       // 2030–2033
      currentSaved: 0,
      color: '#14b8a6'
    },
    {
      name: 'College — Adhar',
      category: 'college',
      targetYear: 2032,
      targetAmount: 200000,
      annualAmount: 50000,
      durationYears: 4,       // 2032–2035
      currentSaved: 0,
      color: '#8b5cf6'
    },
    {
      name: 'Wedding — Abhi',
      category: 'wedding',
      targetYear: 2038,
      targetAmount: 100000,
      annualAmount: null,
      durationYears: 1,
      currentSaved: 0,
      color: '#ec4899'
    },
    {
      name: 'Wedding — Adhar',
      category: 'wedding',
      targetYear: 2041,
      targetAmount: 100000,
      annualAmount: null,
      durationYears: 1,
      currentSaved: 0,
      color: '#f97316'
    }
  ],

  updatedAt: new Date()
};
