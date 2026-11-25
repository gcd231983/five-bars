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
