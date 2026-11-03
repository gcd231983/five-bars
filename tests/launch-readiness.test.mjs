import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assessReadiness,renderReadiness} from '../scripts/launch-readiness.mjs';
import {rankMatches,phoneCost} from '../site/value-core.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const catalog=read('site/data/deals.json');
const research=read('site/data/research-evidence.json');
const retailerEvidence=read('site/data/retailer-evidence.json');
const ledger=read('site/data/verifications.json');
const status=read('site/data/status.json');
const today='2026-11-02';
const model=()=>assessReadiness({catalog,research,retailerEvidence,ledger,status,today});

test('new-line finder forwards confirmed eligibility into phone cost and does not invent unconfirmed savings',()=>{
 const offer=catalog.phones.find(p=>p.id==='vzpre-a17');
 assert.ok(offer?.newLineRequired);
 assert.equal(phoneCost(offer,{discountQualified:true}).due,null);
 const without=rankMatches({plans:[],phones:[offer]},{lines:1,network:'vzw',newCustomer:false},today);
 assert.equal(without.phoneMatches,0);
 const withNew=rankMatches({plans:[],phones:[offer]},{
   lines:1,network:'vzw',newCustomer:true,discountQualified:true},today);
 assert.equal(withNew.phoneMatches,1);
 assert.equal(withNew.phones[0].cost.requiresNewLine,undefined);
 assert.equal(withNew.phones[0].cost.due,60);
 assert.equal(withNew.phones[0].cost.year,610);
 assert.equal(withNew.phones[0].cost.conditionalDiscountUnconfirmed,false);
});

test('public beta report uses repository evidence, not product page impressions or fake approvals',()=>{
 const r=model();
 assert.equal(r.technicalStage,'public_beta_engineering');
 assert.equal(r.commercialStage,'blocked_pending_external_evidence');
 assert.deepEqual([r.source.total,r.source.researched,r.source.matched,r.source.partial,
  r.source.unresearched,r.source.retailerHolds,r.checkout.reviewed],
  [78,75,71,4,3,3,0]);
 assert.equal(r.checkout.unverified,78);
 assert.equal(r.ownerGates.length,6);
 assert.ok(r.ownerGates.every(g=>g.state!=='complete'));
 const html=renderReadiness(r);
 assert.match(html,/Public beta, not a certified checkout service/);
 assert.match(html,/Current human checkout scenarios/);
 assert.match(html,/Private consumer support/);
 assert.match(html,/Executed affiliate approvals/);
 assert.match(html,/owner action pending/i);
 assert.match(html,/source-research.html/);
 assert.doesNotMatch(html,/commercialStage":"approved|guaranteed savings|verified 78 of 78/i);
});

test('even abundant signed scenarios cannot silently certify affiliate contracts or owner approvals',()=>{
 const synthetic=structuredClone(ledger);
 const r=assessReadiness({catalog,research,retailerEvidence,ledger:synthetic,status,today,
  ownerEvidence:{privateSupport:true,legalApproval:true,affiliateContracts:true,userTesting:true,launchApproved:true}});
 assert.equal(r.commercialStage,'blocked_pending_external_evidence');
 assert.ok(r.ownerGates.every(g=>g.state!=='complete'));
 assert.equal(r.checkout.reviewed,0);
});

test('Eastern day boundary does not falsely mark evening scan as negative or future',()=>{
 const same=assessReadiness({catalog,research,retailerEvidence,ledger,
   status:{generatedAt:'2026-11-03T01:56:43.198Z'},today:'2026-11-02'});
 assert.equal(same.automation.scanAgeDays,0);
 assert.equal(same.automation.scanStatus,'recent');
 const prior=assessReadiness({catalog,research,retailerEvidence,ledger,
   status:{generatedAt:'2026-11-02T01:56:43.198Z'},today:'2026-11-02'});
 assert.equal(prior.automation.scanAgeDays,1);
 const future=assessReadiness({catalog,research,retailerEvidence,ledger,
   status:{generatedAt:'2026-11-05T10:00:00Z'},today:'2026-11-02'});
 assert.equal(future.automation.scanStatus,'clock_mismatch');
 const missing=assessReadiness({catalog,research,retailerEvidence,ledger,
   status:{generatedAt:'invalid'},today:'2026-11-02'});
 assert.equal(missing.automation.scanAgeDays,null);
 assert.equal(missing.automation.scanStatus,'not_reported');
});
