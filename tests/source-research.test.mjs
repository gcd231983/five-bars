import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
import {buildResearchAudit,researchStatus,renderResearchPage}
 from '../scripts/source-research.mjs';
import {planCost,verificationState,offerSignature} from '../site/value-core.mjs';
import {simulateSwitch} from '../site/switch-core.mjs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const catalog=JSON.parse(read('site/data/deals.json'));
const research=JSON.parse(read('site/data/research-evidence.json'));
const ledger=JSON.parse(read('site/data/verifications.json'));
const date='2026-11-02';
const build=(changes={})=>buildResearchAudit({catalog,ledger,research,today:date,...changes});
const get=id=>catalog.plans.find(p=>p.id===id);
test('12 public source-backed plan rates are identified without giving any of 78 offers a human full-terms status',()=>{
 assert.equal(Object.keys(research.records).length,12);
 const audit=build();
 assert.equal(audit.summary.offers,78);
 assert.equal(audit.summary.researched,12);
 assert.equal(audit.summary.notResearched,66);
 assert.equal(audit.summary.conflictingOrInvalid,0);
 assert.equal(audit.summary.publishedPriceMatches,12);
 assert.equal(audit.summary.manuallyFullyReviewed,0);
 assert.equal(audit.summary.needingFullTerms,78);
 assert.ok(audit.offers.every(x=>x.manualReview!=='verified'));
 assert.ok(audit.offers.some(x=>x.id==='tello'&&x.researchState==='published_match'));
 assert.ok(audit.offers.some(x=>x.id==='boost-motog'&&x.researchState==='not_researched'));
});
test('official dated evidence is auditable, sourced with HTTPS, exact offer IDs, and unresolved customer conditions',()=>{
 for(const [id,record] of Object.entries(research.records)){
  const offer=get(id);
  assert.ok(offer,'Research missing catalog offer '+id);
  assert.equal(record.carrier,offer.carrier);
  assert.equal(record.observedOn,research.observedOn);
  assert.ok(record.supportedFacts.length>=2,id+' should have source-backed facts');
  assert.ok(record.unresolved.length>=3,id+' should have open questions');
  assert.ok(record.sources.length>=1);
  for(const source of record.sources){
   const url=new URL(source.url);
   assert.equal(url.protocol,'https:');
   assert.ok(url.hostname.endsWith('usmobile.com')||
    url.hostname.endsWith('visible.com')||url.hostname.endsWith('tello.com')||
    url.hostname.endsWith('mintmobile.com')||url.hostname.endsWith('cricketwireless.com'),id+' unexpected domain');
   assert.ok(source.supports.length>20);
  }
  assert.equal(record.publishedMonthly,offer.price);
 }
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
test('static public source audit prints 12 research cards, all 66 unresearched offers and clear noncheckout warnings',()=>{
 const html=renderResearchPage({catalog,ledger,research,today:date});
 assert.equal((html.match(/class="guide research-article"/g)||[]).length,12);
 assert.match(html,/What our official sources actually confirm/);
 assert.match(html,/Official published baseline/);
 assert.ok(html.includes('$360.00 due upfront for 12 months'),'Mint annual prepayment must be visible');
 assert.match(html,/Not yet confirmed at checkout/);
 assert.match(html,/full-terms sign-offs/);
 assert.match(html,/66/);
 assert.doesNotMatch(html,/100% verified|Guaranteed savings|affiliate commission available/);
 const sandbox=structuredClone(catalog);
 sandbox.plans.find(x=>x.id==='mint').plan='<script>alert(1)</script>';
 const page=renderResearchPage({catalog:sandbox,ledger,research,today:date});
 assert.ok(page.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(!page.includes('<script>alert(1)</script>'));
});
test('unrelated phone offers remain not researched; official source research does not sneak into signed ledger',()=>{
 assert.equal(Object.keys(ledger.offers).length,0);
 assert.equal(researchStatus(catalog.phones[0],null,{today:date}).state,'not_researched');
 const fake=structuredClone(research);
 fake.records['missing-fake']={observedOn:date,publishedMonthly:0,sources:[]};
 assert.throws(()=>build({research:fake}),/missing offer/);
});
