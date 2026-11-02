import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  isExpired, expireKnownOffers, phoneCosts,
  parseBoostCandidates, reviewBoostCandidates, offerDiff, safeSourceUrl,
} from '../scripts/auto-core.mjs';

const original = () => ({
  checked: '2026-10-29',
  plans: [
    { id: 'visible', promo: { price: 12.50, ends: '2026-10-29' }, price: 25 },
    { id: 'tello', promo: { price: 10, ends: '2026-11-09' }, price: 15 },
  ],
  phones: [
    { id: 'expired', price: 0, ends: '2026-10-31' },
    { id: 'ongoing', price: 10 },
    { id: 'future', price: 40, ends: '2027-01-31' },
  ],
});

test('strict expiration keeps an offer valid through its last advertised day', () => {
  assert.equal(isExpired('2026-11-01', '2026-11-01'), false);
  assert.equal(isExpired('2026-10-31', '2026-11-01'), true);
  assert.equal(isExpired(null, '2026-11-01'), false);
});

test('expiration rules remove only known-expired promos and phone offers', () => {
  const before = original();
  const result = expireKnownOffers(before, '2026-11-01');
  assert.equal(result.next.plans[0].promo, undefined);
  assert.equal(result.next.plans[1].promo.price, 10);
  assert.deepEqual(result.next.phones.map(p => p.id), ['ongoing', 'future']);
  assert.deepEqual(result.removed.map(p => p.id), ['expired']);
  assert.equal(before.plans[0].promo.price, 12.5, 'input not mutated');
  assert.equal(result.next.checked, '2026-10-29', 'do not fake full review');
});

test('Boost text yields review candidates when price, plan, and port language appear nearby', () => {
  const html = `<html><body>
  <h2>SHOP OUR DEALS</h2>
  <h2>iPHONE 16e</h2><p>$29.99 <s>$599.99</s></p><p>With our Unlimited Premium Plan and when you keep your number</p>
  <h2>Free Phones When You Switch</h2>
  <p>Get the moto g - 2026 for</p><p>$0.00 <s>$299.99</s></p><p>On our $60 Unlimited Premium Plan and keep your number.</p>
  <h3>Galaxy A17 5G</h3><p>for</p><p>$19.99 <s>$269.99</s></p><p>On our $50 Unlimited+ Plan and keep your number.</p>
  <h3>moto g play - 2026 for</h3><p>$0.00 <s>$249.99</s></p><p>On our $50 Unlimited+ Plan and keep your number.</p>
  </body></html>`;
  const deals = parseBoostCandidates(html);
  assert.equal(deals['boost-motog']?.price, 0);
  assert.equal(deals['boost-motog']?.planPrice, 60);
  assert.equal(deals['boost-a17']?.price, 19.99);
  assert.equal(deals['boost-gplay']?.price, 0);
  assert.equal(deals['boost-16e'], undefined, 'unknown plan cost, do not guess');
});

test('does not emit a candidate when listing has wrong plan or no port language', () => {
  const html = '<h3>Galaxy A17 5G</h3><p>for</p><p>$0</p><p>On our $60 Unlimited Premium Plan and keep your number.</p>';
  assert.equal(parseBoostCandidates(html)['boost-a17'], undefined);
  const html2 = '<h3>Galaxy A17 5G</h3><p>for</p><p>$0</p><p>On our $50 Unlimited+ Plan.</p>';
  assert.equal(parseBoostCandidates(html2)['boost-a17'], undefined);
});

test('all price candidates require review without changing or adding offers', () => {
  const data = { phones: [
    { id: 'boost-a17', carrier: 'Boost Mobile', port: true, planPrice: 50, price: 0, stay: 3 },
    { id: 'boost-motog', carrier: 'Boost Mobile', port: true, planPrice: 60, price: 0 },
  ] };
  const before = structuredClone(data);
  const reviews = reviewBoostCandidates(data, {
    'boost-a17': { price: 19.99, planPrice: 50 },
    'boost-motog': { price: 0, planPrice: 60 },
    'boost-gplay': { price: 500, planPrice: 50 },
  }, 'https://www.boostmobile.com/deals');
  assert.deepEqual(data, before, 'changed, unchanged, and new candidates never alter the catalog');
  assert.deepEqual(reviews.map(x => x.id), ['boost-a17', 'boost-motog', 'boost-gplay']);
  assert.ok(reviews.every(x => x.type === 'review_required' && x.verified === false));
  assert.equal(reviews[0].candidatePrice, 19.99);
  assert.equal(reviews[1].currentPrice, 0, 'unchanged price still requires review');
  assert.equal(reviews[2].currentPrice, null, 'unknown offer is not inserted');
});

test('mixed-product text cannot silently introduce an unverified promotion', () => {
  const html = '<article><h3>Galaxy A17 5G</h3><p>for $0</p><p>Requires trade-in.</p></article>' +
    '<article><h3>Unrelated handset</h3><p>On our $50 Unlimited+ Plan and keep your number.</p></article>';
  const data = { phones: [{ id: 'boost-a17', carrier: 'Boost Mobile', port: true, planPrice: 50, price: 49.99 }] };
  const before = structuredClone(data);
  const candidates = parseBoostCandidates(html);
  assert.equal(candidates['boost-a17'].price, 0, 'heuristic still sees the ambiguous text');
  const reviews = reviewBoostCandidates(data, candidates, 'https://www.boostmobile.com/deals');
  assert.deepEqual(data, before, 'ambiguous candidate cannot overwrite verified pricing');
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].verified, false);
  assert.match(reviews[0].reason, /manual review/);
});

test('scanner publishes review alerts without verified-price claims or catalog mutations', async t => {
  const fixture = await mkdtemp(join(tmpdir(), 'five-bars-scan-'));
  try {
    await mkdir(join(fixture, 'scripts'));
    await mkdir(join(fixture, 'site/data'), { recursive: true });
    for (const name of ['auto-core.mjs', 'auto-update.mjs']) {
      await copyFile(new URL('../scripts/' + name, import.meta.url), join(fixture, 'scripts', name));
    }
    const data = {
      checked: '2026-10-29', sources: [{ name: 'Boost', url: 'https://www.boostmobile.com/deals' }],
      plans: Array.from({ length: 8 }, (_, i) => ({ id: 'plan-' + i, price: 25, url: 'https://example.com/plans' })),
      phones: Array.from({ length: 8 }, (_, i) => ({
        id: i === 0 ? 'boost-a17' : 'phone-' + i,
        price: 19.99, planPrice: 50, carrier: 'Boost Mobile', port: true,
        url: 'https://example.com/phones',
      })),
    };
    await writeFile(join(fixture, 'site/data/deals.json'), JSON.stringify(data));
    // The unchanged price must still be unverified. All fetches are local mocks.
    const html = '<html><body><h3>Galaxy A17 5G</h3><p>for $19.99</p><p>On our $50 Unlimited+ Plan and keep your number.</p></body></html>';
    t.mock.method(globalThis, 'fetch', async url => ({
      ok: true, status: 200, url, headers: new Headers({ 'content-type': 'text/html' }),
      body: new Response(html).body,
    }));
    await import(pathToFileURL(join(fixture, 'scripts/auto-update.mjs')).href);
    const saved = JSON.parse(await readFile(join(fixture, 'site/data/deals.json'), 'utf8'));
    const status = JSON.parse(await readFile(join(fixture, 'site/data/status.json'), 'utf8'));
    assert.deepEqual(saved, data);
    assert.deepEqual(status.automaticChanges, []);
    assert.equal(status.summary.priceCandidatesForReview, 1);
    assert.equal(status.summary.pricesMatchedOnCarrierPage, undefined);
    assert.equal(status.offers['boost-a17'].state, 'source_reachable');
    assert.equal(status.offers['boost-a17'].reviewRequired, true);
    assert.ok(Object.values(status.offers).every(offer => offer.state !== 'price_and_plan_checked'));
    assert.ok(status.alerts.some(alert => alert.id === 'boost-a17' && alert.verified === false));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('phone upfront and commitment are different; a future-service requirement is not prepaid cash', () => {
  const c = phoneCosts({ price: 49.99, planPrice: 60, stay: 3 });
  assert.ok(Math.abs(c.dueToday - 109.99) < .001);
  assert.ok(Math.abs(c.minCommitment - 229.99) < .001);
  assert.ok(Math.abs(c.firstYear - 769.99) < .001);
  assert.equal(c.firstMonthAssumed, true);
});

test('rebate does not reduce payment due at checkout; prepaid months do', () => {
  const metro = phoneCosts({ price: 99.99, rebate: 100, planPrice: 55, stay: 3 });
  assert.ok(Math.abs(metro.dueToday - 154.99) < .001);
  assert.ok(Math.abs(metro.minCommitment - 164.99) < .001);
  assert.equal(metro.netDevice, 0);
  const cricket = phoneCosts({ price: 29.99, planPrice: 60, prepay: 3 });
  assert.ok(Math.abs(cricket.dueToday - 209.99) < .001);
});

test('bundled services and monthly credits do not double charge included months', () => {
  assert.equal(phoneCosts({ price: 579, bundle: 12 }).firstYear, 579);
  assert.equal(phoneCosts({ price: 480, bundle: 6, planPrice: 40 }).firstYear, 720);
  assert.equal(phoneCosts({ price: 1199, planPrice: 45, credit: 20, creditMonths: 24 }).firstYear, 1499);
  assert.equal(phoneCosts({ price: 349, planPrice: null }).dueToday, null);
});

test('catalog diff records expiry and price change, not mere last-check timestamps', () => {
  const before = original();
  const after = expireKnownOffers(before, '2026-11-01').next;
  assert.deepEqual(offerDiff(before, after), { added: [], removed: ['expired'], changed: ['visible'] });
});

test('only public HTTPS source URLs are accepted', () => {
  assert.equal(safeSourceUrl('https://www.boostmobile.com/deals'), true);
  assert.equal(safeSourceUrl('http://example.com'), false);
  assert.equal(safeSourceUrl('https://127.0.0.1/'), false);
  assert.equal(safeSourceUrl('https://user:pass@example.com'), false);
});
