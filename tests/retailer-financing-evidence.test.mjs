import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planCost,phoneCost,rankMatches,offerSignature,checkoutEvidenceIssues,verificationState} from '../site/value-core.mjs';
import {phoneCosts} from '../scripts/auto-core.mjs';
import {researchStatus,buildResearchAudit} from '../scripts/source-research.mjs';
import {simulateSwitch} from '../site/switch-core.mjs';
import {checkoutFixture} from './helpers/checkout-fixtures.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const catalog=read('site/data/deals.json'),research=read('site/data/research-evidence.json');
const ledger=read('site/data/verifications.json'),today='2026-11-02';
const device=id=>catalog.phones.find(p=>p.id===id);
const plan=id=>catalog.plans.find(p=>p.id===id);
const switchPhone=id=>simulateSwitch({catalog,type:'phone',id,researchEvidence:research,
 scenario:{lines:1,currentMonthly:90,horizon:12,today,newCustomer:true,canPort:true}});

test('Cricket yearly BYOD rate is $300 due upfront, never $25 due monthly',()=>{
 const p=plan('cricket-25'),r=research.records['cricket-25'];
 assert.equal(p.price,25);
 assert.equal(p.billingMonths,12);
 assert.equal(p.billingUpfront,300);
 assert.equal(p.maxLines,1);
 assert.equal(researchStatus(p,r,{today}).state,'published_match');
 assert.equal(planCost(p,1,{today}).upfrontDue,300);
 assert.equal(planCost(p,1,{today}).year,300);
 assert.equal(planCost(p,2,{today}),null,'unsupported multi-line annual quote rejected');
 assert.equal(researchStatus({...p,billingUpfront:25},r,{today}).state,'conflict');
 assert.equal(verificationState(p,ledger.offers?.['cricket-25'],today).status,'unverified');
});

test('Three unsupported retailer phone claims remain browse-only and never get invented quotes',()=>{
 for(const id of ['wm-vzpre-a17','wm-st-a17','simple-a16']){
  const p=device(id);
  assert.ok(p.listingHold.length>30);
  assert.equal(research.records[id],undefined,'retailer headline not certified as official carrier record');
  assert.equal(phoneCost(p).due,null);
  assert.equal(phoneCosts(p).dueToday,null);
  assert.equal(phoneCost(p,{newCustomer:true,discountQualified:true}).year,null);
  assert.notEqual(offerSignature(p),offerSignature({...p,listingHold:undefined}));
  assert.ok(checkoutEvidenceIssues(p,checkoutFixture(p),today).some(x=>/held for evidence review/.test(x)));
  assert.throws(()=>switchPhone(id),/under evidence review/i);
  assert.equal(rankMatches({plans:[],phones:[p]},{lines:1,canPort:true,newCustomer:true},today).phoneMatches,0);
 }
});

test('Financed phone advertisements never become verified upfront prices from eventual credits',()=>{
 for(const id of ['tmo-18pro','vz-18pro','att-18pro']){
  const p=device(id),r=research.records[id];
  assert.equal(p.postpaid,true);
  assert.equal(p.financingMonths,36);
  assert.equal(p.grossRetailPrice,1199.99);
  assert.equal(p.planPrice,null,'selected recurring service plan remains unpriced');
  assert.equal(r.publishedServiceUnpriced,true);
  assert.equal(researchStatus(p,r,{today}).state,'published_partial');
  assert.equal(phoneCost(p).due,null);
  assert.equal(phoneCost(p).year,null);
  assert.equal(phoneCosts(p).dueToday,null);
  assert.throws(()=>switchPhone(id),/Financed\/trade-in/i);
  assert.equal(verificationState(p,ledger.offers?.[id],today).status,'unverified');
  assert.equal(researchStatus({...p,grossRetailPrice:1000},r,{today}).state,'conflict');
  assert.equal(researchStatus({...p,planPrice:80},r,{today}).state,'conflict');
 }
});

test('US Mobile Pixel source confirms a device offer but not its missing annual cash',()=>{
 const p=device('usm-p11'),r=research.records['usm-p11'];
 assert.equal(p.planPrice,null);
 assert.equal(p.prepay,12);
 assert.equal(r.publishedPlanMonthly,null);
 assert.equal(researchStatus(p,r,{today}).state,'published_partial');
 assert.equal(phoneCost(p,{newCustomer:true}).year,null);
 assert.equal(researchStatus({...p,planPrice:16.58},r,{today}).state,'conflict');
});

test('Audit accurately separates published matching baselines, partial financing and remaining retailers',()=>{
 const audit=buildResearchAudit({catalog,research,ledger,today});
 assert.deepEqual([audit.summary.offers,audit.summary.researched,audit.summary.publishedPriceMatches,
  audit.summary.publishedPartial,audit.summary.notResearched,audit.summary.listingHolds,audit.summary.manuallyFullyReviewed],
  [78,75,71,4,3,3,0]);
 assert.ok(['wm-vzpre-a17','wm-st-a17','simple-a16'].every(id=>
  audit.offers.some(x=>x.id===id&&x.researchState==='not_researched'&&x.listingHold)));
});
