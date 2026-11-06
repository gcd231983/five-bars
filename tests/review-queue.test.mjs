import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReviewQueue} from '../scripts/review-queue.mjs';
import {checkoutRecord} from './helpers/checkout-fixtures.mjs';
import {readFileSync} from 'node:fs';

const dt='2026-11-02T14:20:00.000Z';
const today='2026-11-02';
const mk=()=>({
  plans:[
    {id:'tello',carrier:'Tello',plan:'10GB',price:15,url:'https://tello.com/buy/custom_plans',promo:{price:10,months:3,ends:'2026-11-09'},priceSourceDate:'2026-11-02'},
    {id:'helium',carrier:'Helium Mobile',plan:'Air',price:15,url:'https://support.hellohelium.com/example',priceSourceDate:'2026-11-02'},
    {id:'h2o',carrier:'H2O Wireless',plan:'10GB',price:20,url:'https://www.h2owireless.com/',priceSourceDate:'2026-09-01'},
    {id:'good2go',carrier:'Good2Go Mobile',plan:'1GB Annual',price:5,url:'https://annualplans.good2gomobile.com/home-page',billingMonths:12,billingUpfront:60},
  ],
  phones:[{id:'phone1',carrier:'Boost Mobile',phone:'Phone',price:0,url:'https://www.boostmobile.com/deals',ends:'2026-11-01'}]
});
const output=(override={})=>buildReviewQueue({catalog:mk(),today,generatedAt:dt,...override});

test('sorts actual conflicts above expiring promotions, blocked links and missing full reviews',()=>{
 const doc=output({
  status:{offers:{tello:{state:'source_unavailable'},h2o:{state:'source_unavailable'},helium:{state:'source_reachable'}}},
  mvnoEvidence:{generatedAt:dt,offers:{helium:{state:'headline_mismatch',observedPrice:25}}},
 });
 assert.equal(doc.summary.offers,5);
 assert.equal(doc.summary.withoutCurrentManualReview,5);
 assert.deepEqual(doc.items.map(r=>r.id).slice(0,2),['helium','phone1']);
 assert.equal(doc.items[0].priority,'critical');
 assert.equal(doc.items[1].priority,'critical');
 assert.equal(doc.items.find(r=>r.id==='tello').priority,'high');
 assert.equal(doc.items.find(r=>r.id==='h2o').priority,'medium');
 assert.ok(doc.items.find(r=>r.id==='h2o').reasonCodes.includes('catalog_price_stale'));
 assert.equal(doc.summary.blockedProviders,2);
 assert.equal(doc.blockedProviders.find(r=>r.carrier==='Tello').affected,1);
});
test('source reachability and price headline match cannot create a manual full-terms verification',()=>{
 const doc=output({
  status:{offers:{good2go:{state:'source_reachable'}}},
  mvnoEvidence:{generatedAt:dt,offers:{good2go:{state:'headline_matched'}}}
 });
 assert.equal(doc.items.find(x=>x.id==='good2go').manualReviewStatus,'unverified');
 assert.ok(doc.items.find(x=>x.id==='good2go').reasonCodes.includes('full_terms_not_verified'));
 assert.equal(doc.summary.withoutCurrentManualReview,5);
});
test('only a signed, dated manual record can remove the independent full-review requirement',()=>{
 const catalog=mk();
 const record=checkoutRecord(catalog.plans[3],'2026-11-01',
  'https://annualplans.good2gomobile.com/home-page');
 const doc=buildReviewQueue({catalog,generatedAt:dt,today,manualRecords:{good2go:record}});
 assert.equal(doc.summary.withoutCurrentManualReview,4);
 assert.equal(doc.items.find(x=>x.id==='good2go'),undefined);
 assert.equal(doc.summary.offers,5);
 const altered=structuredClone(catalog);
 altered.plans[3].price=10;
 const mismatch=buildReviewQueue({catalog:altered,generatedAt:dt,today,manualRecords:{good2go:record}});
 assert.ok(mismatch.items.some(x=>x.id==='good2go'));
});
test('preserves unresolved price discrepancies across missing official sources',()=>{
 const doc=output({mvnoEvidence:{generatedAt:dt,offers:{helium:{state:'unresolved_mismatch'}}}});
 const conflict=doc.items.find(x=>x.id==='helium');
 assert.equal(conflict.priority,'critical');
 assert.ok(conflict.reasonCodes.includes('official_price_conflict'));
});
test('does not turn stale evidence into a full-terms verified claim',()=>{
 const doc=output({mvnoEvidence:{generatedAt:'2026-10-25T14:00:00Z',offers:{helium:{state:'headline_matched'}}}});
 assert.ok(doc.items.find(x=>x.id==='helium').reasonCodes.includes('official_evidence_aged'));
 assert.equal(doc.items.find(x=>x.id==='helium').manualReviewStatus,'unverified');
});
test('does not accept invalid dates, private sources, or malformed catalogs',()=>{
 assert.throws(()=>buildReviewQueue({catalog:{plans:[],phones:[]},today:'2026-02-30',generatedAt:dt}));
 assert.throws(()=>buildReviewQueue({catalog:{plans:null,phones:[]},today,generatedAt:dt}));
 const catalog=mk();catalog.phones[0].url='javascript:alert(1)';
 const doc=buildReviewQueue({catalog,today,generatedAt:dt});
 assert.equal(doc.items.find(x=>x.id==='phone1').link,null);
});
test('queue output contains only public offer metadata, no scraped web page payloads',()=>{
 const data=output();
 const json=JSON.stringify(data);
 assert.doesNotMatch(json,/_html|cookie|authorization/i);
 assert.ok(data.items.every(x=>x.id&&x.carrier&&Array.isArray(x.reasons)));
 assert.ok(data.items.length<=data.summary.offers);
});

test('real catalog prioritizes partial research and held retailer paths without inventing checkouts',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
 const researchEvidence=JSON.parse(readFileSync(new URL('../site/data/research-evidence.json',import.meta.url),'utf8'));
 const doc=buildReviewQueue({catalog,researchEvidence,today:'2026-11-06',
   generatedAt:'2026-11-06T15:00:00.000Z'});
 assert.equal(doc.summary.offers,78);
 assert.equal(doc.summary.withoutCurrentManualReview,78);
 assert.equal(doc.summary.retailerHolds,3);
 assert.equal(doc.summary.stockHolds,6);
 assert.deepEqual(doc.summary.publicationEvidence,{
   publishedMatches:72,partial:4,unresearched:2,aged:0,conflictsOrInvalid:0
 });
 const missing=doc.items.find(x=>x.id==='wm-vzpre-a17');
 assert.ok(missing.reasonCodes.includes('published_research_missing'));
 assert.ok(missing.reasonCodes.includes('retailer_listing_hold'));
 assert.equal(missing.priority,'high');
 const incomplete=doc.items.find(x=>x.id==='vz-18pro');
 assert.equal(incomplete.officialResearchState,'published_partial');
 assert.ok(incomplete.reasonCodes.includes('published_research_partial'));
 assert.equal(incomplete.priority,'high');
 const stock=doc.items.find(x=>x.reasonCodes.includes('documented_stock_hold'));
 assert.ok(stock);
 assert.ok(stock.reasonCodes.includes('full_terms_not_verified'));
 assert.equal(doc.items[0].id,'tello','near-deadline published promotion remains highest review priority');
 assert.equal(catalog.checked,'2026-10-29','automatic source research must not modify the human catalog review date');
});

test('official research conflict or invalid future research is critical, not a verified checkout',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
 const researchEvidence=JSON.parse(readFileSync(new URL('../site/data/research-evidence.json',import.meta.url),'utf8'));
 const changed=structuredClone(catalog);
 changed.plans.find(x=>x.id==='usm-starter').price=999;
 const conflict=buildReviewQueue({catalog:changed,researchEvidence,
   today:'2026-11-06',generatedAt:'2026-11-06T15:00:00Z'});
 const item=conflict.items.find(x=>x.id==='usm-starter');
 assert.equal(item.officialResearchState,'conflict');
 assert.equal(item.priority,'critical');
 assert.equal(item.manualReviewStatus,'unverified');
 const future=structuredClone(researchEvidence);
 future.records['usm-starter'].observedOn='2099-01-01';
 const invalid=buildReviewQueue({catalog,researchEvidence:future,
   today:'2026-11-06',generatedAt:'2026-11-06T15:00:00Z'});
 assert.equal(invalid.items.find(x=>x.id==='usm-starter').officialResearchState,'invalid');
 assert.throws(()=>buildReviewQueue({catalog,researchEvidence:{schema:1,records:[]},
   today:'2026-11-06',generatedAt:'2026-11-06T15:00:00Z'}),/Invalid official research/);
});

test('repeated seven-day failures elevate conditional offers without declaring the promotion withdrawn',()=>{
 const catalog=mk(),ts='2026-11-08T15:00:00.000Z';
 const snapshot={state:'source_unavailable',sourceUrl:'https://tello.com/buy/custom_plans',
   checkedAt:ts,unavailableSince:'2026-11-01T15:00:00.000Z'};
 const run=(today,scan)=>buildReviewQueue({catalog,today,generatedAt:ts,status:{offers:{tello:scan}}});
 const old=run('2026-11-08',snapshot);
 const item=old.items.find(x=>x.id==='tello');
 assert.ok(item.reasonCodes.includes('conditional_promo_uncheckable_7d'));
 assert.equal(item.priority,'high');
 assert.equal(item.linkUnavailableSince,snapshot.unavailableSince);
 assert.equal(old.summary.prolongedConditionalPromos,1);
 assert.equal(catalog.plans[0].promo.price,10,'queue never edits an advertised rate');
 const brief=run('2026-11-08',{...snapshot,unavailableSince:'2026-11-05T15:00:00Z'});
 assert.equal(brief.summary.prolongedConditionalPromos,0);
 const stale=run('2026-11-08',{...snapshot,checkedAt:'2026-11-01T15:00:00Z'});
 assert.equal(stale.summary.prolongedConditionalPromos,0,'stale scanner report never claims a fresh seven-day outage');
 const recovered=run('2026-11-08',{...snapshot,state:'source_reachable',unavailableSince:null});
 assert.equal(recovered.summary.prolongedConditionalPromos,0);
 const afterEnd=run('2026-11-10',snapshot);
 assert.equal(afterEnd.summary.prolongedConditionalPromos,0,'expired promotions use the separate known-deadline rule');
 assert.ok(afterEnd.items.find(x=>x.id==='tello').reasonCodes.includes('promotion_past_end'));
});
