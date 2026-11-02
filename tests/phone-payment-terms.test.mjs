import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {phoneCost,rankMatches,offerSignature,checkoutEvidenceIssues} from '../site/value-core.mjs';
import {phoneCosts} from '../scripts/auto-core.mjs';
import {researchStatus} from '../scripts/source-research.mjs';
import {simulateSwitch} from '../site/switch-core.mjs';
import {checkoutFixture} from './helpers/checkout-fixtures.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const catalog=JSON.parse(read('site/data/deals.json'));
const research=JSON.parse(read('site/data/research-evidence.json'));
const get=id=>catalog.phones.find(p=>p.id===id);
const today='2026-11-02';
const scenario={lines:1,currentMonthly:100,canPort:true,today,horizon:12};
const switchFor=(offer,extra={})=>simulateSwitch({catalog:{plans:[],phones:[offer]},type:'phone',
 id:offer.id,researchEvidence:research,scenario:{...scenario,...extra}});

test('all seven Boost device estimates require explicit AutoPay confirmation',()=>{
 const offers=catalog.phones.filter(p=>p.carrier==='Boost Mobile');
 assert.equal(offers.length,7);
 for(const p of offers){
  assert.equal(p.undiscountedPlanPrice,p.planPrice+5);
  const base=phoneCost(p),qualified=phoneCost(p,{discountQualified:true});
  assert.equal(base.planPrice,p.planPrice+5);
  assert.equal(qualified.planPrice,p.planPrice);
  assert.ok(base.conditionalDiscountUnconfirmed);
  assert.ok(!qualified.conditionalDiscountUnconfirmed);
  assert.ok(Math.abs(base.year-qualified.year-60)<0.001);
  assert.equal(phoneCost(p,{discountQualified:'true'}).year,base.year);
  for(const discountQualified of [false,true]){
   const cost=phoneCost(p,{discountQualified});
   const deterministic=phoneCosts(p,{discountQualified});
   const report=switchFor(p,{discountQualified});
   assert.ok(Math.abs(cost.due-deterministic.dueToday)<0.001);
   assert.ok(Math.abs(cost.year-report.results[12].newTotal)<0.001);
   assert.ok(Math.abs(cost.due-report.chosen.upfrontDue)<0.001);
  }
 }
});

test('phone finder applies the selected AutoPay rate to budget filters',()=>{
 const sample={plans:[],phones:[get('boost-stylus')]};
 const prefs={lines:1,canPort:true,budget:50};
 assert.equal(rankMatches(sample,prefs,today).phoneMatches,0);
 assert.equal(rankMatches(sample,{...prefs,discountQualified:true},today).phoneMatches,1);
 assert.equal(rankMatches(sample,{...prefs,budget:55},today).phoneMatches,1);
});

test('legacy phone cards use the same AutoPay choice as other calculators',()=>{
 const source=read('site/index.html').match(/^function phoneCalc\(d\)\{[\s\S]*?^\}/m)[0];
 const offer=get('boost-razr');
 for(const discountqualified of [false,true]){
  const actual=runInNewContext(source+';phoneCalc(offer)',{
   offer,state:{t:{discountqualified}},endInfo:()=>null});
  const expected=phoneCost(offer,{discountQualified:discountqualified});
  assert.equal(actual.planPrice,expected.planPrice);
  assert.equal(actual.due,expected.due);
  assert.equal(actual.year,expected.year);
 }
});

test('fixed service blocks are charged once, independently of later monthly renewal assumptions',()=>{
 const offer=get('tracfone-a17');
 const cost=phoneCost(offer);
 assert.equal(offer.planPrice,50);
 assert.equal(cost.due,135);
 assert.equal(cost.commitment,135);
 assert.equal(cost.year,585);
 const report=switchFor(offer);
 assert.equal(report.chosen.upfrontDue,135);
 assert.equal(report.results[12].serviceTotal,585);
 assert.equal(report.results[24].serviceTotal,1185);
 assert.equal(report.results[36].serviceTotal,1785);
 assert.ok(report.warnings.some(w=>w.includes('confirm the actual renewal interval')));
 assert.equal(phoneCost({...offer,stay:6}).commitment,285);
 const quote=checkoutFixture(offer);
 assert.ok(checkoutEvidenceIssues(offer,{...quote,upfrontCents:13499},today).some(x=>x.includes('fixed prepaid')));
 assert.deepEqual(checkoutEvidenceIssues(offer,{...quote,upfrontCents:13500},today),[]);
});

test('removing mandatory transfer eligibility never creates a cheaper free Total A36 recommendation',()=>{
 const offer=get('total-a36');
 assert.equal(offer.port,true);
 assert.equal(phoneCost(offer).due,165);
 assert.equal(rankMatches({plans:[],phones:[offer]},{canPort:false},today).phoneMatches,0);
 assert.equal(rankMatches({plans:[],phones:[offer]},{canPort:true},today).phoneMatches,1);
 assert.throws(()=>switchFor(offer,{canPort:false}),/transfer|port/i);
});

test('source and human-signature checks cover AutoPay rates and fixed prepaid amounts',()=>{
 for(const [id,changes] of [
  ['boost-stylus',{undiscountedPlanPrice:50}],
  ['boost-stylus',{planDiscountCondition:undefined}],
  ['tracfone-a17',{prepaidServiceTotal:120}],
  ['tracfone-a17',{prepaidServiceTotal:undefined}],
  ['total-a36',{port:false}]
 ]){
  const offer=get(id),changed={...offer,...changes};
  assert.notEqual(offerSignature(offer),offerSignature(changed));
  assert.equal(researchStatus(changed,research.records[id],{today}).state,'conflict');
  assert.throws(()=>switchFor(changed),/published-source research conflicts/i);
 }
 const record=research.records['boost-stylus'];
 assert.equal(researchStatus(get('boost-stylus'),{...record,publishedUndiscountedPlanPrice:40},{today}).state,'invalid');
});
