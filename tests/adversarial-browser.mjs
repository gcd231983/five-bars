// Adversarial Five Bars browser QA: deliberately unusual, isolated user journeys.
// Uses the same deterministic static release as the regular smoke suite. No live checkout.
import {strict as assert} from 'node:assert';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname,resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const site=process.env.FIVE_BARS_SITE_DIR?resolve(process.env.FIVE_BARS_SITE_DIR):join(repo,'site');
const artifact=join(repo,'browser-artifacts');
const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(site,'.'+pathname+(pathname==='/'?'index.html':''));
    if(file!==site&&!file.startsWith(site+sep))throw Error('Unsafe path');
    const content=await readFile(file);
    res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});
    res.end(content);
  }catch{
    res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');
  }
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/';
await mkdir(artifact,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
const findings=[];
async function ready(page,url=base){
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#r-usm-starter').waitFor({state:'attached',timeout:12000});
  await page.locator('#fb-switch-submit:not([disabled])').waitFor({state:'attached',timeout:12000});
}
async function changeTab(page,name){
  await page.evaluate(name=>window.showTab(name),name);
  await page.locator('#p-'+name).waitFor({state:'visible',timeout:10000});
}
async function scenario(name,viewport,run){
  const context=await browser.newContext({viewport,locale:'en-US'});
  const page=await context.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  const start=Date.now();
  let status='PASS',problem='';
  try{
    await run(page,context);
    assert.deepEqual(pageErrors,[],'Unexpected browser exceptions');
  }catch(err){
    status='FAIL';problem=err?.stack||String(err);
    try{await page.screenshot({path:join(artifact,'adversarial-'+name+'.png'),fullPage:true,timeout:12000});}catch{}
  }finally{
    findings.push({name,viewport,status,elapsedMs:Date.now()-start,problem:problem.slice(0,2800),pageErrors});
    process.stdout.write('['+status+'] '+name+(problem?' : '+problem.split('\n')[0]:'')+'\n');
    await context.close();
  }
}
try{
  for(const width of [320,360,768]){
    await scenario('layout-'+width,{width,height:812},async page=>{
      await ready(page);
      const sections=['finder','plans','phones','compare','switch','watchlist','pricewatch','sources'];
      for(const part of sections){
        await changeTab(page,part);
        const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
        assert.ok(horizontal<=2,part+' causes horizontal scrolling at '+width+'px: '+horizontal+'px');
      }
      await changeTab(page,'finder');
      assert.equal(await page.locator('.fb-site-brand svg rect').count(),5);
    });
  }

  await scenario('search-sort-filter-rapid',{width:390,height:844},async page=>{
    await ready(page);
    await page.evaluate(()=>window.fiveBarsBrowsePlans('all'));
    assert.equal(await page.locator('#plans-list .row').count(),38);
    const search=page.locator('#fb-plans-search');
    await search.fill('Tello');
    assert.ok((await page.locator('#plans-list .row').count())>=1);
    assert.ok((await page.locator('#plans-list .row').count())<38);
    await page.locator('#fb-plans-network').selectOption('vzw');
    assert.equal(await page.locator('#plans-list .row').count(),0);
    assert.match(await page.locator('#plans-list').innerText(),/No plans match/i);
    await page.locator('#fb-plans-network').selectOption('any');
    await search.fill('<img src=x onerror=window.__fiveBarsInjected=true>');
    assert.equal(await page.locator('#plans-list .row').count(),0);
    assert.equal(await page.evaluate(()=>window.__fiveBarsInjected===true),false);
    for(const order of ['pri','save','reg','year']){
      await page.locator('#fb-plans-order').selectOption(order);
      assert.equal(await page.locator('#fb-plans-order').inputValue(),order);
    }
    await page.locator('#fb-plans-show-unlimited').click();
    assert.equal(await search.inputValue(),'');
    assert.equal(await page.locator('#plans-list .row').count(),24);
    await page.locator('#fb-plans-show-all').click();
    assert.equal(await page.locator('#plans-list .row').count(),38);
    assert.doesNotMatch(await page.locator('#fb-plans-catalog-count').innerText(),/Showing 5 of 38/);
  });

  await scenario('compare-reload-cap-and-carrier-switch',{width:390,height:844},async page=>{
    await ready(page);
    await page.evaluate(()=>window.fiveBarsBrowsePlans('all'));
    await page.locator('#r-usm-starter button[data-compare-type="plan"][data-compare-id="usm-starter"]').click();
    assert.match(await page.locator('#fb-compare-tray').innerText(),/1 of 3 chosen/);
    await changeTab(page,'compare');
    await page.locator('#fb-compare-search').fill('Tello');
    await page.locator('.fb-compare-pick-add').first().click();
    assert.equal(await page.locator('.fb-compare-highlight').count(),2);
    assert.equal(await page.locator('#fb-compare-search').inputValue(),'');
    assert.ok(await page.locator('.fb-compare-pick-add').count()>0);
    await page.locator('.fb-compare-pick-add').first().click();
    assert.equal(await page.locator('.fb-compare-highlight').count(),3);
    await page.evaluate(()=>window.fiveBarsCompare('plan','visible'));
    assert.equal(await page.locator('.fb-compare-highlight').count(),3);
    assert.match(await page.locator('.fb-compare-notice').first().innerText(),/Three offers already selected/);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#r-usm-starter').waitFor({state:'attached',timeout:12000});
    await changeTab(page,'compare');
    assert.equal(await page.locator('.fb-compare-highlight').count(),3,'Three selections should persist after reload');
    await page.evaluate(()=>window.fiveBarsCompare('phone','boost-motog'));
    assert.equal(await page.locator('.fb-compare-highlight').count(),3,'Cross-type switch must not destroy saved plan comparison');
    await page.locator('.fb-compare-clear').click();
    assert.equal(await page.locator('.fb-compare-highlight').count(),0);
    await page.getByRole('button',{name:'Compare phone deals'}).click();
    assert.match(await page.locator('#fb-compare-root').innerText(),/Start with a phone deal/);
  });

  await scenario('watchlist-backup-corruption-and-injection',{width:390,height:844},async page=>{
    await ready(page);
    await changeTab(page,'watchlist');
    await page.locator('#fb-watch-carrier').selectOption('Tello');
    await page.getByRole('button',{name:'Add provider watch'}).click();
    assert.equal(await page.locator('.fb-watch-saved-card').count(),1);
    await page.locator('#fb-watch-backup').fill('{bad JSON');
    await page.getByRole('button',{name:'Import JSON'}).click();
    assert.match(await page.locator('#fb-watch-feedback').innerText(),/Import not completed/);
    assert.equal(await page.locator('.fb-watch-saved-card').count(),1);
    await page.locator('#fb-watch-backup').fill('X'.repeat(25001));
    await page.getByRole('button',{name:'Import JSON'}).click();
    assert.match(await page.locator('#fb-watch-feedback').innerText(),/25 KB/);
    assert.equal(await page.locator('.fb-watch-saved-card').count(),1);
    const hostile={schema:1,watches:[
      {kind:'carrier',id:'Tello',target:5},
      {kind:'carrier',id:'<img src=x onerror=window.__fiveBarsInjected=true>',target:1},
      {kind:'plan',id:'not-a-real-id',target:2},
      {kind:'carrier',id:'Tello',target:5},
      {kind:'plan',id:'usm-starter',target:-1}
    ]};
    await page.locator('#fb-watch-backup').fill(JSON.stringify(hostile));
    await page.getByRole('button',{name:'Import JSON'}).click();
    assert.equal(await page.locator('.fb-watch-saved-card').count(),1);
    assert.equal(await page.evaluate(()=>window.__fiveBarsInjected===true),false);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('.fb-watch-saved-card').waitFor({state:'attached',timeout:12000});
    assert.equal(await page.locator('.fb-watch-saved-card').count(),1);
  });

  await scenario('switch-result-invalidated-after-edit',{width:390,height:844},async page=>{
    await ready(page);
    await changeTab(page,'switch');
    await page.locator('#fb-switch-offer').selectOption('usm-starter');
    await page.locator('#fb-switch-current').fill('95');
    await page.locator('#fb-switch-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-switch-results').innerText(),/Current 12-month spending/);
    await page.locator('#fb-switch-current').fill('250');
    assert.equal(await page.locator('#fb-switch-results').innerText(),'',
      'After input changes, the previous savings result must be cleared to avoid a stale quote');
    assert.match(await page.locator('#fb-switch-message').innerText(),/recalculate|inputs changed/i);
    await page.locator('#fb-switch-current').fill('-4');
    assert.equal(await page.locator('#fb-switch-form').evaluate(f=>f.checkValidity()),false);
    await page.locator('#fb-switch-current').fill('250');
    await page.locator('#fb-switch-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-switch-results').innerText(),/Current 12-month spending/);
    await page.locator('#fb-switch-discountqualified').check();
    assert.equal(await page.locator('#fb-switch-results').innerText(),'',
      'Eligibility toggle must invalidate previous price result');
  });

  await scenario('saved-invalid-preferences-recovery',{width:390,height:844},async page=>{
    await page.addInitScript(()=>{
      localStorage.setItem('fivebars-prefs',JSON.stringify({
        mode:'outdated-view',lines:99999,net:'wrong-network',provider:'fake-provider',
        sort:'not-sortable',tab:'finder',t:{unl:true}
      }));
    });
    await ready(page);
    assert.equal(await page.locator('#lines').inputValue(),'1');
    assert.equal(await page.locator('#net').inputValue(),'any');
    await page.evaluate(()=>window.fiveBarsBrowsePlans('all'));
    assert.equal(await page.locator('#plans-list .row').count(),38);
    assert.doesNotMatch(await page.locator('#plans-list').innerText(),/\$Infinity|\$NaN/);
  });

  await scenario('blocked-storage-fallback',{width:390,height:844},async page=>{
    await page.addInitScript(()=>{
      Storage.prototype.getItem=function(){throw Error('Storage disabled for testing');};
      Storage.prototype.setItem=function(){throw Error('Storage disabled for testing');};
    });
    await ready(page);
    await page.evaluate(()=>window.fiveBarsBrowsePlans('all'));
    assert.equal(await page.locator('#plans-list .row').count(),38);
    await page.locator('#r-usm-starter button[data-compare-type="plan"][data-compare-id="usm-starter"]').click();
    assert.match(await page.locator('#fb-compare-tray').innerText(),/1 of 3 chosen/);
    await changeTab(page,'watchlist');
    assert.match(await page.locator('#fb-watchlist-root').innerText(),/local storage|saved watchlist|Stored on this device/i);
  });

  await scenario('partial-monitoring-outage',{width:390,height:844},async page=>{
    await page.route('**/data/status.json',route=>route.fulfill({
      status:503,contentType:'application/json',body:'{"error":"unavailable"}'
    }));
    await ready(page);
    await page.evaluate(()=>window.fiveBarsBrowsePlans('all'));
    assert.equal(await page.locator('#plans-list .row').count(),38);
    assert.doesNotMatch(await page.locator('#r-usm-starter .price').innerText(),/\$NaN|\$Infinity/);
  });

  await scenario('small-phone-more-navigation',{width:320,height:700},async page=>{
    await ready(page);
    assert.equal(await page.locator('#fb-tabs-more').isVisible(),true);
    await page.locator('#fb-tabs-more summary').click();
    await page.locator('[data-more-tab="switch"]').click();
    assert.equal(await page.locator('#p-switch').isVisible(),true);
    assert.equal(new URL(page.url()).hash,'#switch');
    await page.locator('#fb-tabs-more summary').click();
    await page.locator('[data-more-tab="watchlist"]').click();
    assert.equal(await page.locator('#p-watchlist').isVisible(),true);
    await page.goBack({waitUntil:'domcontentloaded'});
    await page.locator('#p-switch').waitFor({state:'visible',timeout:10000});
  });
}finally{
  await browser.close();
  await new Promise(ok=>server.close(ok));
  await writeFile(join(artifact,'adversarial-results.json'),
    JSON.stringify({testedAt:new Date().toISOString(),revision:process.env.FIVE_BARS_RELEASE_SHA||'CI branch',findings},null,2));
}
const fails=findings.filter(x=>x.status==='FAIL');
process.stdout.write('Adversarial QA: '+(findings.length-fails.length)+' passed; '+fails.length+' failed.\n');
if(fails.length)process.exitCode=1;
