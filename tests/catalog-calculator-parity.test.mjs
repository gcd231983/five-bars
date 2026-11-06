import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {planCost,phoneCost} from '../site/value-core.mjs';

// Guard the two customer-facing calculators against contradictory estimates.
// These tests execute the actual homepage function bodies, not copies of the
// pricing formulas. A future change to either surface must preserve parity.
const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
function extract(name){
 const source=html.match(new RegExp('^function '+name+'\\([^\\n]*\\)\\{[\\s\\S]*?^\\}','m'))?.[0];
 assert.ok(source,'Homepage function '+name+' must remain independently testable');
 return source;
}
const state={lines:1,t:{}};
const context={state,today:'2026-11-06'};
context.easternDay=()=>context.today; // Simulate the actual Eastern date moving while the page stays open.
const functions=runInNewContext(['endInfo','planCalc','phoneCalc'].map(extract).join('\n')+
 '\n;({planCalc,phoneCalc})',context);

function equalMoney(a,b,context){
 const left=a===undefined?null:a,right=b===undefined?null:b;
 if(left===null||right===null){
  assert.equal(left,right,context);
 } else {
  assert.ok(Number.isFinite(left)&&Number.isFinite(right)&&Math.abs(left-right)<0.000001,
   context+': legacy='+left+' shared='+right);
 }
}
const eligibility=[
 {name:'unknown',t:{}},
 {name:'new-line',t:{newcustomer:true}},
 {name:'eligible-transfer',t:{canport:true}},
 {name:'cannot-transfer',t:{noport:true}},
 {name:'payment-discount',t:{discountqualified:true}},
 {name:'new-and-port',t:{newcustomer:true,canport:true}},
 {name:'all-confirmed',t:{newcustomer:true,canport:true,discountqualified:true}},
 {name:'conflicting-port-answers',t:{canport:true,noport:true,newcustomer:true}}
];
const days=['2026-11-06','2026-11-09','2026-11-10'];

test('all catalog plans use the same upfront, recurring and year-one math in homepage and finder',()=>{
 let checked=0;
 for(const today of days){
  context.today=today;
  for(const count of [1,2,3,4,5]){
   state.lines=count;
   for(const {name,t} of eligibility){
    state.t=t;
    for(const offer of catalog.plans){
     // Unsupported multi-line annual billing and explicitly one-line plans
     // are hidden on the homepage and rejected by the shared model.
     if(offer.maxLines&&count>offer.maxLines)continue;
     if(offer.billingMonths===12&&count!==1)continue;
     const legacy=functions.planCalc(offer);
     const shared=planCost(offer,count,{
      today,canPort:t.canport===true,cannotPort:t.noport===true,
      newCustomer:t.newcustomer===true,discountQualified:t.discountqualified===true
     });
     const where=offer.id+' '+count+' lines '+name+' on '+today;
     assert.ok(legacy&&shared,where+' returned missing plan quote');
     for(const [a,b] of [
      [legacy.now,shared.nowPerLine],
      [legacy.reg,shared.regularPerLine],
      [legacy.year,shared.year],
      [legacy.upfrontDue,shared.upfrontDue],
      [legacy.knownMonthlyFee,shared.knownMonthlyFeeTotal],
      [legacy.knownActivationFee,shared.knownActivationFeeTotal]
     ])equalMoney(a,b,where);
     assert.equal(Boolean(legacy.live),shared.promoUsed,where+' intro eligibility differs');
     assert.equal(legacy.annualPrepaid,shared.annualPrepaid,where+' annual billing differs');
     assert.equal(legacy.famKnown,shared.familyKnown,where+' household certainty differs');
     assert.equal(legacy.promoFamilyUnconfirmed,shared.promoFamilyUnconfirmed,where+' family intro certainty differs');
     assert.equal(legacy.conditionalDiscountUnconfirmed,shared.conditionalDiscountUnconfirmed,where+' payment discount differs');
     checked++;
    }
   }
  }
 }
 assert.ok(checked>1000,'A full catalog and eligibility matrix must run');
});

test('all catalog phone offers have identical estimates and withheld totals on both surfaces',()=>{
 let checked=0;
 state.lines=1;
 for(const today of days){
  context.today=today;
  for(const {name,t} of eligibility){
   state.t=t;
   for(const offer of catalog.phones){
    const legacy=functions.phoneCalc(offer);
    const shared=phoneCost(offer,{
     newCustomer:t.newcustomer===true,discountQualified:t.discountqualified===true
    });
    const where=offer.id+' '+name+' on '+today;
    assert.ok(legacy&&shared,where+' returned missing phone quote');
    for(const [a,b] of [
     [legacy.due,shared.due],
     [legacy.commitment,shared.commitment],
     [legacy.year,shared.year],
     [legacy.eff,shared.netDevice],
     [legacy.planPrice,shared.planPrice]
    ])equalMoney(a,b,where);
    for(const flag of ['listingHold','unavailable','financingUncertain','requiresNewLine','conditionalDiscountUnconfirmed']){
     assert.equal(Boolean(legacy[flag]),Boolean(shared[flag]),where+' flag '+flag+' differs');
    }
    checked++;
   }
  }
 }
 assert.ok(checked>=catalog.phones.length*eligibility.length*days.length);
});

test('Tello promotion stays conditional on its last published day and is excluded the next Eastern day',()=>{
 const offer=catalog.plans.find(p=>p.id==='tello');
 assert.ok(offer?.promo?.ends==='2026-11-09');
 state.lines=1;
 state.t={newcustomer:true};
 context.today='2026-11-09';
 const finalDay=functions.planCalc(offer);
 const coreFinal=planCost(offer,1,{today:'2026-11-09',newCustomer:true});
 assert.equal(finalDay.now,10);
 assert.equal(coreFinal.nowPerLine,10);
 context.today='2026-11-10';
 const nextDay=functions.planCalc(offer);
 const coreNext=planCost(offer,1,{today:'2026-11-10',newCustomer:true});
 assert.equal(nextDay.now,15);
 assert.equal(coreNext.nowPerLine,15);
 assert.equal(Boolean(nextDay.live),false);
 assert.equal(coreNext.promoUsed,false);
});

test('US Mobile introductory quote never assumes AutoPay based on a confirmed port alone',()=>{
 state.lines=1;
 context.today='2026-11-06';
 for(const [id,regular,promo] of [['usm-starter',25,15],['usm-premium',44,25]]){
  const offer=catalog.plans.find(x=>x.id===id);
  state.t={canport:true};
  const withoutPayment=functions.planCalc(offer);
  assert.equal(withoutPayment.now,regular);
  assert.equal(withoutPayment.live,false);
  assert.match(withoutPayment.promoState.why,/requires AutoPay/);
  state.t={discountqualified:true};
  assert.equal(functions.planCalc(offer).now,regular,'AutoPay alone does not prove port eligibility');
  state.t={canport:true,discountqualified:true};
  const qualified=functions.planCalc(offer);
  assert.equal(qualified.now,promo);
  assert.equal(qualified.live,true);
  assert.equal(qualified.year,6*promo+6*regular);
  const core=planCost(offer,1,{today:context.today,canPort:true,discountQualified:true});
  assert.equal(qualified.upfrontDue,core.upfrontDue);
 }
});
