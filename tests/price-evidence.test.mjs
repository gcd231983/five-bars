import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoostHeadlineProofs, evaluatePriceEvidence, BOOST_SOURCE } from '../scripts/price-evidence.mjs';

const m = (price,plan=50) => 'Galaxy A17 5G for $'+price+
  ' $269.99 On our $'+plan+' Unlimited+ Plan and keep your number. Get This Deal';
const g = (price,plan=60) => 'Get the moto g - 2026 for $'+price+
  ' $299.99 On our $'+plan+' Unlimited Premium Plan and keep your number. Get This Deal';
const p = (price,plan=50) => 'moto g play - 2026 for $'+price+
  ' $249.99 On our $'+plan+' Unlimited+ Plan and keep your number. Get This Deal';
const html=(...parts)=>'<html><head><title>Boost Mobile deals</title></head><body>'+
  parts.map(x=>'<section class="deal">'+x+'</section>').join('')+'</body></html>';
const catalog=()=>({phones:[
 {id:'boost-motog',phone:'Moto G 2026',price:0,planPrice:60,port:true},
 {id:'boost-a17',phone:'Samsung Galaxy A17 5G',price:0,planPrice:50,port:true},
 {id:'boost-gplay',phone:'Moto G Play 2026',price:0,planPrice:50,port:true}
]});
function run(doc,old=null,url=BOOST_SOURCE){
 return evaluatePriceEvidence({catalog:catalog(),html:doc,sourceAvailable:true,finalUrl:url,
  checkedAt:'2026-11-02T14:00:00.000Z',day:'2026-11-02',previousHistory:old});
}
test('parses exact phone, device price, plan price and porting together from Boost official card text',()=>{
 const scan=run(html(g('0.00'),m('0.00'),p('0.00')));
 assert.equal(scan.report.summary.headlineMatches,3);
 assert.equal(scan.report.summary.needReview,0);
 assert.equal(scan.report.summary.observationsRecorded,3);
 for(const [id,offer] of Object.entries(scan.report.offers)){
   assert.equal(offer.state,'headline_matched',id);
   assert.equal(offer.observedPrice,0);
   assert.equal(offer.fullTermsVerified,false);
   assert.equal(offer.scope,'advertised_device_and_plan_headline');
   assert.match(offer.note,/NOT verified/);
   assert.ok(/^[a-f0-9]{20}$/.test(offer.evidenceDigest));
 }
 assert.equal(scan.history.offers['boost-a17'][0].source,BOOST_SOURCE);
 assert.equal(scan.history.offers['boost-a17'][0].scope,'advertised_device_and_plan_headline');
});
test('device price mismatch is flagged but catalog prices stay immutable',()=>{
 const data=catalog(),snapshot=structuredClone(data);
 const scan=evaluatePriceEvidence({catalog:data,html:html(g('0'),m('19.99'),p('0')),
   sourceAvailable:true,finalUrl:BOOST_SOURCE,checkedAt:'2026-11-02T14:00:00Z',day:'2026-11-02'});
 assert.equal(scan.report.offers['boost-a17'].state,'headline_mismatch');
 assert.equal(scan.report.offers['boost-a17'].observedPrice,19.99);
 assert.equal(scan.report.summary.priceMismatches,1);
 assert.equal(scan.report.summary.headlineMatches,2);
 assert.ok(scan.report.alerts.some(a=>a.id==='boost-a17' && a.observedPrice===19.99));
 assert.equal(scan.history.offers['boost-a17'][0].price,19.99,'record unverified headline, not catalog');
 assert.deepEqual(data,snapshot,'never overwrite prices without manual approval');
});
test('wrong required plan mismatches even if device price is unchanged',()=>{
 const proof=run(html(g('0'),m('0',60),p('0')));
 assert.equal(proof.report.offers['boost-a17'].state,'headline_mismatch');
 assert.equal(proof.report.offers['boost-a17'].observedPlanPrice,60);
 assert.equal(proof.report.offers['boost-a17'].catalogPlanPrice,50);
});
test('does not match unbounded cross-product price text, omitted porting, or partial plan copy',()=>{
 const text=html(
   '<h3>Galaxy A17 5G for $0</h3><p>Trade-in required.</p>',
   '<h3>Other Phone for $0</h3><p>On our $50 Unlimited+ Plan and keep your number. Get This Deal</p>',
   '<h3>Get the moto g - 2026 for $0</h3><p>On our $60 Unlimited Premium Plan.</p>');
 const p=parseBoostHeadlineProofs(text);
 assert.equal(p.observations['boost-a17'],undefined);
 assert.equal(p.observations['boost-motog'],undefined);
 const scan=run(text);
 assert.equal(scan.report.summary.headlineMatches,0);
 assert.equal(scan.report.offers['boost-a17'].state,'not_found');
 assert.deepEqual(scan.history.offers,{});
});
test('conflicting official prices for one model are flagged as ambiguous and not recorded',()=>{
 const result=run(html(m('0'),m('19.99'),g('0'),p('0')));
 assert.equal(result.report.offers['boost-a17'].state,'ambiguous');
 assert.equal(result.report.summary.missingOrAmbiguous,1);
 assert.equal(result.report.summary.headlineMatches,2);
 assert.equal(result.history.offers['boost-a17'],undefined,'no nonunique observation can enter history');
});
test('redirect to an unrelated domain is treated as unavailable, never trusted as official',()=>{
 const result=run(html(g('0'),m('0'),p('0')),null,'https://boostmobile.com.evil.example/deals');
 assert.equal(result.report.summary.sourceUnavailable,3);
 assert.equal(result.report.summary.headlineMatches,0);
 assert.deepEqual(result.history.offers,{});
});
test('source failure preserves earlier history while preventing a fresh matched status',()=>{
 const before=run(html(g('0'),m('0'),p('0'))).history;
 const now=evaluatePriceEvidence({catalog:catalog(),html:'',sourceAvailable:false,
  finalUrl:BOOST_SOURCE,checkedAt:'2026-11-03T14:00:00Z',day:'2026-11-03',previousHistory:before});
 assert.equal(now.report.summary.headlineMatches,0);
 assert.equal(now.report.summary.sourceUnavailable,3);
 assert.deepEqual(now.history,before);
});
test('history stores one observation per local day, handles price changes and keeps 90 points',()=>{
 let history=run(html(g('0'),m('0'),p('0'))).history;
 const repeat=run(html(g('0'),m('0'),p('0')),history).history;
 assert.equal(repeat.offers['boost-a17'].length,1);
 history=repeat;
 for(let i=1;i<=98;i++){
   const day=new Date(Date.UTC(2026,10,2+i)).toISOString().slice(0,10);
   const res=evaluatePriceEvidence({catalog:catalog(),html:html(m(String(i))),
    sourceAvailable:true,finalUrl:BOOST_SOURCE,checkedAt:day+'T14:00:00Z',
    day,previousHistory:history});
   history=res.history;
 }
 assert.equal(history.offers['boost-a17'].length,90);
 assert.equal(history.offers['boost-a17'][0].price,9);
 assert.equal(history.offers['boost-a17'][89].price,98);
 assert.ok(history.offers['boost-a17'].every(x=>!('evidenceHtml' in x) && !('markup' in x)));
});
test('untrusted official-like text cannot certify financing, unlocking or rebate terms',()=>{
 const result=run(html(g('0'),m('0'),p('0')));
 assert.equal(result.report.method.includes('No AI'),true);
 assert.match(result.report.scope,/no financing\/unlocking\/fees\/checkout confirmation/);
 assert.equal(result.report.offers['boost-motog'].fullTermsVerified,false);
 assert.equal(result.report.offers['boost-a17'].fullTermsVerified,false);
});
