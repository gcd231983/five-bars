import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runInNewContext} from 'node:vm';

test('when ALL sources reject requests, known expirations still publish and no prices are revalidated',async t=>{
 const fixture=await mkdtemp(join(tmpdir(),'five-bars-source-blackout-'));
 try{
  await mkdir(join(fixture,'scripts'),{recursive:true});
  await mkdir(join(fixture,'site/data'),{recursive:true});
  for(const name of [
   'auto-core.mjs','auto-update.mjs','price-evidence.mjs','mvno-evidence.mjs',
   'review-queue.mjs','alert-engine.mjs','source-health.mjs'
  ])await copyFile(new URL('../scripts/'+name,import.meta.url),join(fixture,'scripts',name));
  await copyFile(new URL('../site/value-core.mjs',import.meta.url),join(fixture,'site/value-core.mjs'));
  const before={
   checked:'2026-10-29',
   sources:[{name:'Boost official promotions',url:'https://www.boostmobile.com/deals'}],
   plans:Array.from({length:10},(_,i)=>({
    id:i===0?'tello':'test-plan-'+i,
    carrier:i===0?'Tello':'Test Provider',plan:'Test Plan '+i,price:i===0?15:25,
    url:'https://example.com/plans',
    ...(i===0?{promo:{price:10,months:3,req:'new',ends:'2000-01-01'}}:{})
   })),
   phones:Array.from({length:12},(_,i)=>({
    id:'test-phone-'+i,carrier:'Test Provider',phone:'Test Phone '+i,
    price:49.99,planPrice:30,url:'https://example.com/devices',
    ...(i===0?{ends:'2000-01-01'}:{})
   }))
  };
  await writeFile(join(fixture,'site/data/deals.json'),JSON.stringify(before));
  // This is a simulated blackout. A 503 never proves an advertised offer has
  // changed, and it must never prevent independently dated expirations.
  t.mock.method(globalThis,'fetch',async()=>({ok:false,status:503}));
  await import(pathToFileURL(join(fixture,'scripts/auto-update.mjs')).href);
  const get=async name=>JSON.parse(await readFile(join(fixture,'site/data',name),'utf8'));
  const deals=await get('deals.json');
  const changes=await get('changes.json');
  const status=await get('status.json');
  const prices=await get('price-evidence.json');
  const mvno=await get('mvno-evidence.json');
  const alerts=await get('alerts.json');
  assert.equal(deals.checked,before.checked,'no fake human review date');
  assert.equal(deals.plans[0].price,15,'regular published rate preserved');
  assert.equal(deals.plans[0].promo,undefined,'expired intro price removed during outage');
  assert.deepEqual(deals.plans.slice(1),before.plans.slice(1),'other plans not modified');
  assert.deepEqual(deals.phones,before.phones.slice(1),'only dated expired phone removed');
  assert.deepEqual(changes.changed,['tello']);
  assert.deepEqual(changes.removed,['test-phone-0']);
  assert.equal(status.summary.sourceBlackout,true,'must flag complete monitoring outage');
  assert.equal(status.summary.sourcesChecked,1);
  assert.equal(status.summary.sourcesReachable,0);
  assert.equal(status.summary.offerLinksReachable,0);
  assert.equal(status.summary.automaticChanges,2);
  assert.equal(status.summary.expiredPhoneDealsRemoved,1);
  assert.ok(status.sources.every(s=>s.ok===false && s.failureReason==='source_server_error'));
  assert.ok(Object.values(status.offers).every(s=>s.state==='source_unavailable'));
  assert.equal(prices.summary.headlineMatches,0,'no prices confirmed by failed scans');
  assert.equal(mvno.summary.headlineMatches,0,'no plan prices confirmed by failed scans');
  assert.equal(status.lastFullReview,before.checked);
  assert.equal(alerts.events.some(x=>x.type==='rate-change'),false,'no fabricated rate-change event');
 }finally{await rm(fixture,{recursive:true,force:true});}
});

test('home page displays visible blackout warning even when the failed scan is recent',()=>{
 const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
 const age=html.match(/^function catalogAgeDays\([^)]*\)\{[\s\S]*?^\}/m)?.[0];
 const render=html.match(/^function renderCatalogFreshness\(\)\{[\s\S]*?^\}/m)?.[0];
 assert.ok(age && render,'read actual homepage freshness code');
 const node={hidden:true,textContent:''};
 runInNewContext(age+'\n'+render+'\nrenderCatalogFreshness();',{
  $:id=>{assert.equal(id,'#fb-catalog-freshness');return node;},
  CHECKED:'2026-10-29',
  AUTO_STATUS:{
   generatedAt:new Date().toISOString(),
   summary:{sourcesChecked:18,sourcesReachable:0,sourceBlackout:true}
  }
 });
 assert.equal(node.hidden,false);
 assert.match(node.textContent,/Public-source monitoring blackout/i);
 assert.match(node.textContent,/NOT been revalidated/i);
 assert.match(node.textContent,/known published expirations/i);
 assert.match(node.textContent,/Carrier checkout determines/i);
});

test('guided finder also shows a warning outside collapsed pricing details',()=>{
 const js=readFileSync(new URL('../site/value-ui.mjs',import.meta.url),'utf8');
 const warning=js.indexOf("PUBLIC-SOURCE MONITORING UNAVAILABLE:");
 const details=js.indexOf("const details=element('details',null,'fb-finder-caveats');");
 assert.ok(warning>0&&details>warning,'warning appears before collapsed details');
 assert.match(js,/sourceHealth\.sourceBlackout===true/);
 assert.match(js,/warning\.setAttribute\('role','status'\)/);
 assert.match(js,/known published promotion deadlines are still enforced/i);
 assert.match(js,/Listed prices and eligibility remain unconfirmed/i);
});
