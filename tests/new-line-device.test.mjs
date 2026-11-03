import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {phoneCost,rankMatches,offerSignature,checkoutEvidenceIssues} from '../site/value-core.mjs';
import {phoneCosts} from '../scripts/auto-core.mjs';
import {researchStatus} from '../scripts/source-research.mjs';
import {simulateSwitch} from '../site/switch-core.mjs';
import {checkoutFixture} from './helpers/checkout-fixtures.mjs';

const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const catalog=read('site/data/deals.json');
const research=read('site/data/research-evidence.json');
const get=id=>catalog.phones.find(x=>x.id===id);
const day='2026-11-02';
const eligible={lines:1,currentMonthly:95,horizon:12,today:day,canPort:false,newCustomer:true};
const run=(id,scenario=eligible)=>simulateSwitch({catalog,type:'phone',id,scenario,researchEvidence:research});

test('five new first-party handset records are published-only and material new-line requirements are source-bound',()=>{
 assert.equal(Object.keys(research.records).length,75);
 for(const id of ['att-pre-motog','vzpre-a17','vzpre-16e','mint-p11','mint-s26fe']){
  const p=get(id),r=research.records[id];
  assert.equal(p.newLineRequired,true,id);
  assert.equal(r.publishedNewLineRequired,true,id);
  assert.equal(r.observedOn,day);
  assert.equal(researchStatus(p,r,{today:day}).state,'published_match');
  assert.equal(researchStatus({...p,newLineRequired:false},r,{today:day}).state,'conflict');
  assert.notEqual(offerSignature(p),offerSignature({...p,newLineRequired:false}));
  assert.ok(r.unresolved.some(s=>/checkout/i.test(s)));
 }
 assert.deepEqual(read('site/data/verifications.json').offers,{});
});

test('unknown new-line eligibility never produces quantified device checkout or savings',()=>{
 for(const id of ['att-pre-motog','vzpre-a17','vzpre-16e','mint-p11','usm-p11']){
  const p=get(id);
  assert.equal(phoneCost(p).due,null,id);
  assert.equal(phoneCost(p).year,null,id);
  assert.equal(phoneCosts(p).dueToday,null,id);
  assert.equal(phoneCosts(p).firstYear,null,id);
  assert.throws(()=>run(id,{...eligible,newCustomer:false}),/new-line activation/i,id);
 }
 const matches=rankMatches({plans:[],phones:['att-pre-motog','vzpre-a17','mint-p11'].map(get)},
   {newCustomer:false,canPort:false},day);
 assert.equal(matches.phoneMatches,0);
 assert.ok(matches.messages.some(s=>/new-line-only device promotion/i.test(s)));
 assert.equal(rankMatches({plans:[],phones:[get('att-pre-motog')]},
   {newCustomer:true,canPort:false},day).phoneMatches,1);
});

test('Verizon Unlimited first month and conditional Auto Pay renewal are not confused with $45 limited-data plan',()=>{
 const free=get('vzpre-a17'),iphone=get('vzpre-16e');
 assert.equal(free.price,0);
 assert.equal(free.planPrice,50);
 assert.equal(free.undiscountedPlanPrice,60);
 assert.equal(free.firstMonthPlanPrice,60);
 assert.equal(phoneCost(free,{newCustomer:true}).due,60);
 assert.equal(phoneCost(free,{newCustomer:true}).year,720);
 assert.equal(phoneCost(free,{newCustomer:true,discountQualified:true}).year,610);
 const report=run('vzpre-a17',{...eligible,discountQualified:true});
 assert.equal(report.chosen.upfrontDue,60);
 assert.equal(report.results[12].serviceTotal,610);
 assert.equal(iphone.price,349.99);
 assert.equal(phoneCost(iphone,{newCustomer:true,discountQualified:true}).due,409.99);
 assert.ok(Math.abs(run('vzpre-16e',{...eligible,discountQualified:true}).results[12].newTotal-959.99)<0.001);
 assert.equal(iphone.credit,10);
 assert.equal(iphone.creditMonths,10);
 assert.equal(iphone.newLineRequired,true);
 assert.ok(run('vzpre-16e',{...eligible,discountQualified:true}).warnings.some(s=>/credits/i.test(s)));
});

test('Mint bundles count annual prepaid service exactly once and respect observed stock hold',()=>{
 const p=get('mint-p11'),blocked=get('mint-s26fe');
 assert.equal(p.price,579);
 assert.equal(p.bundle,12);
 assert.equal(p.planPrice,15);
 assert.equal(phoneCost(p,{newCustomer:true}).due,579);
 assert.equal(phoneCost(p,{newCustomer:true}).year,579);
 assert.equal(p.bundleRenewalUnverified,true);
 assert.equal(research.records['mint-p11'].publishedBundleRenewalUnverified,true);
 assert.equal(researchStatus({...p,bundleRenewalUnverified:undefined},research.records['mint-p11'],{today:day}).state,'conflict');
 assert.throws(()=>run('mint-p11'),/renewal rate after month 12 is unknown/i);
 assert.equal(blocked.availability,'out_of_stock');
 assert.equal(blocked.bundleRenewalUnverified,true);
 assert.equal(phoneCost(blocked,{newCustomer:true}).due,null);
 assert.throws(()=>run('mint-s26fe'),/out of stock/i);
});

test('US Mobile Pixel annual price is unproven; retain device reference but no invented service cost',()=>{
 const p=get('usm-p11');
 assert.equal(p.price,539);
 assert.equal(p.prepay,12);
 assert.equal(p.planPrice,null);
 assert.equal(p.newLineRequired,true);
 assert.equal(phoneCost(p,{newCustomer:true}).due,null);
 assert.equal(phoneCost(p,{newCustomer:true}).year,null);
 assert.equal(rankMatches({plans:[],phones:[p]},{newCustomer:true},day).phoneMatches,0);
 assert.throws(()=>run('usm-p11'),/no reliable required monthly plan price/i);
 assert.match(p.note,/ended September 29, 2026/);
});

test('human checkout sign-off must document an actual new-line scenario for these device offers',()=>{
 const p=get('vzpre-a17');
 const quote=checkoutFixture(p);
 assert.ok(checkoutEvidenceIssues(p,{...quote,customerScenario:'existing_customer'},day)
   .some(s=>/new-line scenario/i.test(s)));
});
