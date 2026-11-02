import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAlertFeed} from '../scripts/alert-engine.mjs';

const catalog=()=>({
  plans:[
    {id:'tello',carrier:'Tello',plan:'Everyday 10GB',url:'https://tello.com/buy/custom_plans',
      price:15,promo:{price:10,months:3,ends:'2026-11-09'}},
    {id:'helium-air',carrier:'Helium Mobile',plan:'Air 10GB',price:15,
      url:'https://support.hellohelium.com/en/articles/17734883-plans-pricing'},
    {id:'good2go-annual1',carrier:'Good2Go Mobile',plan:'Annual 1GB',price:5,
      billingMonths:12,billingUpfront:60,url:'https://annualplans.good2gomobile.com/home-page'}
  ],
  phones:[
    {id:'boost-a17',carrier:'Boost Mobile',phone:'Samsung Galaxy A17 5G',price:0,planPrice:50,
     url:'https://www.boostmobile.com/deals'}
  ]
});
const timestamp='2026-11-02T15:00:00Z';
function run(args={}){
  return buildAlertFeed({catalog:catalog(),generatedAt:timestamp,today:'2026-11-02',...args});
}
test('expiring catalog deadlines generate only one narrowly qualified alert',()=>{
 const feed=run();
 assert.equal(feed.summary.active,1);
 assert.equal(feed.summary.critical,0);
 assert.equal(feed.summary.high,1);
 const e=feed.events[0];
 assert.equal(e.key,'deadline:plan:tello:2026-11-09');
 assert.equal(e.type,'deadline');
 assert.equal(e.daysUntil,7);
 assert.match(e.description,/carrier has not independently reconfirmed/);
 assert.doesNotMatch(JSON.stringify(feed),/source_unavailable|full_terms_not_verified/);
});
test('officially corroborated Tello deadline is visible but does not issue another unconfirmed-deadline notification',()=>{
  const before=catalog();
  const tello=before.plans.find(p=>p.id==='tello');
  tello.promo.officialDeadlineEvidence={
    sourceUrl:'https://blog.tello.com/news/halloween-deal-10gb-for-10-mo-first-3-months/',
    observedOn:'2026-11-02'
  };
  const feed=run({catalog:before});
  const alert=feed.events.find(event=>event.offerId==='tello');
  assert.equal(alert.key,'deadline:plan:tello:2026-11-09','stable event key preserves issue deduplication');
  assert.equal(alert.active,true,'date should remain visible until expiration');
  assert.equal(alert.notify,false,'published deadline is resolved, not another owner notification');
  assert.equal(alert.evidenceScope,'carrier_published_deadline_not_checkout');
  assert.equal(alert.officialEvidenceObservedOn,'2026-11-02');
  assert.match(alert.description,/NOT a live or customer-specific checkout/);
  assert.equal(alert.sourceUrl,tello.promo.officialDeadlineEvidence.sourceUrl);
  const next=run({catalog:before,today:'2026-11-10',generatedAt:'2026-11-10T15:00:00Z',previousFeed:feed});
  assert.equal(next.summary.active,0);
  assert.equal(next.events.find(event=>event.offerId==='tello').active,false);
});

test('unattributed or future-dated deadline evidence cannot suppress unresolved owner review',()=>{
  const variants=[
    {sourceUrl:'https://example.com/promotion',observedOn:'2026-11-02'},
    {sourceUrl:'https://blog.tello.com/promotion',observedOn:'2026-11-10'},
    {sourceUrl:'http://blog.tello.com/promotion',observedOn:'2026-11-02'}
  ];
  for(const proof of variants){
    const before=catalog();
    before.plans[0].promo.officialDeadlineEvidence=proof;
    const alert=run({catalog:before}).events[0];
    assert.equal(alert.notify,true);
    assert.equal(alert.evidenceScope,'catalog_end_date_not_carrier_reconfirmed');
  }
});

test('same expiration stays one event despite repeated daily scans',()=>{
 const first=run();
 const next=run({today:'2026-11-03',generatedAt:'2026-11-03T14:00:00Z',previousFeed:first});
 assert.deepEqual(next.events.filter(x=>x.active).map(x=>x.key),first.events.map(x=>x.key));
 assert.equal(next.events[0].firstSeen,'2026-11-02');
 assert.equal(next.events[0].lastSeen,'2026-11-03');
 assert.equal(next.summary.active,1);
 const after=run({today:'2026-11-10',generatedAt:'2026-11-10T14:00:00Z',previousFeed:next});
 assert.equal(after.summary.active,0);
 assert.equal(after.events[0].active,false,'expired promotional date is historical, not a newly notified price change');
});
test('scope-limited official mismatches notify once; source failures never count as price changes',()=>{
 const mvnoEvidence={generatedAt:timestamp,offers:{
  'helium-air':{state:'headline_mismatch',observedPrice:19,sourceUrl:'https://support.hellohelium.com/en/articles/17734883-plans-pricing'},
  'good2go-annual1':{state:'source_unavailable'}
 }};
 const feed=run({mvnoEvidence});
 const conflict=feed.events.find(e=>e.type==='conflict');
 assert.equal(conflict.key,'conflict:plan:helium-air:2026-11-02');
 assert.match(conflict.description,/partial price comparison/);
 assert.ok(!feed.events.some(e=>e.offerId==='good2go-annual1'));
 const pending=run({
   mvnoEvidence:{generatedAt:'2026-11-03T14:00:00Z',offers:{
    'helium-air':{state:'unresolved_mismatch'},'good2go-annual1':{state:'not_found'}
   }},
   today:'2026-11-03',generatedAt:'2026-11-03T14:00:00Z',previousFeed:feed,
 });
 assert.equal(pending.events.filter(e=>e.type==='conflict').length,1);
 assert.equal(pending.events.find(e=>e.type==='conflict').key,conflict.key);
});
test('when conflicting official headline is resolved, the alert archives rather than continuing to notify',()=>{
 const mismatch=run({phoneEvidence:{offers:{'boost-a17':{state:'headline_mismatch',observedPrice:29,observedPlanPrice:50}},source:'https://www.boostmobile.com/deals'}});
 const settled=run({phoneEvidence:{offers:{'boost-a17':{state:'headline_matched',observedPrice:0,observedPlanPrice:50}}},
   previousFeed:mismatch,today:'2026-11-03',generatedAt:'2026-11-03T14:00:00Z'});
 assert.equal(settled.events.find(e=>e.type==='conflict').active,false);
 assert.equal(settled.summary.active,1,'Tello deadline remains active');
});
test('real observed headline rate changes need two dated observations AND a new exact match',()=>{
 const history={schema:1,offers:{'helium-air':[
  {date:'2026-10-31',price:15},{date:'2026-11-02',price:18}
 ]}};
 const matched={generatedAt:timestamp,offers:{'helium-air':{state:'headline_matched',observedPrice:18}}};
 const feed=run({mvnoHistory:history,mvnoEvidence:matched});
 const diff=feed.events.find(e=>e.type==='rate-change');
 assert.equal(diff.key,'rate-change:plan:helium-air:2026-11-02');
 assert.equal(diff.previousPrice,15);
 assert.equal(diff.currentPrice,18);
 assert.match(diff.description,/\$15\.00\/mo.*\$18\.00\/mo/);
 const following=run({today:'2026-11-03',generatedAt:'2026-11-03T15:00:00Z',mvnoHistory:history,mvnoEvidence:matched});
 assert.equal(following.events.some(e=>e.type==='rate-change'),false,'old observation must not create daily repeat');
 const unknown=run({mvnoHistory:history,mvnoEvidence:{offers:{'helium-air':{state:'source_unavailable'}}}});
 assert.equal(unknown.events.some(e=>e.type==='rate-change'),false);
});
test('annual upfront amount or required phone plan change can trigger a headline-change alert',()=>{
 const mvnoHistory={offers:{'good2go-annual1':[
  {date:'2026-11-01',price:5,upfront:60},
  {date:'2026-11-02',price:5,upfront:72}
 ]}};
 const phoneHistory={offers:{'boost-a17':[
  {date:'2026-11-01',price:0,planPrice:50},
  {date:'2026-11-02',price:0,planPrice:60}
 ]}};
 const feed=run({
  mvnoHistory,phoneHistory,
  mvnoEvidence:{offers:{'good2go-annual1':{state:'headline_matched'}}},
  phoneEvidence:{offers:{'boost-a17':{state:'headline_matched'}}},
 });
 const changes=feed.events.filter(e=>e.type==='rate-change');
 assert.equal(changes.length,2);
 assert.ok(changes.some(e=>e.kind==='phone'&&e.offerId==='boost-a17'));
 assert.match(changes.find(e=>e.offerId==='good2go-annual1').description,/\$72\.00 annual upfront/);
});
test('no alerts for blocked sites, routine unverified offers, or duplicate unchanged observations',()=>{
 const feed=run({
  catalog:{plans:[{id:'tello',carrier:'Tello',plan:'10GB',price:15,url:'https://tello.com/buy/custom_plans'}],phones:[]},
  mvnoEvidence:{offers:{tello:{state:'source_unavailable'}}},
  mvnoHistory:{offers:{tello:[{date:'2026-11-01',price:15},{date:'2026-11-02',price:15}]}}
 });
 assert.equal(feed.summary.active,0);
 assert.deepEqual(feed.events,[]);
});
test('rejects malformed dates, catalog schemas, and unsafe event identifiers',()=>{
 assert.throws(()=>run({today:'2026-02-30'}));
 assert.throws(()=>run({catalog:{plans:'bad',phones:[]}}));
 const fed=run({catalog:{plans:[{id:'bad-id<script>',carrier:'X',plan:'Y',promo:{ends:'2026-11-09'}}],phones:[]}});
 assert.equal(fed.events.length,0);
});
