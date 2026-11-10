import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {renderSeoPages,renderSeoGuide,renderCarrierPage,affiliateFor,planFacts} from '../scripts/seo-pages.mjs';
import {SEO_GUIDES,seoPagePaths,catalogCarriers,carrierSlug} from '../scripts/seo-guides.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const data={
 catalog:JSON.parse(read('site/data/deals.json')),
 status:JSON.parse(read('site/data/status.json')),
 ledger:{schema:1,offers:{}},
 mvnoEvidence:JSON.parse(read('site/data/mvno-evidence.json')),
 research:JSON.parse(read('site/data/research-evidence.json'))
};
const fixed={today:'2026-11-02'};
const guide=slug=>SEO_GUIDES.find(g=>g.slug===slug);
const rowOrder=html=>[...html.matchAll(/<tr[^>]*><td>(\d+)<\/td><th scope="row">(.*?)<\/th>/g)].map(m=>m[2]);

test('every SEO page renders with unique title, canonical, description, one h1 and social image',()=>{
 const pages=renderSeoPages(data,fixed);
 assert.deepEqual(Object.keys(pages).sort(),seoPagePaths(data.catalog).sort());
 const titles=new Set();
 for(const [path,html] of Object.entries(pages)){
  assert.ok(html.includes('<link rel="canonical" href="https://fivebars.info/'+path+'">'),path);
  const title=html.match(/<title>([^<]+)<\/title>/)[1];
  assert.ok(!titles.has(title),'duplicate title '+title);titles.add(title);
  const description=html.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.ok(description.length>=50&&description.length<=165,path+' description length '+description.length);
  assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,path);
  assert.match(html,/property="og:image" content="https:\/\/fivebars\.info\/og-card\.jpg"/);
  assert.match(html,/name="twitter:card"/);
  assert.match(html,/index,follow/);
  for(const [,json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))JSON.parse(json);
  assert.doesNotMatch(html,/"aggregateRating"|"@type":"Offer"|"@type":"Product"|"Review"/,path);
  assert.doesNotMatch(html,/<script(?![^>]*application\/ld\+json)/,path+' must not ship executable scripts');
 }
});

test('committed SEO pages exist for every catalog carrier and guide',()=>{
 for(const path of seoPagePaths(data.catalog))assert.ok(existsSync(new URL('../site/'+path,import.meta.url)),path);
 assert.equal(catalogCarriers(data.catalog).length,new Set(data.catalog.plans.map(p=>p.carrier)).size);
 assert.equal(carrierSlug('Metro by T-Mobile'),'metro-by-t-mobile');
 assert.equal(carrierSlug('Visible+ Pro'),'visible-plus-pro');
});

test('guides rank by regular 12-month cost and show intro deals separately',()=>{
 const html=renderSeoGuide(guide('cheap-unlimited-plans'),data,fixed);
 const usm=planFacts(data.catalog.plans.find(p=>p.id==='usm-starter'),data,fixed.today);
 assert.equal(usm.year,300,'US Mobile Starter baseline uses the $25 regular price');
 assert.ok(usm.deal&&usm.deal.year<300,'intro deal is reported separately');
 assert.match(html,/Quick answer/);
 assert.match(html,/How we rank/);
 const annual=planFacts(data.catalog.plans.find(p=>p.id==='h2o-annual30'),data,fixed.today);
 assert.equal(annual.year,288);
 assert.equal(annual.monthly,24);
});

test('documented price conflicts are withheld and never ranked',()=>{
 const fixture=structuredClone(data);
 fixture.mvnoEvidence.offers['tello-starter']={state:'headline_mismatch',observedPrice:17};
 const html=renderSeoGuide(guide('low-data-plans'),fixture,fixed);
 const row=html.match(/<tr class="needs-review"><td>–<\/td><th scope="row"><a href="\.\.\/carriers\/tello\.html">Tello<\/a><span>Starter 2GB<\/span>.*?<\/tr>/s);
 assert.ok(row,'held row is shown for context');
 assert.match(row[0],/Under review/);
 assert.match(row[0],/Withheld/);
});

test('approved affiliate links are labeled and disclosed but never change ranking order',()=>{
 const g=guide('cheap-phone-plans');
 const plain=renderSeoGuide(g,data,fixed);
 assert.doesNotMatch(plain,/rel="sponsored/);
 assert.doesNotMatch(plain,/Advertiser disclosure/);
 assert.match(plain,/no carrier pays for placement/);
 const affiliates={programs:{Tello:{status:'active',approvedOn:'2026-11-01',url:'https://www.anrdoezrs.net/click-1-2'}}};
 const paid=renderSeoGuide(g,data,{...fixed,affiliates});
 assert.deepEqual(rowOrder(paid),rowOrder(plain));
 assert.match(paid,/href="https:\/\/www\.anrdoezrs\.net\/click-1-2" target="_blank" rel="sponsored noopener noreferrer"/);
 assert.match(paid,/Affiliate link<\/span>/);
 assert.match(paid,/Advertiser disclosure:/);
 assert.match(paid,/may earn a commission/);
});

test('unapproved, insecure or malformed affiliate entries are ignored',()=>{
 for(const entry of [
  {status:'inactive',approvedOn:'2026-11-01',url:'https://example.com/a'},
  {status:'active',approvedOn:null,url:'https://example.com/a'},
  {status:'active',approvedOn:'2026-11-01',url:'http://example.com/a'},
  {status:'active',approvedOn:'2026-11-01',url:'javascript:alert(1)'}
 ])assert.equal(affiliateFor('Tello',{programs:{Tello:entry}}),null);
 const committed=JSON.parse(read('site/data/affiliates.json'));
 for(const [name,entry] of Object.entries(committed.programs)){
  if(entry.status!=='active')continue;
  assert.ok(affiliateFor(name,committed),name+' is active but missing an approval date or HTTPS link');
 }
});

test('carrier pages escape catalog text and link to official sources',()=>{
 const fixture=structuredClone(data);
 const plan=fixture.catalog.plans.find(p=>p.id==='visible');
 plan.plan='<script>alert(1)</script>';
 const html=renderCarrierPage('Visible',fixture,fixed);
 assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.doesNotMatch(html,/<script>alert/);
 assert.match(html,/rel="noopener noreferrer">See plan at Visible/);
 assert.match(html,/Can I keep my phone number if I switch to Visible\?/);
 assert.throws(()=>renderCarrierPage('Not A Carrier',data,fixed),/No catalog plans/);
});
