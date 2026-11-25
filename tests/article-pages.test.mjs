import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {articlePath,parseArticleIndex,readArticleIndex,renderArticleIndex} from '../scripts/article-pages.mjs';
import {renderSitemap} from '../scripts/comparison-pages.mjs';

const fromSite=(file,encoding='utf8')=>readFileSync(new URL('../site/'+file,import.meta.url),encoding);
const rows=readArticleIndex();

test('the published article register drives the archive and sitemap with dated canonical pages',()=>{
 assert.equal(fromSite('articles.html'),renderArticleIndex(rows));
 assert.deepEqual(readdirSync(new URL('../site/articles/',import.meta.url)).filter(p=>p.endsWith('.html')).sort(),
  rows.map(r=>r.slug+'.html').sort());
 for(const row of rows){
  const path=articlePath(row.slug);
  assert.ok(fromSite(path).includes('rel="canonical" href="https://fivebars.info/'+path+'"'));
  assert.ok(fromSite(path).includes('<time datetime="'+row.published+'">'));
  assert.ok(renderSitemap({},rows).includes('<loc>https://fivebars.info/'+path+'</loc><lastmod>'+row.published+'</lastmod>'));
 }
 assert.match(fromSite('index.html'),/<a href="articles\.html">Articles<\/a>/);
 assert.match(fromSite('about.html'),/href="articles\.html"/);
});

test('future approved entries are sorted, escaped and validated',()=>{
 const sample={...rows[0],slug:'next-issue',title:'A < B & "C"',published:'2026-12-01'};
 assert.equal(parseArticleIndex([...rows,sample])[0].slug,sample.slug);
 assert.match(renderArticleIndex([sample]),/A &lt; B &amp; &quot;C&quot;/);
 assert.throws(()=>parseArticleIndex([...rows,rows[0]]),/duplicate/);
 assert.throws(()=>parseArticleIndex([{...sample,slug:'../draft'}]),/Invalid/);
 assert.throws(()=>parseArticleIndex([{...sample,published:'2026-02-30'}]),/Invalid/);
});

test('first receipt labels example claims and links the workbook plus the calculator',()=>{
 const html=fromSite('articles/free-phone-vs-unlocked.html');
 assert.match(html,/Illustrative example/);
 assert.match(html,/not necessarily \$0 due today/);
 assert.match(html,/href="assets\/five-bars-reader-workbook\.xlsx" download/);
 assert.match(html,/href="\.\.\/#switch"/);
 const workbook=fromSite('articles/assets/five-bars-reader-workbook.xlsx',null);
 assert.equal(workbook.subarray(0,4).toString('hex'),'504b0304');
});

test('homepage and evergreen guide link the receipt, which links back to the guide',()=>{
 const path='articles/free-phone-vs-unlocked.html';
 const home=fromSite('index.html');
 const guide=fromSite('best/free-phone-deals.html');
 const html=fromSite(path);
 assert.match(home,/<a href="articles\/free-phone-vs-unlocked\.html">Is a \$0 phone/);
 assert.match(home,/In one 24-month example, the \$0 promotion cost \$80 more/);
 assert.match(guide,/href="\.\.\/articles\/free-phone-vs-unlocked\.html"/);
 assert.match(html,/href="\.\.\/best\/free-phone-deals\.html"/);
});

test('receipt search markup agrees with the public article metadata and does not claim a live offer',()=>{
 const row=rows.find(row=>row.slug==='free-phone-vs-unlocked');
 const html=fromSite(articlePath(row.slug));
 const canonical='https://fivebars.info/'+articlePath(row.slug);
 const [,raw]=html.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
 const meta=JSON.parse(raw);
 assert.equal(meta['@type'],'Article');
 assert.equal(meta.headline,row.title);
 assert.equal(meta.author.name,row.author);
 assert.equal(meta.datePublished,row.published);
 assert.equal(meta.mainEntityOfPage,canonical);
 for(const src of meta.image){
  const url=new URL(src);
  assert.equal(url.origin,'https://fivebars.info');
  assert.ok(fromSite(url.pathname.slice(1),null).length>0);
 }
 assert.doesNotMatch(raw,/"(?:offers|price|aggregateRating|reviewRating)"\s*:/);
});
