import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
import {buildResearchAudit,researchStatus,renderResearchPage}
 from '../scripts/source-research.mjs';
import {planCost,phoneCost,rankMatches,verificationState,offerSignature} from '../site/value-core.mjs';
import {simulateSwitch} from '../site/switch-core.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const catalog=JSON.parse(read('site/data/deals.json'));
const research=JSON.parse(read('site/data/research-evidence.json'));
const ledger=JSON.parse(read('site/data/verifications.json'));
const date='2026-11-02';
const build=(changes={})=>buildResearchAudit({catalog,ledger,research,today:date,...changes});
const get=id=>catalog.plans.find(p=>p.id===id);
test('38 plan baselines and 37 device headlines remain separate from checkout verification',()=>{
 assert.equal(Object.keys(research.records).length,75);
 const audit=build();
 assert.equal(audit.summary.offers,78);
 assert.equal(audit.summary.researched,75);
 assert.equal(audit.summary.notResearched,3);
 assert.equal(audit.summary.availabilityHolds,6);
 assert.equal(audit.summary.publishedPartial,4);
 assert.equal(audit.summary.listingHolds,3);
 assert.equal(audit.summary.conflictingOrInvalid,0);
 assert.equal(audit.summary.publishedPriceMatches,71);
 assert.equal(audit.summary.manuallyFullyReviewed,0);
 assert.equal(audit.summary.needingFullTerms,78);
 assert.ok(audit.offers.every(x=>x.manualReview!=='verified'));
 assert.ok(audit.offers.some(x=>x.id==='tello'&&x.researchState==='published_match'));
 assert.ok(audit.offers.some(x=>x.id==='boost-motog'&&x.researchState==='published_match'));
 assert.ok(audit.offers.some(x=>x.id==='visible-18pro'&&x.researchState==='published_match'));
 assert.ok(audit.offers.some(x=>x.id==='metro-16e'&&x.researchState==='published_match'));
 assert.ok(audit.offers.some(x=>x.id==='cricket-16e'&&x.researchState==='published_match'));
 assert.ok(audit.offers.some(x=>x.id==='total-a17'&&x.researchState==='published_match'));
});
test('official dated evidence is auditable, sourced with HTTPS, exact offer IDs, and unresolved customer conditions',()=>{
 for(const [id,record] of Object.entries(research.records)){
  const offer=get(id)||catalog.phones.find(p=>p.id===id);
  assert.ok(offer,'Research missing catalog offer '+id);
  assert.equal(record.carrier,offer.carrier);
  assert.equal(record.observedOn,research.observedOn);
  assert.ok(record.supportedFacts.length>=2,id+' should have source-backed facts');
  assert.ok(record.unresolved.length>=3,id+' should have open questions');
  assert.ok(record.sources.length>=1);
  for(const source of record.sources){
   const url=new URL(source.url);
   assert.equal(url.protocol,'https:');
   assert.ok(url.hostname.endsWith('att.com')||url.hostname.endsWith('verizon.com')||
    url.hostname.endsWith('t-mobile.com')||
    url.hostname.endsWith('usmobile.com')||
    url.hostname.endsWith('visible.com')||url.hostname.endsWith('tello.com')||
    url.hostname.endsWith('mintmobile.com')||url.hostname.endsWith('cricketwireless.com')||
    url.hostname.endsWith('totalwireless.com')||url.hostname.endsWith('h2owireless.com')||
    url.hostname.endsWith('metrobyt-mobile.com')||
    url.hostname.endsWith('boostmobile.com')||url.hostname.endsWith('good2gomobile.com')||
    url.hostname.endsWith('hellohelium.com')||url.hostname.endsWith('redpocket.com')||
    url.hostname.endsWith('ultramobile.com')||url.hostname.endsWith('mymobilex.com')||
    url.hostname.endsWith('fi.google.com')||url.hostname.endsWith('consumercellular.com')||
    url.hostname.endsWith('tracfone.com')||url.hostname.endsWith('straighttalk.com'),id+' unexpected domain');
   assert.ok(source.supports.length>20);
  }
  assert.equal(record.kind==='phone'?record.publishedDevicePrice:record.publishedMonthly,offer.price);
 }
});
test('Tello official documentation confirms new-line-only promotion without fabricating checkout fees',()=>{
 const offer=get('tello'),record=research.records.tello;
 assert.equal(offer.price,15);
 assert.deepEqual({price:offer.promo.price,months:offer.promo.months,req:offer.promo.req,ends:offer.promo.ends},
   {price:10,months:3,req:'new',ends:'2026-11-09'});
 assert.equal(record.observedOn,'2026-11-02');
 assert.ok(record.sources.some(s=>s.url.includes('/halloween-deal-10gb-for-10-mo-first-3-months/')));
 assert.ok(record.sources.some(s=>s.url.includes('/broadband_facts/M00245106460000000000002FB')));
 assert.ok(record.supportedFacts.some(s=>s.includes('existing Tello customers adding a new line')));
 assert.ok(record.supportedFacts.some(s=>s.includes('up to $0.30')));
 assert.ok(record.unresolved.some(s=>s.includes('exact first bill')));
 assert.equal(offer.knownMonthlyFee,undefined,'variable cost recovery is NOT a fixed known fee');
 assert.equal(offer.knownActivationFee,undefined,'no invented checkout charge');
 assert.equal(verificationState(offer,ledger.offers?.tello,date).status,'unverified');
 assert.equal(researchStatus(offer,record,{today:date}).state,'published_match');
});

test('Mint annual $360 upfront is never shown as $30 monthly cash due; $180 promo is disclosed but not assumed',()=>{
 const mint=get('mint');
 assert.equal(mint.price,30);
 assert.equal(mint.billingMonths,12);
 assert.equal(mint.billingUpfront,360);
 assert.equal(mint.family,undefined,'unverified family monthly billing removed');
 const c=planCost(mint,1,{today:date});
 assert.equal(c.annualPrepaid,true);
 assert.equal(c.upfrontDue,360);
 assert.equal(c.year,360);
 assert.equal(c.regularMonthTotal,30);
 assert.equal(planCost(mint,2,{today:date}),null);
 const report=simulateSwitch({
   catalog,type:'plan',id:'mint',
   scenario:{lines:1,currentMonthly:80,horizon:12,today:date,canPort:true,newCustomer:true}
 });
 assert.equal(report.chosen.upfrontDue,360);
 assert.equal(report.results[12].serviceTotal,360);
 assert.equal(report.results[24].serviceTotal,720);
 assert.ok(report.warnings.some(v=>v.includes('Annual prepay')));
 assert.ok(mint.extra.includes('$180')&&mint.extra.includes('not automatic promo eligibility'));
});
test('main page also excludes unsupported annual multi-line quotes rather than pretending monthly billing',()=>{
 const html=read('site/index.html');
 const calc=html.match(/^function planCalc\(p\)\{[\s\S]*?^\}/m)?.[0];
 const visible=html.match(/^function planVisible\(p\)\{[\s\S]*?^\}/m)?.[0];
 assert.ok(calc&&visible);
 const single=runInNewContext(calc+'; planCalc(mint);',{
  mint:get('mint'),state:{lines:1,t:{}},endInfo:()=>null
 });
 assert.equal(single.year,360);
 assert.equal(single.upfrontDue,360);
 const multiple=runInNewContext(calc+'; planCalc(mint);',{
  mint:get('mint'),state:{lines:2,t:{}},endInfo:()=>null
 });
 assert.equal(multiple,null);
 const v=runInNewContext(visible+'; planVisible(mint);',{
  mint:get('mint'),state:{lines:2,net:'any',provider:'any',t:{}},
  planCalc:()=>{throw Error('should be rejected before calculator');}
 });
 assert.equal(v,false);
});
test('catalog mutations, annual billing discrepancies or stale observations never retain a current evidence match',()=>{
 const rec=research.records.mint;
 assert.equal(researchStatus(get('mint'),rec,{today:date}).state,'published_match');
 const p={...get('mint'),billingUpfront:30};
 assert.equal(researchStatus(p,rec,{today:date}).state,'conflict');
 assert.equal(researchStatus({...get('mint'),price:35},rec,{today:date}).state,'conflict');
 assert.equal(researchStatus(get('mint'),rec,{today:'2026-11-24'}).state,'aged');
 assert.equal(researchStatus(get('mint'),rec,{today:'2026-10-31'}).state,'invalid');
 assert.equal(researchStatus(get('mint'),{...rec,sources:[{url:'javascript:alert(1)'}]},{today:date}).state,'invalid');
});
test('published source matches do not create human verification records',()=>{
 const offer=get('usm-starter');
 const signed=verificationState(offer,ledger.offers?.[offer.id],date);
 assert.equal(signed.status,'unverified');
 assert.equal(researchStatus(offer,research.records[offer.id],{today:date}).state,'published_match');
});
test('static public source audit prints 75 dated source cards and 3 unresearched retailer offers',()=>{
 const html=renderResearchPage({catalog,ledger,research,today:date});
 assert.equal((html.match(/class="guide research-article"/g)||[]).length,75);
 assert.match(html,/What our official sources actually confirm/);
 assert.match(html,/Official published baseline/);
 assert.ok(html.includes('$360.00 due upfront for 12 months'),'Mint annual prepayment must be visible');
 assert.match(html,/Not yet confirmed at checkout/);
 assert.match(html,/human checkout-scenario reviews/);
 assert.match(html,/25/);
 assert.match(html,/Research next — prioritized source checklist/);
 assert.match(html,/Stock and checkout holds \(6\)/);
 assert.match(html,/Retail-specific price holds \(3\)/);
 assert.match(html,/SERVICE PRICE UNKNOWN/);
 assert.match(html,/report\.html\?offer=usm-starter/);
 assert.match(html,/Report a correction to this listing/);
 assert.match(html,/OUT OF STOCK on recorded date; no live checkout quote/);
 assert.match(html,/\$10\.00\/mo for first 6 month\(s\) ONLY for eligible new customers/);
 assert.match(html,/id="research-redpocket-plus"/);
 assert.match(html,/FULL RETAIL handset payment required; financing ineligible/);
 assert.match(html,/\$20\.00\/mo conditional service credits for 24 months NOT deducted/);
 assert.match(html,/Official conditional DEVICE HEADLINE \(not checkout\)/);
 assert.match(html,/\$100\.00 conditional later reward NOT deducted/);
 assert.doesNotMatch(html,/100% verified|Guaranteed savings|affiliate commission available/);
 const sandbox=structuredClone(catalog);
 sandbox.plans.find(x=>x.id==='mint').plan='<script>alert(1)</script>';
 const page=renderResearchPage({catalog:sandbox,ledger,research,today:date});
 assert.ok(page.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(!page.includes('<script>alert(1)</script>'));
});
test('Switch & Save refuses sourced rate or annual cash discrepancies but never treats a match as checkout verification',()=>{
 const original=simulateSwitch({catalog,type:'plan',id:'mint',
  researchEvidence:research,
  scenario:{currentMonthly:60,lines:1,horizon:12,today:date}});
 assert.equal(original.chosen.serviceTotal,360);
 assert.ok(original.warnings.some(x=>x.includes('published official plan baseline')));
 assert.equal(original.confidence,'indicative_not_fully_verified');
 const bad=structuredClone(catalog);
 bad.plans.find(p=>p.id==='mint').billingUpfront=30;
 assert.throws(()=>simulateSwitch({catalog:bad,type:'plan',id:'mint',researchEvidence:research,
  scenario:{currentMonthly:60,lines:1,horizon:12,today:date}}),/official published-source research conflicts/i);
 const stale=simulateSwitch({catalog,type:'plan',id:'mint',researchEvidence:research,
  scenario:{currentMonthly:60,lines:1,horizon:12,today:'2026-11-26'}});
 assert.ok(stale.warnings.some(x=>x.includes('older than 21 days')));
});
test('Total BYO first month is modeled once across standalone and Switch & Save calculators',()=>{
 const p=get('total-max');
 const unconfirmed=planCost(p,1,{today:date});
 assert.equal(unconfirmed.monthTotal,30);
 assert.equal(unconfirmed.year,360);
 const cost=planCost(p,1,{today:date,discountQualified:true});
 assert.equal(cost.monthTotal,20);
 assert.equal(cost.upfrontDue,30);
 assert.equal(cost.year,250);
 const report=simulateSwitch({catalog,type:'plan',id:'total-max',researchEvidence:research,
  scenario:{lines:1,currentMonthly:60,horizon:12,today:date,discountQualified:true}});
 assert.equal(report.chosen.upfrontDue,30);
 assert.equal(report.results[12].serviceTotal,250);
 assert.equal(report.results[24].serviceTotal,490);
 assert.equal(report.results[36].serviceTotal,730);
 const page=read('site/index.html');
 const start=page.indexOf('function planCalc(p){');
 const end=page.indexOf('function planVisible(p){',start);
 assert.ok(start>=0 && end>start,'legacy plan calculator must remain embedded in site');
 const calc=page.slice(start,end);
 const main=runInNewContext(calc+'; planCalc(p);',{p,state:{lines:1,t:{discountqualified:true}},endInfo:()=>null});
 assert.equal(main.upfrontDue,30);
 assert.equal(main.year,250);
 assert.ok(renderResearchPage({catalog,ledger,research,today:date}).includes('$30.00 first month'));
 const bad={...p,firstMonthPrice:20};
 assert.equal(researchStatus(bad,research.records['total-max'],{today:date}).state,'conflict');
 assert.throws(()=>simulateSwitch({catalog:{...catalog,plans:catalog.plans.map(v=>v.id===p.id?bad:v)},
  type:'plan',id:p.id,researchEvidence:research,
  scenario:{lines:1,currentMonthly:60,horizon:12,today:date}}),/official published-source research conflicts/i);
});
test('published handset conditions do not certify checkout and changed terms block savings estimates',()=>{
 const cricket=catalog.phones.find(p=>p.id==='cricket-16e');
 assert.equal(researchStatus(cricket,research.records['cricket-16e'],{today:date}).state,'published_match');
 assert.equal(researchStatus({...cricket,prepay:2},research.records['cricket-16e'],{today:date}).state,'conflict');
 assert.equal(researchStatus({...cricket,price:49.99},research.records['cricket-16e'],{today:date}).state,'conflict');
 const report=simulateSwitch({catalog,type:'phone',id:'metro-16e',researchEvidence:research,
  scenario:{lines:1,currentMonthly:80,canPort:true,today:date,horizon:12}});
 assert.equal(report.chosen.upfrontDue,154.99);
 assert.equal(report.chosen.serviceTotal,605);
 assert.equal(report.chosen.newTotal,704.99);
 assert.equal(report.confidence,'indicative_not_fully_verified');
 assert.ok(report.warnings.some(w=>w.includes('conditional device headline')));
 const old=catalog.phones.find(p=>p.id==='metro-16e');
 const wrong={...old,firstMonthPlanPrice:50};
 assert.equal(researchStatus(wrong,research.records['metro-16e'],{today:date}).state,'conflict');
 assert.throws(()=>simulateSwitch({catalog:{...catalog,phones:catalog.phones.map(p=>p.id===old.id?wrong:p)},
  type:'phone',id:old.id,researchEvidence:research,
  scenario:{lines:1,currentMonthly:80,canPort:true,today:date,horizon:12}}),/official published-source research conflicts/i);
});
test('Visible retail-only $480 bill credit is noncash and materially checked against official publication',()=>{
 const offer=catalog.phones.find(x=>x.id==='visible-18pro');
 const record=research.records['visible-18pro'];
 assert.equal(offer.fullRetailRequired,true);
 assert.equal(record.publishedFullRetailRequired,true);
 assert.equal(record.publishedCreditMonthly,20);
 assert.equal(record.publishedCreditMonths,24);
 assert.equal(researchStatus(offer,record,{today:date}).state,'published_match');
 const report=simulateSwitch({catalog,type:'phone',id:offer.id,researchEvidence:research,
  scenario:{lines:1,currentMonthly:80,canPort:false,today:date,horizon:12}});
 assert.equal(report.chosen.upfrontDue,1244);
 assert.equal(report.results[12].newTotal,1739);
 assert.equal(report.results[24].newTotal,2279);
 assert.ok(report.warnings.some(x=>x.includes('conditional device headline')));
 assert.equal(report.confidence,'indicative_not_fully_verified');
 for(const changed of [{credit:15},{creditMonths:12},{fullRetailRequired:false}]){
  const wrong={...offer,...changed};
  assert.equal(researchStatus(wrong,record,{today:date}).state,'conflict');
  assert.throws(()=>simulateSwitch({catalog:{...catalog,phones:catalog.phones.map(x=>x.id===offer.id?wrong:x)},
    type:'phone',id:offer.id,researchEvidence:research,
    scenario:{lines:1,currentMonthly:80,today:date,horizon:12}}),/official published-source research conflicts/i);
 }
});
test('Boost razr prepaid service is documented without promoting an online headline to a checkout sign-off',()=>{
 const offer=catalog.phones.find(x=>x.id==='boost-razr');
 const record=research.records[offer.id];
 assert.equal(record.publishedPrepayMonths,2);
 assert.equal(researchStatus(offer,record,{today:date}).state,'published_match');
 assert.equal(researchStatus({...offer,prepay:1},record,{today:date}).state,'conflict');
 const report=simulateSwitch({catalog,type:'phone',id:offer.id,researchEvidence:research,
  scenario:{lines:1,currentMonthly:100,canPort:true,today:date,horizon:12}});
 assert.equal(report.chosen.upfrontDue,159.99);
 assert.equal(report.confidence,'indicative_not_fully_verified');
});
test('Metro first bill and optional new-line Boost/Red Pocket discounts are checked against official sources',()=>{
 const metro=get('metro'),premium=get('metro-premium');
 assert.equal(metro.firstMonthPrice,30);
 assert.equal(planCost(metro,1,{today:date}).year,360);
 assert.equal(planCost(premium,1,{today:date}).year,780);
 assert.equal(planCost(metro,1,{today:date,discountQualified:true}).year,305);
 assert.equal(planCost(premium,1,{today:date,discountQualified:true}).year,725);
 assert.equal(researchStatus(metro,research.records.metro,{today:date}).state,'published_match');
 assert.equal(researchStatus({...metro,firstMonthPrice:25},research.records.metro,{today:date}).state,'conflict');
 for(const [id,regular,discounted] of [['boost',300,210],['redpocket-plus',240,230],['redpocket-premium',360,345]]){
  const offer=get(id),r=research.records[id];
  assert.equal(researchStatus(offer,r,{today:date}).state,'published_match');
  assert.equal(planCost(offer,1,{today:date}).year,regular,'new-only discount is not automatic for '+id);
  assert.equal(planCost(offer,1,{today:date,newCustomer:true}).year,discounted);
  assert.equal(researchStatus({...offer,promo:{...offer.promo,req:'port'}},r,{today:date}).state,'conflict');
 }
 const report=simulateSwitch({catalog,type:'plan',id:'boost',researchEvidence:research,
  scenario:{currentMonthly:80,lines:1,horizon:12,today:date,newCustomer:false}});
 assert.equal(report.chosen.serviceTotal,300);
 const newReport=simulateSwitch({catalog,type:'plan',id:'boost',researchEvidence:research,
  scenario:{currentMonthly:80,lines:1,horizon:12,today:date,newCustomer:true}});
 assert.equal(newReport.chosen.serviceTotal,210);
});
test('US Mobile selected port-in headline is never applied without confirmed eligible transfer',()=>{
 for(const [id,regular,discounted] of [
  ['usm-starter',300,240],['usm-premium',528,414]]){
  const offer=get(id),record=research.records[id];
  assert.equal(record.publishedPromoRequirement,'port');
  assert.equal(researchStatus(offer,record,{today:date}).state,'published_match');
  assert.equal(planCost(offer,1,{today:date}).year,regular);
  assert.equal(planCost(offer,1,{today:date,canPort:true}).year,discounted);
  const falsePromo={...offer,promo:{...offer.promo,price:1}};
  assert.equal(researchStatus(falsePromo,record,{today:date}).state,'conflict');
  const base=simulateSwitch({catalog,type:'plan',id,researchEvidence:research,
   scenario:{lines:1,currentMonthly:80,horizon:12,today:date,canPort:false}});
  assert.equal(base.chosen.serviceTotal,regular);
  const eligible=simulateSwitch({catalog,type:'plan',id,researchEvidence:research,
   scenario:{lines:1,currentMonthly:80,horizon:12,today:date,canPort:true}});
  assert.equal(eligible.chosen.serviceTotal,discounted);
  assert.equal(eligible.confidence,'indicative_not_fully_verified');
 }
 const html=renderResearchPage({catalog,ledger,research,today:date});
 assert.match(html,/ONLY for eligible number transfers/);
});
test('Ultra 3/6/12-month prepaid options never appear as recurring intro discounts',()=>{
 for(const [id,price,annual] of [['ultra',49,588],['ultra-4',19,228]]){
  const offer=get(id),record=research.records[id];
  assert.equal(offer.promo,undefined);
  assert.equal(researchStatus(offer,record,{today:date}).state,'published_match');
  const cost=planCost(offer,1,{today:date,newCustomer:true,canPort:true});
  assert.equal(cost.year,annual);
  assert.equal(cost.upfrontDue,price);
  assert.equal(cost.promoUsed,false);
 }
 const page=renderResearchPage({catalog,ledger,research,today:date});
 assert.match(page,/multi-month prepaid/);
});
test('remaining official source records never imply autopay or customer-specific extras were fully checked',()=>{
 for(const id of ['mobilex-unlimited10','mobilex-unlimited30','fi','cc','tracfone','straighttalk']){
  const o=get(id),record=research.records[id];
  assert.equal(researchStatus(o,record,{today:date}).state,'published_match');
  assert.ok(record.unresolved.length>=3);
  assert.ok(record.sources.some(x=>x.url.startsWith('https://')));
 }
 assert.equal(get('fi').plan,'Unlimited Essentials');
 assert.equal(get('straighttalk').price,25,'regular plan excludes optional BYOP AutoPay discount');
 assert.equal(get('cc').price,20,'published AutoPay discounted rate requires confirmation');
 assert.equal(get('tracfone').price,45,'published Auto-Refill rate requires confirmation');
});
test('published non-discount pricing and fixed provider charges are independently signed and cannot be altered silently',()=>{
 for(const [id,standard,qualified] of [
  ['metro',360,305],['metro-premium',780,725],['total-max',360,250],
  ['cc',370,310],['tracfone',600,545]]){
  const p=get(id),r=research.records[id];
  assert.equal(researchStatus(p,r,{today:date}).state,'published_match',id);
  assert.equal(planCost(p,1,{today:date}).year,standard,id+' standard');
  assert.equal(planCost(p,1,{today:date,discountQualified:true}).year,qualified,id+' confirmed');
  assert.equal(researchStatus({...p,undiscountedPrice:p.undiscountedPrice+5},r,{today:date}).state,'conflict');
  assert.equal(researchStatus({...p,discountCondition:'invalid'},r,{today:date}).state,'conflict');
 }
 const cc=get('cc');
 assert.equal(planCost(cc,1,{today:date}).upfrontDue,40);
 assert.equal(planCost(cc,1,{today:date,discountQualified:true}).upfrontDue,35);
 assert.equal(researchStatus({...cc,knownMonthlyFee:0},research.records.cc,{today:date}).state,'conflict');
 assert.equal(researchStatus({...cc,knownActivationFee:0},research.records.cc,{today:date}).state,'conflict');
 assert.match(renderResearchPage({catalog,ledger,research,today:date}),/\$5\.00\/mo documented provider fees added to estimates/);
 const bad={...cc,knownMonthlyFee:0};
 assert.throws(()=>simulateSwitch({catalog:{...catalog,plans:catalog.plans.map(x=>x.id===bad.id?bad:x)},
  type:'plan',id:'cc',researchEvidence:research,scenario:{lines:1,currentMonthly:80,horizon:12,today:date}}),
  /official published-source research conflicts/i);
});
test('Total ALL ACCESS identity and Metro Moto G first bill are published as chosen, not copied from unrelated plan',()=>{
 const plan=get('total-all-access');
 assert.ok(plan);
 assert.equal(get('total-max-family'),undefined,'mixed-up MAX family entry was replaced');
 assert.equal(plan.plan,'Total ALL ACCESS');
 assert.equal(plan.price,60);
 assert.equal(plan.firstMonthPrice,65);
 assert.equal(plan.maxLines,1);
 assert.equal(planCost(plan,1,{today:date}).year,780);
 assert.equal(planCost(plan,1,{today:date,discountQualified:true}).year,725);
 assert.equal(planCost(plan,4,{today:date}),null);
 assert.equal(researchStatus(plan,research.records['total-all-access'],{today:date}).state,'published_match');
 const phone=catalog.phones.find(x=>x.id==='metro-motog');
 assert.equal(phone.planPrice,60);
 assert.equal(phone.firstMonthPlanPrice,60);
 assert.equal(researchStatus(phone,research.records['metro-motog'],{today:date}).state,'published_match');
 assert.equal(phoneCost(phone).due,60);
 assert.equal(phoneCost(phone).year,720);
 const mismatch={...phone,firstMonthPlanPrice:40};
 assert.equal(researchStatus(mismatch,research.records['metro-motog'],{today:date}).state,'conflict');
 assert.throws(()=>simulateSwitch({catalog:{...catalog,phones:catalog.phones.map(x=>x.id===phone.id?mismatch:x)},
  type:'phone',id:phone.id,researchEvidence:research,
  scenario:{lines:1,currentMonthly:80,canPort:true,horizon:12,today:date}}),/official published-source research conflicts/i);
});
test('six unavailable handset promotions are not saleable, rankable or able to generate switch cash estimates',()=>{
 const unavailable=['mint-s26fe','cricket-s25fe','cricket-razr','cricket-a37','cricket-power','cricket-motog'];
 const audit=build();
 assert.equal(audit.summary.availabilityHolds,6);
 for(const id of unavailable){
  const phone=catalog.phones.find(x=>x.id===id);
  assert.equal(phone.availability,'out_of_stock');
  assert.equal(phone.availabilityObservedOn,date);
  assert.equal(phoneCost(phone).due,null);
  assert.equal(phoneCost(phone).year,null);
  assert.equal(phoneCost(phone).unavailable,true);
  assert.throws(()=>simulateSwitch({catalog,type:'phone',id,researchEvidence:research,
   scenario:{lines:1,currentMonthly:100,canPort:true,horizon:12,today:date}}),/out of stock/i);
  assert.ok(!rankMatches(catalog,{lines:1,canPort:true},date).phones.some(x=>x.id===id));
  if(research.records[id]){
   const record=research.records[id];
   assert.equal(record.publishedAvailability,'out_of_stock');
   assert.equal(researchStatus(phone,record,{today:date}).state,'published_match');
   assert.equal(researchStatus({...phone,availability:undefined},record,{today:date}).state,'conflict');
  }
 }
 const mint=catalog.phones.find(x=>x.id==='mint-p11');
 assert.equal(mint.bundle,12);
 assert.equal(phoneCost(mint,{newCustomer:true}).due,579);
 assert.match(mint.note,/\$399.*\$180/);
 const html=renderResearchPage({catalog,ledger,research,today:date});
 assert.match(html,/Financing priority/);
 assert.match(html,/Recheck stock at listed carrier page/);
});
test('unrelated phone offers remain not researched; official source research does not sneak into signed ledger',()=>{
 assert.equal(Object.keys(ledger.offers).length,0);
 assert.equal(researchStatus(catalog.phones[0],null,{today:date}).state,'not_researched');
 const fake=structuredClone(research);
 fake.records['missing-fake']={observedOn:date,publishedMonthly:0,sources:[]};
 assert.throws(()=>build({research:fake}),/missing offer/);
});
