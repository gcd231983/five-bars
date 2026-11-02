import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateReviewRequest,VERIFY_ATTESTATION,INVALIDATE_ATTESTATION}
  from '../scripts/review-gate.mjs';
import {checkoutFixture} from './helpers/checkout-fixtures.mjs';

const catalog=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
const offer=catalog.plans.find(x=>x.id==='usm-starter');
const good=()=>checkoutFixture(offer,'2026-11-02');
const request=(options={})=>validateReviewRequest({
 operation:'verify',id:'usm-starter',evidenceUrl:'https://www.usmobile.com/plans',
 attestation:VERIFY_ATTESTATION,catalog,reviewerActor:'test-editor',
 reviewDetails:JSON.stringify(good()),today:'2026-11-02',...options
});

test('full-terms verification demands explicit exact human attestation, known offer and provider domain',()=>{
 const result=request();
 assert.equal(result.operation,'verify');
 assert.equal(result.id,'usm-starter');
 assert.equal(result.offer.carrier,'US Mobile');
 assert.equal(result.sourceUrl,'https://www.usmobile.com/plans');
 assert.equal(result.checkout.customerScenario,'new_line_port');
 assert.equal(result.reviewerActor,'test-editor');
 for(const bad of ['',undefined,'YES','I read some plans']){
   assert.throws(()=>request({attestation:bad}),/personally reviewing|Full-terms attestation/);
 }
 assert.throws(()=>request({id:'fake-phone'}),/Unknown offer/);
});
test('wrong, misleading and insecure official evidence URLs cannot certify unrelated carrier offers',()=>{
 for(const url of [
  'https://www.usmobile.com.attacker.invalid/plans',
  'https://www.visible.com/plans',
  'http://www.usmobile.com/plans',
  'https://user:pass@www.usmobile.com/plans',
  'https://www.usmobile.com:8443/plans',
  'javascript:alert(1)',
  'https://www.usmobile.com/plans#misleading'
 ]){
  assert.throws(()=>request({evidenceUrl:url}),/official|public HTTPS/,'should reject '+url);
 }
});
test('signoff rejects unsupported prices, unobserved taxes, personal data and incomplete checkout details',()=>{
 const badSamples=[
  ['missing amount',{...good(),upfrontCents:null}],
  ['negative amount',{...good(),renewalCents:-10}],
  ['uncertain taxes',{...good(),taxesAndFeesIncluded:false}],
  ['unconfirmed stock',{...good(),stockConfirmed:false}],
  ['wrong port scenario',{...good(),customerScenario:'not_required'}],
  ['outdated date',{...good(),observedAt:'2026-10-31'}],
  ['PII injected',{...good(),subscriberAccount:'PRIVATE_NUMBER'}],
  ['unchecked materials',{...good(),checks:{...good().checks,
    phone_lock_early_exit_and_credit_terms:false}}]
 ];
 for(const [label,detail] of badSamples){
  assert.throws(()=>request({reviewDetails:JSON.stringify(detail)}),/Checkout evidence is incomplete/,label);
 }
 for(const absent of ['',undefined,'{}','not-json']){
  assert.throws(()=>request({reviewDetails:absent}),/evidence|valid JSON/);
 }
 assert.throws(()=>request({reviewerActor:'fake actor with spaces'}),/GitHub actor/);
 assert.throws(()=>request({reviewerActor:''}),/GitHub actor/);
 const sold=catalog.phones.find(x=>x.availability==='out_of_stock');
 assert.ok(sold);
 const notAvailable={...checkoutFixture(sold,'2026-11-02')};
 assert.throws(()=>request({id:sold.id,evidenceUrl:sold.url,
  reviewDetails:JSON.stringify(notAvailable)}),/out of stock|inventory|available/i);
 const postpaid=catalog.phones.find(x=>x.postpaid===true);
 assert.ok(postpaid);
 const unfinished=checkoutFixture(postpaid,'2026-11-02');
 delete unfinished.financing;
 assert.throws(()=>request({id:postpaid.id,evidenceUrl:postpaid.url,
  reviewDetails:JSON.stringify(unfinished)}),/financ/i);
});
test('human review invalidation is deliberate and cannot be triggered by the verification phrase',()=>{
 const result=request({operation:'invalidate',attestation:INVALIDATE_ATTESTATION,evidenceUrl:''});
 assert.equal(result.operation,'invalidate');
 assert.equal(result.sourceUrl,null);
 assert.throws(()=>request({operation:'invalidate',attestation:VERIFY_ATTESTATION}),/invalidation confirmation/);
 assert.throws(()=>request({operation:'delete',attestation:INVALIDATE_ATTESTATION}),/Choose verify or invalidate/);
});
test('workflow is opt-in, non-automated, pinned to main, signed and runs auditing',()=>{
 const yml=readFileSync(new URL('../.github/workflows/human-review.yml',import.meta.url),'utf8');
 assert.match(yml,/workflow_dispatch/);
 assert.match(yml,/github.ref == 'refs\/heads\/main'/);
 assert.match(yml,/contents: write/);
 assert.match(yml,/node scripts\/review-dispatch\.mjs/);
 assert.match(yml,/review_details:/);
 assert.match(yml,/REVIEW_DETAILS: /);
 assert.match(readFileSync(new URL('../scripts/review-offer.mjs',import.meta.url),'utf8'),/anonymized_human_checkout_quote/);
 assert.match(yml,/node scripts\/review-offer\.mjs audit/);
 assert.match(yml,/git add site\/data\/verifications\.json/);
 assert.match(yml,/requested by \$GITHUB_ACTOR/);
 assert.match(yml,/group: five-bars/);
 assert.doesNotMatch(yml,/schedule:\s/);
});
