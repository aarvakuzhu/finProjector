const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => res.render('dashboard'));
router.get('/monthly', requireAuth, (req, res) => res.render('monthly'));
router.get('/projection', requireAuth, (req, res) => res.render('projection'));
router.get('/goals', requireAuth, (req, res) => res.render('goals'));
router.get('/settings', requireAuth, (req, res) => res.render('settings'));

module.exports = router;
