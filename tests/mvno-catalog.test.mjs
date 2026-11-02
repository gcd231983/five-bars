import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
import {planCost,rankMatches,offerSignature} from '../site/value-core.mjs';

const data=JSON.parse(readFileSync(new URL('../site/data/deals.json',import.meta.url),'utf8'));
const byId=id=>data.plans.find(p=>p.id===id);
const introduced=['tello-starter','tello-power','tello-max','h2o-10gb','h2o-unlimited',
  'helium-air','helium-infinity','mobilex-unlimited10','mobilex-unlimited30',
  'redpocket-essentials','redpocket-plus','redpocket-premium',
  'good2go-annual1','good2go-annual3','good2go-annual5','h2o-annual10','h2o-annual30'];

test('catalog has expanded MVNO networks with unique IDs and official provenance',()=>{
  assert.equal(data.plans.length,38);
  assert.equal(data.phones.length,40);
  assert.equal(new Set(data.plans.map(p=>p.carrier)).size,18);
  assert.ok(introduced.every(id=>!!byId(id)),'all new plans must remain in catalog');
  assert.ok(data.plans.filter(p=>p.carrier==='Tello').length>=4);
  for (const id of introduced) {
    const p=byId(id);
    assert.match(p.url,/^https:\/\//);
    assert.equal(p.priceSourceDate,'2026-11-02','official price must have scoped date');
    assert.ok(['att','tmo','vzw','multi'].includes(p.net));
    assert.equal(p.pri,null,'do not invent priority data for new MVNO plans');
    assert.equal(p.tax,false,'fees and taxes must not be silently included');
  }
});
test('prices and allowances follow dated official carrier listings',()=>{
  assert.deepEqual([byId('tello-starter').price,byId('tello-power').price,byId('tello-max').price],[10,20,25]);
  assert.deepEqual([byId('h2o-10gb').price,byId('h2o-unlimited').price],[20,30]);
  assert.deepEqual([byId('helium-air').price,byId('helium-infinity').price],[15,30]);
  assert.deepEqual([byId('mobilex-unlimited10').price,byId('mobilex-unlimited30').price],[14.88,24.88]);
  assert.deepEqual([byId('redpocket-essentials').price,byId('redpocket-plus').price,byId('redpocket-premium').price],[10,20,30]);
  assert.equal(byId('redpocket-plus').promo.price,10);
  assert.equal(byId('redpocket-plus').promo.months,1);
  assert.equal(byId('redpocket-plus').promo.req,'new');
  assert.equal(byId('h2o-10gb').net,'att');
  assert.equal(byId('tello-max').hot,'10GB hotspot');
});
test('annual payments are NOT modeled as month-by-month bills',()=>{
  const cases=[
    ['good2go-annual1',5,60],['good2go-annual3',10,120],
    ['good2go-annual5',20,240],['h2o-annual10',16,192],
    ['h2o-annual30',24,288],
  ];
  for(const [id,effective,upfront] of cases){
    const plan=byId(id);
    assert.equal(plan.price,effective);
    assert.equal(plan.billingUpfront,upfront);
    assert.equal(plan.billingMonths,12);
    assert.equal(plan.maxLines,1);
    const cost=planCost(plan,1,{today:'2026-11-02'});
    assert.equal(cost.year,upfront);
    assert.equal(cost.upfrontDue,upfront);
    assert.equal(cost.monthTotal,effective);
    assert.equal(cost.annualPrepaid,true);
    assert.equal(cost.billingMonths,12);
  }
});
test('legacy HTML and pure planCost agree on prepaid annual math',()=>{
  const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
  const source=html.match(/^function planCalc\(p\)\{[\s\S]*?^\}/m)?.[0];
  assert.ok(source,'site includes an accessible plan calculator');
  const annual=byId('good2go-annual1');
  const p=runInNewContext(source+';planCalc(plan);',{
    plan:annual,state:{lines:1,t:{}},endInfo:()=>null,
  });
  const c=planCost(annual,1,{today:'2026-11-02'});
  assert.equal(p.year,c.year);
  assert.equal(p.upfrontDue,c.upfrontDue);
  assert.equal(p.annualPrepaid,true);
  assert.match(html,/Billed annually/);
  assert.match(html,/\/mo eq\./);
  assert.match(html,/Filter wireless provider/);
  assert.match(html,/priceSourceDate/);
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
});
test('provider filter only lists that carrier and network requirements still apply',()=>{
  const tello=rankMatches(data,{provider:'Tello',network:'tmo',lines:1},'2026-11-02');
  assert.ok(tello.plans.length>=4);
  assert.ok(tello.plans.every(x=>x.offer.carrier==='Tello'));
  assert.equal(tello.phoneMatches,0,'choosing Tello cannot show unrelated device promotions');
  assert.equal(rankMatches(data,{provider:'Tello',network:'att',lines:1},'2026-11-02').planMatches,0);
  const h2o=rankMatches(data,{provider:'H2O Wireless',network:'att',lines:1},'2026-11-02');
  assert.equal(h2o.plans.length,4);
  assert.ok(h2o.plans.every(x=>x.offer.net==='att'));
});
test('prepaid annual plans do not claim unsupported multi-line eligibility',()=>{
  const single=rankMatches(data,{provider:'Good2Go Mobile',lines:1},'2026-11-02');
  assert.equal(single.phoneMatches,0,'Good2Go provider selection excludes other carriers phones');
  assert.equal(rankMatches(data,{provider:'Good2Go Mobile',lines:2},'2026-11-02').planMatches,0);
  assert.equal(rankMatches(data,{provider:'Good2Go Mobile',lines:1,budget:12},'2026-11-02').planMatches,2);
  const h2o=rankMatches(data,{provider:'H2O Wireless',lines:1,network:'att'},'2026-11-02');
  assert.ok(h2o.messages.some(x=>x.includes('full year payment upfront')));
  assert.equal(h2o.plans[0].cost.upfrontDue,192,'annual 10GB has $192 upfront even with $16 monthly equivalent');
});
test('carrier-source evidence does not accidentally become a manual full-deal verification',()=>{
  assert.equal(typeof byId('h2o-10gb').priceSourceDate,'string');
  const verified=JSON.parse(readFileSync(new URL('../site/data/verifications.json',import.meta.url),'utf8'));
  assert.equal(verified.offers['h2o-10gb'],undefined);
  assert.notEqual(offerSignature(byId('h2o-10gb')),offerSignature(byId('h2o-annual10')));
});
