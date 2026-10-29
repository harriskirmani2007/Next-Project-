/* The Next Chapter Project: pure calculation logic.
   Loads as a classic <script> in the browser (window.NCP) and as a CommonJS module in Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.NCP = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX = 1000000;
  const MATCH_CAP = 3500; // Opportunity Passport lifetime match maximum (Foster Success Indiana)

  function clampAmount(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.min(MAX, Math.max(0, v));
  }

  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function formatMoney(n) { return fmt.format(n); }

  // Split a monthly total into spend / save / keep using percentage presets. Remainder goes to spend
  // so the three parts always add up to the total.
  function splitMoney(total, pct) {
    const t = clampAmount(total);
    const save = Math.round(t * pct[1] / 100);
    const keep = Math.round(t * pct[2] / 100);
    return { spend: t - save - keep, save, keep };
  }

  function budgetSummary(input) {
    const income = clampAmount(input.income);
    const savings = clampAmount(input.savings);
    const expenses = Object.keys(input.expenses || {}).reduce((sum, k) => sum + clampAmount(input.expenses[k]), 0);
    const allocated = expenses + savings;
    const remaining = income - allocated;
    const pct = income > 0 ? Math.round(allocated / income * 100) : (allocated > 0 ? 100 : 0);
    return { expenses, allocated, remaining, pct };
  }

  function moveInTotal(costs) {
    return ['deposit', 'firstRent', 'basics', 'utilities'].reduce((sum, k) => sum + clampAmount(costs[k]), 0);
  }

  // Benefits finder rules. Inputs: age '18-20' | '21-22' | '23-25';
  // careAt18 'yes' | 'adopted16' | 'no'; school 'yes' | 'planning' | 'no'.
  function findBenefits(a) {
    const young = a.age === '18-20';
    const under23 = a.age === '18-20' || a.age === '21-22';
    const inCare = a.careAt18 === 'yes';
    const careOrAdopted = inCare || a.careAt18 === 'adopted16';
    const school = a.school === 'yes' || a.school === 'planning';
    const out = [];
    if (young && inCare) out.push('collaborative_care');
    if (under23 && careOrAdopted) out.push('voluntary_services');
    if (careOrAdopted && school) out.push('etv');
    if (young && school) out.push('scholars21');
    out.push('opportunity_passport');
    if (inCare) out.push('medicaid26');
    if (young && inCare) out.push('credit_report');
    if (young && inCare) out.push('car_insurance');
    out.push('credit_build');
    return out;
  }

  // Savings goal with optional Opportunity Passport $1-for-$1 match (lifetime cap 3,500).
  function matchPlan(p) {
    const goal = clampAmount(p.goal), start = clampAmount(p.start), monthly = clampAmount(p.monthly);
    const base = { monthsPlain: 0, monthsMatched: 0, matchApplied: 0, ownNeeded: goal, state: 'ok' };
    if (goal <= 0) return Object.assign(base, { state: 'no-goal' });
    if (start >= goal) return Object.assign(base, { state: 'reached', ownNeeded: start });
    if (monthly <= 0) return Object.assign(base, { monthsPlain: null, monthsMatched: null, state: 'no-monthly' });
    const monthsPlain = Math.ceil((goal - start) / monthly);
    if (!p.matchOn) return Object.assign(base, { monthsPlain, monthsMatched: monthsPlain });
    const cap = Math.max(0, MATCH_CAP - clampAmount(p.matchUsed));
    const ownNeeded = goal <= 2 * cap ? Math.ceil(goal / 2) : goal - cap;
    const ownTotal = Math.max(start, ownNeeded);
    const monthsMatched = Math.max(0, Math.ceil((ownNeeded - start) / monthly));
    const matchApplied = Math.max(0, Math.min(cap, ownTotal, goal - ownTotal));
    return Object.assign(base, { monthsPlain, monthsMatched, matchApplied, ownNeeded: ownTotal });
  }

  return { MATCH_CAP, clampAmount, formatMoney, splitMoney, budgetSummary, moveInTotal, findBenefits, matchPlan };
}));
