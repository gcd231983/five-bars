#!/usr/bin/env node
// Refresh editorially curated comparison pages, SEO buying guides and carrier
// pages from the *existing* catalog. Does not scrape carriers or mark any
// offer fully verified.
import {readFile,mkdir,writeFile,readdir,rm} from 'node:fs/promises';
import {GUIDES,renderGuide,renderHub,renderSitemap} from './comparison-pages.mjs';
import {renderSeoPages} from './seo-pages.mjs';
import {GUIDE_DIR,CARRIER_DIR} from './seo-guides.mjs';

const root=new URL('../',import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const optional=async path=>{try{return await read(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}};
const data={
 catalog:await read('site/data/deals.json'),
 status:await read('site/data/status.json'),
 ledger:await read('site/data/verifications.json'),
 mvnoEvidence:await read('site/data/mvno-evidence.json'),
 research:await read('site/data/research-evidence.json')
};
const affiliates=await optional('site/data/affiliates.json');
await mkdir(new URL('site/compare/',root),{recursive:true});
for(const guide of GUIDES){
 const page=renderGuide(guide,data);
 await writeFile(new URL('site/compare/'+guide.slug+'.html',root),page,'utf8');
}
await writeFile(new URL('site/carrier-comparisons.html',root),renderHub(data),'utf8');

// Buying guides and carrier pages. Pages for carriers that left the catalog
// are removed so search engines never see a stale, orphaned price page.
const seo=renderSeoPages(data,{affiliates});
for(const dir of [GUIDE_DIR,CARRIER_DIR]){
 await mkdir(new URL('site/'+dir,root),{recursive:true});
 for(const name of await readdir(new URL('site/'+dir,root))){
  if(name.endsWith('.html')&&!(dir+name in seo))await rm(new URL('site/'+dir+name,root));
 }
}
for(const [path,html] of Object.entries(seo))await writeFile(new URL('site/'+path,root),html,'utf8');

await writeFile(new URL('site/sitemap.xml',root),renderSitemap(data),'utf8');
console.log(JSON.stringify({
 guides:GUIDES.map(g=>g.slug),seoPages:Object.keys(seo).length,catalogDate:data.catalog.checked,
 sourceScan:data.status.generatedAt,manuallyReviewed:Object.keys(data.ledger?.offers||{}).length
},null,2));
