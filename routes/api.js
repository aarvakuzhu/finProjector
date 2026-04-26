const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { MonthlyEntry, Profile } = require('../models');

// ── Safe helpers ─────────────────────────────────────────────

function safeSum(obj) {
  if (!obj || typeof obj !== 'object') return 0;
  return Object.values(obj).reduce((acc, v) => {
    const n = parseFloat(v);
    return acc + (isNaN(n) ? 0 : n);
  }, 0);
}

function defaultProfile(override = {}) {
  return {
    currentAge: 35, retirementAge: 65,
    currentSavings: 0, currentInvestments: 0,
    annualReturnRate: 7, inflationRate: 3, salaryGrowthRate: 4,
    goals: [],
    ...override
  };
}

function entryTotals(e) {
  if (!e) return { income: 0, expenses: 0, investments: 0, net: 0 };
  const income = safeSum(e.income);
  const expenses = safeSum(e.expenses);
  const investments = safeSum(e.investments);
  return { income, expenses, investments, net: income - expenses };
}

// ── Monthly Entries ──────────────────────────────────────────

router.get('/entries', requireAuth, async (req, res) => {
  try {
    const entries = await MonthlyEntry.find().sort({ year: -1, month: -1 });
    res.json(entries || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/entries/:year/:month', requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (isNaN(year) || isNaN(month)) return res.json({});
    const entry = await MonthlyEntry.findOne({ year, month });
    res.json(entry || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/entries/:year/:month', requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (isNaN(year) || isNaN(month)) return res.status(400).json({ error: 'Invalid year/month' });

    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object') return {};
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        const n = parseFloat(v);
        out[k] = isNaN(n) ? 0 : n;
      }
      return out;
    };

    const data = {
      year, month,
      income: sanitize(req.body.income),
      expenses: sanitize(req.body.expenses),
      investments: sanitize(req.body.investments),
      notes: (req.body.notes || '').toString().slice(0, 1000),
      updatedAt: new Date()
    };

    const entry = await MonthlyEntry.findOneAndUpdate(
      { year, month }, data,
      { upsert: true, new: true, runValidators: true }
    );
    res.json(entry);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/entries/:year/:month', requireAuth, async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (isNaN(year) || isNaN(month)) return res.status(400).json({ error: 'Invalid year/month' });
    await MonthlyEntry.deleteOne({ year, month });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Profile / Goals ──────────────────────────────────────────

router.get('/profile', requireAuth, async (req, res) => {
  try {
    let profile = await Profile.findById('main');
    if (!profile) profile = await Profile.create({ _id: 'main', ...defaultProfile() });
    res.json(profile);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/profile', requireAuth, async (req, res) => {
  try {
    const numFields = ['currentAge','retirementAge','currentSavings','currentInvestments','annualReturnRate','inflationRate','salaryGrowthRate'];
    const sanitized = { ...req.body };
    for (const f of numFields) {
      if (sanitized[f] !== undefined) {
        const n = parseFloat(sanitized[f]);
        sanitized[f] = isNaN(n) ? defaultProfile()[f] : n;
      }
    }
    if (sanitized.goals && Array.isArray(sanitized.goals)) {
      sanitized.goals = sanitized.goals
        .filter(g => g && g.name && g.targetAmount)
        .map(g => ({
          name: (g.name || '').toString().slice(0, 100),
          targetYear: parseInt(g.targetYear) || new Date().getFullYear() + 5,
          targetAmount: parseFloat(g.targetAmount) || 0,
          currentSaved: parseFloat(g.currentSaved) || 0,
          category: ['college','wedding','house','travel','emergency','other'].includes(g.category) ? g.category : 'other',
          color: /^#[0-9a-fA-F]{6}$/.test(g.color) ? g.color : '#f59e0b'
        }));
    }
    const profile = await Profile.findByIdAndUpdate(
      'main',
      { ...sanitized, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(profile);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Projection Engine ────────────────────────────────────────

router.get('/projection', requireAuth, async (req, res) => {
  try {
    const rawProfile = await Profile.findById('main');
    const profile = defaultProfile(rawProfile ? rawProfile.toObject() : {});
    const entries = await MonthlyEntry.find().sort({ year: 1, month: 1 }) || [];

    const currentYear = new Date().getFullYear();
    const yearsToRetirement = Math.max(1, (profile.retirementAge || 65) - (profile.currentAge || 35));
    const retirementYear = currentYear + yearsToRetirement;
    const returnRate = Math.max(0, profile.annualReturnRate || 7) / 100;
    const salaryGrowth = Math.max(0, profile.salaryGrowthRate || 4) / 100;

    const recent = entries.slice(-6);
    let avgMonthlySavings = 0, avgMonthlyInvested = 0;
    if (recent.length > 0) {
      const nets = recent.map(e => entryTotals(e).net);
      const invs = recent.map(e => entryTotals(e).investments);
      avgMonthlySavings = nets.reduce((a, b) => a + b, 0) / nets.length;
      avgMonthlyInvested = invs.reduce((a, b) => a + b, 0) / invs.length;
    }

    const avgMonthlyCash = Math.max(0, avgMonthlySavings - avgMonthlyInvested);
    const annualCash = avgMonthlyCash * 12;
    const annualInvested = avgMonthlyInvested * 12;

    // Build goal expense schedule — distributed across years for multi-year goals
    const goalExpenseByYear = {};
    for (const g of (profile.goals || [])) {
      const startYear = parseInt(g.targetYear) || currentYear;
      const duration  = parseInt(g.durationYears) || 1;
      const annualCost = g.annualAmount
        ? parseFloat(g.annualAmount)
        : parseFloat(g.targetAmount) / duration;
      for (let i = 0; i < duration; i++) {
        const yr = startYear + i;
        goalExpenseByYear[yr] = (goalExpenseByYear[yr] || 0) + annualCost;
      }
    }

    const years = [];
    let investmentPortfolio = Math.max(0, profile.currentInvestments || 0);
    let cashStack = Math.max(0, profile.currentSavings || 0);

    for (let yr = currentYear; yr <= retirementYear + 5; yr++) {
      const yearsFromNow = yr - currentYear;
      const growthFactor = Math.pow(1 + salaryGrowth, yearsFromNow);
      const thisYearInvested = annualInvested * growthFactor;
      investmentPortfolio = investmentPortfolio * (1 + returnRate) + thisYearInvested;
      const thisYearCash = annualCash * growthFactor;
      const goalDraw = goalExpenseByYear[yr] || 0;
      cashStack += thisYearCash - goalDraw;

      years.push({
        year: yr,
        portfolio: Math.round(investmentPortfolio),
        cashStack: Math.round(Math.max(0, cashStack)),
        totalWealth: Math.round(investmentPortfolio + Math.max(0, cashStack)),
        annualSavings: Math.round((annualCash + annualInvested) * growthFactor),
        annualCash: Math.round(thisYearCash),
        annualInvested: Math.round(thisYearInvested),
        goalDraw: Math.round(goalDraw),
        isRetirement: yr === retirementYear
      });
    }

    const monthlyActual = entries.map(e => {
      const t = entryTotals(e);
      return {
        label: `${e.year}-${String(e.month).padStart(2, '0')}`,
        income: t.income,
        expenses: t.expenses,
        investments: t.investments,
        net: t.net,
        cashSurplus: Math.max(0, t.net - t.investments)
      };
    });

    let runningCash = profile.currentSavings || 0;
    const monthlyCumulative = monthlyActual.map(m => {
      runningCash += m.cashSurplus;
      return { label: m.label, cumulative: Math.round(runningCash) };
    });

    res.json({
      projection: years,
      monthly: monthlyActual,
      monthlyCumulative,
      avgMonthlySavings: Math.round(avgMonthlySavings),
      avgMonthlyCash: Math.round(avgMonthlyCash),
      avgMonthlyInvested: Math.round(avgMonthlyInvested),
      retirementYear,
      goals: profile.goals || [],
      hasData: entries.length > 0
    });
  } catch (e) {
    console.error('Projection error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ── Dashboard Summary ────────────────────────────────────────

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const entries = await MonthlyEntry.find().sort({ year: -1, month: -1 }) || [];
    const rawProfile = await Profile.findById('main');
    const profile = defaultProfile(rawProfile ? rawProfile.toObject() : {});

    const last = entries[0] || null;
    const lastTotals = entryTotals(last);

    const ytd = entries.filter(e => e && e.year === now.getFullYear());
    const ytdIncome = ytd.reduce((s, e) => s + entryTotals(e).income, 0);
    const ytdExpenses = ytd.reduce((s, e) => s + entryTotals(e).expenses, 0);
    const ytdInvested = ytd.reduce((s, e) => s + entryTotals(e).investments, 0);

    const trend = entries.slice(0, 12).reverse().map(e => {
      const t = entryTotals(e);
      return {
        label: `${e.year}-${String(e.month).padStart(2, '0')}`,
        income: t.income,
        expenses: t.expenses,
        net: t.net,
        cashSurplus: Math.max(0, t.net - t.investments)
      };
    });

    res.json({
      lastMonthIncome: lastTotals.income,
      lastMonthExpenses: lastTotals.expenses,
      lastMonthSaved: lastTotals.net,
      lastMonthCash: Math.max(0, lastTotals.net - lastTotals.investments),
      lastMonthInvested: lastTotals.investments,
      ytdIncome, ytdExpenses,
      ytdSaved: ytdIncome - ytdExpenses,
      ytdInvested,
      ytdCash: Math.max(0, (ytdIncome - ytdExpenses) - ytdInvested),
      totalMonths: entries.length,
      trend,
      goals: profile.goals || [],
      currentSavings: profile.currentSavings || 0,
      currentInvestments: profile.currentInvestments || 0,
      hasData: entries.length > 0
    });
  } catch (e) {
    console.error('Summary error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

// ── Tax Estimate ─────────────────────────────────────────────
router.get('/tax', requireAuth, async (req, res) => {
  try {
    const rawProfile = await Profile.findById('main');
    const tp = rawProfile?.taxProfile || {};
    const { estimateTax } = require('../utils/taxEngine');
    const result = estimateTax({
      ashGross:   tp.ashGross   || 203000,
      kpGross:    tp.kpGross    || 55000,
      ash401kPct: tp.ash401kPct || 10,
      kp401kPct:  tp.kp401kPct  || 7
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
