#!/usr/bin/env node
// Static SEO diagnostics; optionally probe live deployment with --live.
// A passing static audit does not prove Google has indexed any URL.
import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..','site');
const errors=[],warnings=[];
const read=p=>readFileSync(resolve(root,p),'utf8');
const sitemap=read('sitemap.xml'),robots=read('robots.txt');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(!urls.length)errors.push('Sitemap has no URLs');
if(new Set(urls).size!==urls.length)errors.push('Duplicate sitemap URLs');
if(!robots.includes('Sitemap: https://fivebars.info/sitemap.xml'))errors.push('robots.txt missing canonical sitemap URL');
for(const url of urls){
 let path;
 try {const u=new URL(url);if(u.origin!=='https://fivebars.info')throw Error('wrong origin');path=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1));}
 catch {errors.push('Invalid sitemap URL: '+url);continue;}
 if(!existsSync(resolve(root,path)))errors.push('Missing sitemap target: '+path);
 else {
  const html=read(path);
  const canonical=html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if(canonical!==url)warnings.push('Canonical mismatch or missing: '+path);
  if(!/<meta\s+name="description"/i.test(html))warnings.push('Description missing: '+path);
 }
}
const home=read('index.html');
if(!/<h1\b[^>]*>/.test(home))errors.push('Homepage missing H1');
console.log('SEO static audit: '+urls.length+' sitemap URLs');
for(const w of warnings)console.warn('WARN '+w);
if(process.argv.includes('--live')){
 for(const path of ['/robots.txt','/sitemap.xml','/']){
  try{
   const response=await fetch('https://fivebars.info'+path,{signal:AbortSignal.timeout(12000),redirect:'follow'});
   if(!response.ok)errors.push('Live '+path+' returned HTTP '+response.status);
   else console.log('LIVE '+path+' HTTP '+response.status+' '+response.url);
  }catch(e){errors.push('Live '+path+' unreachable: '+e.message);}
 }
}
for(const e of errors)console.error('ERROR '+e);
if(errors.length)process.exitCode=1;
