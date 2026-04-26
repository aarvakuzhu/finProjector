const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { RentalProperty } = require('../models');

// Get all properties
router.get('/rental', requireAuth, async (req, res) => {
  try {
    const properties = await RentalProperty.find();
    res.json(properties || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get single property
router.get('/rental/:id', requireAuth, async (req, res) => {
  try {
    const prop = await RentalProperty.findById(req.params.id);
    res.json(prop || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Upsert property
router.post('/rental/:id', requireAuth, async (req, res) => {
  try {
    const sanitizeNum = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
    const body = req.body;

    const data = {
      name: (body.name || 'Rental Property').toString().slice(0, 100),
      address: (body.address || '').toString().slice(0, 200),
      monthlyRent: sanitizeNum(body.monthlyRent),
      mortgage: sanitizeNum(body.mortgage),
      annualExpenses: {
        hoa: sanitizeNum(body.annualExpenses?.hoa),
        rentalFee: sanitizeNum(body.annualExpenses?.rentalFee),
        trugreen: sanitizeNum(body.annualExpenses?.trugreen),
        termite: sanitizeNum(body.annualExpenses?.termite),
        mowing: sanitizeNum(body.annualExpenses?.mowing),
        maintenance: sanitizeNum(body.annualExpenses?.maintenance),
        other: sanitizeNum(body.annualExpenses?.other)
      },
      multiYearExpenses: Array.isArray(body.multiYearExpenses)
        ? body.multiYearExpenses
            .filter(e => e && e.name && e.totalCost)
            .map(e => ({
              name: e.name.toString().slice(0, 100),
              totalCost: sanitizeNum(e.totalCost),
              years: Math.max(1, parseInt(e.years) || 1)
            }))
        : [],
      notes: (body.notes || '').toString().slice(0, 500),
      updatedAt: new Date()
    };

    const prop = await RentalProperty.findByIdAndUpdate(
      req.params.id, data,
      { upsert: true, new: true }
    );
    res.json(prop);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete property
router.delete('/rental/:id', requireAuth, async (req, res) => {
  try {
    await RentalProperty.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// Rental P&L summary — used by monthly waterfall
router.get('/rental-summary', requireAuth, async (req, res) => {
  try {
    const properties = await RentalProperty.find() || [];
    const summary = properties.map(p => {
      const rent = p.monthlyRent || 0;
      const mortgage = p.mortgage || 0;
      const ae = p.annualExpenses || {};
      const annMonthly = (
        (ae.hoa || 0) + (ae.rentalFee || 0) + (ae.trugreen || 0) +
        (ae.termite || 0) + (ae.mowing || 0) + (ae.maintenance || 0) + (ae.other || 0)
      ) / 12;
      const multiMonthly = (p.multiYearExpenses || []).reduce((s, e) =>
        s + (parseFloat(e.totalCost) || 0) / Math.max(1, parseInt(e.years) || 1) / 12, 0);
      const totalExpenses = mortgage + annMonthly + multiMonthly;
      const netCashFlow = rent - totalExpenses;
      return {
        id: p._id,
        name: p.name,
        rent,
        mortgage,
        annMonthly: Math.round(annMonthly * 100) / 100,
        multiMonthly: Math.round(multiMonthly * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netCashFlow: Math.round(netCashFlow * 100) / 100,
        expenseDetail: {
          mortgage,
          hoa:         (ae.hoa         || 0) / 12,
          rentalFee:   (ae.rentalFee   || 0) / 12,
          trugreen:    (ae.trugreen    || 0) / 12,
          termite:     (ae.termite     || 0) / 12,
          mowing:      (ae.mowing      || 0) / 12,
          maintenance: (ae.maintenance || 0) / 12,
          other:       (ae.other       || 0) / 12,
          multiYear:   (p.multiYearExpenses || []).map(e => ({
            name: e.name,
            monthly: (parseFloat(e.totalCost)||0) / Math.max(1, parseInt(e.years)||1) / 12
          }))
        }
      };
    });
    const totals = {
      totalRent:     summary.reduce((s, p) => s + p.rent, 0),
      totalExpenses: summary.reduce((s, p) => s + p.totalExpenses, 0),
      totalNet:      summary.reduce((s, p) => s + p.netCashFlow, 0)
    };
    res.json({ properties: summary, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
