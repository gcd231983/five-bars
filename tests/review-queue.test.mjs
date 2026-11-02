import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReviewQueue} from '../scripts/review-queue.mjs';
import {checkoutRecord} from './helpers/checkout-fixtures.mjs';

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
