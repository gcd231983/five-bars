import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {resolve,relative,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const site=fileURLToPath(new URL('../site/',import.meta.url));
const pages=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(item=>
 item.isDirectory()?pages(join(dir,item.name)):item.name.endsWith('.html')?[join(dir,item.name)]:[]);
const homepageTabs=new Set(['finder','plans','phones','compare','switch','switch-save','watchlist','pricewatch','sources']);

test('all static local page links, assets and anchors resolve inside the deployed site',()=>{
 for(const file of pages(site)){
  const name=relative(site,file).split(sep).join('/');
  const html=readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  for(const [,raw] of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)){
   if(/^(?:[a-z]+:|\/\/)/i.test(raw))continue;
   const url=new URL(raw,'https://example.test/'+name);
   let target=resolve(site,'.'+decodeURIComponent(url.pathname));
   assert.ok(target===resolve(site)||target.startsWith(resolve(site)+sep),name+': '+raw);
   assert.ok(existsSync(target),name+': missing '+raw);
   if(statSync(target).isDirectory())target=join(target,'index.html');
   assert.ok(existsSync(target),name+': missing index '+raw);
   const anchor=decodeURIComponent(url.hash.slice(1));
   if(!anchor)continue;
   if(target===join(site,'index.html')&&homepageTabs.has(anchor))continue;
   const ids=[...readFileSync(target,'utf8').matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
   assert.ok(ids.includes(anchor),name+': missing anchor '+raw);
  }
 }
});

test('sitemap URLs resolve to deployed pages and include the satellite guide',()=>{
 const xml=readFileSync(join(site,'sitemap.xml'),'utf8');
 const locations=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]));
 assert.ok(locations.length>0);
 assert.ok(locations.some(url=>url.pathname==='/satellite.html'));
 for(const url of locations){
  assert.equal(url.origin,'https://fivebars.info');
  assert.ok(url.pathname.startsWith('/'));
  const path=join(site,url.pathname.slice('/'.length)||'index.html');
  assert.ok(existsSync(path),url.href);
 }
});

test('original Five Bars mark and consistent editorial brand styles exist across all information pages',()=>{
 const mark=readFileSync(join(site,'five-bars-mark.svg'),'utf8');
 assert.deepEqual([...mark.matchAll(/<rect\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"/g)]
   .map(([,x,y,width,height])=>({x:Number(x),y:Number(y),width:Number(width),height:Number(height)})),[
   {x:0,y:34,width:7,height:10},{x:10.5,y:26,width:7,height:18},
   {x:21,y:18,width:7,height:26},{x:31.5,y:9,width:7,height:35},
   {x:42,y:0,width:7,height:44}
 ]);
 const index=readFileSync(join(site,'index.html'),'utf8');
 assert.match(index,/rel="icon" type="image\/svg\+xml" href="five-bars-mark\.svg"/);
 const common=readFileSync(join(site,'comparison-styles.css'),'utf8');
 assert.ok(common.includes('Shared original Five Bars identity'),
   'Versioned comparison CSS must bundle the brand rather than request an unversioned nested import');
 assert.ok(common.includes('five-bars-mark.svg'));
 const css=readFileSync(join(site,'editorial-brand.css'),'utf8');
 assert.match(css,/five-bars-mark\.svg/);
 for(const name of [
   'about.html','contact.html','privacy.html','disclosures.html','editorial.html',
   'switching-guide.html','launch-readiness.html']){
    const html=readFileSync(join(site,name),'utf8');
    assert.match(html,/href="editorial-brand\.css"/,name+' must use the same masthead/theme');
 }
});
