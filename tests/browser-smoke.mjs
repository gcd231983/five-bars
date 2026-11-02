// Browser acceptance checks for the Five Bars static site.
// Run using: npm install --no-save playwright@1.56.1
//            (Requires Google Chrome installed locally or on the CI runner.)
//            node tests/browser-smoke.mjs
import {strict as assert} from 'node:assert';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {extname,resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const site=resolve(dirname(fileURLToPath(import.meta.url)),'../site');
const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
const server=createServer(async (req,res)=>{
  try {
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const absolute=resolve(site,'.'+pathname+(pathname==='/'?'index.html':''));
    if(absolute!==site && !absolute.startsWith(site+sep))throw Error('Invalid path');
    const data=await readFile(absolute);
    res.writeHead(200,{'content-type':mime[extname(absolute)]||'application/octet-stream','cache-control':'no-store'});
    res.end(data);
  } catch {
    res.writeHead(404,{'content-type':'text/plain'});
    res.end('Not found');
  }
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox']});
const output=resolve(dirname(fileURLToPath(import.meta.url)),'../browser-artifacts');
await mkdir(output,{recursive:true});
let errors=[];
try {
  for (const [view,viewport] of Object.entries({
    mobile:{width:390,height:844},desktop:{width:1280,height:840}
  })) {
    const context=await browser.newContext({viewport,locale:'en-US'});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(view+': '+e.message));
    // Deterministic browser fixtures: demonstrate partial proof without implying
    // that any live offer has independently verified checkout terms.
    const checkedAt=new Date().toISOString();
    const evidence={
      schema:1,generatedAt:checkedAt,source:'https://www.boostmobile.com/deals',
      summary:{headlineMatches:1,priceMismatches:1,needReview:1},
      offers:{
        'boost-motog':{state:'headline_matched',scope:'advertised_device_and_plan_headline',
          observedPrice:0,observedPlanPrice:60,note:'Official page matches these headline fields; other terms are NOT verified.'},
        'boost-a17':{state:'headline_mismatch',scope:'advertised_device_and_plan_headline',
          observedPrice:19.99,observedPlanPrice:50,note:'Official device-price headline differs; review needed.'}
      }
    };
    const history={schema:1,offers:{
      'boost-a17':[{date:'2026-10-31',price:0,planPrice:50,source:'https://www.boostmobile.com/deals'},
        {date:'2026-11-02',price:19.99,planPrice:50,source:'https://www.boostmobile.com/deals'}]
    }};
    await page.route('**/data/status.json',async route=>{
      const response=await route.fetch();
      const saved=await response.json();
      saved.offers ||= {};
      saved.offers['boost-a17']={
        ...(saved.offers['boost-a17']||{}),
        state:'source_reachable',
        priceEvidenceState:'headline_mismatch',
        reviewRequired:true,
      };
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(saved)});
    });
    await page.route('**/data/price-evidence.json',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify(evidence)}));
    await page.route('**/data/price-history.json',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify(history)}));
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.locator('#fb-finder-form').waitFor({timeout:15000});
    await page.locator('#r-usm-starter').waitFor({state:'attached',timeout:15000});
    await page.locator('#t-finder').click();
    await page.locator('#t-finder').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#p-plans').isVisible(),true,'Arrow key activates next tab');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#p-finder').isVisible(),true,'Home returns to first tab');
    await page.locator('#fb-net').selectOption('att');
    await page.locator('#fb-lines').selectOption('2');
    await page.locator('#fb-budget').fill('80');
    await page.locator('#fb-finder-form button[type="submit"]').click();
    const options=page.locator('#fb-finder-results .fb-result');
    assert.ok(await options.count()>0,'Finder should show options on '+view);
    assert.match(await page.locator('#fb-finder-results').innerText(),/estimated/i);
    const width=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(width<=viewport.width+2,'Finder causes unwanted document overflow on '+view+': '+width);
    await page.screenshot({path:join(output,view+'-finder.png'),fullPage:true});
    await options.first().getByRole('button',{name:'Compare'}).click();
    assert.equal(await page.locator('#p-compare').isVisible(),true,'Clicking Compare opens comparison');
    assert.ok(await page.locator('#fb-compare-root table').count()>0,'comparison table exists');
    const familySelector=page.locator('#fb-compare-root .fb-compare-household select');
    assert.equal(await familySelector.inputValue(),'2','finder household size is preserved in comparisons');
    assert.match(await page.locator('#fb-compare-root').innerText(),/12-month total \(2 lines\)/);
    await familySelector.selectOption('3');
    assert.match(await page.locator('#fb-compare-root').innerText(),/12-month total \(3 lines\)/);
    await page.locator('#fb-compare-root .fb-compare-household select').selectOption('2');
    await page.screenshot({path:join(output,view+'-comparison.png'),fullPage:true});
    await page.locator('#t-plans').click();
    assert.equal(await page.locator('#p-plans').isVisible(),true);
    assert.ok(await page.locator('#plans-list .fb-review').count()>0,'verification labels on plan rows');
    await page.locator('#plans-list .fb-compare-btn').first().click();
    assert.equal(await page.locator('#p-compare').isVisible(),true);
    await page.locator('#t-phones').click();
    assert.ok(await page.locator('#phones-list .row').count()>0);
    assert.match(await page.locator('#r-boost-motog [data-verification]').innerText(),
      /Official headline matches/i);
    assert.match(await page.locator('#r-boost-a17 [data-verification]').innerText(),
      /Official headline differs/i);
    assert.match(await page.locator('#r-boost-a17 .price .now').innerText(),
      /Price under review/,'conflicting official price must never display as Free');
    assert.match(await page.locator('#r-boost-a17').innerText(),
      /stale totals suppressed/i);
    assert.equal(await page.locator('#r-boost-a17 .fb-compare-btn').count(),0,
      'disputed offer cannot be compared at stale catalog price');
    const phoneOverflow=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(phoneOverflow<=viewport.width+2,
      'Price-under-review row must not cause page overflow on '+view+': '+phoneOverflow);
    await page.locator('#t-pricewatch').click();
    assert.equal(await page.locator('#p-pricewatch').isVisible(),true);
    assert.equal(await page.locator('#fb-price-watch-root .fb-watch-card').count(),2,
      'Only tested offers are shown in price-watch fixture');
    assert.match(await page.locator('#fb-price-watch-root').innerText(),
      /A match never proves full eligibility/i);
    assert.ok(await page.locator('#fb-price-watch-root svg.fb-watch-chart').count()>0,
      'observed price history is plotted');
    assert.match(await page.locator('#fb-price-watch-root').innerText(),
      /19\.99/,'observed mismatch is visible');
    await page.screenshot({path:join(output,view+'-price-watch.png'),fullPage:true});
    await page.locator('#t-phones').click();
    assert.match(await page.locator('#phones-list').innerText(),/Due today \(est\.\)/);
    await page.locator('#phones-list .fb-compare-btn').first().click();
    assert.equal(await page.locator('#p-compare').isVisible(),true);
    assert.ok((await page.locator('#fb-compare-root').innerText()).includes('Due today (est.)'));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#fb-compare-root table').waitFor({timeout:15000});
    await page.locator('#t-compare').click();
    assert.ok(await page.locator('#fb-compare-root table').count()>0,'saved comparison survived reload');
    await context.close();
  }
  assert.deepEqual(errors,[],'no JavaScript page errors');
  console.log('PASS: mobile/desktop finder, verification, compare, saved state and layout');
} finally {
  await browser.close();
  await new Promise(done=>server.close(done));
}
