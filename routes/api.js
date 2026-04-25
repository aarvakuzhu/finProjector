const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { MonthlyEntry, Profile } = require('../models');

// ── Monthly Entries ──────────────────────────────────────────

// Get all entries (summary list)
router.get('/entries', requireAuth, async (req, res) => {
  try {
    const entries = await MonthlyEntry.find().sort({ year: -1, month: -1 });
    res.json(entries);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single entry
router.get('/entries/:year/:month', requireAuth, async (req, res) => {
  try {
    const entry = await MonthlyEntry.findOne({ year: +req.params.year, month: +req.params.month });
    res.json(entry || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Upsert monthly entry
router.post('/entries/:year/:month', requireAuth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const data = { ...req.body, year: +year, month: +month, updatedAt: new Date() };
    const entry = await MonthlyEntry.findOneAndUpdate(
      { year: +year, month: +month },
      data,
      { upsert: true, new: true, runValidators: true }
    );
    res.json(entry);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete entry
router.delete('/entries/:year/:month', requireAuth, async (req, res) => {
  try {
    await MonthlyEntry.deleteOne({ year: +req.params.year, month: +req.params.month });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Profile / Goals ──────────────────────────────────────────

router.get('/profile', requireAuth, async (req, res) => {
  try {
    let profile = await Profile.findById('main');
    if (!profile) profile = await Profile.create({ _id: 'main' });
    res.json(profile);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.findByIdAndUpdate(
      'main',
      { ...req.body, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(profile);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Projection Engine ────────────────────────────────────────

router.get('/projection', requireAuth, async (req, res) => {
  try {
    const profile = await Profile.findById('main') || {};
    const entries = await MonthlyEntry.find().sort({ year: 1, month: 1 });

    const currentYear = new Date().getFullYear();
    const retirementYear = currentYear + ((profile.retirementAge || 65) - (profile.currentAge || 35));
    const returnRate = (profile.annualReturnRate || 7) / 100;
    const inflation = (profile.inflationRate || 3) / 100;
    const salaryGrowth = (profile.salaryGrowthRate || 4) / 100;

    // Compute avg monthly net savings from last 6 months of entries
    const recent = entries.slice(-6);
    let avgMonthlySavings = 2000; // fallback
    if (recent.length > 0) {
      const totals = recent.map(e => {
        const totalIncome = Object.values(e.income || {}).reduce((a, b) => a + b, 0);
        const totalExpenses = Object.values(e.expenses || {}).reduce((a, b) => a + b, 0);
        const totalInvested = Object.values(e.investments || {}).reduce((a, b) => a + b, 0);
        return totalIncome - totalExpenses;
      });
      avgMonthlySavings = totals.reduce((a, b) => a + b, 0) / totals.length;
    }

    // Build year-by-year projection
    const years = [];
    let portfolio = (profile.currentSavings || 0) + (profile.currentInvestments || 0);
    let annualSavings = avgMonthlySavings * 12;

    for (let yr = currentYear; yr <= retirementYear + 5; yr++) {
      const yearsFromNow = yr - currentYear;
      // Apply salary growth to savings rate (savings grow with income)
      const thisYearSavings = annualSavings * Math.pow(1 + salaryGrowth, yearsFromNow);
      portfolio = portfolio * (1 + returnRate) + thisYearSavings;

      years.push({
        year: yr,
        portfolio: Math.round(portfolio),
        annualSavings: Math.round(thisYearSavings),
        isRetirement: yr === retirementYear
      });
    }

    // Monthly detail for current year
    const monthlyActual = [];
    let runningTotal = (profile.currentSavings || 0) + (profile.currentInvestments || 0);
    for (const e of entries) {
      const totalIncome = Object.values(e.income || {}).reduce((a, b) => a + b, 0);
      const totalExpenses = Object.values(e.expenses || {}).reduce((a, b) => a + b, 0);
      const totalInvested = Object.values(e.investments || {}).reduce((a, b) => a + b, 0);
      const net = totalIncome - totalExpenses;
      runningTotal += net;
      monthlyActual.push({
        label: `${e.year}-${String(e.month).padStart(2, '0')}`,
        income: totalIncome,
        expenses: totalExpenses,
        invested: totalInvested,
        net,
        cumulative: Math.round(runningTotal)
      });
    }

    res.json({
      projection: years,
      monthly: monthlyActual,
      avgMonthlySavings: Math.round(avgMonthlySavings),
      retirementYear,
      goals: profile.goals || []
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Dashboard Summary ────────────────────────────────────────

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const entries = await MonthlyEntry.find().sort({ year: -1, month: -1 });
    const profile = await Profile.findById('main') || {};

    // Last month
    const last = entries[0];
    let lastMonthIncome = 0, lastMonthExpenses = 0, lastMonthSaved = 0;
    if (last) {
      lastMonthIncome = Object.values(last.income || {}).reduce((a, b) => a + b, 0);
      lastMonthExpenses = Object.values(last.expenses || {}).reduce((a, b) => a + b, 0);
      lastMonthSaved = lastMonthIncome - lastMonthExpenses;
    }

    // YTD
    const ytd = entries.filter(e => e.year === now.getFullYear());
    const ytdIncome = ytd.reduce((s, e) => s + Object.values(e.income || {}).reduce((a, b) => a + b, 0), 0);
    const ytdExpenses = ytd.reduce((s, e) => s + Object.values(e.expenses || {}).reduce((a, b) => a + b, 0), 0);

    // 12-month trend
    const trend = entries.slice(0, 12).reverse().map(e => ({
      label: `${e.year}-${String(e.month).padStart(2, '0')}`,
      income: Object.values(e.income || {}).reduce((a, b) => a + b, 0),
      expenses: Object.values(e.expenses || {}).reduce((a, b) => a + b, 0)
    }));

    res.json({
      lastMonthIncome, lastMonthExpenses, lastMonthSaved,
      ytdIncome, ytdExpenses, ytdSaved: ytdIncome - ytdExpenses,
      totalMonths: entries.length,
      trend,
      goals: profile.goals || [],
      currentSavings: (profile.currentSavings || 0) + (profile.currentInvestments || 0)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
