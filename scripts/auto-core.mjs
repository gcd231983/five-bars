// Five Bars deterministic data helpers. No AI, APIs, or packages required.

export function easternDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

export function isExpired(date, today) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && date < today;
}

export function expireKnownOffers(data, today) {
  const next = structuredClone(data);
  const removed = [];
  const changed = [];
  for (const p of next.plans) {
    if (p.promo && isExpired(p.promo.ends, today)) {
      delete p.promo;
      changed.push({ id: p.id, field: 'promo', reason: 'Published end date passed' });
    }
  }
  next.phones = next.phones.filter(p => {
    if (isExpired(p.ends, today)) {
      removed.push({ id: p.id, reason: 'Published deal end date passed' });
      return false;
    }
    return true;
  });
  return { next, removed, changed };
}

export function phoneCosts(d) {
  const device = Number(d.price);
  const plan = Number.isFinite(d.planPrice) ? Number(d.planPrice) : null;
  const rebate = Math.max(0, Number(d.rebate) || 0);
  const prepay = Math.max(0, Number(d.prepay) || 0);
  const stay = Math.max(0, Number(d.stay) || 0);
  const bundle = Math.max(0, Number(d.bundle) || 0);
  const credit = Math.max(0, Number(d.credit) || 0);
  const creditMonths = Math.min(12, Math.max(0, Number(d.creditMonths) || 0));
  const netDevice = Math.max(0, device - rebate);
  // These are estimates before taxes, fees, financed-device terms, and any
  // conditional discount clawback. The first month is assumed due at signup
  // unless the phone bundle already includes it.
  const dueToday = bundle ? device : (plan == null ? null : device + plan * Math.max(1, prepay));
  const minCommitment = bundle ? device : (plan == null ? null : (device - rebate) + plan * Math.max(1, prepay, stay));
  const firstYear = bundle
    ? (bundle >= 12 ? device : (plan == null ? null : device + plan * (12 - bundle)))
    : (plan == null ? null : Math.max(0, device + 12 * plan - rebate - credit * creditMonths));
  return { dueToday, minCommitment, firstYear, netDevice, rebate, firstMonthAssumed: !bundle && !prepay };
}

function decodeHtml(html) {
  return html
    .replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(?:h[1-6]|p|div|li|section|article|tr)>/gi, '\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"').replace(/&rsquo;|&#8217;/gi, '\u2019')
    .replace(/\r/g, '').replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n');
}

// These heuristics find candidates for human review only. Nearby text may
// belong to a different product, and neither eligibility nor full terms can
// be verified from a headline. Never use these candidates to update offers.
const BOOST_RULES = [
  { id: 'boost-motog', model: /(?:get\s+the\s+)?moto\s+g\s*[-\u2013]?\s*2026\s+for\s*/i, plan: 60 },
  { id: 'boost-a17', model: /galaxy\s+a17\s+5g\s+(?:for\s*)?/i, plan: 50 },
  { id: 'boost-gplay', model: /moto\s+g\s+play\s*[-\u2013]?\s*2026\s+for\s*/i, plan: 50 },
];

export function parseBoostCandidates(html) {
  const text = decodeHtml(html);
  const prices = {};
  for (const rule of BOOST_RULES) {
    const match = rule.model.exec(text);
    if (!match) continue;
    // Nearby price, plan, and transfer language is a review lead, not proof
    // that all of those terms apply to this product.
    const snippet = text.slice(match.index + match[0].length, match.index + match[0].length + 230);
    const first = snippet.match(/^\s*\$([0-9]{1,4}(?:\.[0-9]{1,2})?)/);
    const planMatch = snippet.match(/(?:on\s+our|with\s+our)[\s\S]{0,22}?\$(\d+(?:\.\d{1,2})?)\s*(?:unlimited|plan)/i)
      || snippet.match(/on\s+our\s+\$(\d+(?:\.\d{1,2})?)[^\n]{0,50}?plan/i);
    const keepNumber = /(?:keep\s+your\s+number|when\s+you\s+switch)/i.test(snippet);
    if (!first || !planMatch || !keepNumber) continue;
    const price = Number(first[1]);
    const plan = Number(planMatch[1]);
    if (Number.isFinite(price) && price >= 0 && price <= 3000 && plan === rule.plan) {
      prices[rule.id] = { price, planPrice: plan, evidence: snippet.replace(/\s+/g, ' ').slice(0, 155) };
    }
  }
  return prices;
}

export function reviewBoostCandidates(data, scraped, sourceUrl) {
  return Object.entries(scraped).map(([id, item]) => {
    const d = data.phones.find(p => p.id === id);
    return {
      id, type: 'review_required', verified: false,
      reason: 'Unverified price candidate; product association and complete eligibility require manual review. Catalog unchanged.',
      currentPrice: d?.price ?? null,
      candidatePrice: item.price, candidatePlanPrice: item.planPrice,
      source: sourceUrl, evidence: item.evidence || null,
    };
  });
}

export function offerDiff(previous, next) {
  const before = new Map([...previous.plans, ...previous.phones].map(p => [p.id, JSON.stringify(p)]));
  const after = new Map([...next.plans, ...next.phones].map(p => [p.id, JSON.stringify(p)]));
  return {
    added: [...after.keys()].filter(k => !before.has(k)),
    removed: [...before.keys()].filter(k => !after.has(k)),
    changed: [...after.keys()].filter(k => before.has(k) && before.get(k) !== after.get(k)),
  };
}

export function safeSourceUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(u.hostname)) return false;
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname);
  } catch { return false; }
}
