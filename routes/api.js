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

// ── Admin Operations ─────────────────────────────────────────
router.post('/admin/patch', requireAuth, async (req, res) => {
  try {
    const { operation } = req.body;
    const { MonthlyEntry, Profile } = require('../models');
    const seedData = require('../config/seedData');
    const results = [];

    if (operation === 'patch_expenses' || operation === 'all') {
      const r = await MonthlyEntry.findOneAndUpdate(
        { year: 2026, month: 4 },
        { $set: {
          'expenses.childcare': 240,       // 2 kids × $120/mo classes
          'expenses.subscriptions': 305.42 // Netflix $15 + Prime $13.33 + gym $80 + phone $180 + printing $10 + Costco $5.42 + BJs $1.67
        }},
        { new: true }
      );
      results.push(r
        ? '✅ April 2026 expenses patched — Kids classes $240, Subscriptions $305.42'
        : '⚠️ April 2026 entry not found'
      );
    }

    if (operation === 'patch_utilities' || operation === 'all') {
      const r = await MonthlyEntry.findOneAndUpdate(
        { year: 2026, month: 4 },
        { $set: { 'expenses.utilities': 486.34 } },
        { new: true }
      );
      results.push(r
        ? '✅ April 2026 utilities → $486.34 (Sawnee $207.43 + Xoom $111.13 + AT&T $94.99 + Water $72.79)'
        : '⚠️ April 2026 entry not found — will use correct value when created'
      );
    }

    if (operation === 'patch_goals' || operation === 'all') {
      const r = await Profile.findByIdAndUpdate('main', {
        goals: seedData.goals,
        currentInvestments: seedData.currentInvestments,
        taxProfile: seedData.taxProfile
      }, { new: true });
      results.push(r
        ? `✅ Goals patched — ${r.goals.length} goals restored`
        : '⚠️ Profile not found'
      );
    }

    if (operation === 'patch_investments' || operation === 'all') {
      const r = await Profile.findByIdAndUpdate('main', {
        currentInvestments: 321845,
        currentSavings: 100000
      }, { new: true });
      results.push(r
        ? '✅ Investments → $321,845 (Ash $300k + KP ReadySave $13,845 + Empower $8k)'
        : '⚠️ Profile not found'
      );
    }

    if (operation === 'seed_april' || operation === 'all') {
      const existing = await MonthlyEntry.findOne({ year: 2026, month: 4 });
      if (existing) {
        await MonthlyEntry.findOneAndUpdate(
          { year: 2026, month: 4 },
          {
            income: { salary: 16917, bonus: 0, rental: 2350, investments: 0, other: 4583 },
            expenses: {
              taxes: 5340, housing: 3150, utilities: 486.34, groceries: 1200,
              dining: 400, transport: 350, insurance: 650, healthcare: 850,
              childcare: 600, subscriptions: 335, clothing: 200,
              entertainment: 200, travel: 833, education: 250, other: 250
            },
            investments: { retirement401k: 2013, ira: 846, brokerage: 0, savings: 0, hsa: 150, other: 0 },
            notes: 'April 2026 — seeded with actual values. Utilities: Sawnee $207.43 + Xoom $111.13 + AT&T $94.99 + Water $72.79.'
          }
        );
        results.push('✅ April 2026 fully reseeded with all actual values');
      } else {
        await MonthlyEntry.create({
          year: 2026, month: 4,
          income: { salary: 16917, bonus: 0, rental: 2350, investments: 0, other: 4583 },
          expenses: {
            taxes: 5340, housing: 3150, utilities: 486.34, groceries: 1200,
            dining: 400, transport: 350, insurance: 650, healthcare: 850,
            childcare: 600, subscriptions: 335, clothing: 200,
            entertainment: 200, travel: 833, education: 250, other: 250
          },
          investments: { retirement401k: 2013, ira: 846, brokerage: 0, savings: 0, hsa: 150, other: 0 },
          notes: 'April 2026 — created with actual values.'
        });
        results.push('✅ April 2026 created fresh with all actual values');
      }
    }

    if (results.length === 0) {
      return res.status(400).json({ error: 'Unknown operation' });
    }

    res.json({ ok: true, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Scenario Engine ──────────────────────────────────────────
// Accepts override params, runs projection with them, returns
// baseline + scenario side by side for comparison

router.post('/scenario', requireAuth, async (req, res) => {
  try {
    const rawProfile = await Profile.findById('main');
    const profile = defaultProfile(rawProfile ? rawProfile.toObject() : {});
    const entries = await MonthlyEntry.find().sort({ year: 1, month: 1 }) || [];
    const currentYear = new Date().getFullYear();

    // Base projection params
    const baseRetirementYear = currentYear + Math.max(1, (profile.retirementAge || 65) - (profile.currentAge || 45));
    const baseReturnRate  = Math.max(0, profile.annualReturnRate || 7) / 100;
    const baseSalaryGrowth = Math.max(0, profile.salaryGrowthRate || 4) / 100;

    // Avg monthly from recent entries
    const recent = entries.slice(-6);
    let avgMonthlyCash = 0, avgMonthlyInvested = 0;
    if (recent.length > 0) {
      const nets = recent.map(e => entryTotals(e).net);
      const invs = recent.map(e => entryTotals(e).investments);
      avgMonthlyCash     = Math.max(0, nets.reduce((a,b) => a+b,0) / nets.length - invs.reduce((a,b) => a+b,0) / invs.length);
      avgMonthlyInvested = invs.reduce((a,b) => a+b,0) / invs.length;
    } else {
      // Fallback: known numbers
      avgMonthlyCash     = 1460;   // estimated monthly surplus
      avgMonthlyInvested = 2858;   // 401k + ROTH
    }

    // Goal schedule (shared between base and scenario)
    const goalExpenseByYear = {};
    for (const g of (profile.goals || [])) {
      const startYear = parseInt(g.targetYear) || currentYear;
      const duration  = parseInt(g.durationYears) || 1;
      const annualCost = g.annualAmount ? parseFloat(g.annualAmount) : parseFloat(g.targetAmount) / duration;
      for (let i = 0; i < duration; i++) {
        const yr = startYear + i;
        goalExpenseByYear[yr] = (goalExpenseByYear[yr] || 0) + annualCost;
      }
    }

    // ── Scenario overrides ───────────────────────────────────
    const sc = req.body || {};
    const scReturnRate   = Math.max(0, parseFloat(sc.returnRate   ?? profile.annualReturnRate)) / 100;
    const scSalaryGrowth = Math.max(0, parseFloat(sc.salaryGrowth ?? profile.salaryGrowthRate)) / 100;
    const scRetirementAge = parseInt(sc.retirementAge ?? profile.retirementAge);
    const scRetirementYear = currentYear + Math.max(1, scRetirementAge - (profile.currentAge || 45));

    // Income shock: job loss for N months in a given year
    const shockYear       = parseInt(sc.shockYear) || null;
    const shockMonths     = Math.min(12, Math.max(0, parseInt(sc.shockMonths) || 0));
    const shockSalary     = parseFloat(sc.shockSalaryPct ?? 100) / 100; // % of Ash salary retained during shock
    const shockInvestPct  = parseFloat(sc.shockInvestPct ?? 100) / 100; // % of investments retained during shock

    // Extra one-time cost or income in a year
    const eventYear       = parseInt(sc.eventYear) || null;
    const eventAmount     = parseFloat(sc.eventAmount) || 0; // negative = expense, positive = windfall

    const maxYear = Math.max(baseRetirementYear, scRetirementYear) + 5;

    function runProjection({ returnRate, salaryGrowth, retirementYear, isScenario }) {
      let portfolio = Math.max(0, profile.currentInvestments || 0);
      let cash      = Math.max(0, profile.currentSavings || 0);
      const years   = [];

      for (let yr = currentYear; yr <= maxYear; yr++) {
        const yearsFromNow  = yr - currentYear;
        const growthFactor  = Math.pow(1 + salaryGrowth, yearsFromNow);

        // Apply shocks for scenario
        let cashFactor = 1, invFactor = 1;
        if (isScenario && shockYear && yr === shockYear && shockMonths > 0) {
          const affectedFraction = shockMonths / 12;
          cashFactor = 1 - affectedFraction * (1 - shockSalary);
          invFactor  = 1 - affectedFraction * (1 - shockInvestPct);
        }

        const thisYearCash = avgMonthlyCash     * 12 * growthFactor * cashFactor;
        const thisYearInv  = avgMonthlyInvested * 12 * growthFactor * invFactor;
        const goalDraw     = goalExpenseByYear[yr] || 0;
        const oneTimeEvent = (isScenario && eventYear && yr === eventYear) ? eventAmount : 0;

        portfolio = portfolio * (1 + returnRate) + thisYearInv;
        cash     += thisYearCash - goalDraw + oneTimeEvent;

        years.push({
          year: yr,
          portfolio:   Math.round(portfolio),
          cashStack:   Math.round(Math.max(0, cash)),
          totalWealth: Math.round(portfolio + Math.max(0, cash)),
          isRetirement: yr === retirementYear,
          goalDraw:    Math.round(goalDraw),
          shockApplied: isScenario && shockYear && yr === shockYear
        });
      }
      return years;
    }

    const baseline = runProjection({
      returnRate: baseReturnRate, salaryGrowth: baseSalaryGrowth,
      retirementYear: baseRetirementYear, isScenario: false
    });
    const scenario = runProjection({
      returnRate: scReturnRate, salaryGrowth: scSalaryGrowth,
      retirementYear: scRetirementYear, isScenario: true
    });

    // Compute impact at retirement and at each goal
    const baseAtRet = baseline.find(y => y.isRetirement);
    const scAtRet   = scenario.find(y => y.year === scRetirementYear);
    const wealthDiff = scAtRet && baseAtRet ? scAtRet.totalWealth - baseAtRet.totalWealth : 0;

    const goalImpacts = (profile.goals || []).map(g => {
      const yr = g.targetYear;
      const base = baseline.find(y => y.year === yr);
      const sc   = scenario.find(y => y.year === yr);
      return {
        name: g.name,
        year: yr,
        baseWealth: base?.totalWealth || 0,
        scWealth:   sc?.totalWealth   || 0,
        diff:       (sc?.totalWealth || 0) - (base?.totalWealth || 0)
      };
    });

    res.json({
      baseline,
      scenario,
      baseRetirementYear,
      scRetirementYear,
      wealthDiff,
      goalImpacts,
      params: {
        base:     { returnRate: baseReturnRate*100, salaryGrowth: baseSalaryGrowth*100, retirementAge: profile.retirementAge },
        scenario: { returnRate: scReturnRate*100,   salaryGrowth: scSalaryGrowth*100,   retirementAge: scRetirementAge,
                    shockYear, shockMonths, shockSalary: shockSalary*100, shockInvestPct: shockInvestPct*100,
                    eventYear, eventAmount }
      }
    });
  } catch(e) {
    console.error('Scenario error:', e);
    res.status(500).json({ error: e.message });
  }
});
