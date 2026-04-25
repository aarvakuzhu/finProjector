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
