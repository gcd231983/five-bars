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

const site=process.env.FIVE_BARS_SITE_DIR?resolve(process.env.FIVE_BARS_SITE_DIR):
  resolve(dirname(fileURLToPath(import.meta.url)),'../site');
const auditSummary=JSON.parse(await readFile(join(site,'data/research-audit.json'),'utf8')).summary;
const mime={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
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
    const assetVersions=new Set();
    context.on('response',response=>{
      if(response.url().startsWith(base)&&response.status()>=400)errors.push(view+': HTTP '+response.status()+' '+response.url());
      if(process.env.FIVE_BARS_SITE_DIR&&response.url().startsWith(base)){
        const url=new URL(response.url());
        if(/\.(?:m?js|css)$/.test(url.pathname)){
          const version=url.searchParams.get('v');
          if(!/^[a-f0-9]{16}$/.test(version||''))errors.push(view+': unversioned release asset '+url.pathname);
          assetVersions.add(version);
        }
      }
    });
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(view+': '+e.message));
    // Deterministic browser fixtures: demonstrate partial proof without implying
    // that any live offer has independently verified checkout terms.
    const checkedAt=new Date().toISOString();
    await page.route('**/data/verifications.json',route=>route.fulfill({
      status:200,contentType:'application/json',body:JSON.stringify({schema:1,offers:{}})}));
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
      saved.offers['usm-starter']={
        ...(saved.offers['usm-starter']||{}),
        state:'source_unavailable',checkedAt,note:'HTTP 403',
      };
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
    assert.match(await page.locator('#fb-finder-affiliate-note').innerText(),/does not currently report commission-based rankings/i);
    await page.locator('#scan-status').waitFor({state:'attached'});
    await page.waitForFunction(()=>document.querySelector('#scan-status')?.textContent?.includes('public sources'));
    assert.match(await page.locator('#scan-status').innerText(),/Some public sources could not be reached|No public sources reachable|Public source reachability checks completed|Scan is stale|No scan report available|No public sources checked/);

    await page.waitForFunction(()=>document.querySelector('#src-date')?.textContent?.includes('Catalog reference date'));
    const freshness=await page.locator('#fb-catalog-freshness').evaluate(node=>({
      hidden:node.hidden,text:node.textContent,
      catalogDay:document.querySelector('#src-date')?.textContent
    }));
    assert.ok(freshness.text.includes('Carrier checkout')||freshness.hidden,
      'Stale-data warning must explain that checkout prices are not verified');
    const checkedAge=Math.floor((Date.now()-Date.parse('2026-10-29T12:00:00Z'))/86400000);
    if(checkedAge>7)assert.equal(freshness.hidden,false,
      'Catalog older than seven days must show a visible warning');

    await page.waitForFunction(()=>
      document.querySelector('#fb-finder-form button[type="submit"]')?.disabled===false,
      {timeout:15000});
    await page.locator('#r-usm-starter').waitFor({state:'attached',timeout:15000});
    if(view==='mobile'){
      assert.equal(await page.locator('.fb-mobile-evidence').getAttribute('open'),null,
        'Mobile pricing evidence should be collapsed by default');
      await page.locator('.fb-mobile-evidence summary').click();
    }
    const evidenceSnapshot=await page.locator('#fb-evidence-summary-copy').innerText();
    assert.match(evidenceSnapshot,/76 of 78 offers have dated public-source research/);
    assert.ok(evidenceSnapshot.includes(auditSummary.manuallyFullyReviewed+' independently documented full-checkout reviews'));
    assert.match(evidenceSnapshot,/3 retailer checkout offers on hold/);
    assert.equal(await page.locator('a.fb-skip-link[href="#main-content"]').count(),1);
    assert.equal(await page.locator('main#main-content').count(),1);
    await page.locator('a.fb-skip-link').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'main-content',
      'keyboard skip navigation must move focus into the main content');
    await page.locator('#t-finder').click();
    assert.equal(await page.locator('.fb-tab-swipe').isVisible(),false,
      'Mobile tab instructions should not crowd the page');
    await page.locator('#t-finder').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#p-plans').isVisible(),true,'Arrow key activates next tab');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#p-finder').isVisible(),true,'Home returns to first tab');
    if(view==='mobile'){
      // Exercise the actual three-stage mobile journey before running the existing
      // full-form price and eligibility regression scenarios.
      assert.equal(await page.locator('.fb-wizard-progress').innerText(),'Step 1 of 3');
      assert.equal(await page.locator('#fb-device').isVisible(),false);
      await page.locator('.fb-wizard-next').click();
      assert.equal(await page.locator('#fb-device').isVisible(),true);
      await page.locator('.fb-wizard-next').click();
      assert.equal(await page.locator('#fb-port-status').isVisible(),true);
      assert.equal(await page.locator('#fb-finder-form button[type="submit"]').isVisible(),true);
      await page.locator('.fb-wizard-back').click();
      assert.equal(await page.locator('#fb-budget').isVisible(),true);
      await page.locator('.fb-wizard-back').click();
      assert.equal(await page.locator('#fb-net').isVisible(),true);
      // Existing pricing scenarios manipulate controls from several stages;
      // expand the steps only for those legacy scenarios.
      await page.locator('.fb-wizard-step').evaluateAll(nodes=>nodes.forEach(n=>n.hidden=false));
      await page.locator('#fb-finder-form button[type="submit"]').evaluate(node=>node.hidden=false);
      await page.addStyleTag({content:'.fb-wizard-step[hidden]{display:block!important} #fb-finder-form>button[type="submit"][hidden]{display:block!important}'});
    }
    // Port-in promotions are omitted from quotes until a person confirms eligibility.
    assert.equal(await page.locator('#fb-port-status').inputValue(),'unknown');
    await page.locator('#fb-net').selectOption('any');
    await page.locator('#fb-provider').selectOption('US Mobile');
    await page.locator('#fb-device').selectOption('byop');
    await page.locator('#fb-finder-form button[type="submit"]').click();
    const starter=page.locator('#fb-finder-results .fb-result:not(.fb-phone-result)')
      .filter({hasText:'Unlimited Starter'}).first();
    assert.equal(await starter.count(),1,'Selected plan must be visible in finder');
    const visibleProof=starter.locator(':scope > .fb-badges');
    assert.equal(await visibleProof.count(),1,
      'Manual-review and automated-link warnings must be outside collapsed details');
    assert.equal(await visibleProof.isVisible(),true);
    assert.match(await visibleProof.innerText(),/Offer not independently verified/i);
    assert.match(await visibleProof.innerText(),/Offer link not checked automatically/i);
    assert.match(await visibleProof.locator('[title*="could not read"]').getAttribute('title'),
      /does not prove the deal has ended/i);
    const caveats=page.locator('#fb-finder-results .fb-finder-caveats');
    assert.equal(await caveats.isVisible(),true,'Eligibility details remain accessible');
    await caveats.locator('summary').click();
    assert.match(await caveats.innerText(),/Port-in introductory discounts are excluded/i);
    const allResultCards=await page.locator('#fb-finder-results .fb-result').count();
    const visibleResultCards=await page.locator('#fb-finder-results .fb-result:visible').count();
    assert.ok(visibleResultCards<=allResultCards,'Results must not duplicate offers');
    assert.ok(visibleResultCards>=1,'At least one matching result should be visible');
    assert.ok(await page.locator('#fb-finder-results .fb-result-heading:visible').count()<=5,
      'Initially no more than five plan results should be visible');
    if(await page.locator('.fb-more-plans').count()){
      assert.equal(await page.locator('#fb-finder-results .fb-result-heading').count()>5,true);
      assert.equal(await page.locator('#fb-finder-results .fb-provider-mark').count()>0,true);
      const iconSources=await page.locator('#fb-finder-results .fb-provider-icon').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));
      assert.ok(iconSources.every(src=>src.startsWith('https://www.google.com/s2/favicons?domain=')),
        'Provider icons must use canonical carrier domain favicons');
      assert.ok(iconSources.some(src=>src.includes('domain=usmobile.com')),
        'US Mobile must use its canonical site, not a reseller or referral host');
      assert.ok(await page.locator('#fb-finder-results .fb-provider-initials').count()>0,
        'Every provider icon needs an initials fallback');
      await page.locator('.fb-more-plans').click();
      const visiblePlans=await page.locator('#fb-finder-results .fb-result:not(.fb-phone-result):visible').count();
      const allPlans=await page.locator('#fb-finder-results .fb-result:not(.fb-phone-result)').count();
      assert.equal(visiblePlans,allPlans,'Show all must reveal every matching plan');
    }
    const phoneResults=page.locator('#fb-finder-results .fb-phone-result');
    const phoneCount=await phoneResults.count();
    assert.ok(await page.locator('#fb-finder-results .fb-phone-result:visible').count()<=5,
      'Show at most five phone offers initially');
    if(phoneCount>5){
      const phoneToggle=page.locator('#fb-finder-results .fb-more-phones');
      assert.equal(await phoneToggle.getAttribute('aria-expanded'),'false');
      await phoneToggle.click();
      assert.equal(await page.locator('#fb-finder-results .fb-phone-result:visible').count(),phoneCount,
        'Expanding phone offers must reveal all matching phones');
      assert.equal(await phoneToggle.getAttribute('aria-expanded'),'true');
      await phoneToggle.click();
      assert.equal(await page.locator('#fb-finder-results .fb-phone-result:visible').count(),5,
        'Collapsing phone offers must restore the initial five');
    }
    assert.match(await page.locator('#fb-finder-results').innerText(),/\$300\.00 estimated first year/);
    await page.locator('#fb-port-status').selectOption('yes');
    await page.locator('#fb-finder-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-finder-results').innerText(),/\$300\.00 estimated first year/,
      'Port eligibility alone must not unlock an AutoPay-required offer');
    await page.locator('#fb-discount-qualified').check();
    await page.locator('#fb-finder-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-finder-results').innerText(),/\$240\.00 estimated first year/,
      'Both number transfer and AutoPay confirmation are required');
    await page.locator('#fb-port-status').selectOption('no');
    await page.locator('#fb-finder-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-finder-results').innerText(),/\$300\.00 estimated first year/);
    await page.locator('#fb-port-status').selectOption('unknown');
    await page.locator('#fb-discount-qualified').uncheck();
    await page.locator('#fb-device').selectOption('either');
    // MVNO expansion: find an exact provider, and verify annual billing on mobile and desktop.
    await page.locator('#fb-net').selectOption('att');
    await page.locator('#fb-provider').selectOption('Consumer Cellular');
    await page.locator('#fb-lines').selectOption('1');
    await page.locator('#fb-budget').fill('');
    await page.locator('#fb-finder-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-finder-results').innerText(),/\$370\.00 estimated first year/);
    const feeDetails=page.locator('#fb-finder-results .fb-result-details').first();
    await feeDetails.locator('summary').click();
    assert.match(await feeDetails.innerText(),/\$10\.00 activation fee/);
    await page.locator('#fb-discount-qualified').check();
    await page.locator('#fb-finder-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-finder-results').innerText(),/\$310\.00 estimated first year/);
    await page.locator('#fb-discount-qualified').uncheck();
    await page.locator('#fb-provider').selectOption('any');
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
    assert.match(annualText,/Annual prepaid — not monthly billing/i);
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
    assert.match(await page.locator('#r-h2o-unlimited [data-verification]').innerText(),/Dated carrier source.*partial/i);
    assert.match(await page.locator('#r-h2o-unlimited [data-verification] a').getAttribute('href'),/research-h2o-unlimited/);
    // Advanced filters are intentionally collapsed in the new guided homepage.
    await page.locator('.fb-advanced-filters summary').click();
    // Consumer Cellular 1GB is excluded by the default Unlimited-only filter.
    await page.getByRole('button',{name:'Unlimited data',exact:true}).click();
    await page.locator('#carrier').selectOption('Consumer Cellular');
    assert.match(await page.locator('#r-cc .price .now').innerText(),/\$25/);
    assert.match(await page.locator('#r-cc').innerText(),/Known carrier fees \$5\/mo included/);
    await page.getByRole('button',{name:'I meet AutoPay / eBilling / Auto-Refill conditions'}).click();
    assert.match(await page.locator('#r-cc .price .now').innerText(),/\$20/);
    await page.getByRole('button',{name:'I meet AutoPay / eBilling / Auto-Refill conditions'}).click();
    assert.match(await page.locator('#r-cc .price .now').innerText(),/\$25/);
    await page.getByRole('button',{name:'Unlimited data',exact:true}).click();
    await page.locator('#carrier').selectOption('Boost Mobile');
    assert.match(await page.locator('#r-boost .price .now').innerText(),/\$25/);
    await page.getByRole('button',{name:'I qualify for a new-customer or eligible new-line offer'}).click();
    assert.match(await page.locator('#r-boost .price .now').innerText(),/\$10/);
    await page.getByRole('button',{name:'I qualify for a new-customer or eligible new-line offer'}).click();
    assert.match(await page.locator('#r-boost .price .now').innerText(),/\$25/);
    await page.locator('#carrier').selectOption('US Mobile');
    assert.match(await page.locator('#r-usm-starter .price .now').innerText(),/\$25/);
    await page.getByRole('button',{name:'I confirm eligible number transfer'}).click();
    assert.match(await page.locator('#r-usm-starter .price .now').innerText(),/\$25/,
      'Confirming port alone must leave US Mobile at the regular rate');
    await page.getByRole('button',{name:'I meet AutoPay / eBilling / Auto-Refill conditions'}).click();
    assert.match(await page.locator('#r-usm-starter .price .now').innerText(),/\$15/,
      'Only confirmed port and AutoPay together unlock the introductory rate');
    await page.getByRole('button',{name:'Can’t move my number'}).click();
    assert.match(await page.locator('#r-usm-starter .price .now').innerText(),/\$25/);
    await page.getByRole('button',{name:'Can’t move my number'}).click();
    await page.getByRole('button',{name:'I meet AutoPay / eBilling / Auto-Refill conditions'}).click();
    await page.locator('#carrier').selectOption('Ultra Mobile');
    assert.match(await page.locator('#r-ultra .price .now').innerText(),/\$49/);
    await page.getByRole('button',{name:'I qualify for a new-customer or eligible new-line offer'}).click();
    assert.match(await page.locator('#r-ultra .price .now').innerText(),/\$49/,
      'multi-month prepaid discounts cannot be quoted as monthly intro rates');
    await page.getByRole('button',{name:'I qualify for a new-customer or eligible new-line offer'}).click();
    await page.locator('#carrier').selectOption('any');
    assert.doesNotMatch(await disputed.locator('.foot').innerText(),/12 months \(est\.\)/);
    await page.locator('#plans-list .fb-compare-btn').first().click();
    assert.equal(await page.locator('#p-compare').isVisible(),true);
    await page.locator('#t-phones').click();
    assert.ok(await page.locator('#phones-list .row').count()>0);
    const boostPhone=page.locator('#r-boost-motog');
    assert.match(await boostPhone.innerText(),/Needs a \$65\/mo plan/);
    assert.match(await boostPhone.innerText(),/AutoPay discount NOT assumed/);
    await page.getByRole('button',{name:'I meet AutoPay / eBilling / Auto-Refill conditions'}).click();
    assert.match(await boostPhone.innerText(),/Needs a \$60\/mo plan/);
    assert.doesNotMatch(await boostPhone.innerText(),/AutoPay discount NOT assumed/);
    await page.getByRole('button',{name:'I meet AutoPay / eBilling / Auto-Refill conditions'}).click();
    assert.match(await boostPhone.innerText(),/Needs a \$65\/mo plan/);
    assert.match(await page.locator('#r-total-a36').innerText(),/Must move your number/);
    assert.match(await page.locator('#r-tracfone-a17').innerText(),/\$135 fixed service prepayment included upfront/);
    const vzFree=page.locator('#r-vzpre-a17');
    assert.match(await vzFree.innerText(),/New-line activation not confirmed/);
    await page.getByRole('button',{name:'I confirm qualifying new-line activation'}).click();
    assert.match(await vzFree.innerText(),/Due today \(est\.\): \$60/);
    await page.getByRole('button',{name:'I confirm qualifying new-line activation'}).click();
    assert.match(await vzFree.innerText(),/New-line activation not confirmed/);
    for(const id of ['cricket-power','cricket-motog']){
      const held=page.locator('#r-'+id);
      assert.match(await held.innerText(),/OUT OF STOCK/);
      assert.equal(await held.getByRole('button',{name:'Compare',exact:true}).count(),0);
    }
    assert.match(await page.locator('#r-boost-motog [data-verification]').innerText(),
      /Official headline matches/i);
    assert.match(await page.locator('#r-boost-a17 [data-verification]').innerText(),
      /Official headline differs/i);
    assert.match(await page.locator('#r-boost-a17 .price .now').innerText(),
      /Price under review/,'conflicting official price must never display as Free');
    assert.match(await page.locator('#r-boost-a17').innerText(),
      /stale totals suppressed/i);
    const financed=page.locator('#r-vz-18pro');
    for(const id of ['wm-vzpre-a17','wm-st-a17','simple-a16']){
      const held=page.locator('#r-'+id);
      assert.match(await held.locator('.price .now').innerText(),/Price under review/);
      assert.match(await held.innerText(),/Retail promotion under review/i);
      assert.doesNotMatch(await held.locator('.price').innerText(),/was\s+\$99\.88|Free/i,
        'held retailer headlines must not expose bogus strike-through savings or a free device');
      assert.equal(await held.getByRole('button',{name:'Compare',exact:true}).count(),0,
        'retailer hold may not open cost comparisons');
      assert.doesNotMatch(await held.locator('.foot').innerText(),/Due today \(est\.\)|First year \(est\.\)/i);
    }
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
    for(const id of ['mint-s26fe','cricket-s25fe','cricket-razr','cricket-a37']){
      const card=page.locator('#r-'+id);
      assert.match(await card.innerText(),/Out of stock/i);
      assert.doesNotMatch(await card.innerText(),/First year \(est\.\)/);
      assert.equal(await card.getByRole('button',{name:'Compare',exact:true}).count(),0);
      assert.equal(await card.locator('.fb-switch-button').count(),0);
    }
    assert.match(await page.locator('#r-mint-p11').innerText(),/phone \+ 12 months service/);
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
    assert.equal(await page.locator('#fb-switch-offer option[value="mint-s26fe"]').count(),0);
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
    assert.equal(await editor.locator('.fb-review-offer').count(),10,
      'Launch reviewer scope must include ten real checkout scenarios, not all-plan selections');
    assert.equal(await editor.locator('[data-offer-id="cricket-16e"]').count(),1,
      'Prepaid zero-dollar handset must appear in the initial reviewer scope');
    assert.equal(await editor.locator('[data-offer-id="vz-18pro"]').count(),1,
      'Financed postpaid handset must appear in the initial reviewer scope');
    assert.match(await editor.locator('[data-offer-id="vz-18pro"]').innerText(),
      /gross retail balance|conditional monthly bill credits/i);
    assert.match(await editor.locator('[data-offer-id="tello"]').innerText(),
      /published promotion ends|after the published promotion ends/i);
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
    assert.match(await tello.first().innerText(),/1 of 10 items checked/);
    assert.ok(await tello.first().getByRole('button',{name:'Copy structured checkout JSON for GitHub review'}).count()===1);
    await tello.first().getByRole('button',{name:'Copy structured checkout JSON for GitHub review'}).click();
    assert.match(await editor.locator('#fb-editor-notice').innerText(),/Complete real checkout evidence first/i);
    assert.match(await editor.locator('#fb-editor-notice').innerText(),/no offer has been approved/i);
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
    assert.equal(await research.locator('.research-article').count(),76);
    assert.ok((await research.locator('main').innerText()).includes(auditSummary.manuallyFullyReviewed+' of '+auditSummary.offers+' listings have valid, documented human checkout-scenario reviews'));
    assert.match(await research.locator('main').innerText(),/2.*without documented official-source research/s);
    assert.match(await research.locator('main').innerText(),/Stock and checkout holds \(6\)/);
    assert.match(await research.locator('main').innerText(),/Retail-specific price holds \(3\)/);
    const retailSection=research.locator('main').getByText('Separate dated page observation',{exact:false});
    assert.equal(await retailSection.count(),3);
    assert.match(await research.locator('main').innerText(),/Observed retailer ONLINE device price: \$99\.88/);
    assert.match(await research.locator('main').innerText(),/NOT a verified activation offer/);
    assert.match(await research.locator('main').innerText(),/Online device price not independently established/);
    assert.match(await research.locator('[data-offer-id="tmo-18pro"]').innerText(),/SERVICE PRICE UNKNOWN/);
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
    assert.match(await boostRazr.innerText(),/\$65\.00\/mo WITHOUT AutoPay; discount NOT assumed/);
    assert.match(await research.locator('[data-offer-id="tracfone-a17"]').innerText(),/\$135\.00 fixed upfront service total/);
    assert.match(await research.locator('[data-offer-id="total-a36"]').innerText(),/qualifying number transfer/);
    const visible=research.locator('[data-offer-id="visible-18pro"]');
    assert.match(await visible.innerText(),/FULL RETAIL handset payment required; financing ineligible/);
    assert.match(await visible.innerText(),/conditional service credits for 24 months NOT deducted/);
    const metroRecord=research.locator('[data-offer-id="metro"]');
    assert.match(await metroRecord.innerText(),/\$30\.00 first month/);
    const redPocket=research.locator('[data-offer-id="redpocket-plus"]');
    assert.match(await redPocket.innerText(),/ONLY for eligible new customers/);
    assert.match(await research.locator('[data-offer-id="good2go-annual1"]').innerText(),/\$60\.00 due upfront/);
    const ultra=research.locator('[data-offer-id="ultra"]');
    assert.match(await ultra.innerText(),/\$49\.00 regular per month/);
    assert.match(await ultra.innerText(),/NOT month-to-month introductory discounts/);
    assert.match(await research.locator('[data-offer-id="fi"]').innerText(),/Unlimited Essentials/);
    assert.match(await research.locator('[data-offer-id="tracfone"]').innerText(),/October 26, 2026/);
    assert.match(await research.locator('[data-offer-id="cc"]').innerText(),/\$5\.00\/mo documented provider fees/);
    assert.match(await research.locator('[data-offer-id="straighttalk"]').innerText(),/not combinable with AutoPay discounts/i);
    assert.match(await research.locator('[data-offer-id="metro-motog"]').innerText(),/\$60\.00 first service bill/);
    assert.match(await research.locator('[data-offer-id="cricket-razr"]').innerText(),/OUT OF STOCK on recorded date/);
    assert.match(await research.locator('[data-offer-id="total-all-access"]').innerText(),/\$65\.00 first month/);
    const researchOverflow=await research.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(researchOverflow<=viewport.width+2,'Research audit should not overflow '+view+' width');
    await research.screenshot({path:join(output,view+'-source-audit.png'),fullPage:true});
    await research.close();

    // Current engineering progress must not be presented as commercial or checkout approval.
    const launch=await context.newPage();
    launch.on('pageerror',e=>errors.push(view+' launch readiness: '+e.message));
    await launch.goto(new URL('launch-readiness.html',base).href,{waitUntil:'domcontentloaded'});
    assert.match(await launch.locator('h1').innerText(),/Five Bars launch readiness/);
    assert.match(await launch.locator('main').innerText(),/Public beta, not a certified checkout service/i);
    assert.match(await launch.locator('main').innerText(),/Current human checkout scenarios/);
    assert.match(await launch.locator('main').innerText(),/Private consumer support/);
    assert.match(await launch.locator('main').innerText(),/Executed affiliate approvals/);
    assert.equal(await launch.locator('ol li').count(),6);
    const launchOverflow=await launch.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(launchOverflow<=viewport.width+2,'Readiness page should fit '+view);
    await launch.screenshot({path:join(output,view+'-launch-readiness.png'),fullPage:true});
    await launch.close();

    // Reader correction assistant: no PII, no background POST and no public
    // GitHub issue until the visitor explicitly chooses to submit it.
    const report=await context.newPage();
    report.on('pageerror',e=>errors.push(view+' corrections: '+e.message));
    await report.goto(new URL('report.html?offer=usm-starter',base).href,{waitUntil:'domcontentloaded'});
    await report.locator('#fb-report-form:not([hidden])').waitFor({timeout:15000});
    assert.equal(await report.locator('#fb-report-offer').inputValue(),'usm-starter');
    assert.equal(await report.locator('#fb-report-result').isHidden(),true);
    await report.locator('#fb-report-category').selectOption('price');
    await report.locator('#fb-report-source').fill('https://www.usmobile.com/plans');
    await report.locator('#fb-report-details').fill('The carrier page lists a first-month payment that appears higher than the Five Bars service estimate.');
    await report.locator('#fb-report-public').check();
    await report.getByRole('button',{name:'Prepare report draft'}).click();
    assert.equal(await report.locator('#fb-report-result').isVisible(),true);
    assert.match(await report.locator('#fb-report-draft').inputValue(),/Offer ID:\*\* usm-starter/);
    assert.match(await report.locator('#fb-report-draft').inputValue(),/NOT verified/);
    const issue=await report.locator('#fb-issue-open').getAttribute('href');
    assert.equal(issue,'https://github.com/gcd231983/five-bars/issues/new?template=offer-correction.yml');
    assert.doesNotMatch(issue,/body=|The carrier page lists/);
    await report.locator('#fb-report-details').fill('My contact email is reader@example.com. The plan is wrong.');
    assert.equal(await report.locator('#fb-report-result').isHidden(),true);
    await report.getByRole('button',{name:'Prepare report draft'}).click();
    assert.match(await report.locator('#fb-report-status').innerText(),/private/i);
    assert.equal(await report.locator('#fb-report-result').isHidden(),true);
    const reportWidth=await report.evaluate(()=>document.documentElement.scrollWidth);
    assert.ok(reportWidth<=viewport.width+2,'Correction assistant must fit '+view+' width');
    await report.screenshot({path:join(output,view+'-reader-correction.png'),fullPage:true});
    await report.close();

    // Mint annual-plan cash must NEVER be disguised as ordinary month-to-month billing.
    // A full reload intentionally resets progressive-disclosure controls; reopen for filtering.
    await page.locator('.fb-advanced-filters summary').click();
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
    assert.match(await page.locator('#r-total-max').innerText(),/Estimated first payment \$30(?:\.00)?/i);
    assert.match(await page.locator('#r-total-max').innerText(),/12 months \(est\.\): \$360/);
    await page.getByRole('button',{name:'I meet AutoPay / eBilling / Auto-Refill conditions'}).click();
    assert.match(await page.locator('#r-total-max').innerText(),/12 months \(est\.\): \$250/);
    await page.locator('#t-switch').click();
    await page.locator('#fb-switch-offer').selectOption('total-max');
    await page.locator('#fb-switch-discountqualified').check();
    await page.locator('#fb-switch-form button[type="submit"]').click();
    assert.match(await page.locator('#fb-switch-results').innerText(),/\$250\.00/);
    assert.match(await page.locator('#fb-switch-results').innerText(),/\$490\.00/);
    await page.locator('#t-plans').click();
    await page.locator('#carrier').selectOption('any');
    await page.locator('#net').selectOption('any');
    for(const id of ['wm-st-a17','cricket-razr','vz-18pro','boost-a17']){
      await page.locator('#t-phones').click();
      await page.locator('#r-'+id+' .fb-watch-toggle').click();
      const card=page.locator('[data-watch-key="phone:'+id+'"]');
      await card.locator('input').fill('2000');
      await card.getByRole('button',{name:'Save target'}).click();
      assert.match(await card.innerText(),/Price unavailable for target matching/);
      assert.doesNotMatch(await card.innerText(),/Advertised device price: \$/);
    }
    assert.doesNotMatch(await page.locator('#fb-watchlist-root').innerText(),/(Galaxy|razr|iPhone)[^\n]*meets target/i);
    await page.locator('#t-plans').click();
    await page.locator('#r-total-max .fb-watch-toggle').click();
    const totalWatch=page.locator('[data-watch-key="plan:total-max"]');
    await totalWatch.locator('input').fill('20');
    await totalWatch.getByRole('button',{name:'Save target'}).click();
    assert.match(await totalWatch.innerText(),/Standard catalog monthly price: \$30\.00/);
    assert.doesNotMatch(await page.locator('#fb-watchlist-root').innerText(),/Total MAX[^\n]*meets target/i);
    await page.screenshot({path:join(output,view+'-watchlist-safeguards.png'),fullPage:true});
    const satellite=await context.newPage();
    satellite.on('pageerror',e=>errors.push(view+': satellite '+e.message));
    await satellite.goto(base+'satellite.html');
    await satellite.locator('label[for="phone-iphone14"]').click();
    await satellite.locator('label[for="carrier-att"]').click();
    assert.ok(await satellite.getByLabel('iPhone 14 or newer').isChecked());
    assert.ok(await satellite.getByLabel('AT&T', {exact:true}).isChecked());
    assert.match(await satellite.locator('#result').innerText(),/Apple|iMessage/);
    assert.ok(await satellite.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'satellite page fits viewport');
    await satellite.getByRole('link',{name:'Switch & Save',exact:true}).click();
    await satellite.locator('#p-switch').waitFor({state:'visible'});
    await satellite.close();
    // A complete external monitoring outage must NOT be invisible to shoppers.
    // Simulate the response locally; never claim these are real carrier prices.
    const blackoutPage=await context.newPage();
    blackoutPage.on('pageerror',e=>errors.push(view+' monitoring blackout: '+e.message));
    await blackoutPage.route('**/data/status.json',async route=>{
      const response=await route.fetch();
      const snapshot=await response.json();
      snapshot.generatedAt=new Date().toISOString();
      snapshot.summary={...snapshot.summary,
        sourcesChecked:18,sourcesReachable:0,sourceBlackout:true};
      await route.fulfill({status:200,contentType:'application/json',
        body:JSON.stringify(snapshot)});
    });
    await blackoutPage.goto(base,{waitUntil:'domcontentloaded'});
    await blackoutPage.waitForFunction(()=>
      document.querySelector('#fb-catalog-freshness')?.textContent?.includes('Public-source monitoring blackout'));
    assert.equal(await blackoutPage.locator('#fb-catalog-freshness').isVisible(),true,
      'a recent but completely blocked scan must still warn on the homepage');
    await blackoutPage.waitForFunction(()=>
      document.querySelector('#fb-finder-form button[type="submit"]')?.disabled===false);
    await blackoutPage.locator('#fb-finder-form').evaluate(form=>
      form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    assert.match(await blackoutPage.locator('#fb-finder-results').innerText(),
      /PUBLIC-SOURCE MONITORING UNAVAILABLE.*No monitored source responded/is);
    assert.match(await blackoutPage.locator('#fb-finder-results').innerText(),
      /Listed prices and eligibility remain unconfirmed/);
    await blackoutPage.close();
    // Cached comparisons must not resurrect an expired phone promotion when
    // the local browser has old saved selections or an old catalog snapshot.
    const expiredCompare=await context.newPage();
    expiredCompare.on('pageerror',e=>errors.push(view+' expired compare: '+e.message));
    await expiredCompare.addInitScript(()=>{
      localStorage.setItem('fivebars-compare-v1',
        JSON.stringify([{type:'phone',id:'boost-p10a'}]));
    });
    await expiredCompare.route('**/data/deals.json',async route=>{
      const response=await route.fetch();
      const snapshot=await response.json();
      const offer=snapshot.phones.find(x=>x.id==='boost-p10a');
      assert.ok(offer,'expired comparison fixture phone must exist');
      offer.ends='2000-01-01';
      await route.fulfill({status:200,contentType:'application/json',
        body:JSON.stringify(snapshot)});
    });
    await expiredCompare.goto(base,{waitUntil:'domcontentloaded'});
    await expiredCompare.waitForFunction(()=>
      document.querySelector('#fb-finder-form button[type="submit"]')?.disabled===false);
    assert.match(await expiredCompare.locator('#fb-compare-root').innerText(),
      /Select Compare on any plan or phone offer to start/);
    assert.doesNotMatch(await expiredCompare.locator('#fb-compare-root').innerText(),
      /Google Pixel 10a/i,'expired saved handset must not be restored');
    let expiredDialog='';
    expiredCompare.on('dialog',async d=>{
      expiredDialog=d.message();await d.dismiss();
    });
    await expiredCompare.evaluate(()=>window.fiveBarsCompare('phone','boost-p10a'));
    assert.match(expiredDialog,/passed its published end date/i);
    assert.doesNotMatch(await expiredCompare.locator('#fb-compare-root').innerText(),
      /Google Pixel 10a/i,'manual comparison attempts must not bypass expiry');
    await expiredCompare.close();
    // Simulate a tab left open across the published Eastern midnight.
    // The catalog still contains the expired intro until the next scan;
    // local date logic must stop advertising it immediately.
    const rollover=await context.newPage();
    rollover.on('pageerror',e=>errors.push(view+' calendar rollover: '+e.message));
    await rollover.clock.install({time:new Date('2026-11-10T04:58:00Z')});
    await rollover.goto(base,{waitUntil:'domcontentloaded'});
    await rollover.locator('#t-plans').click();
    await rollover.locator('.fb-advanced-filters summary').click();
    const unlimited=rollover.getByRole('button',{name:'Unlimited data',exact:true});
    if(await unlimited.getAttribute('aria-pressed')==='true')await unlimited.click();
    const newLine=rollover.getByRole('button',{name:'I qualify for a new-customer or eligible new-line offer'});
    if(await newLine.getAttribute('aria-pressed')!=='true')await newLine.click();
    await rollover.locator('#carrier').selectOption('Tello');
    assert.match(await rollover.locator('#r-tello .price .now').innerText(),/\$10/,
      'eligible new-line promo is active through Nov 9 Eastern');
    await rollover.clock.setFixedTime(new Date('2026-11-10T05:02:00Z'));
    await rollover.evaluate(()=>window.dispatchEvent(new Event('focus')));
    assert.match(await rollover.locator('#r-tello .price .now').innerText(),/\$15/,
      'the already-open page must remove expired intro rate after midnight Eastern');
    await rollover.close();
    // Restore deliberately stale local-storage comparisons: held retailer,
    // sold-out device, newly disputed official headline, and one safe offer.
    const cachePage=await context.newPage();
    cachePage.on('pageerror',e=>errors.push(view+' saved comparison: '+e.message));
    await cachePage.addInitScript(()=>{
      localStorage.setItem('fivebars-compare-v1',JSON.stringify([
        {type:'phone',id:'wm-st-a17'},
        {type:'phone',id:'cricket-razr'},
        {type:'phone',id:'boost-a17'},
        {type:'phone',id:'metro-motog'}
      ]));
    });
    await cachePage.route('**/data/price-evidence.json',async route=>{
      const response=await route.fetch(),data=await response.json();
      data.offers ||= {};
      data.offers['boost-a17']={
        ...(data.offers['boost-a17']||{}),state:'headline_mismatch'
      };
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    });
    await cachePage.goto(base,{waitUntil:'domcontentloaded'});
    await cachePage.waitForFunction(()=>document.querySelector('#fb-finder-form button[type="submit"]')?.disabled===false);
    await cachePage.waitForFunction(()=>
      JSON.parse(localStorage.getItem('fivebars-compare-v1')||'[]').length===1);
    const retained=await cachePage.evaluate(()=>
      JSON.parse(localStorage.getItem('fivebars-compare-v1')||'[]'));
    assert.deepEqual(retained,[{type:'phone',id:'metro-motog'}],
      'stored unavailable or price-conflicted offers must be removed before comparing');
    const compareText=await cachePage.locator('#fb-compare-root').innerText();
    assert.match(compareText,/Metro/i);
    assert.doesNotMatch(compareText,/Straight Talk at Walmart|razr|Boost Mobile/i);
    assert.match(compareText,/conflicting-price or removed saved comparisons were cleared/i);
    await cachePage.close();
    if(process.env.FIVE_BARS_SITE_DIR){
      // An old open page must notify, never automatically discard form input.
      // The mocked manifest is NOT a simulated carrier price verification.
      const oldTab=await context.newPage();
      oldTab.on('pageerror',e=>errors.push(view+' release notice: '+e.message));
      await oldTab.route('**/release.json',async route=>{
        const response=await route.fetch();
        const latest=await response.json();
        latest.contentHash=latest.contentHash==='0000000000000000'?
          '1111111111111111':'0000000000000000';
        await route.fulfill({status:200,contentType:'application/json',
          body:JSON.stringify(latest)});
      });
      await oldTab.goto(base,{waitUntil:'domcontentloaded'});
      await oldTab.locator('#fb-release-notice').waitFor({state:'visible',timeout:15000});
      assert.match(await oldTab.locator('#fb-release-notice').innerText(),
        /A newer Five Bars release is available/i);
      assert.match(await oldTab.locator('#fb-release-notice').innerText(),
        /Unsaved form entries may be lost/);
      await oldTab.evaluate(()=>window.__unsavedInputMarker='still here');
      await oldTab.waitForTimeout(100);
      assert.equal(await oldTab.evaluate(()=>window.__unsavedInputMarker),'still here',
        'detecting new data must never silently reload shopper inputs');
      assert.equal(await oldTab.locator('#fb-release-reload').isVisible(),true);
      await Promise.all([
        oldTab.waitForEvent('framenavigated',{timeout:10000}),
        oldTab.locator('#fb-release-reload').click()
      ]);
      await oldTab.close();
    }
    if(process.env.FIVE_BARS_SITE_DIR)assert.equal(assetVersions.size,1,'all styles and modules use the same release version');
    await context.close();
  }
  assert.deepEqual(errors,[],'no JavaScript page errors');
  console.log('PASS: mobile/desktop finder, verification, compare, saved state and layout');
} finally {
  await browser.close();
  await new Promise(done=>server.close(done));
}
