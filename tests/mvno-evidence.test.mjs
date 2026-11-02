import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MVNO_SOURCES,MVNO_PLAN_RULES,parseMvnoHeadlines,evaluateMvnoEvidence} from '../scripts/mvno-evidence.mjs';

const fixture=()=>({
  plans:[
    {id:'helium-air',carrier:'Helium Mobile',plan:'Air 10GB',price:15},
    {id:'helium-infinity',carrier:'Helium Mobile',plan:'Infinity Unlimited',price:30},
    {id:'mobilex-unlimited10',carrier:'MobileX',plan:'Unlimited 10',price:14.88},
    {id:'mobilex-unlimited30',carrier:'MobileX',plan:'Unlimited 30',price:24.88},
    {id:'good2go-annual1',carrier:'Good2Go Mobile',plan:'Annual 1GB',price:5,billingMonths:12,billingUpfront:60},
    {id:'good2go-annual3',carrier:'Good2Go Mobile',plan:'Annual 3GB',price:10,billingMonths:12,billingUpfront:120},
    {id:'good2go-annual5',carrier:'Good2Go Mobile',plan:'Annual 5GB',price:20,billingMonths:12,billingUpfront:240},
  ]
});
const mark={
 helium:'<html><main><h2>Plans & Pricing</h2><p>Air Plan $15/month</p><div>Infinity Plan $30/month</div></main></html>',
 mobilex:'<html><main><h2>MobileX FAQ</h2><p>Basic Unlimited 10GB: $14.88</p><p>Basic Unlimited 30GB: $24.88</p></main></html>',
 good2go:'<html><main><div>$60 Annual Payment Includes nationwide service and unlimited voice, 1GB high speed data per month</div><div>$120 Annual Payment Includes nationwide service and unlimited voice, 3GB high speed data per month</div><div>$240 Annual Payment Includes nationwide service and unlimited voice, 5GB high speed data per month</div></main></html>',
};
const sources=(html=mark)=>Object.entries(MVNO_SOURCES).map(([key,url])=>({
  url,ok:true,finalUrl:url,_html:html[key],
}));
const run=(cat=fixture(),html=mark,prior=null,day='2026-11-02')=>
  evaluateMvnoEvidence({catalog:cat,sources:sources(html),day,checkedAt:day+'T14:00:00.000Z',previousHistory:prior});

test('extracts only exact rate-bearing Helium and MobileX official plan headings',()=>{
 const a=parseMvnoHeadlines('helium',mark.helium);
 assert.deepEqual(Object.keys(a.observations).sort(),['helium-air','helium-infinity']);
 assert.equal(a.observations['helium-air'].price,15);
 assert.equal(a.observations['helium-infinity'].price,30);
 const b=parseMvnoHeadlines('mobilex',mark.mobilex);
 assert.deepEqual(Object.keys(b.observations).sort(),['mobilex-unlimited10','mobilex-unlimited30']);
 assert.equal(b.observations['mobilex-unlimited10'].price,14.88);
 assert.equal(b.observations['mobilex-unlimited30'].price,24.88);
 assert.ok(/^[a-f0-9]{20}$/.test(b.observations['mobilex-unlimited30'].evidenceDigest));
});
test('Good2Go match includes exact upfront annual payment AND allowance, not a monthly charge',()=>{
 const p=parseMvnoHeadlines('good2go',mark.good2go);
 assert.deepEqual(Object.keys(p.observations).sort(),['good2go-annual1','good2go-annual3','good2go-annual5']);
 assert.equal(p.observations['good2go-annual1'].upfront,60);
 assert.equal(p.observations['good2go-annual1'].price,5);
 assert.equal(p.observations['good2go-annual3'].upfront,120);
 assert.equal(p.observations['good2go-annual3'].price,10);
 assert.equal(p.observations['good2go-annual5'].upfront,240);
 assert.equal(p.observations['good2go-annual5'].price,20);
});
test('all exact headline observations are explicitly partial and do not certify full conditions',()=>{
 const {report,history}=run();
 assert.equal(report.summary.plansChecked,7);
 assert.equal(report.summary.headlineMatches,7);
 assert.equal(report.summary.needReview,0);
 assert.equal(report.summary.observationsRecorded,7);
 for(const [id,p] of Object.entries(report.offers)){
   assert.equal(p.state,'headline_matched',id);
   assert.equal(p.fullTermsVerified,false);
   assert.match(p.note,/NOT verified/);
   assert.equal(p.scope,'official_plan_rate_and_billing_term_headline');
   assert.equal(history.offers[id].length,1);
 }
});
test('price or upfront discrepancies trigger review, never edit the catalog',()=>{
 const cat=fixture(),before=structuredClone(cat);
 const pages={...mark,
   helium:'Air Plan $20/month Infinity Plan $30/month',
   good2go:mark.good2go.replace('$120 Annual Payment','$180 Annual Payment'),
 };
 const {report,history}=run(cat,pages);
 assert.equal(report.offers['helium-air'].state,'headline_mismatch');
 assert.equal(report.offers['helium-air'].observedPrice,20);
 assert.equal(report.offers['good2go-annual3'].state,'headline_mismatch');
 assert.equal(report.offers['good2go-annual3'].observedUpfront,180);
 assert.equal(report.offers['good2go-annual3'].observedPrice,15);
 assert.equal(report.summary.priceMismatches,2);
 assert.equal(history.offers['good2go-annual3'][0].upfront,180);
 assert.deepEqual(cat,before,'mutating catalog data is prohibited');
});
test('annual billing classification mismatch triggers review without changing offers',()=>{
 const cat=fixture();
 delete cat.plans.find(x=>x.id==='good2go-annual1').billingUpfront;
 const {report}=run(cat);
 assert.equal(report.offers['good2go-annual1'].state,'headline_mismatch');
 assert.equal(report.offers['good2go-annual1'].catalogUpfront,null);
});
test('missing rate-bearing headings fail closed even if plan name and unrelated dollar amount are present',()=>{
 const source={
  helium:'<p>Air Plan</p><aside>$15 is an unrelated referral offer</aside>',
  mobilex:'<p>Basic Unlimited 10GB - learn more. Get $14.88 credit on a device</p>',
  good2go:'<p>$60 Annual Payment for 3GB high speed</p><p>$120 Annual Payment for 1GB high speed</p>',
 };
 const {report}=run(fixture(),source);
 assert.equal(report.summary.headlineMatches,0);
 assert.equal(report.offers['helium-air'].state,'not_found');
 assert.equal(report.offers['mobilex-unlimited10'].state,'not_found');
 assert.equal(report.offers['good2go-annual1'].state,'headline_mismatch');
 assert.equal(report.offers['good2go-annual3'].state,'headline_mismatch');
});
test('contradictory same-plan prices are ambiguous, not a selected best deal',()=>{
 const pages={...mark,helium:mark.helium+'<div>Air Plan $9/month</div>'};
 const {report,history}=run(fixture(),pages);
 assert.equal(report.offers['helium-air'].state,'ambiguous');
 assert.equal(report.summary.missingOrAmbiguous,1);
 assert.equal(history.offers['helium-air'],undefined,'history cannot store an ambiguous quote');
});
test('untrusted, failed or redirected sources never become price evidence',()=>{
 const entries=sources().map(x=>({...x}));
 const fail=entries.find(x=>x.url===MVNO_SOURCES.helium);fail.ok=false;
 const spoof=entries.find(x=>x.url===MVNO_SOURCES.mobilex);spoof.finalUrl='https://mymobilex.com.evil.example/all-faqs/';
 const wrong=entries.find(x=>x.url===MVNO_SOURCES.good2go);wrong.finalUrl='http://annualplans.good2gomobile.com/home-page';
 const {report,history}=evaluateMvnoEvidence({
   catalog:fixture(),sources:entries,day:'2026-11-02',checkedAt:'2026-11-02T14:00:00Z'
 });
 assert.equal(report.summary.headlineMatches,0);
 assert.equal(report.summary.sourceUnavailable,7);
 assert.deepEqual(history.offers,{});
});
test('source outages preserve old evidence history but never claim a new match',()=>{
 const before=run().history;
 const {report,history}=evaluateMvnoEvidence({
   catalog:fixture(),sources:sources().map(x=>({...x,ok:false})),
   checkedAt:'2026-11-03T14:00:00Z',day:'2026-11-03',previousHistory:before,
 });
 assert.equal(report.summary.sourceUnavailable,7);
 assert.equal(report.summary.observationsRecorded,0);
 assert.deepEqual(history,before);
});
test('one observation per day and 90 observation-day history limit',()=>{
 let last=run().history;
 assert.equal(run(fixture(),mark,last).history.offers['helium-air'].length,1);
 for(let i=1;i<=97;i++){
   const day=new Date(Date.UTC(2026,10,2+i)).toISOString().slice(0,10);
   last=run(fixture(),mark,last,day).history;
 }
 assert.equal(last.offers['helium-air'].length,90);
 assert.equal(last.offers['helium-air'][0].date,'2026-11-10');
 assert.equal(last.offers['good2go-annual1'].at(-1).upfront,60);
 assert.ok(last.offers['helium-air'].every(x=>!Object.hasOwn(x,'_html')));
});
test('source allowlist contains only the three independently scoped official carriers',()=>{
 assert.deepEqual(Object.keys(MVNO_SOURCES).sort(),['good2go','helium','mobilex']);
 assert.equal(Object.keys(MVNO_PLAN_RULES).length,7);
 const d=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
 for(const [key,url] of Object.entries(MVNO_SOURCES)){
   assert.ok(d.sources.some(x=>x.url===url),'source '+key+' absent from catalog');
 }
 assert.ok(!Object.values(MVNO_SOURCES).some(u=>u.includes('tello.com')||u.includes('h2owireless.com')),
   'blocked carriers cannot be presented as automatically rate-validated');
});
