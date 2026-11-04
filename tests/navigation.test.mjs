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
 assert.ok(locations.some(url=>url.pathname==='/five-bars/satellite.html'));
 for(const url of locations){
  assert.equal(url.origin,'https://gcd231983.github.io');
  assert.ok(url.pathname.startsWith('/five-bars/'));
  const path=join(site,url.pathname.slice('/five-bars/'.length)||'index.html');
  assert.ok(existsSync(path),url.href);
 }
});
