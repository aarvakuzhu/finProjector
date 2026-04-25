const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { password } = req.body;
  const APP_PASSWORD = process.env.APP_PASSWORD || 'fintracker2024';
  if (password === APP_PASSWORD) {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Incorrect password. Please try again.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
