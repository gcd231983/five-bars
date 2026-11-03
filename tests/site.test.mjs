import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Script, runInNewContext } from 'node:vm';
import { phoneCosts } from '../scripts/auto-core.mjs';

const sitePath = resolve(dirname(fileURLToPath(import.meta.url)), '../site/index.html');
const skip = !existsSync(sitePath);

test('static site JavaScript parses and uses no misleading cash-to-walk-away label', { skip }, () => {
  const html = readFileSync(sitePath, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'inline site application script exists');
  new Script(match[1]);
  assert.ok(!html.includes('Cash to walk away'), 'old cost label removed');
  assert.ok(html.includes('Due today (est.)'));
  assert.match(html,/gift cards and promotional credits are excluded from ALL estimated totals/i);
  assert.ok(html.includes('Catalog reference date:'));
  assert.ok(html.includes('data/status.json'));
  assert.doesNotMatch(match[1], /\bclaude\b|anthropic|sample\.json/i, 'no model runtime remains');
  assert.doesNotMatch(html, /id="(?:t|p)-ask"/, 'removed assistant UI cannot be activated');
});

test('homepage evidence snapshot discloses sourced claims without treating them as checkout quotes', {skip},()=>{
 const html=readFileSync(sitePath,'utf8');
 assert.match(html, /href="#main-content">Skip to main content/);
 assert.match(html, /id="main-content" tabindex="-1"/);
 assert.match(html, /id="fb-evidence-summary-copy" aria-live="polite"/);
 assert.match(html, /href="launch-readiness.html">View evidence status/);
 const code=html.match(/^function renderEvidenceSummary\(\)\{[\s\S]*?^\}/m)?.[0];
 assert.ok(code,'Dynamic evidence summary is defined');
 const render=research=>{
   const node={textContent:''};
   runInNewContext(code+';renderEvidenceSummary();',{
     $:()=>node,RESEARCH_AUDIT:research
   });
   return node.textContent;
 };
 assert.match(render({summary:{offers:78,researched:76,publishedPriceMatches:72,publishedPartial:4,manuallyFullyReviewed:0,listingHolds:3}}),
   /76 of 78 offers.*72 rate matches, 4 partial.*0 independently documented full-checkout reviews.*3 retailer checkout offers on hold/);
 assert.match(render(null),/counts unavailable/);
 assert.match(render({summary:{offers:78,researched:999}}),/counts unavailable/);
});

test('site and tested phone-cost helper agree on sample checkout math', { skip }, () => {
  const html = readFileSync(sitePath, 'utf8');
  const source = html.match(/^function phoneCalc\(d\)\{[\s\S]*?^\}/m)?.[0];
  assert.ok(source, 'phoneCalc found');
  const browserCalc = runInNewContext(`const endInfo=()=>null; ${source}; phoneCalc;`);
  for (const deal of [
    { price: 49.99, planPrice: 60, stay: 3 },
    { price: 29.99, planPrice: 60, undiscountedPlanPrice:65, planDiscountCondition:'autopay', prepay:2, stay:3 },
    { price: 0, planPrice: 50, prepay:3, prepaidServiceTotal:135 },
    { price: 99.99, rebate: 100, planPrice: 50, firstMonthPlanPrice: 55, stay: 3 },
    { price: 29.99, planPrice: 60, prepay: 3 },
    { price: 579, bundle: 12 },
    { price: 480, bundle: 6, planPrice: 40 },
    { price: 349, planPrice: null },
    { price: 1199, planPrice: 45, credit: 20, creditMonths: 24 },
    { price: 0, planPrice: 35, firstMonthPlanPrice: 40 },
    { price: 0, planPrice: 80, postpaid: true },
    { price: 0, planPrice: 60, availability:'out_of_stock',availabilityObservedOn:'2026-11-02' },
    { price: 199.99, planPrice: null, postpaid: true },
  ]) {
    const fromPage = browserCalc(deal), fromCore = phoneCosts(deal);
    assert.ok(fromPage.due === fromCore.dueToday || Math.abs(fromPage.due - fromCore.dueToday) < .001);
    assert.ok(fromPage.commitment === fromCore.minCommitment || Math.abs(fromPage.commitment - fromCore.minCommitment) < .001);
    assert.ok(fromPage.year === fromCore.firstYear || Math.abs(fromPage.year - fromCore.firstYear) < .001);
    if(deal.postpaid){assert.equal(fromPage.eff,null);assert.equal(fromPage.financingUncertain,true);}
  }
});

test('legacy plan finder never silently applies new-only intro, even when it is published', {skip},()=>{
 const html=readFileSync(sitePath,'utf8');
 const code=html.match(/^function planCalc\(p\)\{[\s\S]*?^\}/m)?.[0];
 assert.ok(code);
 const p={price:25, promo:{price:10,months:6,req:'new'}};
 const testCalc=t=>runInNewContext(code+';planCalc(p);',{p,state:{lines:1,t},endInfo:()=>null});
 assert.equal(testCalc({}).year,300);
 assert.equal(testCalc({newcustomer:true}).year,210);
 assert.match(html,/I qualify for a new-customer or eligible new-line offer/);
});
test('legacy plan list estimates AutoPay and published provider fees like the shared model',()=>{
 const html=readFileSync(sitePath,'utf8');
 const fn=html.match(/^function planCalc\(p\)\{[\s\S]*?^\}/m)?.[0];
 assert.ok(fn);
 const p={price:20,undiscountedPrice:25,discountCondition:'autopay_ebilling',
  knownMonthlyFee:5,knownActivationFee:10,maxLines:1};
 const calc=t=>runInNewContext(fn+';planCalc(p);',{p,state:{lines:1,t},endInfo:()=>null});
 const full=calc({});
 assert.equal(full.now,25);
 assert.equal(full.upfrontDue,40);
 assert.equal(full.year,370);
 const discounted=calc({discountqualified:true});
 assert.equal(discounted.now,20);
 assert.equal(discounted.upfrontDue,35);
 assert.equal(discounted.year,310);
 assert.match(html,/I meet AutoPay \/ eBilling \/ Auto-Refill conditions/);
});
test('source status describes candidates as needing review rather than verified prices', { skip }, () => {
  const html = readFileSync(sitePath, 'utf8');
  const source = html.match(/^function renderSources\(\)\{[\s\S]*?^\}/m)?.[0];
  assert.ok(source, 'renderSources found');
  const nodes = Object.fromEntries(['#src-date', '#scan-status', '#src-list'].map(id => [id, {
    textContent: '', replaceChildren() {},
  }]));
  runInNewContext(`${source}; renderSources();`, {
    $: id => nodes[id], CHECKED: '2026-10-29', SOURCES: [],
    AUTO_STATUS: {
      generatedAt: '2026-11-02T10:17:00Z',
      summary: { sourcesReachable: 7, sourcesChecked: 11, priceCandidatesForReview: 3, reviewAlerts: 5 },
    },
  });
  assert.match(nodes['#scan-status'].textContent, /7\/11 public sources reachable/);
  assert.match(nodes['#scan-status'].textContent, /3 price candidates need manual review/);
  assert.match(nodes['#scan-status'].textContent, /does NOT prove the offer/);
  assert.doesNotMatch(nodes['#scan-status'].textContent, /prices.*matched|prices.*verified/);
});

test('phone row keeps link failure and manual-review warnings together', { skip }, () => {
  const html = readFileSync(sitePath, 'utf8');
  const source = html.match(/^function renderPhones\(\)\{[\s\S]*?^\}/m)?.[0];
  assert.ok(source, 'renderPhones found');
  let rows;
  const nodes = { '#c-phones': {}, '#phones-list': { replaceChildren(...children) { rows = children; } } };
  runInNewContext(`${source}; renderPhones();`, {
    $: id => nodes[id],
    PHONES: [{ id: 'boost-a17', net: 'multi', phone: 'Galaxy A17 5G', carrier: 'Boost Mobile', price: 19.99, planPrice: 50, port: true }],
    phoneVisible: () => true,
    phoneCalc: () => ({ year: 619.99, due: 69.99, commitment: 69.99, eff: 19.99, ei: null }),
    state: { sort: 'year' }, NET: { multi: { name: 'Multiple networks', c: '#000' } }, NEWIDS: new Set(),
    AUTO_STATUS: { offers: { 'boost-a17': { state: 'source_unavailable', reviewRequired: true } } },
    RESEARCH_AUDIT:null,
    money: n => '$' + n.toFixed(2),
    el: (tag, props, ...children) => ({ tag, props, children }),
  });
  const rendered = JSON.stringify(rows);
  assert.match(rendered, /Offer link could not be checked/);
  assert.match(rendered, /Price candidate needs manual review; listed terms are unverified/);
  assert.doesNotMatch(rendered, /matched carrier listing/);
});
