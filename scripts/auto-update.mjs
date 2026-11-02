// Free, conservative daily updates for Five Bars. Node 20+, no AI/API keys.
// Usage: node scripts/auto-update.mjs
//        node scripts/auto-update.mjs --dry-run (does not write files)
// This scans canonical public URLs; a reachable page is NOT proof of a deal.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BOOST_SOURCE, evaluatePriceEvidence } from './price-evidence.mjs';
import { evaluateMvnoEvidence } from './mvno-evidence.mjs';
import { buildReviewQueue } from './review-queue.mjs';
import {
  easternDate, expireKnownOffers, offerDiff,
  parseBoostCandidates, reviewBoostCandidates, safeSourceUrl,
} from './auto-core.mjs';

const root = new URL('../', import.meta.url);
const dataFile = new URL('site/data/deals.json', root);
const statusFile = new URL('site/data/status.json', root);
const changesFile = new URL('site/data/changes.json', root);
const priceEvidenceFile = new URL('site/data/price-evidence.json', root);
const priceHistoryFile = new URL('site/data/price-history.json', root);
const mvnoEvidenceFile = new URL('site/data/mvno-evidence.json', root);
const mvnoHistoryFile = new URL('site/data/mvno-history.json', root);
const reviewQueueFile = new URL('site/data/review-queue.json',root);
const manualReviewsFile = new URL('site/data/verifications.json',root);
const dryRun = process.argv.includes('--dry-run');
const concurrency = 5;
const requestTimeoutMs = 12000;
const maxBytes = 1_500_000;
const BOOST_URL = BOOST_SOURCE;

async function json(url, fallback = null) {
  try { return JSON.parse(await readFile(url, 'utf8')); } catch { return fallback; }
}
async function writeJson(url, data) {
  const temp = new URL(url.pathname + '.tmp', url);
  await writeFile(temp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await rename(temp, url);
}

async function download(url) {
  if (!safeSourceUrl(url)) return { ok: false, error: 'Non-public or invalid HTTPS URL' };
  try {
    const r = await fetch(url, {
      headers: {
        'user-agent': 'FiveBarsDealMonitor/2.0 (+https://github.com/gcd231983/five-bars)',
        accept: 'text/html,application/xhtml+xml,application/xml,text/xml,text/plain;q=0.9',
      },
      redirect: 'follow', signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (!r.ok) return { ok: false, status: r.status, error: 'HTTP ' + r.status };
    if (!safeSourceUrl(r.url)) return { ok: false, error: 'Unexpected redirect destination' };
    const contentType = r.headers.get('content-type') || '';
    if (contentType && !/(text\/|html|xml)/i.test(contentType)) {
      return { ok: false, error: 'Source did not return text or HTML' };
    }
    const chunks = [];
    let size = 0;
    const reader = r.body?.getReader();
    if (!reader) return { ok: false, error: 'Empty response' };
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > maxBytes) throw new Error('Page exceeded 1.5 MB safety limit');
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    const bytes = Buffer.concat(chunks);
    const html = bytes.toString('utf8');
    if (html.trim().length < 100) return { ok: false, error: 'Page too short to verify' };
    if (/<title>\s*(?:access denied|just a moment|attention required|captcha)/i.test(html)) {
      return { ok: false, error: 'Source blocked automated access' };
    }
    return { ok: true, status: r.status, html, finalUrl: r.url };
  } catch (e) { return { ok: false, error: String(e?.message || e).slice(0, 110) }; }
}

async function mapped(items, fn) {
  const results = Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

function description(result) {
  return result.ok ? 'Fetched public page; deal terms are not independently confirmed' : (result.error || 'Page unavailable');
}

const now = new Date();
const today = easternDate(now);
const previous = await json(dataFile);
if (!previous || !Array.isArray(previous.plans) || !Array.isArray(previous.phones)) {
  throw new Error('Existing deals.json missing or invalid; no files were changed');
}
const { next, changed: expiredPromos, removed: expiredPhones } = expireKnownOffers(previous, today);
const previousStatus = await json(statusFile, {});
const sourceInputs = (previous.sources || []).filter(s => s && safeSourceUrl(s.url));
const sources = await mapped(sourceInputs, async s => {
  const result = await download(s.url);
  const hash = result.ok ? createHash('sha256').update(result.html.replace(/\s+/g, ' ').slice(0, 20000)).digest('hex') : null;
  return {
    name: s.name, url: s.url, ok: result.ok,
    finalUrl: result.ok ? result.finalUrl : null,
    status: result.status || null, note: description(result),
    changedSincePreviousScan: !!(hash && previousStatus.sources?.find(p => p.url === s.url)?.hash && previousStatus.sources.find(p => p.url === s.url).hash !== hash),
    hash,
    // transient raw content is only used for matching, not committed
    _html: result.ok ? result.html : null,
  };
});
const sourceSuccess = sources.filter(s => s.ok).length;
if (sourceSuccess === 0) throw new Error('No source pages could be fetched; preserving previous data');

const alerts = [];
const automaticChanges = [...expiredPromos, ...expiredPhones].map(x => ({ ...x, type: 'expiration' }));
const carrierFeed = sources.find(s => s.url === BOOST_URL && s.ok);
const extracted = carrierFeed ? parseBoostCandidates(carrierFeed._html) : {};
const priceReviews = reviewBoostCandidates(next, extracted, BOOST_URL);
alerts.push(...priceReviews);
// This is an additional, stricter and deliberately limited official-headline
// check. Only price/plan/port headline text is compared; full terms still
// require the manual review ledger. Missing/ambiguous pages NEVER edit prices.
const oldHistory = await json(priceHistoryFile, {schema:1,offers:{}});
const { report:priceEvidence, history:priceHistory } = evaluatePriceEvidence({
  catalog:next,
  html:carrierFeed?._html || '',
  sourceAvailable:!!carrierFeed,
  finalUrl:carrierFeed?.finalUrl || BOOST_URL,
  checkedAt:now.toISOString(),
  day:today,
  previousHistory:oldHistory
});
alerts.push(...priceEvidence.alerts);
// MVNO plan headline checks use exact official-plan labels, prices and billing
// periods (not arbitrary nearby dollar amounts). Blocked/changed pages are
// reported as unavailable or not found; no price edits are inferred.
const oldMvnoHistory = await json(mvnoHistoryFile,{schema:1,offers:{}});
const oldMvnoEvidence = await json(mvnoEvidenceFile,{schema:1,offers:{}});
const {report:mvnoEvidence,history:mvnoHistory} = evaluateMvnoEvidence({
  catalog:next, sources, checkedAt:now.toISOString(), day:today,
  previousHistory:oldMvnoHistory,previousReport:oldMvnoEvidence,
});
alerts.push(...mvnoEvidence.alerts);

// Check each known offer URL, but NEVER treat HTTP 200 as proof that a specific
// price, promotion, or activation condition still exists.
const allOffers = [...next.plans, ...next.phones];
const urlList = [...new Set(allOffers.map(p => p.url).filter(safeSourceUrl))];
const scannedLinks = await mapped(urlList, async url => ({ url, ...(await download(url)) }));
const linkMap = new Map(scannedLinks.map(({ url, ok, status, error }) => [url, { ok, status, error }]));
const offerStatuses = {};
for (const offer of allOffers) {
  const link = linkMap.get(offer.url);
  offerStatuses[offer.id] = {
    state: link?.ok ? 'source_reachable' : 'source_unavailable',
    checkedAt: now.toISOString(),
    note: link?.ok ? 'Carrier or retailer page reachable; individual deal terms are not verified' : (link?.error || 'Invalid URL'),
  };
}
for (const [id, proof] of Object.entries(priceEvidence.offers)) {
  if (offerStatuses[id]) {
    offerStatuses[id].priceEvidenceState = proof.state;
    offerStatuses[id].priceEvidenceScope = proof.scope;
    offerStatuses[id].priceEvidenceNote = proof.note;
    if (proof.state === 'headline_mismatch' || proof.state === 'ambiguous') {
      offerStatuses[id].reviewRequired = true;
    }
  }
}
for (const [id,proof] of Object.entries(mvnoEvidence.offers)) {
  if (offerStatuses[id]) {
    offerStatuses[id].mvnoPriceEvidenceState = proof.state;
    offerStatuses[id].mvnoPriceEvidenceScope = proof.scope;
    offerStatuses[id].mvnoPriceEvidenceNote = proof.note;
    if (['headline_mismatch','ambiguous','unresolved_mismatch'].includes(proof.state)) {
      offerStatuses[id].reviewRequired = true;
    }
  }
}
for (const { id } of priceReviews) {
  if (offerStatuses[id]) {
    offerStatuses[id].reviewRequired = true;
    offerStatuses[id].note += '; unverified price candidate requires manual review; catalog unchanged';
  }
}
const unavailable = allOffers.filter(p => offerStatuses[p.id].state === 'source_unavailable');
for (const p of unavailable) alerts.push({ id: p.id, type: 'source_unavailable', reason: 'Could not verify the offer link; offer remains listed with caution' });

// Never allow an outage or bad extractor to replace a large part of the catalog.
if (next.plans.length < Math.max(8, Math.floor(previous.plans.length * 0.8)) ||
    next.phones.length < Math.max(8, Math.floor(previous.phones.length * 0.6))) {
  throw new Error('Safety threshold failed: too many offers would disappear; no files changed');
}
const diff = offerDiff(previous, next);
const status = {
  schema: 1,
  generatedAt: now.toISOString(),
  timezone: 'America/New_York',
  lastFullReview: previous.checked || null,
  method: 'Deterministic public-source monitoring (no AI). HTTP availability does not prove a deal is valid.',
  summary: {
    sourcesChecked: sourceInputs.length, sourcesReachable: sourceSuccess,
    offerLinksChecked: urlList.length, offerLinksReachable: scannedLinks.filter(x => x.ok).length,
    priceCandidatesForReview: priceReviews.length,
    officialHeadlineMatches: priceEvidence.summary.headlineMatches,
    officialHeadlineMismatches: priceEvidence.summary.priceMismatches,
    officialHeadlineReviewAlerts: priceEvidence.summary.needReview,
    officialPriceObservations: priceEvidence.summary.observationsRecorded,
    mvnoHeadlineMatches: mvnoEvidence.summary.headlineMatches,
    mvnoHeadlineMismatches: mvnoEvidence.summary.priceMismatches,
    mvnoReviewAlerts: mvnoEvidence.summary.needReview,
    mvnoObservations: mvnoEvidence.summary.observationsRecorded,
    automaticChanges: automaticChanges.length, expiredPhoneDealsRemoved: expiredPhones.length,
    reviewAlerts: alerts.length,
  },
  sources: sources.map(({ _html, ...s }) => s),
  offers: offerStatuses,
  automaticChanges,
  alerts: alerts.slice(0, 100),
};
const manualReviews = await json(manualReviewsFile,{offers:{}});
const reviewQueue = buildReviewQueue({
  catalog:next, status, mvnoEvidence, phoneEvidence:priceEvidence,
  manualRecords:manualReviews?.offers||{},
  generatedAt:now.toISOString(),today
});
status.summary.offersNeedingReview=reviewQueue.summary.needAttention;
status.summary.highPriorityReviews=reviewQueue.summary.critical+reviewQueue.summary.high;
const newChanges = { date: today, ...diff };

if (!dryRun) {
  // A successful scan does not pretend that 60 offers have been fully vetted.
  // Preserve the last fully reviewed date in deals.json.
  await writeJson(dataFile, next);
  await writeJson(changesFile, newChanges);
  await writeJson(statusFile, status);
  await writeJson(priceEvidenceFile, priceEvidence);
  await writeJson(priceHistoryFile, priceHistory);
  await writeJson(mvnoEvidenceFile, mvnoEvidence);
  await writeJson(mvnoHistoryFile, mvnoHistory);
  await writeJson(reviewQueueFile, reviewQueue);
}
console.log(JSON.stringify({
  date: today, dryRun,
  sources: `${sourceSuccess}/${sourceInputs.length}`,
  links: `${status.summary.offerLinksReachable}/${urlList.length}`,
  priceCandidatesForReview: status.summary.priceCandidatesForReview,
  officialHeadlineMatches: priceEvidence.summary.headlineMatches,
  officialHeadlineReviewAlerts: priceEvidence.summary.needReview,
  priceObservations: priceEvidence.summary.observationsRecorded,
  mvnoHeadlineMatches: mvnoEvidence.summary.headlineMatches,
  mvnoReviewAlerts: mvnoEvidence.summary.needReview,
  mvnoPriceObservations: mvnoEvidence.summary.observationsRecorded,
  mvnoStates: Object.fromEntries(Object.entries(mvnoEvidence.offers).map(([id,p])=>[id,p.state])),
  reviewQueue: reviewQueue.summary,
  ...(dryRun ? {sourceFailures: sources.filter(x=>!x.ok).map(x=>({name:x.name,note:x.note,status:x.status}))} : {}),
  catalogChanges: diff,
  alerts: alerts.length,
  wroteFiles: !dryRun,
}, null, 2));
