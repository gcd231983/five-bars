import test from 'node:test';
import assert from 'node:assert/strict';
import {
 normalizeScenario,simulateSwitch,formatSwitchSummary,switchShareParams,
 parseSwitchShare,SWITCH_HORIZONS
} from '../site/switch-core.mjs';

const catalog={
 plans:[
  {id:'monthly',carrier:'Example Mobile',plan:'Monthly 10GB',net:'att',price:20,tax:false,
   promo:{price:10,months:3,req:'port'},url:'https://example.org/monthly'},
  {id:'annual',carrier:'Annual Co',plan:'1GB annual',net:'tmo',price:5,billingMonths:12,
   billingUpfront:60,maxLines:1,url:'https://example.org/annual'},
  {id:'family',carrier:'Family Co',plan:'Unlimited',net:'vzw',price:30,family:{'2':25},
   url:'https://example.org/family'},
 ],
 phones:[
  {id:'prepay',carrier:'Device Co',phone:'A phone',net:'att',price:100,planPrice:40,
   prepay:3,stay:3,port:true,rebate:50,url:'https://example.org/phone'},
  {id:'bundle',carrier:'Bundle Co',phone:'Free with 12 months',net:'vzw',
   price:220,bundle:12,planPrice:40,url:'https://example.org/bundle'},
  {id:'missing-plan',carrier:'Unknown Co',phone:'Phone',net:'tmo',price:25,
   url:'https://example.org/missing'},
 ]
};
const scenario={currentMonthly:50,lines:1,horizon:12,today:'2026-11-02',payoff:0,switchFees:0,extraMonthly:0,canPort:true,newCustomer:false};
function simulate(type,id,opts={}) {
 const {scenario:sc,...rest}=opts;
 return simulateSwitch({catalog,type,id,scenario:{...scenario,...sc},...rest});
}
test('Metro delayed gift reward is excluded and $55 first month / $50 renewal are modeled faithfully',()=>{
 const changed={...catalog,phones:[...catalog.phones,{
  id:'metro-cash',carrier:'Metro',phone:'iPhone',net:'tmo',price:99.99,planPrice:50,
  firstMonthPlanPrice:55,stay:3,port:true,rebate:100,url:'https://example.org'
 }]};
 const report=simulateSwitch({catalog:changed,type:'phone',id:'metro-cash',
  scenario:{...scenario,canPort:true,currentMonthly:80}});
 assert.equal(report.chosen.upfrontDue,154.99);
 assert.equal(report.chosen.serviceTotal,605);
 assert.equal(report.chosen.newTotal,704.99);
 assert.equal(report.results[24].serviceTotal,1205);
 assert.equal(report.results[36].serviceTotal,1805);
 assert.ok(report.warnings.some(x=>x.includes('rebates')));
});
test('monthly promotion first 3 months then regular service; accurate 12/24/36',()=>{
 const r=simulate('plan','monthly');
 assert.deepEqual(r.results[12],{
  months:12,currentTotal:600,newTotal:210,savings:390,
  upfrontDue:10,serviceTotal:210,additionalMonthlyFeeTotal:0,
  oneTimeCost:0,breakeven:1,notes:r.results[12].notes
 });
 assert.equal(r.results[24].serviceTotal,450);
 assert.equal(r.results[36].serviceTotal,690);
 assert.equal(r.offer.kind,'plan');
 assert.equal(r.confidence,'indicative_not_fully_verified');
 assert.ok(r.warnings.some(s=>s.includes('NOT received')));
});
test('new-customer discounts require explicit eligibility, otherwise standard rate applies',()=>{
 const c={plans:[{id:'new-rate',carrier:'New Co',plan:'Standard plan',price:35,
   promo:{price:12,months:3,req:'new'},url:'https://example.org/new'}],phones:[]};
 const base={...scenario,newCustomer:false};
 const noneligible=simulateSwitch({catalog:c,type:'plan',id:'new-rate',scenario:base});
 assert.equal(noneligible.results[12].serviceTotal,420);
 assert.ok(noneligible.warnings.some(x=>x.includes('New-customer introductory pricing excluded')));
 const eligible=simulateSwitch({catalog:c,type:'plan',id:'new-rate',scenario:{...base,newCustomer:true}});
 assert.equal(eligible.results[12].serviceTotal,351);
});
test('number-transfer promotions default to full regular price without an explicit confirmed port',()=>{
 const noConfirm=simulate('plan','monthly',{scenario:{canPort:false}});
 assert.equal(noConfirm.results[12].serviceTotal,240);
 const qualified=simulate('plan','monthly',{scenario:{canPort:true}});
 assert.equal(qualified.results[12].serviceTotal,210);
 assert.throws(()=>simulate('phone','prepay',{scenario:{canPort:false}}),/confirmed eligible number transfer/);
});
test('cannot port excludes port-only promotional price but keeps the full regular rate',()=>{
 const r=simulate('plan','monthly',{scenario:{cannotPort:true,canPort:false}});
 assert.equal(r.results[12].newTotal,240);
 assert.equal(r.results[12].upfrontDue,20);
 assert.match(r.warnings.join(' '),/Port-in intro discount excluded/);
});
test('annual billing charges exactly 60 upfront then again at month 13/25',()=>{
 const r=simulate('plan','annual');
 assert.equal(r.results[12].serviceTotal,60);
 assert.equal(r.results[12].upfrontDue,60);
 assert.equal(r.results[24].serviceTotal,120);
 assert.equal(r.results[36].serviceTotal,180);
 assert.ok(r.warnings.some(s=>s.includes('NOT guaranteed')));
});
test('family plan uses recorded known per-line price, but no imagined family rate for annual plan',()=>{
 const x=simulate('plan','family',{scenario:{lines:2,currentMonthly:80}});
 assert.equal(x.results[12].serviceTotal,600);
 assert.equal(x.results[12].upfrontDue,50);
 assert.throws(()=>simulate('plan','annual',{scenario:{lines:2}}),/not been quoted/);
});
test('device offer preserves qualifying required plan and true prepaid cash timing, excluding uncertain rebate',()=>{
 const r=simulate('phone','prepay',{scenario:{currentMonthly:70}});
 assert.equal(r.results[12].upfrontDue,220);
 assert.equal(r.results[12].newTotal,580);
 assert.equal(r.results[12].serviceTotal,480);
 assert.equal(r.results[12].savings,260);
 assert.ok(r.warnings.some(s=>s.includes('rebates')));
 assert.throws(()=>simulate('phone','prepay',{scenario:{cannotPort:true,canPort:false}}),/confirmed eligible number transfer/);
 assert.throws(()=>simulate('phone','prepay',{scenario:{lines:2}}),/per device/);
});
test('service bundle pays one-time upfront and renews only after covered months',()=>{
 const r=simulate('phone','bundle');
 assert.equal(r.results[12].upfrontDue,220);
 assert.equal(r.results[12].newTotal,220);
 assert.equal(r.results[24].newTotal,700);
 assert.equal(r.results[36].newTotal,1180);
 assert.throws(()=>simulate('phone','missing-plan'),/no reliable required monthly plan/);
});
test('explicit current bills, payoff, switching fees and continuing charges are counted once',()=>{
 const r=simulate('plan','monthly',{scenario:{
  currentMonthly:50,payoff:125,switchFees:35,extraMonthly:3
 }});
 assert.equal(r.results[12].serviceTotal,210);
 assert.equal(r.results[12].oneTimeCost,160);
 assert.equal(r.results[12].additionalMonthlyFeeTotal,36);
 assert.equal(r.results[12].newTotal,406);
 assert.equal(r.results[12].savings,194);
 assert.equal(r.results[12].upfrontDue,173);
 assert.equal(r.results[24].oneTimeCost,160);
 assert.equal(r.results[36].oneTimeCost,160);
});
test('disputed official source or pending manual review blocks positive savings estimates',()=>{
 assert.throws(()=>simulate('plan','monthly',{mvnoEvidence:{offers:{monthly:{state:'headline_mismatch'}}}}),/paused/);
 assert.throws(()=>simulate('phone','prepay',{status:{offers:{prepay:{reviewRequired:true}}}}),/paused/);
});
test('strict validation prevents NaNs, abuse, expired offers, invalid lines and malformed horizons',()=>{
 for(const input of [{currentMonthly:'abc'},{currentMonthly:-1},{currentMonthly:Infinity},
  {payoff:100001},{horizon:60},{lines:6},{extraMonthly:1500},{today:'2026-02-30'}]){
  assert.throws(()=>normalizeScenario({...scenario,...input}));
 }
 const old={...catalog,phones:[{...catalog.phones[0],id:'expired',ends:'2026-10-01'}]};
 assert.throws(()=>simulateSwitch({catalog:old,type:'phone',id:'expired',scenario}),/passed/);
 assert.throws(()=>simulate('phone','other'),/not in the current/);
});
test('printable analysis contains all comparison horizons and a conservative note',()=>{
 const r=simulate('plan','monthly');
 const summary=formatSwitchSummary(r);
 assert.match(summary,/12 months:/);assert.match(summary,/24 months:/);
 assert.match(summary,/36 months:/);assert.match(summary,/Not verified checkout pricing/);
 assert.doesNotMatch(summary,/Entered existing monthly bill/);
 assert.match(formatSwitchSummary(r,{includeInputs:true}),/Entered existing monthly bill/);
});
test('share URLs exclude financial inputs by default, are scoped to known catalog offers',()=>{
 const link=switchShareParams('plan','monthly',scenario).toString();
 assert.equal(link.includes('bill='),false);
 assert.equal(link.includes('payoff='),false);
 const restored=parseSwitchShare('?'+link,catalog);
 assert.deepEqual(restored,{type:'plan',id:'monthly',scenario:{
  lines:1,horizon:12,cannotPort:false,canPort:true,newCustomer:false},hasFinancials:false});
 const optin=switchShareParams('plan','monthly',scenario,{includeFinancials:true}).toString();
 assert.match(optin,/bill=50/);
 assert.equal(parseSwitchShare('?'+optin,catalog).scenario.currentMonthly,50);
 assert.equal(parseSwitchShare('?switch=phone%3Afake',catalog),null);
 assert.throws(()=>switchShareParams('plan','..%2F',scenario));
});
