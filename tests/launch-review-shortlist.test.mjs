import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 LAUNCH_REVIEW_SCENARIOS,LAUNCH_REVIEW_IDS,LAUNCH_REVIEW_BY_ID
} from '../site/launch-review-shortlist.mjs';

const catalog=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
const plans=new Map(catalog.plans.map(p=>[p.id,p]));
const phones=new Map(catalog.phones.map(p=>[p.id,p]));

test('the launch evidence plan covers ten distinct, currently cataloged and unheld offers',()=>{
 assert.equal(LAUNCH_REVIEW_SCENARIOS.length,10);
 assert.equal(new Set(LAUNCH_REVIEW_IDS).size,10);
 assert.deepEqual(LAUNCH_REVIEW_IDS,LAUNCH_REVIEW_SCENARIOS.map(x=>x.id));
 let planCount=0,phoneCount=0;
 for(const scenario of LAUNCH_REVIEW_SCENARIOS){
  assert.equal(LAUNCH_REVIEW_BY_ID.get(scenario.id),scenario);
  assert.ok(scenario.goal.length>14);
  assert.ok(scenario.check.length>25);
  assert.ok(scenario.caution.length>28);
  const p=plans.get(scenario.id),d=phones.get(scenario.id);
  assert.ok(p||d,'selected review task '+scenario.id+' is still in the catalog');
  if(p)planCount++;
  if(d){
   phoneCount++;
   assert.ok(!d.listingHold,'retailer hold must never be described as a ready shopping quote');
   assert.notEqual(d.availability,'out_of_stock','stock holds are separate risk reviews');
  }
 }
 assert.equal(planCount,6,'reviewer should examine six varied service offers');
 assert.equal(phoneCount,4,'reviewer should also examine four device offers');
});

test('ten real-world risk categories are represented by actual selected-offer attributes',()=>{
 assert.ok(plans.get('visible'));
 assert.ok(plans.get('usm-starter').family?.['2']!=null,'two-line comparison must exist');
 assert.ok(plans.get('tello').price>=0,'time-bound offer must have a regular rate');
 assert.ok(/expired|promotion ends/i.test(LAUNCH_REVIEW_BY_ID.get('tello').caution),
  'old Tello promotion may not be presented as eligible after the deadline');
 for(const id of ['mint','cricket-25']){
  assert.equal(plans.get(id).billingMonths,12);
  assert.ok(plans.get(id).billingUpfront>0);
 }
 assert.ok(plans.get('cc').knownMonthlyFee>0);
 assert.ok(plans.get('cc').knownActivationFee>0);
 assert.ok(phones.get('boost-p10a').stay>0,'future service obligation must be covered');
 assert.equal(phones.get('boost-p10a').planDiscountCondition,'autopay');
 assert.ok(phones.get('cricket-16e').prepay>1);
 assert.equal(phones.get('cricket-16e').price,0);
 assert.equal(phones.get('cricket-16e').port,true);
 assert.equal(phones.get('vzpre-a17').newLineRequired,true);
 assert.ok(phones.get('vzpre-a17').firstMonthPlanPrice>=0);
 assert.equal(phones.get('vz-18pro').postpaid,true,'one gross-retail financing quote is required');
});

test('reviewer workbench displays scenario guidance without auto-signing or revealing personal data',()=>{
 const html=readFileSync(new URL('../site/review-workbench.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../site/review-workbench.mjs',import.meta.url),'utf8');
 const doc=readFileSync(new URL('../LAUNCH_CHECKOUT_REVIEW_PLAN.md',import.meta.url),'utf8');
 assert.match(html,/10-scenario launch review shortlist/);
 assert.match(html,/public read-only worksheet/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/LAUNCH_CHECKOUT_REVIEW_PLAN\.md/);
 assert.match(js,/import \{LAUNCH_REVIEW_IDS,LAUNCH_REVIEW_BY_ID\}/);
 assert.match(js,/Launch scenario: /);
 assert.match(js,/Quote to obtain: /);
 assert.match(js,/Do not assume: /);
 assert.match(js,/verificationState\(/);
 assert.match(js,/checkoutEvidenceIssues\(/);
 assert.match(doc,/genuine, current, anonymized official carrier checkout/i);
 assert.match(doc,/ten genuine, complete, current reviews/i);
 assert.doesNotMatch(doc,/ten offers (?:have been|are) verified/i);
});
