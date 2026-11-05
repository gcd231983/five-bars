import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const site=resolve(dirname(fileURLToPath(import.meta.url)),'../site');
const sitemap=readFileSync(join(site,'sitemap.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const canonicalBase='https://fivebars.info/';
const publicFiles=urls.map(url=>{
 assert.ok(url.startsWith(canonicalBase),'Sitemap must use canonical HTTPS host: '+url);
 const path=new URL(url).pathname;
 return path==='/'?'index.html':decodeURIComponent(path.slice(1));
});
test('sitemap lists unique local HTML pages',()=>{
 assert.equal(new Set(urls).size,urls.length,'Duplicate sitemap URLs');
 for(const file of publicFiles){
  assert.match(file,/\.html$/,'Sitemap target must be an HTML page: '+file);
  assert.ok(existsSync(join(site,file)),'Missing sitemap target: '+file);
 }
});
test('sitemap pages have a matching canonical and valid internal navigation destinations',()=>{
 for(const file of publicFiles){
  const html=readFileSync(join(site,file),'utf8');
  const expected=file==='index.html'?canonicalBase:canonicalBase+file;
  assert.ok(html.includes('href="'+expected+'"')||html.includes("href='"+expected+"'"),file+' missing canonical URL '+expected);
  for(const match of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)){
   const href=match[1];
   if(/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href))continue;
   const path=href.split(/[?#]/)[0];
   if(!path)continue;
   const target=resolve(dirname(join(site,file)),decodeURIComponent(path));
   assert.ok(target===site||target.startsWith(site+sep),file+' contains out-of-root link: '+href);
   assert.ok(existsSync(target),file+' contains broken internal link: '+href);
  }
 }
});
