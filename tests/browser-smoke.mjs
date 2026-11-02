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
    const mvno={
      schema:1,generatedAt:checkedAt,summary:{headlineMatches:2,priceMismatches:1,sourceUnavailable:0,needReview:1},
      offers:{
        'helium-air':{state:'headline_matched',scope:'official_plan_rate_and_billing_term_headline',observedPrice:15,observedUpfront:null,billingMonths:1,sourceUrl:'https://support.hellohelium.com/en/articles/17734883-plans-pricing',note:'Official plan rate matched; full terms NOT verified.'},
        'helium-infinity':{state:'headline_mismatch',scope:'official_plan_rate_and_billing_term_headline',observedPrice:35,observedUpfront:null,billingMonths:1,sourceUrl:'https://support.hellohelium.com/en/articles/17734883-plans-pricing',note:'Official plan price differs from the catalog.'},
        'good2go-annual1':{state:'headline_matched',scope:'official_plan_rate_and_billing_term_headline',observedPrice:5,observedUpfront:60,billingMonths:12,sourceUrl:'https://annualplans.good2gomobile.com/home-page',note:'Official annual payment $60 matches the listed monthly equivalent; full terms NOT verified.'},
        'h2o-10gb':{state:'headline_matched',scope:'official_plan_rate_and_billing_term_headline',observedPrice:20,observedUpfront:null,billingMonths:1,sourceUrl:'https://www.h2owireless.com/',note:'Official homepage featured monthly rate matched; full terms NOT verified.'},
        'h2o-unlimited':{state:'headline_matched',scope:'official_plan_rate_and_billing_term_headline',observedPrice:30,observedUpfront:null,billingMonths:1,sourceUrl:'https://www.h2owireless.com/',note:'Official homepage unlimited plan monthly rate matched; full terms NOT verified.'}
      }
    };
    const mvnoHistory={schema:1,offers:{
      'helium-infinity':[{date:'2026-11-01',price:30,source:'https://support.hellohelium.com/en/articles/17734883-plans-pricing'},{date:'2026-11-02',price:35,source:'https://support.hellohelium.com/en/articles/17734883-plans-pricing'}],
      'good2go-annual1':[{date:'2026-11-02',price:5,upfront:60,billingMonths:12,source:'https://annualplans.good2gomobile.com/home-page'}]
    }};
    const alertFeed={
      schema:1,generatedAt:checkedAt,today:'2026-11-02',
      summary:{active:2,critical:1,high:1,historical:1},
      events:[
        {key:'conflict:plan:helium-infinity:2026-11-02',type:'conflict',active:true,notify:true,severity:'critical',
          title:'Helium Mobile Infinity — official rate differs',carrier:'Helium Mobile',offerId:'helium-infinity',
          description:'Catalog rate conflicts with a partial official headline observation. Not a checkout quote.',
          action:'Check the current carrier offer.',sourceUrl:'https://support.hellohelium.com/en/articles/17734883-plans-pricing'},
        {key:'deadline:plan:tello:2026-11-09',type:'deadline',active:true,notify:true,severity:'high',
          title:'Tello introductory promotion ends November 9',carrier:'Tello',offerId:'tello',
          description:'Catalog end date is coming soon, pending carrier confirmation.',
          action:'Confirm current eligibility and expiration.',sourceUrl:'https://tello.com/buy/custom_plans'},
        {key:'rate-change:phone:boost-motog:2026-11-01',type:'rate-change',active:false,severity:'high',
          title:'Old observed rate change',offerId:'boost-motog'}
      ]
    };
    const reviewQueue={schema:1,generatedAt:checkedAt,
      summary:{offers:78,needAttention:3,critical:1,high:1,medium:1,routine:0,withoutCurrentManualReview:78,blockedProviders:2},
      blockedProviders:[{carrier:'Tello',affected:1},{carrier:'Red Pocket Mobile',affected:1}],
      items:[
        {id:'helium-infinity',carrier:'Helium Mobile',offer:'Infinity Unlimited',kind:'plan',priority:'critical',manualReviewStatus:'unverified',
         reasons:['Official price differs from the catalog.'],link:'https://support.hellohelium.com/en/articles/17734883-plans-pricing'},
        {id:'tello',carrier:'Tello',offer:'Everyday 10GB',kind:'plan',priority:'high',manualReviewStatus:'unverified',
         reasons:['Promotion ends soon.'],link:'https://tello.com/buy/custom_plans'},
        {id:'redpocket-plus',carrier:'Red Pocket Mobile',offer:'Plus 20GB',kind:'plan',priority:'medium',manualReviewStatus:'unverified',
         reasons:['Carrier purchase page could not be checked automatically.'],link:'https://my.redpocket.com/plans'}
      ]
    };
    await page.route('**/data/status.json',async route=>{
      const response=await route.fetch();
      const saved=await response.json();
      saved.generatedAt=checkedAt;
      saved.offers ||= {};
      saved.offers['boost-a17']={
        ...(saved.offers['boost-a17']||{}),
        state:'source_reachable',
        priceEvidenceState:'headline_mismatch',
        reviewRequired:true,
      };
      saved.offers['helium-infinity']={
        ...(saved.offers['helium-infinity']||{}),
        state:'source_reachable',
        mvnoPriceEvidenceState:'headline_mismatch',
        reviewRequired:true,
      };
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(saved)});
    });
    await page.route('**/data/price-evidence.json',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify(evidence)}));
    await page.route('**/data/price-history.json',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify(history)}));
    await page.route('**/data/mvno-evidence.json',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify(mvno)}));
    await page.route('**/data/mvno-history.json',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify(mvnoHistory)}));
    await page.route('**/data/review-queue.json',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify(reviewQueue)}));
    await page.route('**/data/alerts.json',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify(alertFeed)}));
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.locator('#fb-finder-form').waitFor({timeout:15000});
    await page.waitForFunction(()=>
      document.querySelector('#fb-finder-form button[type="submit"]')?.disabled===false,
      {timeout:15000});
    await page.locator('#r-usm-starter').waitFor({state:'attached',timeout:15000});
    await page.locator('#t-finder').click();
    assert.equal(await page.locator('.fb-tab-swipe').isVisible(),view==='mobile',
      'mobile navigation should offer a swipe hint');
    await page.locator('#t-finder').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#p-plans').isVisible(),true,'Arrow key activates next tab');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#p-finder').isVisible(),true,'Home returns to first tab');
    // MVNO expansion: find an exact provider, and verify annual billing on mobile and desktop.
    await page.locator('#fb-net').selectOption('tmo');
    await page.locator('#fb-provider').selectOption('Tello');
    await page.locator('#fb-lines').selectOption('1');
    await page.locator('#fb-budget').fill('');
    await page.locator('#fb-finder-form button[type="submit"]').click();
    assert.ok((await page.locator('#fb-finder-results .fb-result').count())>=3,
      'Tello should appear with multiple official-priced tiers');
    assert.ok((await page.locator('#fb-finder-results .fb-result').first().innerText()).includes('Tello'),
      'provider filter should remove non-Tello plans');

    await page.locator('#fb-net').selectOption('any');
    await page.locator('#fb-provider').selectOption('Good2Go Mobile');
    await page.locator('#fb-finder-form button[type="submit"]').click();
    const annualText=await page.locator('#fb-finder-results').innerText();
    assert.match(annualText,/\$60\.00 UPFRONT/i,'annual plan must expose $60 upfront');
    assert.match(annualText,/not a monthly subscription/i);
    assert.match(annualText,/Phone offers \(0 match the selected filters\)/,
      'provider preference must exclude other carriers handset promotions');
    await page.screenshot({path:join(output,view+'-mvno-annual.png'),fullPage:true});
    await page.locator('#fb-finder-results .fb-result').first().getByRole('button',{name:'Compare'}).click();
    assert.match(await page.locator('#fb-compare-root').innerText(),/Billing \/ upfront amount/i);
    assert.match(await page.locator('#fb-compare-root').innerText(),/\$60\.00 upfront for 12 months/i);
    await page.locator('#t-finder').click();
    await page.locator('#fb-provider').selectOption('any');
    await page.locator('#fb-net').selectOption('att');
    await page.locator('#fb-lines').selectOption('2');
    await page.locator('#fb-budget').fill('80');
    await page.locator('#fb-finder-form button[type="submit"]').click();
    const options=page.locator('#fb-finder-results .fb-result');
    const optionCount=await options.count();
    assert.ok(optionCount>0,'Finder should show options on '+view+
      '. UI says: '+(await page.locator('#fb-finder-results').innerText())+
      '. JavaScript errors: '+errors.join('; '));
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
    const disputed=page.locator('#r-helium-infinity');
    assert.match(await disputed.locator('.price .now').innerText(),/Price under review/);
    assert.equal(await disputed.getByRole('button',{name:'Compare',exact:true}).count(),0,'disputed plan cannot be compared at stale price');
    assert.match(await disputed.locator('[data-verification]').innerText(),/Official plan rate differs/);
    assert.match(await page.locator('#r-h2o-unlimited [data-verification]').innerText(),/Official plan rate matches/);
    assert.doesNotMatch(await disputed.locator('.foot').innerText(),/12 months \(est\.\)/);
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
    const financed=page.locator('#r-vz-18pro');
    assert.match(await financed.innerText(),/Financing.*quote required/i);
    assert.match(await financed.innerText(),/first-year estimates withheld/i);
    assert.doesNotMatch(await financed.innerText(),/Due today \(est\.\)|First year \(est\.\)/i);
    assert.equal(await page.locator('#r-boost-a17').getByRole('button',{name:'Compare',exact:true}).count(),0,
      'disputed offer cannot be compared at stale catalog price');
    const phoneOverflow=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(phoneOverflow<=viewport.width+2,
      'Price-under-review row must not cause page overflow on '+view+': '+phoneOverflow);
    await page.locator('#t-pricewatch').click();
    assert.equal(await page.locator('#p-pricewatch').isVisible(),true);
    const alerts=page.locator('#fb-action-alerts');
    assert.equal(await alerts.locator('.fb-action-card').count(),2,'only actionable alerts may appear');
    assert.match(await alerts.innerText(),/1 critical price conflicts/i);
    assert.match(await alerts.innerText(),/Tello introductory promotion ends November 9/);
    assert.match(await alerts.innerText(),/not a checkout quote/i);
    assert.ok(await alerts.getByText('View GitHub alerts').count()>=1,'link to notification issues is visible');
    assert.equal(await page.locator('#fb-price-watch-root .fb-watch-card:not(.fb-mvno-card)').count(),2,
      'Boost cards still appear in price-watch fixture');
    assert.equal(await page.locator('#fb-price-watch-root .fb-mvno-card').count(),5,
      'Five MVNO test records including both official H2O homepage prices should appear');
    assert.match(await page.locator('#fb-price-watch-root').innerText(),/MVNO service-plan rate monitoring/);
    assert.match(await page.locator('#fb-price-watch-root').innerText(),/\$60\.00 annual payment/);
    assert.match(await page.locator('#fb-price-watch-root').innerText(),/\$35\.00\/mo/);
    const review=page.locator('#fb-review-queue');
    assert.equal(await review.locator('.fb-review-item').count(),3);
    assert.match(await review.innerText(),/1 critical, 1 high, 1 medium/i);
    await review.locator('select').selectOption('high');
    assert.equal(await review.locator('.fb-review-item').count(),1,'filter must narrow queue by priority');
    assert.match(await review.locator('.fb-review-item').innerText(),/Tello/);
    await review.locator('select').selectOption('all');
    assert.equal(await review.locator('.fb-review-item').count(),3);
    const reviewOverflow=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(reviewOverflow<=viewport.width+2,'review dashboard must fit '+view+' width');
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

    // Local-only watchlist: save, filter target, mark reviewed, export/import and reload.
    await page.locator('#t-plans').click();
    const watchButton=page.locator('#r-usm-starter .fb-watch-toggle');
    await watchButton.waitFor();
    await watchButton.click();
    assert.equal(await page.locator('#p-watchlist').isVisible(),true);
    const watchRoot=page.locator('#fb-watchlist-root');
    assert.equal(await watchRoot.locator('.fb-watch-saved-card').count(),1);
    assert.match(await watchRoot.innerText(),/Unlimited Starter/);
    const input=watchRoot.locator('.fb-watch-saved-card input');
    await input.fill('25');
    await watchRoot.locator('.fb-watch-saved-card').getByRole('button',{name:'Save target'}).click();
    assert.match(await watchRoot.innerText(),/Unlimited Starter meets target/);
    assert.match(await watchRoot.innerText(),/Catalog price meets your target/);
    await watchRoot.getByRole('button',{name:'Mark all current alerts reviewed'}).click();
    assert.match(await watchRoot.innerText(),/0 new or unreviewed item\(s\)/);

    await page.locator('#fb-watch-carrier').selectOption('Tello');
    await watchRoot.getByRole('button',{name:'Add provider watch'}).click();
    assert.equal(await watchRoot.locator('.fb-watch-saved-card').count(),2);
    assert.match(await watchRoot.innerText(),/Tello introductory promotion ends November 9/);
    assert.match(await watchRoot.innerText(),/1 new or unreviewed item\(s\)/);
    await watchRoot.getByRole('button',{name:'Export JSON'}).click();
    const backup=await page.locator('#fb-watch-backup').inputValue();
    const exported=JSON.parse(backup);
    assert.equal(exported.schema,1);
    assert.equal(exported.watches.length,2);
    await watchRoot.locator('.fb-watch-saved-card').first().getByRole('button',{name:'Remove'}).click();
    assert.equal(await watchRoot.locator('.fb-watch-saved-card').count(),1);
    await page.locator('#fb-watch-backup').fill(backup);
    await watchRoot.getByRole('button',{name:'Import JSON'}).click();
    assert.equal(await watchRoot.locator('.fb-watch-saved-card').count(),2);
    assert.match(await watchRoot.innerText(),/Stored on this device only/);
    const watchOverflow=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(watchOverflow<=viewport.width+2,'watchlist must not overflow '+view+' viewport');
    await page.screenshot({path:join(output,view+'-watchlist.png'),fullPage:true});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#fb-watchlist-root .fb-watch-saved-card').first().waitFor({timeout:15000});
    assert.equal(await page.locator('#fb-watchlist-root .fb-watch-saved-card').count(),2,
      'watchlist survives reload via localStorage');
    // Five Bars Switch & Save: conservative quoted monthly totals, upfront costs and safe sharing.
    await page.locator('#t-plans').click();
    const switchButton=page.locator('#r-usm-starter .fb-switch-button');
    await switchButton.waitFor();
    await switchButton.click();
    assert.equal(await page.locator('#p-switch').isVisible(),true);
    assert.equal(await page.locator('#fb-switch-offer').inputValue(),'usm-starter');
    await page.locator('#fb-switch-current').fill('80');
    await page.locator('[name="payoff"]').fill('120');
    await page.locator('[name="switchFees"]').fill('30');
    await page.locator('[name="extraMonthly"]').fill('5');
    await page.locator('#fb-switch-form button[type="submit"]').click();
    const switchResult=page.locator('#fb-switch-results');
    assert.match(await switchResult.innerText(),/Current 12-month spending/);
    assert.match(await switchResult.innerText(),/Switched cost estimate/);
    assert.ok((await switchResult.locator('.fb-switch-metric').count())>=4);
    assert.equal(await switchResult.locator('tbody tr').count(),3);
    assert.match(await switchResult.innerText(),/complete offer has NOT received/i);
    assert.match(await switchResult.innerText(),/cash|initial payment/i);
    await switchResult.getByRole('button',{name:'Share private-safe link'}).click();
    await page.waitForTimeout(100);
    const urlShown=await page.locator('#fb-switch-copy').count()
      ?await page.locator('#fb-switch-copy').inputValue()
      :'';
    if(urlShown){
      assert.match(urlShown,/switch=plan%3Ausm-starter/);
      assert.doesNotMatch(urlShown,/payoff=|bill=|monthlyfees=|fees=/);
    }
    const mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(mobileOverflow<=viewport.width+2,'Switch & Save exceeds '+view+' viewport');
    await page.screenshot({path:join(output,view+'-switch-save.png'),fullPage:true});
    await page.locator('#fb-switch-type').selectOption('phone');
    await page.locator('#fb-switch-offer').selectOption('cricket-16e');
    assert.equal(await page.locator('#fb-switch-lines').inputValue(),'1');
    await page.locator('#fb-switch-canport').check();
    await page.locator('#fb-switch-form button[type="submit"]').click();
    assert.match(await switchResult.innerText(),/prepaid service/i,'phone promotion prepay is disclosed');
    await page.locator('#fb-switch-canport').uncheck();
    await page.locator('#fb-switch-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-switch-message').innerText(),/confirmed eligible number transfer/i);
    for(const name of ['editorial.html','privacy.html','disclosures.html','switching-guide.html']){
      const result=await page.request.get(new URL(name,base).href);
      assert.equal(result.status(),200,name+' must be served');
      assert.match(await result.text(),/<title>/);
    }
    // Editorial carrier comparisons are fully rendered HTML with source links.
    const articles=await context.newPage();
    articles.on('pageerror',e=>errors.push(view+' editorial: '+e.message));
    await articles.goto(new URL('carrier-comparisons.html',base).href,{waitUntil:'domcontentloaded'});
    assert.match(await articles.locator('h1').innerText(),/Compare wireless carriers/);
    assert.equal(await articles.locator('.guide').count(),4,'Four curated carrier comparisons should exist');
    assert.match(await articles.locator('main').innerText(),/unverified starting point/i);
    await articles.locator('a[href="compare/us-mobile-vs-visible.html"]').click();
    assert.match(await articles.locator('h1').innerText(),/US Mobile vs Visible/);
    assert.ok(await articles.locator('table').count()>=2,'Single-line comparison must be readable without JS');
    assert.match(await articles.locator('main').innerText(),/not verified checkout pricing/i);
    assert.match(await articles.locator('main').innerText(),/\$300\.00/);
    assert.ok(await articles.locator('a[href*="usmobile.com"]').count()>=1);
    const articleOverflow=await articles.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(articleOverflow<=viewport.width+2,'Comparison page must fit '+view+' viewport');
    await articles.screenshot({path:join(output,view+'-carrier-comparison.png'),fullPage:true});
    await articles.close();

    // Human reviewer dashboard is read-only and never falsely signs off offers.
    const editor=await context.newPage();
    editor.on('pageerror',e=>errors.push(view+' editor: '+e.message));
    await editor.goto(new URL('review-workbench.html',base).href,{waitUntil:'domcontentloaded'});
    assert.equal(await editor.locator('meta[name="robots"]').getAttribute('content'),'noindex,nofollow');
    await editor.locator('.fb-review-offer').first().waitFor({timeout:15000});
    assert.match(await editor.locator('#fb-review-summary').innerText(),/total catalog offers in the review queue/);
    await editor.locator('#fb-review-carrier').selectOption('Tello');
    const tello=editor.locator('.fb-review-offer');
    assert.ok(await tello.count()>=1,'Tello should be filterable for manual review');
    const published=tello.first().locator('.fb-research-evidence');
    assert.ok(await published.count()===1,'Tello official publication research should appear separately from human signoff');
    await published.locator('summary').click();
    assert.match(await published.innerText(),/official published source links/i);
    assert.match(await published.innerText(),/November 9, 2026|checkout review/i);
    await tello.first().locator('details').last().locator('summary').click();
    assert.ok(await tello.first().locator('.fb-review-steps input[type="checkbox"]').count()>=8);
    await tello.first().locator('.fb-review-steps input[type="checkbox"]').first().check();
    assert.match(await tello.first().innerText(),/1 of 8 items checked/);
    assert.match(await editor.locator('main').innerText(),/NOT proof of verification/);
    assert.equal(await editor.locator('button').filter({hasText:/automatically verify/i}).count(),0);
    const editorOverflow=await editor.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(editorOverflow<=viewport.width+2,'Editor checklist must fit '+view+' viewport');
    await editor.screenshot({path:join(output,view+'-editor-review.png'),fullPage:true});
    await editor.close();

    // Dated public official-source evidence: published baseline != human checkout review.
    const research=await context.newPage();
    research.on('pageerror',e=>errors.push(view+' source research: '+e.message));
    await research.goto(new URL('source-research.html',base).href,{waitUntil:'domcontentloaded'});
    assert.match(await research.locator('h1').innerText(),/official sources actually confirm/i);
    assert.equal(await research.locator('.research-article').count(),24);
    assert.match(await research.locator('main').innerText(),/0 of 78 listings have valid, documented human full-terms sign-offs/i);
    assert.match(await research.locator('main').innerText(),/54.*without documented official-source research/s);
    const mint=research.locator('[data-offer-id="mint"]');
    assert.match(await mint.innerText(),/\$360\.00 due upfront for 12 months/);
    assert.match(await mint.innerText(),/\$180/);
    assert.ok(await mint.locator('a[href*="mintmobile.com"]').count()>=2);
    const metro=research.locator('[data-offer-id="metro-16e"]');
    assert.match(await metro.innerText(),/conditional DEVICE HEADLINE/i);
    assert.match(await metro.innerText(),/\$100\.00 conditional later reward NOT deducted/);
    const stylus=research.locator('[data-offer-id="cricket-stylus"]');
    assert.match(await stylus.innerText(),/2 service months prepaid/);
    const boostRazr=research.locator('[data-offer-id="boost-razr"]');
    assert.match(await boostRazr.innerText(),/2 service months prepaid/);
    const visible=research.locator('[data-offer-id="visible-18pro"]');
    assert.match(await visible.innerText(),/FULL RETAIL handset payment required; financing ineligible/);
    assert.match(await visible.innerText(),/conditional service credits for 24 months NOT deducted/);
    const researchOverflow=await research.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(researchOverflow<=viewport.width+2,'Research audit should not overflow '+view+' width');
    await research.screenshot({path:join(output,view+'-source-audit.png'),fullPage:true});
    await research.close();

    // Mint annual-plan cash must NEVER be disguised as ordinary month-to-month billing.
    await page.locator('#t-plans').click();
    await page.locator('#carrier').selectOption('Mint Mobile');
    await page.locator('#lines').selectOption('1');
    assert.match(await page.locator('#r-mint').innerText(),/Pay \$360(?:\.00)? upfront for 12 months/);
    await page.locator('#lines').selectOption('2');
    assert.equal(await page.locator('#r-mint').count(),0,'no fabricated multi-line monthly Mint quote');
    await page.locator('#lines').selectOption('1');
    await page.locator('#t-switch').click();
    await page.locator('#fb-switch-type').selectOption('plan');
    await page.locator('#fb-switch-offer').selectOption('mint');
    await page.locator('[name="payoff"]').fill('0');
    await page.locator('[name="switchFees"]').fill('0');
    await page.locator('[name="extraMonthly"]').fill('0');
    await page.locator('#fb-switch-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-switch-results').innerText(),/\$360\.00/);
    assert.match(await page.locator('#fb-switch-results').innerText(),/\$720\.00/);
    await page.locator('#t-plans').click();
    await page.locator('#carrier').selectOption('Total Wireless');
    assert.match(await page.locator('#r-total-max').innerText(),/First bill \$30(?:\.00)?/i);
    assert.match(await page.locator('#r-total-max').innerText(),/12 months \(est\.\): \$250/);
    await page.locator('#t-switch').click();
    await page.locator('#fb-switch-offer').selectOption('total-max');
    await page.locator('#fb-switch-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-switch-results').innerText(),/\$250\.00/);
    assert.match(await page.locator('#fb-switch-results').innerText(),/\$490\.00/);
    await context.close();
  }
  assert.deepEqual(errors,[],'no JavaScript page errors');
  console.log('PASS: mobile/desktop finder, verification, compare, saved state and layout');
} finally {
  await browser.close();
  await new Promise(done=>server.close(done));
}
