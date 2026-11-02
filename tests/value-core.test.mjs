import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
import {
  localDay, validDay, pastEnd, offerSignature, verificationState,
  planCost, phoneCost, rankMatches, normalizeCompare
} from '../site/value-core.mjs';

const sample = {
  plans:[
    {id:'a',carrier:'A',plan:'Starter',net:'att',price:25,unl:true,pri:true,hot:'10GB',
      family:{'2':22,'3':20},promo:{price:15,months:6,req:'port'}},
    {id:'b',carrier:'B',plan:'Unlimited',net:'vzw',price:30,unl:true,pri:false},
    {id:'c',carrier:'C',plan:'Multi',net:'multi',price:18,unl:true,
      promo:{price:10,months:3,req:'port',familyEligible:true}},
    {id:'d',carrier:'D',plan:'Single',net:'att',price:12,unl:true},
  ],
  phones:[
    {id:'p1',phone:'Phone A',carrier:'A',net:'att',price:49.99,planPrice:60,stay:3,port:true},
    {id:'p2',phone:'Phone B',carrier:'B',net:'vzw',price:0,planPrice:50,port:false},
  ]
};

test('Eastern date and end-date parser use strict calendar days',()=>{
  assert.equal(localDay(new Date('2026-11-02T01:47:36Z')),'2026-11-01');
  assert.equal(validDay('2026-02-29'),false);
  assert.equal(validDay('2028-02-29'),true);
  assert.equal(validDay('2026-11-01'),true);
  assert.equal(pastEnd('2026-10-31','2026-11-01'),true);
  assert.equal(pastEnd('2026-11-01','2026-11-01'),false);
});

test('unreviewed offers never acquire a verified label from link checks',()=>{
  const offer=sample.plans[0];
  assert.equal(verificationState(offer,undefined,'2026-11-01').status,'unverified');
  assert.equal(verificationState(offer,{scope:'link_reachable'},'2026-11-01').status,'unverified');
});
test('manual full-terms verification requires matching exact terms and a fresh date',()=>{
  const offer=sample.plans[0];
  const r={scope:'full_terms',signature:offerSignature(offer),verifiedAt:'2026-10-25',evidenceUrl:'https://example.com/offer'};
  assert.equal(verificationState(offer,r,'2026-11-01').status,'verified');
  assert.equal(verificationState({...offer,price:26},r,'2026-11-01').status,'changed');
  assert.equal(verificationState(offer,r,'2026-11-20').status,'stale');
  assert.equal(verificationState(offer,{...r,verifiedAt:'2026-11-20'},'2026-11-01').status,'unverified');
  assert.equal(verificationState(offer,{...r,evidenceUrl:'http://example.com'},'2026-11-01').status,'unverified');
});
test('family discount is not silently multiplied across every line',()=>{
  const cost=planCost(sample.plans[0],2,{today:'2026-11-01'});
  assert.equal(cost.promoUsed,false);
  assert.equal(cost.promoFamilyUnconfirmed,true);
  assert.equal(cost.monthTotal,44);
  assert.equal(cost.year,528);
  const solo=planCost(sample.plans[0],1,{today:'2026-11-01'});
  assert.equal(solo.promoUsed,true);
  assert.equal(solo.year,240);
  const confirmed=planCost({...sample.plans[0],promo:{price:15,months:6,familyEligible:true}},2,{today:'2026-11-01'});
  assert.equal(confirmed.year,444);
});
test('unknown family rates are extrapolations, never called confirmed',()=>{
  const c=planCost(sample.plans[3],3,{today:'2026-11-01'});
  assert.equal(c.estimatedFamilyPrice,true);
  assert.equal(c.familyKnown,false);
  assert.equal(c.year,432);
});
test('expired promos are excluded from current plan costs',()=>{
  const c=planCost({...sample.plans[0],promo:{price:1,months:12,ends:'2026-10-31'}},1,{today:'2026-11-01'});
  assert.equal(c.promoUsed,false);
  assert.equal(c.year,300);
});
test('phone costs separate first-payment estimate and future commitment',()=>{
  const c=phoneCost(sample.phones[0]);
  assert.ok(Math.abs(c.due-109.99)<.001);
  assert.ok(Math.abs(c.commitment-229.99)<.001);
  assert.ok(Math.abs(c.year-769.99)<.001);
});
test('guided matching respects network, budget, port-in and needs',()=>{
  const r=rankMatches(sample,{lines:1,network:'att',budget:30,cannotPort:true,priority:true,hotspot:true},'2026-11-01');
  assert.deepEqual(r.plans.map(x=>x.id),['a']);
  assert.equal(r.plans[0].cost.promoUsed,false);
  assert.deepEqual(r.phones.map(x=>x.id),[]);
});
test('household matching puts known multi-line pricing ahead of estimates',()=>{
  const r=rankMatches(sample,{lines:3,network:'att'},'2026-11-01');
  assert.deepEqual(r.plans.slice(0,2).map(x=>x.id),['a','d']);
  assert.equal(r.plans[1].cost.estimatedFamilyPrice,true);
  assert.ok(r.messages.some(x=>x.includes('one-line')));
  assert.ok(r.messages.some(x=>x.includes('Introductory')));
});
test('existing page calculator agrees with core and refuses unconfirmed family intro pricing',()=>{
  const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
  const source=html.match(/^function planCalc\(p\)\{[\s\S]*?^\}/m)?.[0];
  assert.ok(source,'page calculator must exist');
  const plan=sample.plans[0];
  const browser=runInNewContext(source+'; planCalc(p);',{
    p:plan,state:{lines:2,t:{}},endInfo:()=>null
  });
  const core=planCost(plan,2,{today:'2026-11-01'});
  assert.equal(browser.year,core.year);
  assert.equal(browser.live,false);
  assert.equal(browser.promoFamilyUnconfirmed,true);
});

test('free-only handset filter does not mistake delayed rebates for no upfront device cost',()=>{
  const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
  const source=html.match(/^function phoneVisible\(d\)\{[\s\S]*?^\}/m)?.[0];
  assert.ok(source,'page phone filter exists');
  const check=d=>runInNewContext(source+'; phoneVisible(d);',{
    d,state:{net:'any',t:{free:true}},endInfo:()=>null
  });
  assert.equal(check({net:'att',price:99.99,rebate:100,postpaid:false}),false);
  assert.equal(check({net:'att',price:0,postpaid:true}),false);
  assert.equal(check({net:'att',price:0,postpaid:false}),true);
});
test('multi-line finder never claims handset prices fit an unknown family budget',()=>{
  const r=rankMatches(sample,{lines:2,network:'any',budget:100},'2026-11-01');
  assert.ok(r.messages.some(x=>x.includes('budget is not applied')));
});

test('comparison refuses mixed types, repeated IDs, and more than 3 entries',()=>{
  const entries=normalizeCompare([{type:'plan',id:'a'},{type:'plan',id:'a'},{type:'phone',id:'p1'},
    {type:'plan',id:'b'},{type:'plan',id:'c'},{type:'plan',id:'d'}],sample);
  assert.deepEqual(entries,[{type:'plan',id:'a'},{type:'plan',id:'b'},{type:'plan',id:'c'}]);
  assert.deepEqual(normalizeCompare([{type:'phone',id:'p2'},{type:'phone',id:'none'}],sample),[{type:'phone',id:'p2'}]);
});
test('new HTML keeps legacy JS parseable and exposes accessible finder/compare panels',()=>{
  const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
  const match=html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match);
  new Script(match[1]);
  for (const label of ['finder','compare']) {
    assert.match(html,new RegExp('id="t-'+label+'"'));
    assert.match(html,new RegExp('id="p-'+label+'"'));
    assert.match(html,new RegExp('aria-controls="p-'+label+'"'));
  }
  assert.match(html,/value-ui\.mjs/);
  assert.match(html,/data-verification/);
  assert.match(html,/Five Bars \| Find a better phone plan/);
  assert.doesNotMatch(html,/and want a free phone/);
});
test('pure client-side UI file contains no AI API or paid service dependency',()=>{
  const js=readFileSync(new URL('../site/value-ui.mjs',import.meta.url),'utf8');
  new Script(js.replace(/^import\s*\{[\s\S]*?\}\s*from\s*'\.\/value-core\.mjs';/m,''));
  assert.doesNotMatch(js,/anthropic|openai\.com|api\.key|claude\.use/i);
  assert.match(js,/aria-live="polite"/);
  assert.match(js,/localStorage/);
});
test('verification records are human-maintained and never populated by the source scanner',()=>{
  const r=JSON.parse(readFileSync(new URL('../site/data/verifications.json',import.meta.url),'utf8'));
  assert.equal(r.schema,1);
  assert.ok(r.offers && !Array.isArray(r.offers) && typeof r.offers === 'object');
  const scanner=readFileSync(new URL('../scripts/auto-update.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(scanner,/writeJson\(manualReviewsFile|writeFile\(manualReviewsFile|review-offer\.mjs/);
  assert.match(scanner,/json\(manualReviewsFile/,'the scanner may read manual evidence without modifying it');
});