// Tax engine — Georgia, Married Filing Jointly, 2026
// Handles federal brackets, Georgia flat tax, FICA

function estimateTax({ ashGross, kpGross, ash401kPct, kp401kPct } = {}) {
  const ash401k = ashGross * (ash401kPct / 100);
  const kp401k  = kpGross  * (kp401kPct  / 100);
  const combinedGross = ashGross + kpGross;
  const combinedAGI   = combinedGross - ash401k - kp401k;

  // ── Federal (MFJ 2026 brackets) ───────────────────────────
  const fedStdDeduction = 30000;
  const fedTaxable = Math.max(0, combinedAGI - fedStdDeduction);
  const fedBrackets = [
    { limit: 23850,   rate: 0.10 },
    { limit: 96950,   rate: 0.12 },
    { limit: 206700,  rate: 0.22 },
    { limit: 394600,  rate: 0.24 },
    { limit: 501050,  rate: 0.32 },
    { limit: 751600,  rate: 0.35 },
    { limit: Infinity,rate: 0.37 }
  ];
  let federalTax = 0, prev = 0;
  for (const b of fedBrackets) {
    if (fedTaxable <= prev) break;
    federalTax += (Math.min(fedTaxable, b.limit) - prev) * b.rate;
    prev = b.limit;
  }

  // ── Georgia (5.39% flat, 2025+) ───────────────────────────
  const gaStdDeduction = 24000;
  const gaTaxable = Math.max(0, combinedAGI - gaStdDeduction);
  const stateTax = gaTaxable * 0.0539;

  // ── FICA ──────────────────────────────────────────────────
  const ssCap = 176100;
  const ashSS       = Math.min(ashGross, ssCap) * 0.062;
  const kpSS        = Math.min(kpGross,  ssCap) * 0.062;
  const ashMedicare = ashGross * 0.0145 + Math.max(0, ashGross - 200000) * 0.009;
  const kpMedicare  = kpGross  * 0.0145;
  const ficaTotal   = ashSS + kpSS + ashMedicare + kpMedicare;

  const totalAnnual  = Math.round(federalTax + stateTax + ficaTotal);
  const totalMonthly = Math.round(totalAnnual / 12);

  return {
    annual: {
      federal:  Math.round(federalTax),
      state:    Math.round(stateTax),
      fica:     Math.round(ficaTotal),
      total:    totalAnnual
    },
    monthly: {
      federal:  Math.round(federalTax / 12),
      state:    Math.round(stateTax / 12),
      fica:     Math.round(ficaTotal / 12),
      total:    totalMonthly
    },
    effectiveRate:   +((totalAnnual / combinedGross) * 100).toFixed(1),
    combinedGross,
    combinedAGI,
    takeHomeMontly:  Math.round((combinedGross - totalAnnual) / 12)
  };
}

module.exports = { estimateTax };
