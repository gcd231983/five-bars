import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateReviewRequest,VERIFY_ATTESTATION,INVALIDATE_ATTESTATION}
  from '../scripts/review-gate.mjs';

const catalog=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
const request=(options={})=>validateReviewRequest({
 operation:'verify',id:'usm-starter',evidenceUrl:'https://www.usmobile.com/plans',
 attestation:VERIFY_ATTESTATION,catalog,...options,
});

test('full-terms verification demands explicit exact human attestation, known offer and provider domain',()=>{
 const result=request();
 assert.equal(result.operation,'verify');
 assert.equal(result.id,'usm-starter');
 assert.equal(result.offer.carrier,'US Mobile');
 assert.equal(result.sourceUrl,'https://www.usmobile.com/plans');
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
 assert.match(yml,/node scripts\/review-offer\.mjs audit/);
 assert.match(yml,/git add site\/data\/verifications\.json/);
 assert.match(yml,/requested by \$GITHUB_ACTOR/);
 assert.match(yml,/group: five-bars/);
 assert.doesNotMatch(yml,/schedule:\s/);
});
