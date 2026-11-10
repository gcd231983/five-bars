import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GUIDES,renderGuide,renderHub,renderSitemap} from '../scripts/comparison-pages.mjs';
import {seoPagePaths} from '../scripts/seo-guides.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const data={
  catalog:JSON.parse(read('site/data/deals.json')),
  status:JSON.parse(read('site/data/status.json')),
  ledger:{schema:1,offers:{}},
  mvnoEvidence:JSON.parse(read('site/data/mvno-evidence.json'))
};
const fixed={today:'2026-11-02'};
const expected=['','about.html','contact.html','editorial.html','privacy.html','disclosures.html',
  'switching-guide.html','carrier-comparisons.html','phone-deals.html','satellite.html',
  'report.html',...GUIDES.map(g=>'compare/'+g.slug+'.html'),...seoPagePaths(data.catalog)];

test('sitemap contains every required public guide exactly once with safe canonical URLs',()=>{
  const sitemap=renderSitemap(data);
  const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.equal(urls.length,expected.length);
  assert.equal(new Set(urls).size,urls.length);
  assert.deepEqual(new Set(urls),new Set(expected.map(path=>'https://fivebars.info/'+path)));
  assert.match(read('site/robots.txt'),/^Sitemap: https:\/\/fivebars\.info\/sitemap\.xml$/m);
  assert.doesNotMatch(sitemap,/https?:\/\/[^<]*[?#]/);
});

test('generated comparison canonicals agree with sitemap and use unique titles',()=>{
  const sitemap=renderSitemap(data);
  const pages=[renderHub(data),...GUIDES.map(g=>renderGuide(g,data,fixed))];
  const titles=new Set();
  for(const html of pages){
    const canonical=html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canonical,'missing canonical');
    assert.ok(sitemap.includes('<loc>'+canonical[1]+'</loc>'));
    const title=html.match(/<title>([^<]+)<\/title>/);
    assert.ok(title&&title[1].length>=25);
    assert.ok(!titles.has(title[1]),'duplicate title');
    titles.add(title[1]);
    assert.match(html,/<meta name="description"/);
    assert.doesNotMatch(html,/aggregateRating|application\/ld\+json[^>]*>[^<]*"Offer"/);
  }
});

test('published sitemap is reproducible from catalog without falsely advancing human review date',()=>{
  assert.equal(read('site/sitemap.xml'),renderSitemap(data));
  assert.ok(renderSitemap(data).includes('<lastmod>'+data.catalog.checked+'</lastmod>'));
});
