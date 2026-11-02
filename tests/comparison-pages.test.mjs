import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GUIDES,renderGuide,renderHub,renderSitemap,escapeHtml,safeHttps} from '../scripts/comparison-pages.mjs';
import {offerSignature} from '../site/value-core.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const data={
 catalog:JSON.parse(read('site/data/deals.json')),
 status:JSON.parse(read('site/data/status.json')),
 ledger:JSON.parse(read('site/data/verifications.json')),
 mvnoEvidence:JSON.parse(read('site/data/mvno-evidence.json'))
};
const fixed={today:'2026-11-02'};

test('all four comparison topics map to distinct real carriers and official source references',()=>{
 assert.equal(GUIDES.length,4);
 assert.equal(new Set(GUIDES.map(x=>x.slug)).size,4);
 for(const guide of GUIDES){
  assert.ok(data.catalog.plans.some(x=>x.carrier===guide.left));
  assert.ok(data.catalog.plans.some(x=>x.carrier===guide.right));
  assert.ok(guide.shopperNotes.length>=3);
  for(const source of guide.refs)assert.ok(safeHttps(source.url));
 }
});
test('generated pages have descriptive static SEO copy, canonical URL, disclosure and billing notes',()=>{
 for(const guide of GUIDES){
  const html=renderGuide(guide,data,fixed);
  assert.match(html,/<title>/);
  assert.match(html,/<meta name="description"/);
  assert.match(html,/property="og:title"/);
  assert.match(html,/rel="canonical"/);
  assert.ok(html.includes('compare/'+guide.slug+'.html'));
  assert.match(html,/not verified checkout pricing/i);
  assert.match(html,/Catalog reference date/);
  assert.match(html,/Last automated source check/);
  assert.match(html,/Single-line standard-rate snapshots/);
  assert.match(html,/Official carrier terms/);
  assert.match(html,/Try Switch &amp; Save/);
  assert.match(html,/no affiliate commissions/i);
  assert.doesNotMatch(html,/"aggregateRating"|"Product"|"Offer"/);
 }
});
test('regardless of intro promotion, static baseline uses standard regular price',()=>{
 const tello=GUIDES.find(g=>g.slug==='tello-vs-mint-mobile');
 const html=renderGuide(tello,data,fixed);
 assert.match(html,/Everyday 10GB/);
 assert.match(html,/\$15\.00\/mo catalog regular/);
 assert.match(html,/\$180\.00/);
 assert.match(html,/Intro offer excluded from this baseline/);
 const usm=renderGuide(GUIDES.find(g=>g.slug==='us-mobile-vs-visible'),data,fixed);
 assert.match(usm,/\$25\.00\/mo catalog regular/);
 assert.match(usm,/\$300\.00/);
});
test('annual prepaid carriers must disclose the full cash commitment',()=>{
 const html=renderGuide(GUIDES.find(g=>g.slug==='cricket-vs-h2o-wireless'),data,fixed);
 assert.match(html,/Annual prepaid; confirm actual renewal terms/);
 assert.match(html,/\$192\.00 paid annually \(\$16\.00\/mo equivalent\)/);
});
test('documented source price conflicts withhold both rate and annual total in public comparison',()=>{
 const fixture=structuredClone(data);
 fixture.mvnoEvidence.offers['tello-starter']={state:'headline_mismatch',observedPrice:17};
 const html=renderGuide(GUIDES.find(g=>g.slug==='tello-vs-mint-mobile'),fixture,fixed);
 const match=html.match(/<tr class="needs-review"><th scope="row">Starter 2GB<\/th>.*?<\/tr>/s);
 assert.ok(match,'conflicted plan row is present for context');
 assert.match(match[0],/Price requires review/);
 assert.match(match[0],/Withheld/);
 assert.doesNotMatch(match[0],/\$10\.00\/mo catalog regular/);
});
test('full term reviews are never invented and material changes invalidate the signed record',()=>{
 const offer=data.catalog.plans.find(x=>x.id==='tello-starter');
 const fixture=structuredClone(data);
 const guide=GUIDES.find(g=>g.slug==='tello-vs-mint-mobile');
 const html=renderGuide(guide,fixture,fixed);
 assert.match(html,/Not independently verified/);
 fixture.ledger.offers[offer.id]={scope:'full_terms',verifiedAt:'2026-11-02',
   evidenceUrl:'https://tello.com/buy/custom_plans',signature:offerSignature(offer)};
 assert.match(renderGuide(guide,fixture,fixed),/Manual full-terms check: 2026-11-02/);
 fixture.catalog.plans.find(x=>x.id===offer.id).price=19;
 assert.match(renderGuide(guide,fixture,fixed),/Terms changed since manual review/);
});
test('HTML special characters and unsafe links are escaped or withheld',()=>{
 assert.equal(escapeHtml('<script>"A & B"</script>'),
  '&lt;script&gt;&quot;A &amp; B&quot;&lt;/script&gt;');
 for(const bad of ['javascript:alert(1)','data:text/html,a','http://carrier.test','https://user:pass@example.com/a'])
  assert.equal(safeHttps(bad),null);
 const fixture=structuredClone(data);
 const target=fixture.catalog.plans.find(x=>x.id==='visible');
 target.plan='<script>Window alert</script>';
 target.url='javascript:alert(1)';
 const html=renderGuide(GUIDES.find(x=>x.slug==='us-mobile-vs-visible'),fixture,fixed);
 assert.ok(html.includes('&lt;script&gt;Window alert&lt;/script&gt;'));
 assert.ok(!html.includes('href="javascript:'));
 assert.ok(!html.includes('<script>Window'));
});
test('comparison hub links every curated guide, uses honest language and has no hidden referral links',()=>{
 const html=renderHub(data);
 for(const g of GUIDES)assert.ok(html.includes('compare/'+g.slug+'.html'));
 assert.match(html,/unverified starting point/);
 assert.match(html,/No affiliate commissions/);
});
test('sitemap includes only reader-facing pages and excludes noindex editorial workbench',()=>{
 const xml=renderSitemap(data);
 for(const g of GUIDES)assert.ok(xml.includes('compare/'+g.slug+'.html'));
 assert.ok(xml.includes('carrier-comparisons.html'));
 assert.ok(!xml.includes('review-workbench.html'));
 const editor=read('site/review-workbench.html');
 assert.match(editor,/name="robots" content="noindex,nofollow"/);
 assert.match(editor,/not a sign-off/i);
});
test('empty or uncurated guide data fails safely',()=>{
 const fake={...GUIDES[0],slug:'forged'};
 assert.throws(()=>renderGuide(fake,data,fixed),/curated/);
 const noPlans=structuredClone(data);
 noPlans.catalog.plans=[];
 assert.throws(()=>renderGuide(GUIDES[0],noPlans,fixed),/No catalog plans/);
});
